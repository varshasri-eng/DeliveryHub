"""
Admin Revenue Routes
--------------------
GET /api/admin/revenue?month=YYYY-MM   - verified payments for that month (default: this month),
                                         the month's total per currency, and a list of every month
                                         with its count and total                          [read]
Months are counted in India time (Asia/Kolkata). USD and INR are never added together.
"""
from collections import OrderedDict
from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

from flask import Blueprint, jsonify, request

from app.models.payment_record import PaymentRecord
from app.utils.auth import permission_required

admin_revenue_bp = Blueprint("admin_revenue", __name__)
BUSINESS_TZ = ZoneInfo("Asia/Kolkata")


def _month_of(dt):
    return dt.astimezone(BUSINESS_TZ).strftime("%Y-%m")


@admin_revenue_bp.route("", methods=["GET"])
@permission_required("read")
def revenue(customer):
    records = PaymentRecord.query.order_by(PaymentRecord.paid_at.desc()).all()

    month = (request.args.get("month") or "").strip()
    if not month:
        month = datetime.now(BUSINESS_TZ).strftime("%Y-%m")
    try:
        datetime.strptime(month, "%Y-%m")
    except ValueError:
        return jsonify({"error": "month must look like 2026-11."}), 400

    overview = OrderedDict()   # (month, currency) -> [count, total]
    entries, totals = [], {}
    for r in records:
        m = _month_of(r.paid_at)
        row = overview.setdefault((m, r.currency_code), [0, Decimal("0")])
        row[0] += 1
        row[1] += r.amount_paid or 0
        if m == month:
            entries.append(r.to_dict())
            t = totals.setdefault(r.currency_code, {"currency_code": r.currency_code, "count": 0, "total": Decimal("0")})
            t["count"] += 1
            t["total"] += r.amount_paid or 0

    return jsonify({
        "month": month,
        "entries": entries,
        "totals": [{**t, "total": float(t["total"])} for t in totals.values()],
        "months": [
            {"month": m, "currency_code": c, "count": v[0], "total": float(v[1])}
            for (m, c), v in sorted(overview.items(), reverse=True)
        ],
    }), 200
