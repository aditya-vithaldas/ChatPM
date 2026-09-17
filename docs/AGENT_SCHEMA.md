# Agent query instructions

Read `demo-schema.json` (or the backend `/schema`) before composing SQL. It gives every column, type, table row count, relationship and business definition. The database is synthetic 2025 e-commerce data, not customer production data.

## Request flow

1. Read the schema and `rules` array.
2. Choose tables at the correct grain and apply date/status filters.
3. Generate one read-only DuckDB SELECT or CTE. Use explicit quoted aliases `AS "label"`, `AS "value"`, and optionally `AS "secondary"`.
4. Call the query service. Only returned values may be described.
5. Replace the primary widget. Prefer time series when dates are meaningful; use a scalar for one requested date.

Never sum order totals after joining order items: that triples revenue. Category/product revenue uses line-item `net_amount`, joined to completed orders. Payment amount includes tax and shipping and is not sales revenue. Relative dates anchor on December 31, 2025. Do not fabricate missing fields, query system tables, read files, load extensions, or alter the database.

## Example

```sql
SELECT order_date::VARCHAR AS "label", SUM(net_amount)::DOUBLE AS "value"
FROM orders
WHERE status = 'completed'
  AND order_date BETWEEN DATE '2025-12-25' AND DATE '2025-12-31'
GROUP BY order_date
ORDER BY order_date
```

## Upload mode

User files are separate from the demo database. The model receives file/sheet schemas and returns a constrained grouping/filter/aggregation plan. All selected rows are evaluated locally. Never fill missing uploaded fields with demo or invented data. The 10 MB total limit applies to user-selected source files; no row sampling or silent truncation is used.

## Display names
Use `categories.category_name`, `products.product_name`, and `customers.customer_name` in displayed results. These are fictional retail categories, branded products and person names. Group by both ID and name for entity rankings because display names can repeat. Do not display raw IDs as category or product labels. The schema JSON includes the exact category catalog for natural-language filtering.
