-- Migration 024: offer links (one offer code + one service) with an optional pop-up image and its own dates.
CREATE TABLE IF NOT EXISTS offer_links (
    id             SERIAL PRIMARY KEY,
    offer_code_id  INTEGER NOT NULL REFERENCES offer_codes(id) ON DELETE CASCADE,
    service_slug   VARCHAR(255) NOT NULL,
    headline       VARCHAR(150),
    image_path     VARCHAR(255),
    show_popup     BOOLEAN NOT NULL DEFAULT FALSE,
    popup_start    TIMESTAMPTZ,
    popup_end      TIMESTAMPTZ,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_offer_links_offer_code_id ON offer_links(offer_code_id);
