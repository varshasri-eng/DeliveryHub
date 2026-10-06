from datetime import datetime, timezone
from app import db


class ServiceType(db.Model):
    __tablename__ = "service_types"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    slug = db.Column(db.String(255), unique=True, nullable=False)
    badge_label = db.Column(db.String(100))
    tagline = db.Column(db.String(255))
    description = db.Column(db.Text)
    icon = db.Column(db.String(20))
    enable_quantity = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    display_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    coverage_items = db.relationship("ServiceCoverageItem", backref="service_type",
                                     order_by="ServiceCoverageItem.display_order",
                                     cascade="all, delete-orphan")
    restrictions = db.relationship("ServiceRestriction", backref="service_type",
                                   order_by="ServiceRestriction.display_order",
                                   cascade="all, delete-orphan")
    pricing_tiers = db.relationship("ServicePricingTier", backref="service_type",
                                    order_by="ServicePricingTier.display_order",
                                    cascade="all, delete-orphan")
    fields = db.relationship("ServiceField", backref="service_type",
                             order_by="ServiceField.display_order",
                             cascade="all, delete-orphan")

    def to_dict(self, include_details=False):
        data = {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "badge_label": self.badge_label,
            "tagline": self.tagline,
            "description": self.description,
            "icon": self.icon,
            "enable_quantity": self.enable_quantity,
            "is_active": self.is_active,
            "display_order": self.display_order,
        }
        if include_details:
            data["coverage_items"] = [c.to_dict() for c in self.coverage_items]
            data["restrictions"] = [r.to_dict() for r in self.restrictions]
            data["pricing_tiers"] = [t.to_dict() for t in self.pricing_tiers]
            data["fields"] = [f.to_dict() for f in self.fields]
        return data


class ServiceCoverageItem(db.Model):
    __tablename__ = "service_coverage_items"

    id = db.Column(db.Integer, primary_key=True)
    service_type_id = db.Column(db.Integer, db.ForeignKey("service_types.id", ondelete="CASCADE"), nullable=False)
    text = db.Column(db.String(255), nullable=False)
    display_order = db.Column(db.Integer, default=0)

    def to_dict(self):
        return {"id": self.id, "text": self.text, "display_order": self.display_order}


class ServiceRestriction(db.Model):
    __tablename__ = "service_restrictions"

    id = db.Column(db.Integer, primary_key=True)
    service_type_id = db.Column(db.Integer, db.ForeignKey("service_types.id", ondelete="CASCADE"), nullable=False)
    text = db.Column(db.String(255), nullable=False)
    display_order = db.Column(db.Integer, default=0)

    def to_dict(self):
        return {"id": self.id, "text": self.text, "display_order": self.display_order}


class ServicePricingTier(db.Model):
    __tablename__ = "service_pricing_tiers"

    id = db.Column(db.Integer, primary_key=True)
    service_type_id = db.Column(db.Integer, db.ForeignKey("service_types.id", ondelete="CASCADE"), nullable=False)
    tier_name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.String(255))
    duration_label = db.Column(db.String(100))
    price = db.Column(db.Numeric(10, 2), nullable=False)
    icon = db.Column(db.String(20))
    display_order = db.Column(db.Integer, default=0)

    sub_services = db.relationship("ServiceSubservice", backref="pricing_tier",
                                  order_by="ServiceSubservice.display_order",
                                  cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "tier_name": self.tier_name,
            "description": self.description,
            "duration_label": self.duration_label,
            "price": float(self.price),
            "icon": self.icon,
            "display_order": self.display_order,
            "sub_services": [sub_service.to_dict() for sub_service in self.sub_services],
        }


class ServiceSubservice(db.Model):
    __tablename__ = "service_subservices"

    id = db.Column(db.Integer, primary_key=True)
    pricing_tier_id = db.Column(
        db.Integer,
        db.ForeignKey("service_pricing_tiers.id", ondelete="CASCADE"),
        nullable=False,
    )
    name = db.Column(db.String(255), nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    icon = db.Column(db.String(20))
    display_order = db.Column(db.Integer, default=0)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "price": float(self.price),
            "icon": self.icon,
            "display_order": self.display_order,
        }


VALID_FIELD_TYPES = {"text", "textarea", "number", "select", "checkbox", "date", "file"}


class ServiceField(db.Model):
    __tablename__ = "service_fields"

    id = db.Column(db.Integer, primary_key=True)
    service_type_id = db.Column(db.Integer, db.ForeignKey("service_types.id", ondelete="CASCADE"), nullable=False)
    label = db.Column(db.String(255), nullable=False)
    field_key = db.Column(db.String(100), nullable=False)
    field_type = db.Column(db.String(20), nullable=False)
    options = db.Column(db.JSON)
    display_order = db.Column(db.Integer, default=0)

    def to_dict(self):
        return {
            "id": self.id,
            "label": self.label,
            "field_key": self.field_key,
            "field_type": self.field_type,
            "options": self.options,
            "display_order": self.display_order,
        }
