# decisionos — Connected practice

Version 0.1. The living reference is `design-system.html`; shared implementation tokens live in `assets/styles.css`.

## Positioning

decisionos is a Fractional Product Builder with 15 years across design, development, and product management. The promise: go to market quickly, with less fuss. Connect business transformation goals to a focused MVP through end-to-end ownership from strategy to launch. The experience statement is supplied by the user; it does not imply the firm has operated for 15 years. Company history, project outcomes, metrics, and availability are intentionally left for the next content discussion.

## Visual thesis

Contemporary editorial simplicity: strong sans-serif typography, five core tones, generous negative space, fine rules, and a softly flowing particle swarm. Emphasize clarity and ownership rather than decoration.

## Palette

| Token | Color | Role |
| --- | --- | --- |
| `--ink` | `#17191F` | Primary text, dark surfaces |
| `--accent` | `#204DFF` | Primary action, key phrase |
| `--muted` | `#5F6572` | Secondary copy |
| `--paper` | `#F7F8FA` | Canvas |
| `--surface` | `#FFFFFF` | Elevated surface |

Borders, light accent surfaces and interaction shades support these five tones. Color never carries information alone. Use ink or slate for body text on paper/white, white on cobalt/ink. Cobalt is an emphasis, not a background for every section.

## Typography

Helvetica Neue → Helvetica → Arial → sans-serif. System monospace is reserved for small indices and specification labels. No external font request. Display uses medium weight, approximately −0.065em tracking, 1.01–1.1 line height, and responsive sizes of 56–110px. Section titles are 32–50px. Body copy is 16–18px, with line height 1.6–1.75. Navigation and buttons are 14px or larger on desktop. Small labels are secondary information.

## Layout and elements

Spacing steps: 8, 16, 24, 32, 48, 64, 96, 128px. Canvas maximum: 1440px. Desktop gutters: 56px; tablet: 32px; phone: 20px. Two-column compositions collapse at 760px. Primary controls have 8px corners; diagram cards 14px. Use one primary action per section, semantic anchors, visible focus rings, and a skip link. Use a fine dividing rule before introducing a new card container.

## Motion

- Entrance: once, 650ms, 14px rise, ease-out; adjacent elements stagger by 100–180ms.
- Hover: 180ms, at most 2px translation for controls.
- Pointer: desktop fine pointers only, bounded ±28px horizontal and ±18px vertical influence on the swarm, eased via requestAnimationFrame. Release pointer influence on exit or window blur.
- Ambient swarm: slow continuous flow, 144 particles on desktop and 60 on mobile. A loose shared current, restrained cobalt/slate opacity, no flashing or long trails. Fine pointers gently displace the field.
- Performance: cap canvas pixel ratio at 2 and drawing at 30 fps. Pause when offscreen or the document is hidden.
- Controls: accessible pause/resume buttons control all swarm instances on the page.
- Touch: fewer particles and no pointer attraction; all content and actions remain available.
- Reduced motion: show a still swarm and disable animation, smooth scrolling, hover translation and pointer response. Listen for preference changes during the session.

## Content and next steps

Keep claims specific and verifiable. The landing page is a preliminary application of the system; refine the introduction and add real experience and selected work in a subsequent pass. Do not invent client logos, impact numbers or project case studies.

## Source and delivery

The original Git-tracked project is preserved byte-for-byte at `archive/chatpm`. It is not copied into the portfolio build. There is no active Sites integration. The root Dockerfile supports the existing Google Cloud Run deployment. Publishing to GitHub is separate from any live deployment.

## Illustration language

Loose editorial crayon illustration, with the friendly simplicity of Notion-style drawings. Use thick, imperfect dry-wax strokes, sparse expressive people, simple objects, generous negative space, and visible grain. Exactly three core tones: ink #17191F, cobalt #204DFF, and white. Cobalt is a selective accent. Avoid gradients, 3D, polished vector edges, decorative complexity, and lettering embedded in artwork. Keep illustrations static alongside the softly moving swarm. Use images to explain the service proposition, not merely fill space.

