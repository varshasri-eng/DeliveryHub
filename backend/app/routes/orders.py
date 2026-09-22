"""
Order Routes
------------
GET  /api/orders              - list current customer's orders
GET  /api/orders/<id>         - order detail (owner only)
POST /api/orders              - place an order (authenticated)
POST /api/orders/guest        - place a guest order (no auth)

Inventory: placing an order decrements Product.stock_quantity for each
item. This is the single place stock moves on the "order placed" side
of the lifecycle — removing/replacing an item on an existing order
(admin.py) is the other side, and restores/adjusts stock to match.

Delivery scheduling is PRODUCT-based, not order-based (see
utils/delivery.py): each OrderItem gets its own delivery_date, computed
from that product's own stock + ProductDeliveryRule, AND from the
order's order_type. Pickup orders skip the delivery lead time entirely
(ready today if in stock, or as soon as restocked if not); delivery
orders apply the configured min_lead_days on top of either case.
Availability is based on whether current stock actually COVERS the
requested quantity for that product (aggregated across duplicate cart
lines) — not just "is it non-zero":
  - stock_quantity is None (untracked) or >= the requested quantity:
    available now, earliest_date = today (+ min_lead_days for
    delivery), and stock decrements normally (never below zero, see
    below).
  - stock_quantity is present but LESS than the requested quantity
    (including zero): this is a BACKORDER. It's only allowed if a
    restock rule exists to compute a future date from (restock_cycle
    'weekly' or 'monthly') — rejected (409) if restock_cycle is 'none'
    or no rule is configured, since nothing can be computed for it.
    Physical stock is NEVER decremented below zero: whatever is on
    hand gets used up (floored at 0), and the shortfall is not
    tracked as negative inventory — Admin Order Review is responsible
    for handling the still-outstanding backorder with the customer.

Stock is only decremented once every other order-level validation
(address, order_type, scheduling, per-item delivery dates, etc.) has
already passed — see _validate_and_price_items() / _reserve_stock()
below — so a request that fails for any reason leaves
Product.stock_quantity untouched.
"""

import os
from datetime import date, datetime, timezone

from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from app import db
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.address import CustomerAddress
from app.models.delivery_rule import ProductDeliveryRule
from app.utils.auth import login_required
from app.utils.delivery import get_earliest_delivery_date

orders_bp = Blueprint("orders", __name__)

# ── Payment proof upload ────────────────────────────────────
PAYMENT_SCREENSHOT_SUBDIR = os.path.join("static", "uploads", "payment_screenshots")
PAYMENT_SCREENSHOT_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "pdf"}
PAYMENT_SCREENSHOT_MAX_BYTES = 5 * 1024 * 1024  # 5 MB

VALID_ORDER_TYPES = {"delivery", "pickup"}
VALID_TIME_SLOTS = {"Morning 9-12", "Afternoon 12-4", "Evening 4-7"}
DEFAULT_DELIVERY_FEE = 5.00
FREE_DELIVERY_THRESHOLD = 50.00


def _delivery_fee_for(zip_code):
    try:
        from app.models.delivery_zone import DeliveryZone
        zone = DeliveryZone.query.filter_by(zip_code=zip_code, is_active=True).first()
        if zone and zone.delivery_fee is not None:
            return float(zone.delivery_fee)
    except Exception:
        pass
    return DEFAULT_DELIVERY_FEE


