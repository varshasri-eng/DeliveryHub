"""
Static Pages Routes
--------------------
GET    /api/pages           - public: list published pages (id, slug, title only)
GET    /api/pages/<slug>    - public: single published page, full content

GET    /api/admin/pages           - admin: list ALL pages (incl. unpublished)  [read]
POST   /api/admin/pages           - admin: create a page                       [write]
PUT    /api/admin/pages/<id>      - admin: update a page                       [write]
DELETE /api/admin/pages/<id>      - admin: delete a page                       [write]
"""

import re
from flask import Blueprint, request, jsonify
from app import db
from app.models.static_page import StaticPage
from app.utils.auth import permission_required

pages_bp = Blueprint("pages", __name__)
admin_pages_bp = Blueprint("admin_pages", __name__)


def _slugify(value):
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug


# ── PUBLIC ───────────────────────────────────────────────────
@pages_bp.route("", methods=["GET"])
def list_pages():
    pages = (
        StaticPage.query.filter_by(is_published=True)
        .order_by(StaticPage.display_order, StaticPage.title)
        .all()
    )
    return jsonify({
        "pages": [{"slug": p.slug, "title": p.title} for p in pages]
    }), 200


@pages_bp.route("/<slug>", methods=["GET"])
def get_page(slug):
    page = StaticPage.query.filter_by(slug=slug, is_published=True).first()
    if not page:
        return jsonify({"error": "Page not found."}), 404
    return jsonify({"page": page.to_dict()}), 200


# ── ADMIN ────────────────────────────────────────────────────
@admin_pages_bp.route("", methods=["GET"])
@permission_required("read")
def admin_list_pages(customer):
    pages = StaticPage.query.order_by(StaticPage.display_order, StaticPage.title).all()
    return jsonify({"pages": [p.to_dict() for p in pages]}), 200


@admin_pages_bp.route("", methods=["POST"])
@permission_required("write")
def create_page(customer):
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "Title is required."}), 400

    slug = (data.get("slug") or "").strip() or _slugify(title)
    if StaticPage.query.filter_by(slug=slug).first():
        return jsonify({"error": f"A page with slug '{slug}' already exists."}), 409

    page = StaticPage(
        slug=slug,
        title=title,
        content=data.get("content") or "",
        is_published=bool(data.get("is_published", True)),
        display_order=int(data.get("display_order") or 0),
    )
    db.session.add(page)
    db.session.commit()
    return jsonify({"message": "Page created.", "page": page.to_dict()}), 201


@admin_pages_bp.route("/<int:page_id>", methods=["PUT"])
@permission_required("write")
def update_page(customer, page_id):
    page = StaticPage.query.get(page_id)
    if not page:
        return jsonify({"error": "Page not found."}), 404

    data = request.get_json(silent=True) or {}
    if "title" in data:
        page.title = data["title"].strip()
    if "slug" in data:
        new_slug = data["slug"].strip()
        existing = StaticPage.query.filter(
            StaticPage.slug == new_slug, StaticPage.id != page.id
        ).first()
        if existing:
            return jsonify({"error": f"A page with slug '{new_slug}' already exists."}), 409
        page.slug = new_slug
    if "content" in data:
        page.content = data["content"]
    if "is_published" in data:
        page.is_published = bool(data["is_published"])
    if "display_order" in data:
        page.display_order = int(data["display_order"] or 0)

    db.session.commit()
    return jsonify({"message": "Page updated.", "page": page.to_dict()}), 200


@admin_pages_bp.route("/<int:page_id>", methods=["DELETE"])
@permission_required("write")
def delete_page(customer, page_id):
    page = StaticPage.query.get(page_id)
    if not page:
        return jsonify({"error": "Page not found."}), 404
    db.session.delete(page)
    db.session.commit()
    return jsonify({"message": "Page deleted."}), 200
