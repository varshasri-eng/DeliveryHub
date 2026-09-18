"""
Generate backend/app/utils/catalog_data.py from dataset/products.xlsx.

IMPORTANT:
This catalog is intentionally limited to:

    Meat
        Goat
        Chicken
        Lamb

    Seafood
        Seafood

No old grocery/vegetable/fruit/dairy/etc. catalog is retained.

Source:
    dataset/products.xlsx

Expected products sheet columns:
    name
    category
    description
    price
    stock_quantity
    diet
    sku

The generated catalog is consumed by:
    backend/app/utils/seed.py
    backend/app/utils/bootstrap.py
"""

from pathlib import Path
import re
import openpyxl


BASE_DIR = Path(__file__).resolve().parent
DATASET_FILE = BASE_DIR / "products.xlsx"

# When running this file from:
#   /var/www/meat-delivery/dataset/generate_catalog_data.py
# BASE_DIR above resolves to the project root.
#
# If your products.xlsx is somewhere else, change this path only.


OUTPUT_FILE = (
    Path(__file__).resolve().parents[1]
    / "backend"
    / "app"
    / "utils"
    / "catalog_data.py"
)


# ---------------------------------------------------------------------------
# CATALOG
# ---------------------------------------------------------------------------

CATALOG = [
    {"category": "Goat", "slug": "goat", "display_order": 1},
    {"category": "Chicken", "slug": "chicken", "display_order": 2},
    {"category": "Lamb", "slug": "lamb", "display_order": 3},
    {"category": "Seafood", "slug": "seafood", "display_order": 4},
]


# ---------------------------------------------------------------------------
# CATEGORY NORMALIZATION
# ---------------------------------------------------------------------------

CATEGORY_MAP = {
    "Goat": "Goat",
    "Chicken": "Chicken",
    "Lamb": "Lamb",
    "Fish": "Seafood",
    "Seafood": "Seafood",
}


# ---------------------------------------------------------------------------
# PRODUCT METADATA
# ---------------------------------------------------------------------------

PRODUCT_META = {
    "Goat Mixed Cut": {
        "emoji": "🥩",
        "unit": "lb",
        "diet": "nonveg",
    },
    "Goat Leg": {
        "emoji": "🥩",
        "unit": "lb",
        "diet": "nonveg",
    },
    "Goat Shoulder": {
        "emoji": "🥩",
        "unit": "lb",
        "diet": "nonveg",
    },
    "Goat Chops": {
        "emoji": "🥩",
        "unit": "lb",
        "diet": "nonveg",
    },
    "Goat Kheema": {
        "emoji": "🥩",
        "unit": "lb",
        "diet": "nonveg",
    },
    "Goat Boneless": {
        "emoji": "🥩",
        "unit": "lb",
        "diet": "nonveg",
    },
    "Goat Paya (Burnt & Cut)": {
        "emoji": "🥩",
        "unit": "lb",
        "diet": "nonveg",
    },
    "Goat Kidney": {
        "emoji": "🥩",
        "unit": "lb",
        "diet": "nonveg",
    },
    "Goat Liver": {
        "emoji": "🥩",
        "unit": "lb",
        "diet": "nonveg",
    },
    "Goat Head": {
        "emoji": "🥩",
        "unit": "lb",
        "diet": "nonveg",
    },
    "Goat Intestine / Boti": {
        "emoji": "🥩",
        "unit": "lb",
        "diet": "nonveg",
    },
    "Goat Stomach": {
        "emoji": "🥩",
        "unit": "lb",
        "diet": "nonveg",
    },

    "Whole Chicken (Skinless, Clean & Cut)": {
        "emoji": "🍗",
        "unit": "bird",
        "diet": "nonveg",
    },
    "Organic Chicken (Skinless, Clean & Cut)": {
        "emoji": "🍗",
        "unit": "bird",
        "diet": "nonveg",
    },
    "Country Chicken (Natu Kodi)": {
        "emoji": "🍗",
        "unit": "bird",
        "diet": "nonveg",
    },
    "Country Chicken (Natu Kodi) — Cut, Turmeric & Burn": {
        "emoji": "🍗",
        "unit": "bird",
        "diet": "nonveg",
    },
    "Chicken Kheema": {
        "emoji": "🍗",
        "unit": "lb",
        "diet": "nonveg",
    },
    "Chicken Leg Quarters (Skinless & Cut)": {
        "emoji": "🍗",
        "unit": "lb",
        "diet": "nonveg",
    },
    "Boneless Chicken Breasts": {
        "emoji": "🍗",
        "unit": "lb",
        "diet": "nonveg",
    },
    "Boneless Chicken Thighs": {
        "emoji": "🍗",
        "unit": "lb",
        "diet": "nonveg",
    },
    "Chicken Liver": {
        "emoji": "🍗",
        "unit": "lb",
        "diet": "nonveg",
    },

    "Lamb Leg/Shoulder": {
        "emoji": "🥩",
        "unit": "lb",
        "diet": "nonveg",
    },

    "Whole Tilapia (Frozen, Cleaned & Gutted)": {
        "emoji": "🐟",
        "unit": "fish",
        "diet": "nonveg",
    },
}