def _validate_and_price_items(raw_items, order_type="delivery"):
    """
    Validate cart entries, price them, and determine each product's
    per-item delivery_date — all WITHOUT touching Product.stock_quantity.
    Stock is reserved separately, by _reserve_stock(), only once every
    other order-level validation has also passed.

    order_type ("delivery" or "pickup") is forwarded to
    get_earliest_delivery_date() for every product in the cart, so
    pickup orders correctly skip the delivery lead time (see
    utils/delivery.py) instead of inheriting delivery's scheduling
    rules.

    Availability is product-based (see the module docstring): a
    product where current stock covers the aggregated requested
    quantity is available now; a product where stock falls short
    (including zero) is only orderable as a backorder if a restock
    rule exists to compute a future date from, and is rejected (409)
    otherwise. Duplicate product_ids in the same cart are aggregated —
    once for the availability decision (a single product-level check
    against total demand, not per-line) and once for the eventual
    stock decrement — so a split cart line for the same product is one
    combined demand rather than several independent ones.

    If a cart entry includes its own "delivery_date", it's validated
    against that product's computed earliest date and rejected (400)
    if it's earlier — this is the server-side re-check a client-side
    calendar restriction alone can't guarantee; a manual API call must
    not be able to select an earlier date than what's actually
    achievable. Entries without one default to the computed earliest
    date.

    Returns (items, subtotal, stock_updates, error_response).
    error_response is None on success; on failure it's a
    (jsonify(...), status_code) tuple the caller should return
    immediately — no stock has been touched for that failed call.
    stock_updates is [(product, total_quantity), ...], aggregated per
    product, for _reserve_stock() to apply later. Products with
    stock_quantity is None (untracked/unlimited) are never included —
    nothing to decrement.
    """
    parsed_entries = []
    products_by_id = {}
    requested_by_id = {}

    for entry in raw_items:
        product_id = entry.get("product_id")
        quantity = entry.get("quantity", 1)
        try:
            quantity = int(quantity)
        except (TypeError, ValueError):
            quantity = 0
        if quantity <= 0:
            return None, None, None, (
                jsonify({"error": "Quantities must be positive integers."}), 400
            )

        product = products_by_id.get(product_id)
        if product is None:
            product = Product.query.filter_by(
                id=product_id, is_active=True
            ).first()
            if not product:
                return None, None, None, (
                    jsonify({"error": f"Product {product_id} not found."}), 404
                )
            products_by_id[product_id] = product

        requested_by_id[product_id] = requested_by_id.get(product_id, 0) + quantity
        parsed_entries.append((product, quantity, entry.get("delivery_date")))

    # ── per-product availability + delivery date (one check per
    # distinct product, using the aggregated demand — not per line) ──
    today = date.today()
    earliest_date_by_product_id = {}
    stock_updates = []

    for product_id, total_quantity in requested_by_id.items():
        product = products_by_id[product_id]
        rule = ProductDeliveryRule.query.filter_by(
            product_id=product_id
        ).first()

        restock_cycle = rule.restock_cycle if rule else "none"
        restock_day_of_week = rule.restock_day_of_week if rule else None
        restock_day_of_month = rule.restock_day_of_month if rule else None
        min_lead_days = rule.min_lead_days if rule else 0

        # Pickup is available immediately when stock is sufficient.
        if order_type == "pickup":
            min_lead_days = 0

        # Validate the rule before using it.
        if restock_cycle not in {"weekly", "monthly", "none"}:
            return None, None, None, (
                jsonify({
                    "error": (
                        f"Invalid restock rule configured for "
                        f"'{product.name}'."
                    )
                }),
                500,
            )

        if min_lead_days < 0:
            return None, None, None, (
                jsonify({
                    "error": (
                        f"Invalid minimum lead time configured for "
                        f"'{product.name}'."
                    )
                }),
                500,
            )

        if restock_cycle == "weekly":
            if (
                restock_day_of_week is None
                or not 0 <= restock_day_of_week <= 6
            ):
                return None, None, None, (
                    jsonify({
                        "error": (
                            f"Invalid weekly restock rule configured for "
                            f"'{product.name}'."
                        )
                    }),
                    500,
                )

        if restock_cycle == "monthly":
            if (
                restock_day_of_month is None
                or not 1 <= restock_day_of_month <= 31
            ):
                return None, None, None, (
                    jsonify({
                        "error": (
                            f"Invalid monthly restock rule configured for "
                            f"'{product.name}'."
                        )
                    }),
                    500,
                )

        # Available now only if stock actually COVERS total demand for
        # this product — not just "is it non-zero". Untracked stock
        # (None) always counts as sufficient. Falling short (including
        # zero) routes through the restock-based date instead.
        sufficient_stock = (
            product.stock_quantity is None
            or product.stock_quantity >= total_quantity
        )

        earliest_date = get_earliest_delivery_date(
            today,
            sufficient_stock,
            restock_cycle,
            restock_day_of_week,
            restock_day_of_month,
            min_lead_days,
            order_type,
        )

        if earliest_date is None:
            # Stock doesn't cover demand and there's no restock plan
            # (restock_cycle 'none', or no rule configured at all) —
            # nothing can be computed, so this product genuinely can't
            # be fulfilled right now.
            available = product.stock_quantity if product.stock_quantity is not None else 0
            return None, None, None, (
                jsonify({
                    "error": f"Only {available} of '{product.name}' "
                             f"available, and it isn't scheduled for "
                             f"restock."
                }),
                409,
            )

        earliest_date_by_product_id[product_id] = earliest_date

        if product.stock_quantity is not None:
            stock_updates.append((product, total_quantity))

    # ── build OrderItems in the cart's original order, validating any
    # customer-submitted delivery_date against that product's earliest ──
    items = []
    subtotal = 0.0

    for product, quantity, requested_date_str in parsed_entries:
        earliest_date = earliest_date_by_product_id[product.id]
        item_delivery_date = earliest_date

        if requested_date_str:
            try:
                submitted_date = date.fromisoformat(requested_date_str)
            except (TypeError, ValueError):
                return None, None, None, (
                    jsonify({
                        "error": f"Invalid delivery_date for "
                                 f"'{product.name}'. Use YYYY-MM-DD."
                    }),
                    400,
                )
            if submitted_date < earliest_date:
                return None, None, None, (
                    jsonify({
                        "error": f"'{product.name}' cannot be delivered "
                                 f"before {earliest_date.isoformat()}."
                    }),
                    400,
                )
            item_delivery_date = submitted_date

        unit_price = float(
            product.discounted_price if product.discounted_price else product.price
        )
        line_total = round(unit_price * quantity, 2)
        subtotal = round(subtotal + line_total, 2)

        items.append(OrderItem(
            product_id=product.id,
            product_name=product.name,
            unit=product.unit,
            quantity=quantity,
            unit_price=unit_price,
            line_total=line_total,
            delivery_date=item_delivery_date,
        ))

    return items, subtotal, stock_updates, None