## Services

- MVP in days and weeks, not months: focused scope and a fast path to a first release.
- Consumer insights as a core part of the proposition: listening, testing assumptions, and using findings to guide design and priorities.
- End-to-end ownership, from concept to hosting: product, design, full stack development, deployment, and hosting.

These are service positioning statements supplied by the user, not historical project metrics or unconditional delivery guarantees.

### Illustration asset and generation brief

Asset: `assets/consumer-to-mvp-crayon.png`. Generated with the built-in image-generation tool; the original image is retained unchanged.

Prompt: Use case: illustration-story. Asset type: editorial illustration for a Fractional Product Builder portfolio and its design system. Create one landscape 3:2 illustration on a pure white background with generous white space. A loose, thick, dry wax-crayon drawing: two simplified human figures at a table turn customer conversation (a simple empty speech bubble) into a small working product on a laptop, with a simple upward launch arrow. Contemporary Notion-like editorial sensibility, friendly and sophisticated, imperfect bold hand-drawn contours, rough crayon grain, sparse detail, oversized simple shapes. Strict three-tone palette only: near-black ink #17191F, cobalt blue #204DFF, and white. Blue used sparingly on clothing and one product detail. No gradients, no shading in additional colors, no 3D, no polished vector outlines. No text, no lettering, no logos, no watermark. Clean standalone illustration, not a screenshot or page mockup.

## Project previews and contact

Three initial project slots: e-commerce discovery concept, agentic engineering for paralegal firms, and a virtual employee for product teams. Sample screenshots are AI-generated conceptual interfaces and explicitly labeled as sample concept previews; they are not evidence of shipped functionality or client results. Replace these with the actual screenshots and case-study content when supplied. Each image links to its full-size local asset. The Contact Us links use `mailto:aditya@decisionos.me` and open the visitor's configured email client; there is no form submission or email-sending backend.

### Sample screenshot generation briefs

All three samples use the built-in image-generation tool, landscape 3:2, refined modern SaaS styling, strong sans-serif type, white/light-gray surfaces, ink text and restrained cobalt #204DFF. Interface only, no hardware frame, tilt, logos, real client names, or performance claims.

- `assets/project-commerce.png`: consumer discovery interface with Discover/Saved/Collections navigation, a simple filter row and a 2×2 grid of a desk lamp, ceramic mug, headphones and tote bag.
- `assets/project-paralegal.png`: matter workspace with Matters/Documents/Tasks navigation, generic example matters, document review, a Sources panel and Human review required.
- `assets/project-employee.png`: product team workspace with Overview/Research/Backlog navigation; To explore/In progress/For review columns; feedback synthesis, product briefs, onboarding and release-note tasks; a Draft ready for review activity panel.

## About positioning

Use “Product thinker. Hands-on builder.” and the throughline “From the why, to the what, and finally the how.” The About profile connects the user's stated 15 years across development, design, and product management with hands-on execution and ownership from concept to hosting. Do not invent employers, accomplishments, education, or dates. The site now speaks as decisionos rather than a personal portfolio. Use firm branding and the shared editorial illustration style.

## Lead proposition

Lead with “Fractional Product Building” and “Get to market in weeks.” Frame the offer as a flexible consulting plan focused on market validation. The hero describes the proposition and customer outcome; experience belongs in About.

## Service composition

Show exactly three illustrated service pieces side by side on desktop, stacked on mobile. Use the customer-conversation drawing for consumer insights, a builder assembling a product for MVP delivery, and a concept-to-cloud drawing for end-to-end ownership. Do not repeat the consumer proposition in a separate introductory panel.

Service illustration assets `assets/service-mvp.png` and `assets/service-ownership.png` were generated with the built-in image-generation tool. Briefs: a builder assembling a product interface on a laptop for fast MVP delivery; a builder at a laptop joined by a continuous line from a lightbulb to cloud hosting for ownership. Both use the shared 3:2, thick dry-crayon, ink/cobalt/white style with generous white space and no text.
