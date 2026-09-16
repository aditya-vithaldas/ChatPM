# Search and AI discovery update — 2026-09-14

## What changed

Four substantive service pages now support the homepage: eCommerce product consulting, AI-first experiences, executive product direction (including fractional product leadership), and full-stack product building. Each explains the customer problem, scope, working approach, a relevant question, concept examples and a contact route. Homepage service links and related-service links make the pages discoverable without JavaScript.

Unique titles/descriptions, canonical URLs, social metadata, sitemap entries and Service/Breadcrumb structured data are generated at build time. Person and WebSite entities connect Aditya Vithaldas, decisionos and the services. Articles have visible author attribution matching their schema. Existing published concepts and contact handling are preserved.

The existing llms.txt summary is kept consistent with the website. It is supplementary documentation, not a ranking mechanism. No claim is made that special AI files, schema, or these edits guarantee rankings or citations. The implementation prioritizes accessible HTML, useful original content, clear entities and internal links, consistent with [Google’s AI search guidance](https://developers.google.com/search/docs/appearance/ai-features).

## Traffic evidence and limits

Source: latest 10,000 GET request logs for Cloud Run service chatpm, queried with a 30-day lookback. The result hit the limit, so the actual sample spans 2026-08-30 03:18 UTC through 2026-09-13 23:23 UTC. It is not a complete 30-day report. All sampled request URLs use decisionos.me. Cloudflare caching can exclude edge-served visits from origin logs.

| Existing page | HTTP 200 requests in sample |
|---|---:|
| Homepage | 460 |
| Case studies | 32 |
| eCommerce Discovery | 26 |
| Surface | 11 |
| Shelf to Sell | 6 |

These are requests, not visitors, sessions or leads. Bot identity and referrers are unverified. The sample includes our own verification traffic and substantial automated scanning: 7,479 responses were 404 and 3,180 requests identified as curl. Of the 460 successful homepage requests, seven had a Google referrer and one had a DuckDuckGo referrer; this does not establish keyword demand. Requests also claimed Googlebot, bingbot and OAI-SearchBot identities.

The evidence supports making service discovery prominent on the homepage. It does not support choosing keywords by conversion, search volume or rank. The four service themes come from the owner’s explicit priorities. No analytics instrumentation or accessible Search Console connector was found. Search Console query/impression/click data is still needed for demand and ranking analysis; origin logs cannot substitute for it.

## Crawl checks

Before release, the homepage and robots.txt returned 200 to ordinary, Googlebot, bingbot and OAI-SearchBot user-agent probes. A PerplexityBot user-agent probe received 403 on the homepage and 200 for robots.txt. This is a synthetic request from the local network, not a verified crawler: Cloudflare can treat spoofed and verified bots differently. Genuine Perplexity access needs confirmation in Cloudflare security events/verified bot settings; do not disable protections based on this test alone.

The site robots.txt allows crawling and points to the sitemap. Historical logs include redirects and missing robots.txt responses from older revisions; current checks confirm it exists. Cloudflare is administered separately and its bot rules were not changed.

## Validation

- Production build succeeds; nine pages registered in sitemap.
- All registered pages have one H1, unique canonical, matching descriptions and valid JSON-LD. Service entities exist on all four new pages.
- Local asset/page links and fragment targets resolve across all registered pages.
- Thank-you page remains noindex; no form submission was triggered.
- Browser service navigation and desktop layout checked. Narrow viewport DOM check reports no horizontal overflow at an effective 433 CSS px; viewport screenshot capture was unreliable, so this is not a claim of exhaustive device testing.
- No third-party analytics script or cookie dependency added.

## Measurement follow-up

Use a verified Search Console property to submit https://decisionos.me/sitemap.xml and track impressions, clicks, queries and landing pages by service theme. Compare equivalent date windows after indexing; do not treat bot request counts as qualified traffic. Track enquiries separately when analytics is configured. Review Cloudflare security events for genuine search/AI crawler blocks. These account-level checks remain outside the currently available connections.

## Published release

Cloud Build `de2ea849-593d-4872-bd8e-21eecbac094d` succeeded. Cloud Run revision `chatpm-00112-42c` serves 100% of traffic using image digest `sha256:0ac9d5c26e14cd445526793b4dfa50ea60e88b3690bfe8e162739739873b2cfc`.

Post-deploy checks against https://decisionos.me verified HTTP 200, intended descriptions, canonical URLs and parsed structured data on all nine pages. robots.txt, sitemap.xml (nine entries), llms.txt and the noindex thank-you page also passed public checks.
