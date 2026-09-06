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

`work.html` is the expandable project index. Case studies live in `projects/commerce.html`, `projects/paralegal.html`, and `projects/employee.html`; their local scripted interactions use `assets/concepts.js`. Each page separates draft hypotheses from eventual research evidence and outcomes. Add a new case-study page and link it from the work index as more projects are supplied. The build versions CSS and JavaScript URLs to avoid stale layouts after publication.
