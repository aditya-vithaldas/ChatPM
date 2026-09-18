# Grounding controls

The query gateway runs two separate model calls in parallel. The first proposes a presentation and investigation choices. The second sees the user question, context, schema and principles, but **not the first draft**, and produces a constrained metric contract. Both calls read principles.md. Model agreement alone is not treated as proof.

The gateway does not execute the first model's SQL. A deterministic compiler creates the executable query using allowlisted metrics, dimensions, joins, filters and dates. SQL identifiers never come from free-form model text. Filter values are quoted. Existing private DuckDB read-only, timeout and external-access restrictions remain in force.

## Definitions enforced in code

- Revenue: completed order net amount by default; product/category splits use line-item net amounts to avoid repeating order totals.
- Orders: distinct order IDs; order items: line-item rows; units: summed quantities.
- Traffic: session count. Conversion: sessions linked to orders / all sessions, with an explicit status definition.
- AOV: net revenue / order count; customers: distinct purchasing customers within the requested period, not the registered customer population.
- Named dimensions include category/product/customer/region/segment/channel and, for sessions, source/device. Time buckets use the correct fact date.

Unsupported operations, fields, or metric/dimension combinations stop with a low-confidence message. They are never silently converted into a different aggregation. Initial coverage does not include arbitrary SQL, median/min/max analysis, retention or unsupported country fields. This is an explicit validation boundary, not an unlimited analytics guarantee.

## Result checks

Each query also runs an ungrouped control total with the same scope. Complete additive breakdowns must sum to that total; top-N subsets must not exceed it. Values must be finite and nonnegative; conversion must be within 0–100%. Rates without observations are rejected. Non-additive metrics are shown as tables when categorical compaction would otherwise combine more than five group rates or distinct counts incorrectly.

The selected prior answer is compared when canonical metric/scope keys match. A changed dataset version is identified rather than called a contradictory same-dataset value. Short explanations are calculated from returned numbers. Model-generated continuity narratives are not reused as evidence. Contributions are not claimed to prove causation.

Uploads use two independent constrained query plans. Exact table/column, metric, aggregation, unit, grouping and filter contracts must agree. Local sum/count breakdowns are reconciled with a separately grouped control calculation. Source rows remain in the browser. This verifies the computation contract; it cannot certify source-data quality or deduplicate overlapping user files automatically.

## Limits and operation

Intent interpretation still uses an LLM and can be mistaken. These checks prevent many arithmetic/grain/join errors; they do not mathematically prove that an interpretation matches the user's intent or establish real-world causation. `Data checks passed` indicates the listed checks, not certainty.

The existing five-question page history supplies continuity. No history from unrelated browser sessions is claimed. Failed checks retain the previous chart and surface a low-confidence status. Timing separates planning, independent validation, SQL and reconciliation.

The dedicated query gateway and Sites interface version 13 were published with owner approval on September 18, 2026. DuckDB remains private behind the gateway. The 10-million-row dataset is live; the homepage and other subtrees were not redeployed.

Validation: `node scripts/check-grounding.mjs`, `node scripts/check-principles.mjs`, `node scripts/check-analytics.mjs`, `node scripts/check-uploads.mjs`, TypeScript and the Sites build. SQL compiler tests execute real DuckDB fixtures for counts versus quantities, fan-out, comparisons, AOV, conversion, safe filters, rejected definitions, and tampered totals.