def _reserve_stock(stock_updates):
    """
    Decrement Product.stock_quantity for each product.

    Stock is never allowed to become negative.

    Uses a row-level lock so concurrent orders cannot reserve
    the same physical inventory at the same time.

    Must only be called after every other order-level validation for
    this request has already passed — it's the last step before
    creating the Order and committing, so a request that ultimately
    fails for an unrelated reason (bad address, invalid time slot,
    etc.) never decrements stock in the first place.
    """
    for product, quantity in stock_updates:
        if product.stock_quantity is None:
            continue

        locked_product = (
            Product.query
            .filter_by(id=product.id)
            .with_for_update()
            .first()
        )

        if not locked_product:
            raise ValueError(
                f"Product {product.id} no longer exists."
            )

        locked_product.stock_quantity = max(
            0,
            locked_product.stock_quantity - quantity
        )


@orders_bp.route("", methods=["GET"])
@login_required
def list_orders(customer):
    orders = (
        Order.query.filter_by(customer_id=customer.id)
        .order_by(Order.created_at.desc())
        .all()
    )
    return jsonify({
        "count": len(orders),
        "orders": [o.to_dict() for o in orders],
    }), 200


@orders_bp.route("/<int:order_id>", methods=["GET"])
@login_required
def get_order(customer, order_id):
    order = Order.query.filter_by(
        id=order_id, customer_id=customer.id
    ).first()
    if not order:
        return jsonify({"error": "Order not found."}), 404
    return jsonify({"order": order.to_dict()}), 200


