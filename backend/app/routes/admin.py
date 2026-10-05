"""
Admin Routes — Customer Management
------------------------------------
GET    /api/admin/customers                    - list all customers (search, filter, paginate)
GET    /api/admin/customers/<id>               - full customer profile
PUT    /api/admin/customers/<id>               - edit customer details
PUT    /api/admin/customers/<id>/deactivate    - deactivate customer
PUT    /api/admin/customers/<id>/activate      - reactivate customer
PUT    /api/admin/customers/<id>/role          - change role (customer <-> admin)
GET    /api/admin/customers/<id>/shipments     - customer shipment history
GET    /api/admin/customers/<id>/addresses     - customer addresses
DELETE /api/admin/customers/<id>               - hard delete (blocked if shipments exist)

GET    /api/admin/stats/customers              - dashboard counts

Order/product management (the old admin.py's largest section) has been
removed entirely — service and shipment administration now live in
admin_services.py and admin_shipments.py.
"""

from flask import Blueprint, request, jsonify
from app import db
from app.models.customer import Customer
from app.models.address import Address, CustomerAddress
from app.models.shipment import Shipment
from app.utils.auth import admin_required

admin_bp = Blueprint("admin", __name__)

VALID_ROLES      = {"customer", "admin"}
VALID_LANGUAGES  = {"english", "telugu", "hindi", "tamil", "kannada", "malayalam"}
VALID_DIET       = {"veg", "nonveg", "both"}
VALID_ORDER_TYPE = {"delivery", "pickup"}


# ── LIST CUSTOMERS ───────────────────────────────────────────
@admin_bp.route("/customers", methods=["GET"])
@admin_required
def list_customers(customer):
    """
    Query params:
      - search        : free-text searches name, email, phone, whatsapp
      - search_by     : name | phone | email | address | dietary | group (household) | last_shipment
      - search_q      : value for the specific search_by field
      - role          : customer | admin
      - is_active     : true | false
      - language      : english | telugu | hindi | tamil | kannada | malayalam
      - dietary       : veg | nonveg | both
      - page          : default 1
      - per_page      : default 20
    """
    search     = request.args.get("search", "").strip()
    search_by  = request.args.get("search_by", "").strip()
    search_q   = request.args.get("search_q", "").strip()
    role       = request.args.get("role", "").strip()
    is_active  = request.args.get("is_active", "").strip()
    language   = request.args.get("language", "").strip()
    dietary    = request.args.get("dietary", "").strip()
    page       = int(request.args.get("page", 1))
    per_page   = min(int(request.args.get("per_page", 20)), 100)

    query = Customer.query

    if search:
        like = f"%{search}%"
        query = query.filter(
            db.or_(
                Customer.name.ilike(like),
                Customer.email.ilike(like),
                Customer.phone.ilike(like),
                Customer.whatsapp_number.ilike(like),
            )
        )

    if search_by and search_q:
        like = f"%{search_q}%"

        if search_by == "name":
            query = query.filter(Customer.name.ilike(like))

        elif search_by == "phone":
            query = query.filter(
                db.or_(
                    Customer.phone.ilike(like),
                    Customer.whatsapp_number.ilike(like),
                )
            )

        elif search_by == "email":
            query = query.filter(Customer.email.ilike(like))

        elif search_by == "dietary":
            if search_q in VALID_DIET:
                query = query.filter(Customer.dietary_preference == search_q)
            else:
                query = query.filter(Customer.dietary_preference.ilike(like))

        elif search_by == "address":
            query = query.join(
                CustomerAddress, CustomerAddress.customer_id == Customer.id
            ).join(
                Address, Address.id == CustomerAddress.address_id
            ).filter(
                db.or_(
                    Address.address_line1.ilike(like),
                    Address.address_line2.ilike(like),
                    Address.city.ilike(like),
                    Address.zip_code.ilike(like),
                )
            ).distinct()

        elif search_by == "group":
            try:
                household_id = int(search_q)
                query = query.filter(Customer.household_id == household_id)
            except ValueError:
                pass

        elif search_by == "last_shipment":
            query = query.join(
                Shipment, Shipment.customer_id == Customer.id
            ).filter(
                db.or_(
                    Shipment.shipment_number.ilike(like),
                    Shipment.status.ilike(like),
                )
            ).distinct()

    if role and role in VALID_ROLES:
        query = query.filter(Customer.role == role)

    if is_active == "true":
        query = query.filter(Customer.is_active == True)
    elif is_active == "false":
        query = query.filter(Customer.is_active == False)

    if language and language in VALID_LANGUAGES:
        query = query.filter(Customer.preferred_language == language)

    if dietary and dietary in VALID_DIET:
        query = query.filter(Customer.dietary_preference == dietary)

    sort_by    = request.args.get("sort_by", "created_at").strip()
    sort_order = request.args.get("sort_order", "desc").strip()
    desc       = sort_order == "desc"

    if sort_by == "name":
        col = Customer.name
    elif sort_by == "shipments_count":
        shipment_count = db.select(
            Shipment.customer_id, db.func.count(Shipment.id).label("cnt")
        ).group_by(Shipment.customer_id).subquery()
        query = query.outerjoin(
            shipment_count, shipment_count.c.customer_id == Customer.id
        )
        query = query.order_by(
            db.desc(shipment_count.c.cnt) if desc else db.asc(shipment_count.c.cnt)
        ).order_by(Customer.id)
    else:
        col = Customer.created_at

    if sort_by != "shipments_count":
        query = query.order_by(col.desc() if desc else col.asc())

    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "customers": [c.to_dict() for c in paginated.items],
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": paginated.total,
            "pages": paginated.pages,
            "has_next": paginated.has_next,
            "has_prev": paginated.has_prev,
        },
    }), 200


