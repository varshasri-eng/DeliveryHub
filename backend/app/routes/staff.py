"""
Staff Routes — Admin RBAC
--------------------------
POST /api/staff/register              - staff self-registration (creates pending account)

POST /api/staff                       - admin adds a staff member directly (active at once)   [full only]
PUT  /api/staff/<id>                  - edit a staff member's name, email, phone, password    [full only]
GET  /api/staff/pending               - list pending staff requests       [full only]
GET  /api/staff/all                   - list all staff members             [full only]
PUT  /api/staff/<id>/approve          - approve + assign permission        [full only]
PUT  /api/staff/<id>/reject           - reject request                     [full only]
PUT  /api/staff/<id>/permission       - change permission of active staff  [full only]
PUT  /api/staff/<id>/revoke           - revoke admin access completely     [full only]
GET  /api/staff/me                    - current staff member's own details [any staff]

Permission levels:
  read  — view customers, orders, products. No mutations.
  write — read + update orders, edit products, manage inventory
  full  — everything including staff approval and role management
"""

from flask import Blueprint, request, jsonify
from app import db
from app.models.customer import Customer
from app.utils.auth import admin_required, permission_required, login_required

staff_bp = Blueprint("staff", __name__)

VALID_PERMISSIONS = {"read", "write", "full"}
MIN_PASSWORD_LENGTH = 8


# ── STAFF SELF-REGISTRATION ──────────────────────────────────
@staff_bp.route("/register", methods=["POST"])
def staff_register():
    """
    Anyone can submit a staff registration request.
    Account is created with role='admin', admin_role='pending', is_active=False.
    The existing full-admin must approve before they can log in.
    """
    data = request.get_json(silent=True) or {}

    name  = (data.get("name") or "").strip()
    phone = (data.get("phone") or "").strip()
    email = (data.get("email") or "").strip().lower()
    note  = (data.get("note") or "").strip()   # optional — why they need access

    if not name:  return jsonify({"error": "Name is required."}), 400
    if not phone: return jsonify({"error": "Phone is required."}), 400
    if not email: return jsonify({"error": "Email is required."}), 400

    password = data.get("password") or ""
    if not password:
        return jsonify({"error": "Password is required."}), 400
    if len(password) < MIN_PASSWORD_LENGTH:
        return jsonify({"error": f"Password must be at least {MIN_PASSWORD_LENGTH} characters."}), 400

    # duplicate checks
    if Customer.query.filter_by(phone=phone).first():
        return jsonify({"error": "Phone already registered."}), 409
    if Customer.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered."}), 409

    staff = Customer(
        name=name,
        phone=phone,
        email=email,
        whatsapp_number=(data.get("whatsapp_number") or phone).strip(),
        role="admin",
        admin_role="pending",        # awaiting approval
        is_active=False,             # cannot log in until approved
        is_verified=False,
        admin_request_note=note or None,
    )
    staff.set_password(password)
    db.session.add(staff)
    db.session.commit()

    return jsonify({
        "message": "Staff request submitted. You will be notified once approved.",
        "staff_id": staff.id,
    }), 201