@orders_bp.route("", methods=["POST"])
@login_required
def create_order(customer):
    data = request.get_json(silent=True) or {}

    raw_items = data.get("items") or []
    if not raw_items:
        return jsonify({"error": "Your cart is empty."}), 400

    order_type = data.get("order_type", customer.default_order_type or "delivery")
    if order_type not in VALID_ORDER_TYPES:
        return jsonify({"error": "order_type must be delivery or pickup."}), 400

    # ── validate + price cart items (does NOT touch stock yet) ──────
    items, subtotal, stock_updates, err = _validate_and_price_items(raw_items, order_type)
    if err:
        return err

    # ── address + delivery fee ────────────────────────────────
    address_id = None
    delivery_fee = 0.0
    if order_type == "delivery":
        address_id = data.get("address_id")
        if not address_id:
            return jsonify({"error": "Please choose a delivery address."}), 400

        link = CustomerAddress.query.filter_by(
            id=address_id, customer_id=customer.id
        ).first()
        if not link or not link.address:
            return jsonify({"error": "Delivery address not found."}), 404

        address_id = link.address_id
        delivery_fee = _delivery_fee_for(link.address.zip_code)
        if subtotal >= FREE_DELIVERY_THRESHOLD:
            delivery_fee = 0.0

    discount = round(float(data.get("discount_amount") or 0), 2)
    total = round(subtotal + delivery_fee - discount, 2)

    # ── scheduling (optional) ─────────────────────────────────
    requested_date = None
    requested_time_slot = data.get("requested_time_slot") or None

    if requested_time_slot and requested_time_slot not in VALID_TIME_SLOTS:
        return jsonify({"error": "Invalid time slot."}), 400

    date_str = data.get("requested_date")

    if date_str:
        try:
            requested_date = date.fromisoformat(date_str)
        except ValueError:
            return jsonify({
                "error": "Invalid requested_date. Use YYYY-MM-DD."
            }), 400

        # The requested order date cannot be earlier than the
        # earliest date required by any product in the cart.
        earliest_order_date = max(
            item.delivery_date
            for item in items
            if item.delivery_date
        )

        if requested_date < earliest_order_date:
            return jsonify({
                "error": (
                    f"The earliest available date for this order is "
                    f"{earliest_order_date.isoformat()}."
                )
            }), 400

    # Every order-level validation has now passed — safe to reserve
    # stock and create the order as a single atomic step.
    _reserve_stock(stock_updates)

    order = Order(
        customer_id=customer.id,
        address_id=address_id,
        order_type=order_type,
        subtotal=subtotal,
        delivery_fee=delivery_fee,
        discount_amount=discount,
        total_amount=total,
        requested_date=requested_date,
        requested_time_slot=requested_time_slot,
        notes=(data.get("notes") or "").strip() or None,
        status="pending",
        items=items,
    )
    db.session.add(order)

    try:
        db.session.commit()
    except Exception:
        # Order creation AND the stock decrements above are part of
        # the same uncommitted session — rolling back here undoes
        # both together, so a failed commit never leaves stock
        # permanently decremented for an order that doesn't exist.
        db.session.rollback()
        return jsonify({
            "error": "Could not place order. Please try again."
        }), 500

    # fallback order number if the DB trigger isn't present
    if not order.order_number:
        order.order_number = f"S2H-{10000 + order.id}"
        db.session.commit()

    return jsonify({
        "message": "Order placed successfully.",
        "order": order.to_dict(),
    }), 201