@admin_bp.route("/customers/<int:customer_id>", methods=["GET"])
@admin_required
def get_customer(customer, customer_id):
    target = Customer.query.get(customer_id)
    if not target:
        return jsonify({"error": "Customer not found."}), 404
    return jsonify({"customer": target.to_dict(include_addresses=True)}), 200


@admin_bp.route("/customers/<int:customer_id>", methods=["PUT"])
@admin_required
def edit_customer(customer, customer_id):
    target = Customer.query.get(customer_id)
    if not target:
        return jsonify({"error": "Customer not found."}), 404

    data = request.get_json(silent=True) or {}

    if "name" in data:
        name = data["name"].strip()
        if not name:
            return jsonify({"error": "Name cannot be empty."}), 400
        target.name = name

    if "phone" in data:
        phone = data["phone"].strip()
        clash = Customer.query.filter(
            Customer.phone == phone, Customer.id != customer_id
        ).first()
        if clash:
            return jsonify({"error": "Phone already in use."}), 409
        target.phone = phone

    if "whatsapp_number" in data:
        target.whatsapp_number = data["whatsapp_number"].strip()

    if "email" in data:
        email = data["email"].strip().lower()
        clash = Customer.query.filter(
            Customer.email == email, Customer.id != customer_id
        ).first()
        if clash:
            return jsonify({"error": "Email already in use."}), 409
        target.email = email

    if "preferred_language" in data:
        if data["preferred_language"] in VALID_LANGUAGES:
            target.preferred_language = data["preferred_language"]

    if "dietary_preference" in data:
        if data["dietary_preference"] in VALID_DIET:
            target.dietary_preference = data["dietary_preference"]

    if "default_order_type" in data:
        if data["default_order_type"] in VALID_ORDER_TYPE:
            target.default_order_type = data["default_order_type"]

    db.session.commit()
    return jsonify({
        "message": "Customer updated.",
        "customer": target.to_dict(),
    }), 200


@admin_bp.route("/customers/<int:customer_id>/deactivate", methods=["PUT"])
@admin_required
def deactivate_customer(customer, customer_id):
    target = Customer.query.get(customer_id)
    if not target:
        return jsonify({"error": "Customer not found."}), 404
    if target.id == customer.id:
        return jsonify({"error": "Cannot deactivate your own account."}), 400

    target.is_active = False
    from app.models.session import Session
    Session.query.filter_by(
        customer_id=target.id, is_active=True
    ).update({"is_active": False})
    db.session.commit()

    return jsonify({
        "message": f"Customer '{target.name}' deactivated.",
        "customer": target.to_dict(),
    }), 200