# ---------------------------------------------------------------------------
# SEARCH TERMS
# ---------------------------------------------------------------------------

SEARCH_TERMS = [
    # Goat
    ("Goat Mixed Cut", "goat mixed cut", "official", "None"),
    ("Goat Mixed Cut", "goat", "alias", "English"),
    ("Goat Mixed Cut", "mutton mixed cut", "alias", "English"),
    ("Goat Mixed Cut", "goat curry cut", "alias", "English"),
    ("Goat Mixed Cut", "goat meat", "alias", "English"),
    ("Goat Mixed Cut", "meka mamsam", "regional", "Telugu"),
    ("Goat Mixed Cut", "aadu mamsam", "regional", "Tamil"),
    ("Goat Mixed Cut", "bakra", "regional", "Hindi"),

    ("Goat Leg", "goat leg", "official", "None"),
    ("Goat Leg", "mutton leg", "alias", "English"),
    ("Goat Leg", "goat raan", "alias", "English"),
    ("Goat Leg", "meka kaalu", "regional", "Telugu"),
    ("Goat Leg", "aadu kaal", "regional", "Tamil"),
    ("Goat Leg", "bakre ki raan", "regional", "Hindi"),

    ("Goat Shoulder", "goat shoulder", "official", "None"),
    ("Goat Shoulder", "mutton shoulder", "alias", "English"),
    ("Goat Shoulder", "meka bhujam", "regional", "Telugu"),
    ("Goat Shoulder", "aadu thol", "regional", "Tamil"),

    ("Goat Chops", "goat chops", "official", "None"),
    ("Goat Chops", "mutton chops", "alias", "English"),
    ("Goat Chops", "goat ribs", "alias", "English"),
    ("Goat Chops", "meka chops", "regional", "Telugu"),

    ("Goat Kheema", "goat kheema", "official", "None"),
    ("Goat Kheema", "mutton kheema", "alias", "English"),
    ("Goat Kheema", "keema", "alias", "English"),
    ("Goat Kheema", "meka keema", "regional", "Telugu"),
    ("Goat Kheema", "bakra keema", "regional", "Hindi"),

    ("Goat Boneless", "goat boneless", "official", "None"),
    ("Goat Boneless", "boneless mutton", "alias", "English"),
    ("Goat Boneless", "boneless goat", "alias", "English"),
    ("Goat Boneless", "meka boneless", "regional", "Telugu"),

    ("Goat Paya (Burnt & Cut)", "goat paya", "official", "None"),
    ("Goat Paya (Burnt & Cut)", "mutton paya", "alias", "English"),
    ("Goat Paya (Burnt & Cut)", "paya", "alias", "English"),
    ("Goat Paya (Burnt & Cut)", "meka paya", "regional", "Telugu"),
    ("Goat Paya (Burnt & Cut)", "bakra paya", "regional", "Hindi"),

    ("Goat Kidney", "goat kidney", "official", "None"),
    ("Goat Kidney", "mutton kidney", "alias", "English"),
    ("Goat Kidney", "meka kidney", "regional", "Telugu"),

    ("Goat Liver", "goat liver", "official", "None"),
    ("Goat Liver", "mutton liver", "alias", "English"),
    ("Goat Liver", "kaleji", "regional", "Hindi"),
    ("Goat Liver", "meka liver", "regional", "Telugu"),

    ("Goat Head", "goat head", "official", "None"),
    ("Goat Head", "mutton head", "alias", "English"),
    ("Goat Head", "tala mamsam", "regional", "Telugu"),
    ("Goat Head", "bakra head", "regional", "Hindi"),

    ("Goat Intestine / Boti", "goat intestine", "official", "None"),
    ("Goat Intestine / Boti", "goat boti", "alias", "English"),
    ("Goat Intestine / Boti", "boti", "alias", "English"),
    ("Goat Intestine / Boti", "meka boti", "regional", "Telugu"),

    ("Goat Stomach", "goat stomach", "official", "None"),
    ("Goat Stomach", "mutton stomach", "alias", "English"),
    ("Goat Stomach", "meka stomach", "regional", "Telugu"),

    # Chicken
    (
        "Whole Chicken (Skinless, Clean & Cut)",
        "whole chicken",
        "official",
        "None",
    ),
    (
        "Whole Chicken (Skinless, Clean & Cut)",
        "skinless chicken",
        "alias",
        "English",
    ),
    (
        "Whole Chicken (Skinless, Clean & Cut)",
        "cleaned chicken",
        "alias",
        "English",
    ),
    (
        "Whole Chicken (Skinless, Clean & Cut)",
        "kodi",
        "regional",
        "Telugu",
    ),
    (
        "Whole Chicken (Skinless, Clean & Cut)",
        "murgi",
        "regional",
        "Hindi",
    ),

    (
        "Organic Chicken (Skinless, Clean & Cut)",
        "organic chicken",
        "official",
        "None",
    ),
    (
        "Organic Chicken (Skinless, Clean & Cut)",
        "organic skinless chicken",
        "alias",
        "English",
    ),
    (
        "Organic Chicken (Skinless, Clean & Cut)",
        "organic kodi",
        "regional",
        "Telugu",
    ),

    (
        "Country Chicken (Natu Kodi)",
        "country chicken",
        "official",
        "None",
    ),
    (
        "Country Chicken (Natu Kodi)",
        "natu kodi",
        "regional",
        "Telugu",
    ),
    (
        "Country Chicken (Natu Kodi)",
        "country hen",
        "alias",
        "English",
    ),
    (
        "Country Chicken (Natu Kodi)",
        "desi chicken",
        "alias",
        "Hindi",
    ),

    (
        "Country Chicken (Natu Kodi) — Cut, Turmeric & Burn",
        "natu kodi cut",
        "official",
        "None",
    ),
    (
        "Country Chicken (Natu Kodi) — Cut, Turmeric & Burn",
        "burnt natu kodi",
        "alias",
        "English",
    ),
    (
        "Country Chicken (Natu Kodi) — Cut, Turmeric & Burn",
        "turmeric chicken",
        "alias",
        "English",
    ),
    (
        "Country Chicken (Natu Kodi) — Cut, Turmeric & Burn",
        "natu kodi kaalchina",
        "regional",
        "Telugu",
    ),

    ("Chicken Kheema", "chicken kheema", "official", "None"),
    ("Chicken Kheema", "chicken keema", "alias", "English"),
    ("Chicken Kheema", "minced chicken", "alias", "English"),
    ("Chicken Kheema", "chicken mince", "alias", "English"),
    ("Chicken Kheema", "chicken keema", "regional", "Hindi"),

    (
        "Chicken Leg Quarters (Skinless & Cut)",
        "chicken leg quarters",
        "official",
        "None",
    ),
    (
        "Chicken Leg Quarters (Skinless & Cut)",
        "skinless chicken legs",
        "alias",
        "English",
    ),
    (
        "Chicken Leg Quarters (Skinless & Cut)",
        "chicken legs",
        "alias",
        "English",
    ),
    (
        "Chicken Leg Quarters (Skinless & Cut)",
        "chicken leg pieces",
        "alias",
        "English",
    ),

    (
        "Boneless Chicken Breasts",
        "boneless chicken breast",
        "official",
        "None",
    ),
    (
        "Boneless Chicken Breasts",
        "chicken breast",
        "alias",
        "English",
    ),
    (
        "Boneless Chicken Breasts",
        "boneless breast",
        "alias",
        "English",
    ),
    (
        "Boneless Chicken Breasts",
        "chicken breast pieces",
        "alias",
        "English",
    ),

    (
        "Boneless Chicken Thighs",
        "boneless chicken thighs",
        "official",
        "None",
    ),
    (
        "Boneless Chicken Thighs",
        "chicken thighs",
        "alias",
        "English",
    ),
    (
        "Boneless Chicken Thighs",
        "boneless thighs",
        "alias",
        "English",
    ),

    ("Chicken Liver", "chicken liver", "official", "None"),
    ("Chicken Liver", "chicken kaleji", "alias", "English"),
    ("Chicken Liver", "kaleji", "regional", "Hindi"),
    ("Chicken Liver", "kodi liver", "regional", "Telugu"),

    # Lamb
    ("Lamb Leg/Shoulder", "lamb", "official", "None"),
    ("Lamb Leg/Shoulder", "lamb leg", "alias", "English"),
    ("Lamb Leg/Shoulder", "lamb shoulder", "alias", "English"),
    ("Lamb Leg/Shoulder", "mutton", "alias", "English"),
    ("Lamb Leg/Shoulder", "lamb meat", "alias", "English"),

    # Seafood
    (
        "Whole Tilapia (Frozen, Cleaned & Gutted)",
        "tilapia",
        "official",
        "None",
    ),
    (
        "Whole Tilapia (Frozen, Cleaned & Gutted)",
        "whole tilapia",
        "alias",
        "English",
    ),
    (
        "Whole Tilapia (Frozen, Cleaned & Gutted)",
        "frozen tilapia",
        "alias",
        "English",
    ),
    (
        "Whole Tilapia (Frozen, Cleaned & Gutted)",
        "cleaned tilapia",
        "alias",
        "English",
    ),
    (
        "Whole Tilapia (Frozen, Cleaned & Gutted)",
        "fish",
        "alias",
        "English",
    ),
    (
        "Whole Tilapia (Frozen, Cleaned & Gutted)",
        "chepa",
        "regional",
        "Telugu",
    ),
]


# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------

def slugify(value):
    value = str(value).strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def clean(value):
    if value is None:
        return ""
    return str(value).strip()


def load_products():
    """
    Read only the products sheet.

    T
he spreadsheet currently contains 23 products:
        12 Goat
         9 Chicken
         1 Lamb
         1 seafood/Tilapia
    """

    if not DATASET_FILE.exists():
        raise FileNotFoundError(
            f"Dataset not found: {DATASET_FILE}"
        )

    wb = openpyxl.load_workbook(
        DATASET_FILE,
        data_only=True,
    )

    if "products" not in wb.sheetnames:
        raise RuntimeError(
            "products.xlsx does not contain a 'products' sheet."
        )

    ws = wb["products"]

    products = []

    for row in ws.iter_rows(min_row=2, values_only=True):
        if not row:
            continue

        name = clean(row[0])

        if not name:
            continue

        source_category = clean(row[1])

        if source_category not in CATEGORY_MAP:
            raise ValueError(
                f"Unsupported product category: "
                f"{source_category!r} for product {name!r}"
            )

        category = CATEGORY_MAP[source_category]

        description = clean(row[2])

        try:
            price = float(row[3])
        except (TypeError, ValueError):
            raise ValueError(
                f"Invalid price for {name!r}: {row[3]!r}"
            )

        meta = PRODUCT_META.get(
            name,
            {
                "emoji": "🥩" if category == "Meat" else "🐟",
                "unit": "lb",
                "diet": "nonveg",
            },
        )

        products.append(
            (
                name,
                category,
                meta["emoji"],
                price,
                meta["unit"],
                meta["diet"],
                description,
            )
        )

    return products


