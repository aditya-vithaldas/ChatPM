# AV — Connected practice

Version 0.1. The living reference is `design-system.html`; shared implementation tokens live in `assets/styles.css`.

## Positioning

Aditya Vithaldas is a full stack builder with 15 years across design, development, and product management, able to own initiatives end to end. This experience statement comes directly from Aditya. Company history, project outcomes, metrics, and availability are intentionally left for the next content discussion.

## Visual thesis

Contemporary editorial simplicity: strong sans-serif typography, five core tones, generous negative space, fine rules, and a layered product/design/engineering diagram. Emphasize clarity and ownership rather than decoration.

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
- Pointer: desktop fine pointers only, bounded ±16px layer movement, eased via requestAnimationFrame. Stop frames when settled. Reset on pointer exit or window blur.
- Touch: static diagram, all content and actions remain available.
- Reduced motion: disable animation, smooth scrolling, hover translation and pointer response. Listen for preference changes during the session.

## Content and next steps

Keep claims specific and verifiable. The landing page is a preliminary application of the system; refine the introduction and add real experience and selected work in a subsequent pass. Do not invent client logos, impact numbers or project case studies.

## Source and delivery

The original Git-tracked project is preserved byte-for-byte at `archive/chatpm`. It is not copied into the portfolio build. There is no active Sites integration or deployment configuration. Publishing to GitHub is separate from any live deployment.
