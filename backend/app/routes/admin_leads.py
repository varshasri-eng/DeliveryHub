"""
Admin Leads Routes
------------------
GET /api/admin/leads            - list leads (?search=&role=sender|receiver|both&page=&per_page=)   [read]
GET /api/admin/leads/<id>       - one lead: details, who they send to, who they receive from,
                                  and every shipment they are part of                                [read]
"""
from flask import Blueprint, jsonify, request
from sqlalchemy import distinct, func, or_

from app import db
from app.models.lead import Lead
from app.models.shipment import Shipment
from app.utils.auth import permission_required

admin_leads_bp = Blueprint("admin_leads", __name__)


def _side_counts(lead_column, other_column):
    return (
        db.session.query(
            lead_column.label("lead_id"),
            func.count(Shipment.id).label("shipments"),
            func.count(distinct(other_column)).label("people"),
        )
        .filter(lead_column.isnot(None))
        .group_by(lead_column)
        .subquery()
    )


def _brief(lead):
    return {"id": lead.id, "name": lead.name, "phone": lead.phone, "country": lead.country} if lead else None


@admin_leads_bp.route("", methods=["GET"])
@permission_required("read")
def list_leads(customer):
    search = (request.args.get("search") or "").strip()
    role = request.args.get("role") or ""
    try:
        page = max(1, int(request.args.get("page", 1)))
        per_page = min(100, max(1, int(request.args.get("per_page", 25))))
    except ValueError:
        page, per_page = 1, 25

    sent = _side_counts(Shipment.sender_lead_id, Shipment.receiver_lead_id)
    received = _side_counts(Shipment.receiver_lead_id, Shipment.sender_lead_id)
    sent_n = func.coalesce(sent.c.shipments, 0)
    recv_n = func.coalesce(received.c.shipments, 0)

    base = (
        db.session.query(
            Lead, sent_n, func.coalesce(sent.c.people, 0), recv_n, func.coalesce(received.c.people, 0),
        )
        .outerjoin(sent, sent.c.lead_id == Lead.id)
        .outerjoin(received, received.c.lead_id == Lead.id)
    )

    def with_search(query):
        if not search:
            return query
        like = f"%{search}%"
        clauses = [Lead.name.ilike(like), Lead.city.ilike(like), Lead.province.ilike(like),
                   Lead.address.ilike(like), Lead.phone.ilike(like), Lead.postal_code.ilike(like)]
        digits = "".join(ch for ch in search if ch.isdigit())
        if len(digits) >= 3:
            clauses.append(Lead.phone_key.like(f"%{digits}%"))
        return query.filter(or_(*clauses))

    def with_role(query, which):
        if which == "sender":
            return query.filter(sent_n > 0)
        if which == "receiver":
            return query.filter(recv_n > 0)
        if which == "both":
            return query.filter(sent_n > 0, recv_n > 0)
        return query

    searched = with_search(base)
    counts = {
        "all": searched.count(),
        "sender": with_role(searched, "sender").count(),
        "receiver": with_role(searched, "receiver").count(),
        "both": with_role(searched, "both").count(),
    }
    query = with_role(searched, role)
    total = counts.get(role if role in counts else "all", counts["all"])
    rows = (
        query.order_by(Lead.last_seen_at.desc(), Lead.id.desc())
        .offset((page - 1) * per_page).limit(per_page).all()
    )

    leads = []
    for lead, sent_shipments, sends_to, received_shipments, receives_from in rows:
        item = lead.to_dict()
        item.update({
            "sent_shipments": int(sent_shipments), "sends_to_people": int(sends_to),
            "received_shipments": int(received_shipments), "receives_from_people": int(receives_from),
        })
        leads.append(item)

    return jsonify({"leads": leads, "total": total, "counts": counts, "page": page, "per_page": per_page}), 200


@admin_leads_bp.route("/<int:lead_id>", methods=["GET"])
@permission_required("read")
def get_lead(customer, lead_id):
    lead = Lead.query.get(lead_id)
    if not lead:
        return jsonify({"error": "Lead not found."}), 404

    def connections(own_column, other_column):
        last = func.max(Shipment.created_at)
        rows = (
            db.session.query(other_column, func.count(Shipment.id), last)
            .filter(own_column == lead.id, other_column.isnot(None))
            .group_by(other_column).order_by(last.desc()).all()
        )
        others = {l.id: l for l in Lead.query.filter(Lead.id.in_([r[0] for r in rows])).all()} if rows else {}
        return [
            {**(_brief(others.get(lead_id_)) or {"id": lead_id_}), "shipments": int(n),
             "last_shipment_at": last_at.isoformat() if last_at else None}
            for lead_id_, n, last_at in rows
        ]

    shipments = (
        Shipment.query
        .filter(or_(Shipment.sender_lead_id == lead.id, Shipment.receiver_lead_id == lead.id))
        .order_by(Shipment.created_at.desc()).limit(200).all()
    )
    history = []
    for s in shipments:
        sent_by_this = s.sender_lead_id == lead.id
        other = s.receiver_lead if sent_by_this else s.sender_lead
        history.append({
            "id": s.id,
            "shipment_number": s.shipment_number,
            "status": s.status,
            "route_direction": s.route_direction,
            "role": "sender" if sent_by_this else "receiver",
            "counterpart": _brief(other),
            "service_name": s.service_type.name if s.service_type else None,
            "total_price": float(s.total_price),
            "currency_code": s.currency_code or "USD",
            "created_at": s.created_at.isoformat() if s.created_at else None,
        })

    return jsonify({
        "lead": lead.to_dict(),
        "sends_to": connections(Shipment.sender_lead_id, Shipment.receiver_lead_id),
        "receives_from": connections(Shipment.receiver_lead_id, Shipment.sender_lead_id),
        "shipments": history,
    }), 200
