# biblocal — Apple-like Redesign Design System

**Date:** 2026-06-14
**Status:** Approved foundation; implementation in progress
**Goal:** Replace the Victorian-library aesthetic with a warm-minimal, Apple-grade design system using an oklch color scheme, refined serif display type, system-UI body text, soft depth, and spring-based motion. Full light/dark parity. Every page and interaction redesigned and verified.

## Identity

**"Apple designed a library app."** Warm neutral canvas (never cold grey), one refined accent (deep ink indigo), depth through light/glass instead of skeuomorphic texture, and spring motion that feels physical and interruptible. The bookish soul survives in the warm hues and the serif used for titles — but the structure, spacing, and motion are Apple-clean.

### Principles
1. **Warm neutral canvas, not cold grey.** Backgrounds carry a faint warm hue so it reads as paper, not a spreadsheet.
2. **Serif for soul, system-sans for UI.** Book titles & headlines in **Newsreader** (editorial screen serif). All interface text in the native `system-ui` / SF stack.
3. **Depth through light, not texture.** Soft diffuse shadows + frosted glass (`backdrop-filter`) + hairline borders. No leather, wood, wax seals, paper grain, or vignettes.
4. **Spring motion, interruptible.** Svelte 5 `svelte/motion` (`Spring`, `Tween`) for island interactions; cubic-bezier spring approximations for CSS-only transitions. Never linear. `prefers-reduced-motion` fully honored.

## Token system (`src/styles/theme.css`)

Single accent hue (270, indigo) drives the whole system. oklch chosen for perceptually-uniform lightness so derived tints/shades step evenly.

### Color — light / dark parity
| Token | Light | Dark |
|---|---|---|
| `--canvas` | `oklch(0.985 0.004 85)` | `oklch(0.18 0.012 270)` |
| `--surface` | `oklch(1 0.002 85)` | `oklch(0.225 0.014 270)` |
| `--surface-sunken` | `oklch(0.965 0.005 85)` | `oklch(0.205 0.012 270)` |
| `--surface-raised` | `oklch(1 0.002 85)` | `oklch(0.26 0.016 270)` |
| `--ink` | `oklch(0.26 0.02 270)` | `oklch(0.96 0.006 85)` |
| `--ink-muted` | `oklch(0.52 0.015 270)` | `oklch(0.72 0.01 270)` |
| `--ink-faint` | `oklch(0.64 0.01 270)` | `oklch(0.58 0.01 270)` |
| `--hairline` | `oklch(0.91 0.005 85)` | `oklch(0.30 0.012 270)` |
| `--hairline-strong` | `oklch(0.85 0.006 85)` | `oklch(0.36 0.014 270)` |
| `--accent` | `oklch(0.55 0.16 270)` | `oklch(0.68 0.15 270)` |
| `--accent-hover` | `oklch(0.50 0.17 270)` | `oklch(0.74 0.15 270)` |
| `--accent-tint` | `oklch(0.95 0.03 270)` | `oklch(0.30 0.05 270)` |
| `--accent-on` | `oklch(0.99 0 0)` | `oklch(0.16 0.01 270)` |

### Status palette (BookStatus, derived from one family)
Seven statuses (`private`, `visible`, `borrowable`, `discussable`, `giftable`, `class-resource`, `seeking-home`) rendered as a low-chroma, indigo-adjacent family — hold lightness/chroma roughly constant, rotate hue modestly so they read as siblings. Each has a `-fg` (text/icon) and `-bg` (tint) pair with light/dark variants. Exact hue assignments live in `theme.css`.

### Typography
- `--font-display: 'Newsreader', ui-serif, Georgia, serif;` — titles, headlines, book titles.
- `--font-ui: system-ui, -apple-system, 'SF Pro Text', 'Segoe UI', sans-serif;` — all UI text.
- Type scale (fluid where useful): display 2.5–4rem, h1 2rem, h2 1.5rem, h3 1.25rem, body 1rem, small 0.875rem, caption 0.75rem. Newsreader used at display/heading; body stays UI sans.

