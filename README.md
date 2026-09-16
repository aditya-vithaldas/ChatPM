# Portfolio and presentation

This repository contains the current portfolio homepage, case studies, service pages, and the Toptal presentation.

Run `npm run build` to generate the static site. Run `npm run dev` to preview it locally.

The root Dockerfile packages the current site and presentation together. Publish from the main branch after checking the homepage, case studies, presentation, and referenced assets. Do not publish an older checkout or the archived application as the current site.

The presentation is available at `/toptal-application.html`; `/toptal-application` redirects to it. The original application remains under `archive/` for reference and is excluded from the production build.

Published pages are registered in `scripts/seo-pages.json`. The build generates page metadata, structured data, a sitemap, and crawler guidance. Contact submissions use the existing configured form provider.

## Analytics

The standalone Meridian demo is served at `/analytics` and its case study at `/projects/analytics.html`. The static bundle under `analytics/` is built from the sibling `meridian-analytics` project using `npx vite build --config vite.portfolio.config.ts`. Copy its `dist-portfolio/` output here before rebuilding the portfolio. Live sessions use the same-origin `/analytics/api/gemini` endpoint; `GEMINI_API_KEY` is a runtime secret and is never bundled. The browser demo does not join meeting calls; the article describes that as a product direction.