# ---------------------------------------------------------------------------
# VALIDATION
# ---------------------------------------------------------------------------

def validate_products(products):
    expected_names = {
        "Goat Mixed Cut",
        "Goat Leg",
        "Goat Shoulder",
        "Goat Chops",
        "Goat Kheema",
        "Goat Boneless",
        "Goat Paya (Burnt & Cut)",
        "Goat Kidney",
        "Goat Liver",
        "Goat Head",
        "Goat Intestine / Boti",
        "Goat Stomach",
        "Whole Chicken (Skinless, Clean & Cut)",
        "Organic Chicken (Skinless, Clean & Cut)",
        "Country Chicken (Natu Kodi)",
        "Country Chicken (Natu Kodi) — Cut, Turmeric & Burn",
        "Chicken Kheema",
        "Chicken Leg Quarters (Skinless & Cut)",
        "Boneless Chicken Breasts",
        "Boneless Chicken Thighs",
        "Chicken Liver",
        "Lamb Leg/Shoulder",
        "Whole Tilapia (Frozen, Cleaned & Gutted)",
    }

    actual_names = {p[0] for p in products}

    if actual_names != expected_names:
        missing = sorted(expected_names - actual_names)
        extra = sorted(actual_names - expected_names)

        raise RuntimeError(
            "Product validation failed.\n"
            f"Missing products: {missing}\n"
            f"Unexpected products: {extra}"
        )

    if len(products) != 23:
        raise RuntimeError(
            f"Expected exactly 23 products, got {len(products)}"
        )

    category_counts = {}

    for product in products:
        category_counts[product[1]] = (
            category_counts.get(product[1], 0) + 1
        )

    expected_counts = {
        "Goat": 12,
        "Chicken": 9,
        "Lamb": 1,
        "Seafood": 1,
    }

    if category_counts != expected_counts:
        raise RuntimeError(
            "Category count validation failed.\n"
            f"Expected: {expected_counts}\n"
            f"Actual: {category_counts}"
        )


