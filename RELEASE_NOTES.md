# Release Notes — Store2Home → TajaMeat Rebrand

**Date:** September 19, 2026
**Branch:** `meat-delivery` (pushed to GitHub: `varshasri-eng/multilingual-product-search`)

## Summary

Converted the existing Store2Home grocery-delivery platform into TajaMeat, a
meat and seafood pre-order/delivery portal for Dublin, San Ramon, Pleasanton,
Livermore, Lathrop, and Manteca. This was a rebrand and re-catalog of a
working codebase, not a rebuild — the underlying order, invoice, auth, and
availability systems were unchanged.

## Catalog

- Replaced the full product catalog: from ~50 Andhra-grocery items (pickles,
  spices, millets, leaves) down to 23 meat/seafood products across four
  categories — **Goat** (12), **Chicken** (9), **Lamb** (1), **Seafood** (1).
- Fixed two bugs in `dataset/generate_catalog_data.py` that were silently
  producing wrong output:
  - A path-resolution bug (`BASE_DIR` walked up one directory too many),
    causing the script to look for `products.xlsx` in the wrong location.
  - Hardcoded 2-category logic (`Meat`/`Seafood`) left over from an earlier
    design, present in *two independent places* in the script — the
    validation check and the actual file-writer — that fought against the
    intended 4-category (Goat/Chicken/Lamb/Seafood) structure.
- Regenerated `backend/app/utils/catalog_data.py` from the corrected
  generator (23 products, 101 multilingual search terms).
- Fully wiped the old database contents (customers, orders, products,
  categories, search terms, etc.) via `TRUNCATE ... CASCADE` and reseeded
  clean from the corrected catalog data.
- Fixed `database/search_function.sql`'s column references, which had been
  written against a different, incompatible schema (`product_id`/`product_name`)
  and needed updating to match the real app's schema (`id`/`name`).

## Product Images

- Sourced and uploaded real photos for all 23 products to
  `backend/app/static/uploads/product_images/`, matched by product slug.
- Set `image_url` on all 23 product rows.
- Fixed a real gap in the frontend: the shop grid (`ShopPage.jsx`) and
  account home page (`account/Home.jsx`) never actually rendered
  `image_url` at all — they always displayed the generic emoji regardless
  of whether a photo existed. Patched both to show the real photo when
  available, falling back to the emoji otherwise (reusing the existing
  `resolveMediaUrl` utility already used for payment screenshots).

## Branding

- Renamed "Store2Home" → "TajaMeat" across 12 frontend files (login,
  register, forgot/reset password, admin login/register, order invoice
  view, `BrandingContext.jsx` defaults, `index.html` title, `package.json`).
- Fixed a hardcoded, non-API-driven "Shop by category" showcase on the
  landing page that still displayed Vegetables/Fruits/Dairy/Rice & Dal —
  now shows Goat/Chicken/Lamb/Seafood.
- Replaced every remaining "Lathrop & Mountain House" (old 2-town service
  area) reference with the real six-town list, across the landing page
  hero badge (both render branches), login page, admin login, register
  page, and account home page.
- Updated hero title/subtitle, tagline, and footer copy from generic
  grocery language to meat-specific copy matching the store's flyer.

## Pricing & Delivery

- Corrected `DEFAULT_DELIVERY_FEE` from an incorrect $2.99 to $5.00,
  matching the store's actual delivery pricing.
- Added a server-side free-delivery rule: delivery fee is waived when
  cart subtotal is $50 or more, applied identically in both the
  authenticated-customer and guest checkout code paths.

## Admin Access

- Superadmin account recreated after the database wipe (manual DB
  creation is currently required — there is no self-registration path to
  a full-permission account, by design).
- Current login: `admin@gmail.com` — password set and known only to the
  team, not recorded here.

## Known Open Items

- **Delivery zones / ZIP codes**: `delivery_zones` table is currently
  empty and the backend's ZIP allow-list still reflects the old two-town
  design. Address entry and per-zone delivery fees will not work
  correctly for the real six-town area until this is populated.
- **Primary brand color**: still the original default (pastel green),
  not yet updated to a TajaMeat-specific color.
- **Client-supplied discount validation**: `discount_amount` in checkout
  is currently accepted directly from the client request with no
  server-side cap or validation — a customer could submit an arbitrary
  discount value. Not yet fixed; flagged for a decision on intended
  discount behavior before locking it down.
- **Kannada/Malayalam search coverage**: originally requested as
  additional search languages alongside Telugu/Hindi/Tamil; not yet
  added to the language allow-list or reflected in seeded search terms.
- **`docs/PRODUCT_CATALOG.md` / `docs/SEARCH.md`**: committed to the
  repo during this work but not reviewed for stale references to the
  old catalog.