# ── GUEST ORDER (no auth required) ──────────────────────────
@orders_bp.route("/guest", methods=["POST"])
def create_guest_order():
    data = request.get_json(silent=True) or {}

    raw_items = data.get("items") or []
    if not raw_items:
        return jsonify({"error": "Your cart is empty."}), 400

    # ── guest info ─────────────────────────────────────────
    guest_name  = (data.get("guest_name") or "").strip()
    guest_email = (data.get("guest_email") or "").strip()
    guest_phone = (data.get("guest_phone") or "").strip()

    if not guest_name:
        return jsonify({"error": "Name is required."}), 400
    if not guest_email:
        return jsonify({"error": "Email is required."}), 400

    # ── find or create guest customer ──────────────────────
    from app.models.customer import Customer
    customer = Customer.query.filter_by(email=guest_email).first()
    if not customer:
        # phone is required+unique; generate a placeholder for guests
        guest_phone = guest_phone or f"guest-{guest_email.split('@')[0]}"
        # ensure uniqueness
        if Customer.query.filter_by(phone=guest_phone).first():
            import secrets
            guest_phone = f"guest-{secrets.token_hex(6)}"
        customer = Customer(
            name=guest_name,
            email=guest_email,
            phone=guest_phone,
            role="customer",
            is_active=True,
        )
        db.session.add(customer)
        db.session.flush()

    order_type = data.get("order_type", "delivery")
    if order_type not in VALID_ORDER_TYPES:
        return jsonify({"error": "order_type must be delivery or pickup."}), 400

    # ── validate + price cart items (does NOT touch stock yet) ──────
    items, subtotal, stock_updates, err = _validate_and_price_items(raw_items, order_type)
    if err:
        return err

    # ── address + delivery fee ────────────────────────────
    address_id = None
    delivery_fee = 0.0
    if order_type == "delivery":
        addr_line1 = (data.get("address_line1") or "").strip()
        city       = (data.get("city") or "").strip()
        state      = (data.get("state") or "CA").strip()
        zip_code   = (data.get("zip_code") or "").strip()

        if not addr_line1 or not city or not zip_code:
            return jsonify({"error": "Full delivery address is required."}), 400

        from app.models.address import Address as AddressModel
        addr = AddressModel(
            address_line1=addr_line1,
            address_line2=(data.get("address_line2") or "").strip() or None,
            city=city,
            state=state,
            zip_code=zip_code,
            delivery_notes=(data.get("delivery_notes") or "").strip() or None,
        )
        db.session.add(addr)
        db.session.flush()

        address_id = addr.id
        delivery_fee = _delivery_fee_for(zip_code)
        if subtotal >= FREE_DELIVERY_THRESHOLD:
            delivery_fee = 0.0

    discount = round(float(data.get("discount_amount") or 0), 2)
    total = round(subtotal + delivery_fee - discount, 2)

    # ── scheduling (optional) ─────────────────────────────
    requested_date = None
    requested_time_slot = data.get("requested_time_slot") or None

    if requested_time_slot and requested_time_slot not in VALID_TIME_SLOTS:
        return jsonify({"error": "Invalid time slot."}), 400

    date_str = data.get("requested_date")

    if date_str:
        try:
            requested_date = date.fromisoformat(date_str)
        except ValueError:
            return jsonify({
                "error": "Invalid requested_date. Use YYYY-MM-DD."
            }), 400

        # The requested order date cannot be earlier than the
        # earliest date required by any product in the cart.
        earliest_order_date = max(
            item.delivery_date
            for item in items
            if item.delivery_date
        )

        if requested_date < earliest_order_date:
            return jsonify({
                "error": (
                    f"The earliest available date for this order is "
                    f"{earliest_order_date.isoformat()}."
                )
            }), 400

    # Every order-level validation has now passed — safe to reserve
    # stock and create the order as a single atomic step.
    _reserve_stock(stock_updates)

    order = Order(
        customer_id=customer.id,
        address_id=address_id,
        order_type=order_type,
        subtotal=subtotal,
        delivery_fee=delivery_fee,
        discount_amount=discount,
        total_amount=total,
        requested_date=requested_date,
        requested_time_slot=requested_time_slot,
        notes=(data.get("notes") or "").strip() or None,
        status="pending",
        items=items,
    )
    db.session.add(order)

    try:
        db.session.commit()
    except Exception:
        # Order creation AND the stock decrements above are part of
        # the same uncommitted session — rolling back here undoes
        # both together, so a failed commit never leaves stock
        # permanently decremented for an order that doesn't exist.
        db.session.rollback()
        return jsonify({
            "error": "Could not place order. Please try again."
        }), 500

    if not order.order_number:
        order.order_number = f"S2H-{10000 + order.id}"
        db.session.commit()

    return jsonify({
        "message": "Order placed successfully.",
        "order": order.to_dict(),
    }), 201

