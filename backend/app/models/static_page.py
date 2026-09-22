from datetime import datetime, timezone
from app import db


class StaticPage(db.Model):
    __tablename__ = "static_pages"

    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(100), unique=True, nullable=False)
    title = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text)  # Markdown
    is_published = db.Column(db.Boolean, default=True)
    display_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "slug": self.slug,
            "title": self.title,
            "content": self.content,
            "is_published": self.is_published,
            "display_order": self.display_order,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