@admin_bp.route("/customers/<int:customer_id>/activate", methods=["PUT"])
@admin_required
def activate_customer(customer, customer_id):
    target = Customer.query.get(customer_id)
    if not target:
        return jsonify({"error": "Customer not found."}), 404

    target.is_active = True
    db.session.commit()

    return jsonify({
        "message": f"Customer '{target.name}' activated.",
        "customer": target.to_dict(),
    }), 200


@admin_bp.route("/customers/<int:customer_id>/role", methods=["PUT"])
@admin_required
def change_role(customer, customer_id):
    target = Customer.query.get(customer_id)
    if not target:
        return jsonify({"error": "Customer not found."}), 404
    if target.id == customer.id:
        return jsonify({"error": "Cannot change your own role."}), 400

    data = request.get_json(silent=True) or {}
    new_role = data.get("role", "").strip()

    if new_role not in VALID_ROLES:
        return jsonify({"error": f"Role must be one of: {VALID_ROLES}"}), 400

    target.role = new_role
    db.session.commit()

    return jsonify({
        "message": f"Role updated to '{new_role}'.",
        "customer": target.to_dict(),
    }), 200


@admin_bp.route("/customers/<int:customer_id>/addresses", methods=["GET"])
@admin_required
def get_customer_addresses(customer, customer_id):
    target = Customer.query.get(customer_id)
    if not target:
        return jsonify({"error": "Customer not found."}), 404

    links = CustomerAddress.query.filter_by(customer_id=customer_id).all()
    return jsonify({
        "customer_id": customer_id,
        "customer_name": target.name,
        "addresses": [link.to_dict() for link in links],
    }), 200


@admin_bp.route("/customers/<int:customer_id>/shipments", methods=["GET"])
@admin_required
def get_customer_shipments(customer, customer_id):
    target = Customer.query.get(customer_id)
    if not target:
        return jsonify({"error": "Customer not found."}), 404

    shipments = Shipment.query.filter_by(
        customer_id=customer_id
    ).order_by(Shipment.created_at.desc()).all()

    return jsonify({
        "customer_id": customer_id,
        "customer_name": target.name,
        "total_shipments": len(shipments),
        "shipments": [s.to_dict() for s in shipments],
    }), 200


@admin_bp.route("/customers/<int:customer_id>", methods=["DELETE"])
@admin_required
def delete_customer(customer, customer_id):
    target = Customer.query.get(customer_id)
    if not target:
        return jsonify({"error": "Customer not found."}), 404
    if target.id == customer.id:
        return jsonify({"error": "Cannot delete your own account."}), 400

    has_shipments = Shipment.query.filter_by(customer_id=customer_id).count() > 0
    if has_shipments:
        return jsonify({
            "error": "Customer has existing shipments. Use deactivate instead."
        }), 400

    db.session.delete(target)
    db.session.commit()
    return jsonify({"message": f"Customer '{target.name}' deleted."}), 200


# ── DASHBOARD STATS ──────────────────────────────────────────
@admin_bp.route("/stats/customers", methods=["GET"])
@admin_required
def customer_stats(customer):
    total    = Customer.query.count()
    active   = Customer.query.filter_by(is_active=True).count()
    inactive = Customer.query.filter_by(is_active=False).count()
    verified = Customer.query.filter_by(is_verified=True).count()
    admins   = Customer.query.filter_by(role="admin").count()

    by_language = db.session.query(
        Customer.preferred_language,
        db.func.count(Customer.id)
    ).group_by(Customer.preferred_language).all()

    return jsonify({
        "total_customers": total,
        "active": active,
        "inactive": inactive,
        "verified": verified,
        "admins": admins,
        "by_language": {lang: count for lang, count in by_language},
    }), 200