# ── PAYMENT PROOF SUBMISSION ─────────────────────────────────
# Customer-facing: after an admin has raised an invoice, the customer
# scans the QR (see /api/payment-settings), pays manually, then
# submits proof here — a screenshot and/or a note. This does NOT mark
# the payment as verified; it only moves the invoice into
# "payment_submitted" for an admin to review (see admin.py's
# verify/reject endpoints).
@orders_bp.route("/<int:order_id>/invoice/payment", methods=["POST"])
@login_required
def submit_payment_proof(customer, order_id):
    order = Order.query.filter_by(
        id=order_id, customer_id=customer.id
    ).first()
    if not order:
        return jsonify({"error": "Order not found."}), 404

    invoice = order.invoice
    if not invoice:
        return jsonify({
            "error": "This order does not have an invoice yet."
        }), 404

    # Only "issued" (first submission) or "payment_rejected"
    # (resubmission) can accept new proof. Already-submitted or
    # already-verified invoices shouldn't be overwritten here.
    if invoice.status not in {"issued", "payment_rejected"}:
        return jsonify({
            "error": (
                "Payment proof has already been submitted for this "
                "invoice."
                if invoice.status == "payment_submitted"
                else "This invoice has already been verified."
            )
        }), 400

    note = (request.form.get("note") or "").strip()
    file = request.files.get("screenshot")
    has_file = bool(file and file.filename)

    if not has_file and not note:
        return jsonify({
            "error": "Please upload a screenshot or add a note."
        }), 400

    screenshot_path = invoice.payment_screenshot_path

    if has_file:
        ext = (
            file.filename.rsplit(".", 1)[-1].lower()
            if "." in file.filename else ""
        )
        if ext not in PAYMENT_SCREENSHOT_EXTENSIONS:
            return jsonify({
                "error": (
                    "Screenshot must be an image (png/jpg/jpeg/webp) "
                    "or PDF."
                )
            }), 400

        file.seek(0, os.SEEK_END)
        size = file.tell()
        file.seek(0)
        if size > PAYMENT_SCREENSHOT_MAX_BYTES:
            return jsonify({
                "error": "Screenshot must be under 5MB."
            }), 400

        upload_dir = os.path.join(
            current_app.root_path, PAYMENT_SCREENSHOT_SUBDIR
        )
        os.makedirs(upload_dir, exist_ok=True)

        timestamp = int(datetime.now(timezone.utc).timestamp())
        filename = secure_filename(
            f"invoice_{invoice.id}_{timestamp}.{ext}"
        )
        file.save(os.path.join(upload_dir, filename))
        screenshot_path = f"/static/uploads/payment_screenshots/{filename}"

    invoice.payment_screenshot_path = screenshot_path
    invoice.payment_note = note or invoice.payment_note
    invoice.payment_submitted_at = datetime.now(timezone.utc)
    invoice.status = "payment_submitted"
    # Resubmission clears any prior rejection reason.
    invoice.payment_rejection_reason = None

    db.session.commit()

    return jsonify({
        "message": "Payment proof submitted. Awaiting admin verification.",
        "invoice": invoice.to_dict(),
    }), 200