### Motion
- `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);` (overshoot, for entrances/taps)
- `--ease-out: cubic-bezier(0.22, 1, 0.36, 1);` (decisive settle)
- `--ease-soft: cubic-bezier(0.4, 0, 0.2, 1);`
- Durations: `--dur-1: 150ms` (taps), `--dur-2: 240ms` (controls), `--dur-3: 420ms` (cards/sheets), `--dur-4: 600ms` (page-level).
- Islands with continuous/interruptible motion (drag, map, swipe-to-delete, sheet) use `Spring`/`Tween` from `svelte/motion`.
- `@media (prefers-reduced-motion: reduce)` neutralizes transforms/animations and collapses transition durations.

### Elevation (soft, layered)
- `--shadow-1`: subtle resting (cards) — large radius, low opacity, two layers.
- `--shadow-2`: hover lift.
- `--shadow-3`: popovers/menus.
- `--shadow-4`: sheets/modals.
- `--glass`: `backdrop-filter: blur(20px) saturate(1.8)` over a translucent surface — nav, overlays.

### Radii & spacing
- Radii: `--r-sm: 8px`, `--r-md: 12px`, `--r-lg: 16px`, `--r-xl: 22px`, `--r-full: 9999px`. (Apple-generous corners.)
- Spacing scale 4→64px on a 4px base (`--s-1`…`--s-12`).

## Core components (vocabulary every page reuses)
Built and signed off BEFORE page work fans out.
- **Nav** — frosted sticky bar, active-state pill, theme toggle, mobile sheet.
- **Button** — variants: `filled` (accent), `tinted` (accent-tint), `plain`; sizes sm/md/lg; spring tap.
- **Card** — soft surface, hairline border, `--shadow-1`, hover lift to `--shadow-2`.
- **Input / Select / Textarea** — quiet fields, accent focus ring.
- **Segmented control** — replaces Victorian `filter-pill` rows (used on Shelf filters); animated selection indicator.
- **Status pill** — uses the derived status palette.
- **Sheet / overlay** — glass backdrop, spring entrance.

## Theme switching
Default to `prefers-color-scheme`; small toggle in nav overrides and persists to `localStorage` (`biblocal-theme`). Inline `<head>` script applies the saved theme pre-paint to avoid flash. `:root[data-theme="dark"]` / `[data-theme="light"]` override the media-query defaults.

## Loop scope (page-groups)
Each group: redesign → screenshot-verify (light + dark) → fix → commit + push.
1. **Foundation** — `theme.css`, core components, `Layout.astro` nav, theme toggle, Footer.
2. **Landing** — `index.astro` + LandingHero, BookshelfDemo, AppPreview, FacetShowcase, InterestConstellation, LendingSection, LocalMapPreview, MidPageCTA, SignInSection, HowItWorks, MidPageCTA, Footer.
3. **Shelf** — `shelf.astro` + ShelfIsland, ShelfContainer, BookCard, AddBookIsland, EmptyShelfIsland, ImportIsland, ScannerIsland, PromptIsland.
4. **Matches** — `matches.astro` + MatchCardIsland, MatchMapIsland.
5. **Profile** — `profile.astro` + ProfileIsland, TopicPickerIsland, OnboardingIsland, InterestConstellation, ConnectionRequestsIsland.
6. **Stores** — `stores/index.astro`, `stores/new.astro`, `store/[id].astro` + AddStoreIsland, StoreDetailIsland.
7. **Content pages** — `about.astro`, `how-it-works.astro`, HowItWorks, UserMenu.

## Guardrails (enforced every page)
- WCAG AA contrast in both modes.
- Light + dark parity (no token left mode-blind).
- `prefers-reduced-motion` honored.
- Visible keyboard focus states.
- Minimum 44px touch targets.
- `npx astro check` clean; `npm run test:run` green.
- No remaining `victorian.css` dependencies once a page is migrated; file deleted at the end.

## Process
Tokens-first foundation → user sign-off (screenshots) → agent team redesigns each page-group, parent verifies via screenshots and `astro check`, commit + push per group → open PR when the loop completes. Commit often.