# ---------------------------------------------------------------------------
# WRITE catalog_data.py
# ---------------------------------------------------------------------------

def python_repr(value):
    return repr(value)


def generate_file(products):
    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    lines = []

    lines.append(
        '"""Auto-generated catalog data from dataset/products.xlsx.'
    )
    lines.append("")
    lines.append("ONLY MEAT AND SEAFOOD PRODUCTS ARE INCLUDED.")
    lines.append("")
    lines.append(
        "Do not edit by hand — regenerate with "
        "dataset/generate_catalog_data.py."
    )
    lines.append('"""')
    lines.append("")
    lines.append("")
    lines.append("CATALOG = [")
    lines.append(
        '    {"category": "Goat", "slug": "goat", "display_order": 1},'
    )
    lines.append(
        '    {"category": "Chicken", "slug": "chicken", "display_order": 2},'
    )
    lines.append(
        '    {"category": "Lamb", "slug": "lamb", "display_order": 3},'
    )
    lines.append(
        '    {"category": "Seafood", "slug": "seafood", "display_order": 4},'
    )
    lines.append("]")
    lines.append("")
    lines.append("")
    lines.append("PRODUCTS = [")

    for product in products:
        name, category, emoji, price, unit, diet, description = product

        lines.append(
            "    "
            + repr(
                (
                    name,
                    category,
                    emoji,
                    price,
                    unit,
                    diet,
                    description,
                )
            )
            + ","
        )

    lines.append("]")
    lines.append("")
    lines.append("")
    lines.append("SEARCH_TERMS = [")

    for term in SEARCH_TERMS:
        lines.append("    " + repr(term) + ",")

    lines.append("]")
    lines.append("")

    OUTPUT_FILE.write_text(
        "\n".join(lines),
        encoding="utf-8",
    )


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main():
    print(f"Reading: {DATASET_FILE}")

    products = load_products()

    print(f"Loaded products: {len(products)}")

    validate_products(products)

    print("Validation passed.")
    print()
    print("Categories:")
    print("  Meat     :", sum(1 for p in products if p[1] == "Meat"))
    print("  Seafood  :", sum(1 for p in products if p[1] == "Seafood"))
    print()

    generate_file(products)

    print(f"Generated: {OUTPUT_FILE}")
    print(f"Search terms: {len(SEARCH_TERMS)}")
    print()
    print("CATALOG:")
    for category in CATALOG:
        print(
            f"  {category['display_order']}. "
            f"{category['category']} "
            f"({category['slug']})"
        )

    print()
    print("Products:")
    for name, category, emoji, price, unit, diet, description in products:
        print(
            f"  {category:8} | "
            f"{name} | "
            f"${price:.2f} / {unit}"
        )


if __name__ == "__main__":
    main()
