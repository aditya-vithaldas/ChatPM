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

The build copies only the two portfolio pages and their assets into `dist/`. The archive is excluded. No Sites integration or production deployment is configured. Existing ChatPM deployment scripts now live in the archive and should be run there only if intentionally restoring the old application.
