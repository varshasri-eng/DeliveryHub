# Product Search

## Overview

Product search uses PostgreSQL search terms together with fuzzy
matching.

Search terms are stored in:

`search_terms`

Each search term contains:

- `product_id`
- `search_term`
- `term_type`
- `language`

## Search Term Types

The current search implementation defines these ranking types:

1. `official`
2. `alias`
3. `regional`
4. `hashtag`
5. `typo`

Lower ranking number means higher search priority.

## Search Behavior

The search function uses PostgreSQL trigram similarity and also
supports substring matching.

The function returns up to 5 results.

Searches are logged in:

`search_logs`

## Current State

The previous grocery search terms were removed when the old
grocery catalog was removed.

The current 23 meat products therefore require a new meat-specific
search-term dataset.

## Multilingual Search

The product catalog supports:

- English
- Telugu
- Hindi
- Tamil

Search terms may contain:

- official English product names
- common aliases
- regional names
- common customer spellings
- useful typos
- optional hashtags

## Maintenance

Search terms must correspond to the actual product.

Do not assign a generic meat term to every product when the term
only applies to a specific cut or product.

For example, terms for goat leg should be relevant to goat leg,
while terms for chicken breast should be relevant to chicken breast.

## Schema Warning

The current products table uses:

`products.id`

and:

`products.name`

Older versions of the search SQL refer to:

`products.product_id`

and:

`products.product_name`

The search function must be reconciled with the current schema
before relying on it in production.

