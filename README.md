# Meridian — Live analytics

Standalone e-commerce analytics study. The fixed September 9–15, 2026 dataset is illustrative. Gemini 3.8 Live uses a server-issued one-use token; no permanent key is sent to the browser. Set `GEMINI_API_KEY` in ignored `.dev.vars` locally and as a Sites secret for hosting.

## Interaction study

One shared `show_analytics` capability drives voice tool calls, deterministic offline text intents, and experimental on-page WebMCP. Browsers with `navigator.modelContext.registerTool` or `document.modelContext.registerTool` register it automatically. Other browsers retain the exact same page capability through voice and UI; they do not claim WebMCP registration.

- Every data request replaces the primary widget: number, chart, table, customers, or an availability explanation.
- Follow-up settings can inherit metric/date context, but never append panels.
- Typed requests render immediately; voice calls use the same tool with transcript fallback at turn completion.

Suggested study: total sales → traffic line chart → daily detail table → top users → average order value. Each answer replaces the primary widget. Reduced-motion preferences suppress transitions.

Top customers are ranked by demo-week spend. Traffic means sessions; conversion is orders / sessions. Only sales includes a previous-week baseline. No causal explanations are invented. Offline typed exploration supports these intents; open-ended spoken interpretation requires a successful Gemini Live session.

## Validation

`node --experimental-strip-types scripts/check-analytics.mjs`, `npx tsc --noEmit`, and `npm run build`.

## Dynamic charts

The screen tool accepts `metrics` (up to two of sales, traffic, orders, conversion, aov, growth), `kind` (area, line, bar), `start` and `end` (September day numbers 9–15), and `previous` (sales baseline). `update` inherits current settings; `replace` starts a new topic. Both replace the primary visual. `display` selects number, chart, or table. Unsupported data uses `notice` in the primary widget. Tool results and visible totals are recomputed for selected dates.

Supported charts: area, line, vertical bar, horizontal bar, stacked bar, pie, donut, scatter, funnel, heatmap, histogram and radar. Categories use consistent illustrative allocations of actual demo sales totals. Funnel cart/checkout stages are illustrative estimates; sessions/orders remain dataset-backed. Histograms count daily metric values, not individual transactions.

New requests can supply validated synthetic data through the shared show_analytics tool. Live voice generates requested dimensions, metrics, and periods; text mode has a deterministic local generator. Generated answers retain values on chart-only follow-ups. The UI keeps its Demo data label, without dataset-unavailable messages.
