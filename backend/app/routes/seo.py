"""
SEO Routes
----------
GET /api/sitemap.xml - list of public pages for Google (home, services, track, every active service).
nginx serves it at https://deliveryhubca.com/sitemap.xml.
"""
import os
from datetime import datetime, timezone
from xml.sax.saxutils import escape

from flask import Blueprint, Response

from app.models.service_type import ServiceType

seo_bp = Blueprint("seo", __name__)

SITE_URL = os.environ.get("SITE_URL", "https://deliveryhubca.com").rstrip("/")


@seo_bp.route("/sitemap.xml", methods=["GET"])
def sitemap():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    pages = [("/", "1.0"), ("/services", "0.9"), ("/track", "0.5")]
    for service in ServiceType.query.filter_by(is_active=True).order_by(ServiceType.display_order).all():
        pages.append((f"/services/{service.slug}/book", "0.8"))

    body = "".join(
        f"<url><loc>{escape(SITE_URL + path)}</loc><lastmod>{today}</lastmod><priority>{priority}</priority></url>"
        for path, priority in pages
    )
    xml = f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{body}</urlset>'
    return Response(xml, mimetype="application/xml")
