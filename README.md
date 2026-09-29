# Portfolio and presentation

This repository contains the current portfolio homepage, case studies, service pages, and the Toptal presentation.

Run `npm run build` to generate the static site. Run `npm run dev` to preview it locally.

The root Dockerfile packages the current site and presentation together. Publish from the main branch after checking the homepage, case studies, presentation, and referenced assets. Do not publish an older checkout or the archived application as the current site.

The presentation is available at `/toptal-application.html`; `/toptal-application` redirects to it. The original application remains under `archive/` for reference and is excluded from the production build.

Published pages are registered in `scripts/seo-pages.json`. The build generates page metadata, structured data, a sitemap, and crawler guidance. Contact submissions use the existing configured form provider.

## Meridian

Meridian is maintained in this repository under `products/meridian` and served at `/analytics`; its case study remains at `/projects/analytics.html`. `npm run build` now installs the pinned Meridian dependencies, builds the application, and places the generated bundle into `/analytics` before assembling the Decision OS site. Do not edit or commit the generated `/analytics` directory. The DuckDB query service and reproducible demo-data generator live under `products/meridian/server` and deploy separately from the website.
