"""
Public Service Routes
-----------------------
GET /api/services          - list active services (name, slug, tagline, icon — for a browsing grid)
GET /api/services/<slug>   - one service's full detail (coverage, restrictions,
                              pricing tiers, and the fields the booking form needs)
"""

from flask import Blueprint, jsonify
from app.models.service_type import ServiceType

services_bp = Blueprint("services", __name__)


@services_bp.route("", methods=["GET"])
def list_services():
    services = (
        ServiceType.query.filter_by(is_active=True)
        .order_by(ServiceType.display_order, ServiceType.name)
        .all()
    )
    return jsonify({
        "services": [s.to_dict() for s in services],
    }), 200


@services_bp.route("/<slug>", methods=["GET"])
def get_service(slug):
    service = ServiceType.query.filter_by(slug=slug, is_active=True).first()
    if not service:
        return jsonify({"error": "Service not found."}), 404
    return jsonify({"service": service.to_dict(include_details=True)}), 200
