# Meat Delivery Product Catalog

## Purpose

This application is a meat-delivery platform.

The production product catalog contains meat and seafood products only.
The previous grocery/store catalog is no longer part of the application.

## Current Categories

| Category | Category ID | Products |
|---|---:|---:|
| Goat | 11 | 12 |
| Chicken | 12 | 9 |
| Lamb | 13 | 1 |
| Seafood | 14 | 1 |
| **Total** | | **23** |

## Removed Categories

The following previous grocery categories were removed:

- Vegetables
- Fruits
- Dairy
- Grains
- Spices
- Snacks
- Leaves
- Pickle Items
- Karam Powders
- Grocery

Before removal, these categories contained no order items,
invoice items, or inventory records.

## Product Source

The current meat catalog was imported from:

`dataset/products.xlsx`

The spreadsheet contains the meat products, categories, prices,
stock values, and product codes.

## Product Identification

Products have:

- `id` — database primary key
- `product_code` — business/product code
- `name` — product name
- `slug` — URL/search-friendly identifier
- `category_id` — product category

Product codes are unique when present.

Examples:

- `GOA-MIX-001`
- `CHK-WHL-001`
- `LMB-LEG-001`
- `FSH-TIL-001`

## Current Product Categories

### Goat

12 products.

### Chicken

9 products.

### Lamb

1 product.

### Seafood

1 product.

## Important Maintenance Rule

This is a meat-delivery application. Do not add unrelated grocery
products to the production catalog unless the application scope
is intentionally changed.

---

## Database Schema Note

The current `products` table uses:

- `id`
- `name`

Some older SQL files use:

- `product_id`
- `product_name`

Those older references must not be assumed to match the current
schema. Verify them before modifying or executing the scripts.

