"""
Database bootstrap — runs once at app startup.
  * db.create_all()  — create any missing tables

Catalog/product seeding (inherited from the TajaMeat codebase this
project was cloned from) has been intentionally removed — DeliveryHub
has no product catalog. Service types and their dynamic fields are
admin-managed at runtime, not seeded from a static source.
"""

import re

from app import db


def slugify(value):
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug


def init_db():
    db.create_all()
