# decisionos — Portfolio foundation

Start with `design-system.html`: a living reference for the five-tone palette, strong typography, layout, elements and restrained motion. `index.html` is the initial portfolio landing page using that system.

## Local preview

Requires Node.js 18 or newer; no dependency installation is needed.

```sh
npm run build
npm run dev
```

Open `http://127.0.0.1:4173/design-system.html` for the design system or `http://127.0.0.1:4173/` for the landing page. Re-run the build after source changes, then refresh.

## Structure

- `assets/styles.css` — shared design tokens and responsive components
- `assets/motion.js` — optional, reduced-motion-aware desktop pointer response
- `docs/DESIGN_SYSTEM.md` — durable design rules and content direction
- `archive/chatpm/` — original application and deployment files, preserved unchanged
- `scripts/` — dependency-free static build and local preview

The build copies only the two portfolio pages and their assets into `dist/`. The archive is excluded. Production uses the existing Google Cloud Run service; no Sites integration is configured. Existing ChatPM deployment scripts now live in the archive and should be run there only if intentionally restoring the old application.

## Production deployment

The existing Cloud Build trigger `fffac18f-e3de-491f-b7ce-e720daca5705` watches `main` in this repository and builds the root Dockerfile. It deploys to service `chatpm`, project `striking-loop-447915-q3`, region `europe-west1`, mapped to `decisionos.me`.

The container serves only `dist/`, listens on Cloud Run's `PORT`, and exposes `/health`. The old application stays in `archive/chatpm` and is excluded from the image.

A specific validated commit can also be deployed through the existing trigger:

```sh
gcloud builds triggers run fffac18f-e3de-491f-b7ce-e720daca5705 --project=striking-loop-447915-q3 --region=global --sha=COMMIT_SHA
```

Wait for the build and rollout to succeed, then verify the public domain. A manual branch deployment does not change which branch the automatic trigger watches.

## Our work and case studies

`case-studies.html` is the expandable project index. Case studies live in `projects/commerce.html`, `projects/paralegal.html`, and `projects/employee.html`; their local scripted interactions use `assets/concepts.js`. Each page separates draft hypotheses from eventual research evidence and outcomes. Add a new case-study page and link it from the work index as more projects are supplied. The build versions CSS and JavaScript URLs to avoid stale layouts after publication.

## Berlin Combat

The case study keeps its static character image. The executable game, model files, audio, build dependencies, and runtime have been removed from this site. Former game URLs return HTTP 410. The original separate game project is unaffected.

## Search and sharing

The build uses `scripts/seo-pages.json` to generate canonical URLs, unique descriptions, Open Graph/Twitter tags, Article/CollectionPage structured data, breadcrumbs, `sitemap.xml`, `robots.txt`, and `llms.txt`. Add new case studies to this registry. `/work.html` redirects permanently to `/case-studies.html`; `/llm.txt` redirects to `/llms.txt`. The design-system reference is marked noindex. Archived source is never served.

Hashed scripts and styles use immutable caching. Text responses support gzip. `llms.txt` is an informational guide, not an indexing guarantee. Search Console ownership verification and sitemap submission are separate account actions and have not been performed.

## Current published case studies

The case-study index publishes three articles: Loop (`projects/commerce.html`), Shelf to Sell (`projects/shelf-to-sell.html`), and Surface (`projects/surface.html`). Each links to its public demo. Surface includes the author-supplied 2002 Amazon screenshot and three mobile screenshots of results, a selected product, and reviews. Demo screens were selected through the catalog tools; these screenshots do not represent recorded voice sessions.

`build.mjs` publishes only project pages listed in `scripts/seo-pages.json`. Other case-study source pages are retained but excluded from the deployed site, sitemap, and index. To restore one, add it to that registry and the visible project list.

## Contact enquiries

All published Contact Us links lead to `/#contact`. The form has three required visible fields: name, email, and message. It posts directly over HTTPS to FormSubmit for delivery to `aditya@decisionos.me`; a one-time email activation is required. FormSubmit's default reCAPTCHA remains enabled, a hidden honeypot helps filter bots, and the subject is `New enquiry from decisionos.me`. The `email` field supplies Reply-To. Successful submissions redirect to `/thanks.html`, which is marked noindex. No email API credentials are stored in this repository.
