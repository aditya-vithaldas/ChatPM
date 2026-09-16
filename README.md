# Meridian — Live analytics

Standalone e-commerce analytics study. The fixed September 9–15, 2026 dataset is illustrative. Gemini 3.8 Live uses a server-issued one-use token; no permanent key is sent to the browser. Set `GEMINI_API_KEY` in ignored `.dev.vars` locally and as a Sites secret for hosting.

## Interaction study

One shared `show_analytics` capability drives voice tool calls, deterministic offline text intents, and experimental on-page WebMCP. Browsers with `navigator.modelContext.registerTool` or `document.modelContext.registerTool` register it automatically. Other browsers retain the exact same page capability through voice and UI; they do not claim WebMCP registration.

- `replace`: select sales, traffic, customers, or sample questions; clear prior details.
- `append`: retain the current topic and chart; add deduplicated daily, comparison, conversion, or breakdown information.
- Invalid arguments or cross-topic append requests return errors without altering the screen.

Suggested study: show sales → ask for more detail → compare previous week → switch to traffic → ask for conversion → switch to top users. Observe whether context preservation makes follow-ups easier to interpret. Sales charts remain mounted during detail additions. New topics animate in. Reduced-motion preferences suppress motion.

Top customers are ranked by demo-week spend. Traffic means sessions; conversion is orders / sessions. Only sales includes a previous-week baseline. No causal explanations are invented. Offline typed exploration supports these intents; open-ended spoken interpretation requires a successful Gemini Live session.

## Validation

`node --experimental-strip-types scripts/check-analytics.mjs`, `npx tsc --noEmit`, and `npm run build`.

## Dynamic charts

The screen tool accepts `metrics` (up to two of sales, traffic, orders, conversion, aov, growth), `kind` (area, line, bar), `start` and `end` (September day numbers 9–15), and `previous` (sales baseline). `update` changes the current graph without clearing supporting details. `replace` starts a new topic; `append` keeps the graph and adds supporting data. Tool results and visible totals are recomputed for the selected range. Comparisons use separately labeled axes. The text parser supports the same bounded requests without a live session. Unsupported metrics or dates return an explanation and preserve the current chart.