# ── ADD STAFF DIRECTLY ───────────────────────────────────────
@staff_bp.route("", methods=["POST"])
@permission_required("full")
def add_staff(customer):
    """An admin creates a staff account that is active straight away (no approval step)."""
    data = request.get_json(silent=True) or {}

    name  = (data.get("name") or "").strip()
    phone = (data.get("phone") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    permission = (data.get("permission") or "").strip()

    if not name:  return jsonify({"error": "Name is required."}), 400
    if not phone: return jsonify({"error": "Phone is required."}), 400
    if len(phone) > 20: return jsonify({"error": "Phone must be 20 characters or fewer."}), 400
    if not email: return jsonify({"error": "Email is required."}), 400
    if len(password) < MIN_PASSWORD_LENGTH:
        return jsonify({"error": f"Password must be at least {MIN_PASSWORD_LENGTH} characters."}), 400
    if permission not in VALID_PERMISSIONS:
        return jsonify({"error": f"Permission must be one of: {sorted(VALID_PERMISSIONS)}"}), 400

    if Customer.query.filter_by(phone=phone).first():
        return jsonify({"error": "Phone already registered."}), 409
    if Customer.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered."}), 409

    staff = Customer(
        name=name,
        phone=phone,
        email=email,
        whatsapp_number=(data.get("whatsapp_number") or phone).strip(),
        role="admin",
        admin_role=permission,
        is_active=True,
        is_verified=True,
    )
    staff.set_password(password)
    db.session.add(staff)
    db.session.commit()

    return jsonify({
        "message": f"{staff.name} added with '{permission}' access. They can sign in at /admin/login.",
        "staff": staff.to_dict(),
    }), 201


# ── EDIT STAFF DETAILS ───────────────────────────────────────
@staff_bp.route("/<int:staff_id>", methods=["PUT"])
@permission_required("full")
def update_staff(customer, staff_id):
    target = Customer.query.get(staff_id)
    if not target or target.role != "admin" or target.admin_role not in VALID_PERMISSIONS:
        return jsonify({"error": "Staff member not found."}), 404

    data = request.get_json(silent=True) or {}

    if "name" in data:
        name = (data.get("name") or "").strip()
        if not name:
            return jsonify({"error": "Name is required."}), 400
        target.name = name
    if "phone" in data:
        phone = (data.get("phone") or "").strip()
        if not phone:
            return jsonify({"error": "Phone is required."}), 400
        if len(phone) > 20:
            return jsonify({"error": "Phone must be 20 characters or fewer."}), 400
        clash = Customer.query.filter(Customer.phone == phone, Customer.id != target.id).first()
        if clash:
            return jsonify({"error": "Phone already registered."}), 409
        target.phone = phone
    if "email" in data:
        email = (data.get("email") or "").strip().lower()
        if not email:
            return jsonify({"error": "Email is required."}), 400
        clash = Customer.query.filter(Customer.email == email, Customer.id != target.id).first()
        if clash:
            return jsonify({"error": "Email already registered."}), 409
        target.email = email
    password = data.get("password") or ""
    if password:
        if len(password) < MIN_PASSWORD_LENGTH:
            return jsonify({"error": f"Password must be at least {MIN_PASSWORD_LENGTH} characters."}), 400
        target.set_password(password)
        # a new password signs them out everywhere
        from app.models.session import Session
        Session.query.filter_by(customer_id=target.id, is_active=True).update({"is_active": False})

    db.session.commit()
    return jsonify({"message": f"{target.name}'s details updated.", "staff": target.to_dict()}), 200


# ── LIST PENDING REQUESTS ────────────────────────────────────
@staff_bp.route("/pending", methods=["GET"])
@permission_required("full")
def list_pending(customer):
    pending = Customer.query.filter_by(
        role="admin", admin_role="pending"
    ).order_by(Customer.created_at.desc()).all()

    return jsonify({
        "count": len(pending),
        "pending": [c.to_dict() for c in pending],
    }), 200


# ── LIST ALL STAFF ───────────────────────────────────────────
@staff_bp.route("/all", methods=["GET"])
@permission_required("full")
def list_all_staff(customer):
    staff = Customer.query.filter(
        Customer.role == "admin",
        Customer.admin_role != "pending",
        Customer.admin_role.isnot(None),
    ).order_by(Customer.name).all()

    return jsonify({
        "count": len(staff),
        "staff": [c.to_dict() for c in staff],
    }), 200


# ── APPROVE ──────────────────────────────────────────────────
@staff_bp.route("/<int:staff_id>/approve", methods=["PUT"])
@permission_required("full")
def approve_staff(customer, staff_id):
    target = Customer.query.get(staff_id)
    if not target:
        return jsonify({"error": "Staff not found."}), 404
    if target.admin_role != "pending":
        return jsonify({"error": "This request is not pending."}), 400

    data = request.get_json(silent=True) or {}
    permission = (data.get("permission") or "").strip()

    if permission not in VALID_PERMISSIONS:
        return jsonify({
            "error": f"Permission must be one of: {sorted(VALID_PERMISSIONS)}"
        }), 400

    target.admin_role = permission
    target.is_active  = True           # now they can log in
    target.is_verified = True
    db.session.commit()

    return jsonify({
        "message": f"{target.name} approved with '{permission}' access. "
                   f"They can sign in with the password they chose at registration.",
        "staff": target.to_dict(),
    }), 200


# ── REJECT ───────────────────────────────────────────────────
@staff_bp.route("/<int:staff_id>/reject", methods=["PUT"])
@permission_required("full")
def reject_staff(customer, staff_id):
    target = Customer.query.get(staff_id)
    if not target:
        return jsonify({"error": "Staff not found."}), 404
    if target.admin_role != "pending":
        return jsonify({"error": "This request is not pending."}), 400

    data = request.get_json(silent=True) or {}
    reason = (data.get("reason") or "").strip()

    # mark as rejected — keep record but permanently inactive
    target.admin_role = "rejected"
    target.is_active  = False
    target.admin_request_note = reason or target.admin_request_note
    db.session.commit()

    return jsonify({
        "message": f"{target.name}'s request rejected.",
        "staff": target.to_dict(),
    }), 200


# ── CHANGE PERMISSION ────────────────────────────────────────
@staff_bp.route("/<int:staff_id>/permission", methods=["PUT"])
@permission_required("full")
def change_permission(customer, staff_id):
    target = Customer.query.get(staff_id)
    if not target or target.role != "admin":
        return jsonify({"error": "Staff member not found."}), 404
    if target.id == customer.id:
        return jsonify({"error": "Cannot change your own permission."}), 400

    data = request.get_json(silent=True) or {}
    permission = (data.get("permission") or "").strip()

    if permission not in VALID_PERMISSIONS:
        return jsonify({
            "error": f"Permission must be one of: {sorted(VALID_PERMISSIONS)}"
        }), 400

    target.admin_role = permission
    db.session.commit()

    return jsonify({
        "message": f"{target.name}'s permission updated to '{permission}'.",
        "staff": target.to_dict(),
    }), 200


# ── REVOKE ACCESS ────────────────────────────────────────────
@staff_bp.route("/<int:staff_id>/revoke", methods=["PUT"])
@permission_required("full")
def revoke_staff(customer, staff_id):
    target = Customer.query.get(staff_id)
    if not target or target.role != "admin":
        return jsonify({"error": "Staff member not found."}), 404
    if target.id == customer.id:
        return jsonify({"error": "Cannot revoke your own access."}), 400

    target.admin_role = None
    target.role       = "customer"
    target.is_active  = True    # keep as regular customer

    # invalidate sessions
    from app.models.session import Session
    Session.query.filter_by(
        customer_id=target.id, is_active=True
    ).update({"is_active": False})
    db.session.commit()

    return jsonify({
        "message": f"{target.name}'s admin access revoked. Converted to customer.",
        "staff": target.to_dict(),
    }), 200


# ── MY PROFILE (for logged-in staff) ────────────────────────
@staff_bp.route("/me", methods=["GET"])
@login_required
def staff_me(customer):
    if customer.role != "admin":
        return jsonify({"error": "Not a staff member."}), 403
    return jsonify({"staff": customer.to_dict()}), 200