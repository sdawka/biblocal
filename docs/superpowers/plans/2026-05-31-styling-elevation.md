# Styling Elevation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate biblocal's visual polish through layered depth, decorative flourishes, and rich textures across all pages.

**Architecture:** Add new design tokens (shadows, textures, animations) to the CSS foundation, then apply consistently to cards, navigation, interactive elements, and page-specific components. Foundation task must complete first; remaining tasks can parallelize.

**Tech Stack:** CSS custom properties, Svelte scoped styles, Astro components

**Spec:** `docs/superpowers/specs/2026-05-31-styling-elevation-design.md`

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/styles/victorian.css` | Design tokens, global utilities, component base styles |
| `src/components/BookCard.svelte` | Book display card with hover effects |
| `src/components/MatchCardIsland.svelte` | Match display card with calling-card styling |
| `src/layouts/Layout.astro` | Main app layout with nav bar |
| `src/layouts/LandingLayout.astro` | Landing page layout (if exists) |
| `src/components/LandingHero.svelte` | Hero section with floating books |
| `src/components/ShelfIsland.svelte` | Shelf grid and empty states |
| `src/components/ProfileIsland.svelte` | Profile sections |
| `src/pages/how-it-works.astro` | How it works page |

---

## Task 1: Foundation — Design Tokens & Utilities

**Dependency:** None (must complete before Tasks 2-5)

**Files:**
- Modify: `src/styles/victorian.css:55-97` (add to :root variables)
- Modify: `src/styles/victorian.css:748-757` (add before reduced-motion)

### Step 1.1: Add elevation shadow tokens

- [ ] **Add shadow vocabulary to :root**

In `src/styles/victorian.css`, after line 60 (`--shadow-wood`), add:

```css
  /* Elevation System — Layered depth */
  --shadow-resting: 0 1px 3px rgba(74, 44, 42, 0.08), 0 1px 2px rgba(74, 44, 42, 0.12);
  --shadow-hover: 0 4px 12px rgba(74, 44, 42, 0.15), 0 0 8px rgba(184, 134, 11, 0.1);
  --shadow-pressed: inset 0 2px 4px rgba(44, 24, 16, 0.15);
  --shadow-elevated: 0 8px 24px rgba(74, 44, 42, 0.18), 0 0 12px rgba(184, 134, 11, 0.08);
  --shadow-gold-glow: 0 0 0 3px rgba(184, 134, 11, 0.2), 0 0 12px rgba(184, 134, 11, 0.15);
```

### Step 1.2: Add texture tokens

- [ ] **Add texture patterns to :root**

After the new shadow tokens, add:

```css
  /* Textures — Material surfaces */
  --texture-paper-fine: repeating-linear-gradient(
    0deg,
    transparent 0px,
    transparent 2px,
    rgba(139, 123, 111, 0.015) 2px,
    rgba(139, 123, 111, 0.015) 4px
  );

  --texture-leather: 
    radial-gradient(ellipse at 20% 30%, rgba(74, 44, 42, 0.03) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 70%, rgba(74, 44, 42, 0.03) 0%, transparent 50%),
    repeating-linear-gradient(
      45deg,
      transparent 0px,
      transparent 1px,
      rgba(0, 0, 0, 0.02) 1px,
      rgba(0, 0, 0, 0.02) 2px
    );

  --texture-linen: repeating-linear-gradient(
    0deg,
    transparent 0px,
    transparent 1px,
    rgba(139, 123, 111, 0.02) 1px,
    rgba(139, 123, 111, 0.02) 2px
  ),
  repeating-linear-gradient(
    90deg,
    transparent 0px,
    transparent 1px,
    rgba(139, 123, 111, 0.02) 1px,
    rgba(139, 123, 111, 0.02) 2px
  );

  --texture-aged: linear-gradient(
    135deg,
    rgba(184, 134, 11, 0.02) 0%,
    transparent 50%,
    rgba(74, 44, 42, 0.02) 100%
  );
```

### Step 1.3: Add shimmer animation

- [ ] **Add shimmer keyframes**

After the existing `@keyframes warmGlow` block (~line 135), add:

```css
@keyframes shimmer {
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
}
```

### Step 1.4: Add utility classes

- [ ] **Add decorative and utility classes**

Before the `/* Reduced motion support */` comment (~line 748), add:

```css
/* ─── Decorative Utilities ─────────────────────────────────── */

.flourish-corner {
  position: relative;
}

.flourish-corner::before,
.flourish-corner::after {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  border: 1px solid var(--color-gold);
  opacity: 0;
  transition: opacity var(--transition-gentle);
  pointer-events: none;
}

.flourish-corner::before {
  top: 6px;
  left: 6px;
  border-right: none;
  border-bottom: none;
}

.flourish-corner::after {
  bottom: 6px;
  right: 6px;
  border-left: none;
  border-top: none;
}

.flourish-corner:hover::before,
.flourish-corner:hover::after {
  opacity: 0.5;
}

.divider-ornate {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin: var(--space-xl) 0;
}

.divider-ornate::before,
.divider-ornate::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, var(--color-gold-pale), transparent);
}

.divider-ornate-motif {
  width: 8px;
  height: 8px;
  background: var(--color-gold);
  transform: rotate(45deg);
  opacity: 0.5;
}

.marginalia {
  font-family: var(--font-handwritten);
  font-size: 1.1rem;
  color: var(--color-ink-faded);
  transform: rotate(-1deg);
  display: inline-block;
}

.embossed-text {
  text-shadow: 
    0 1px 0 rgba(255, 255, 255, 0.3),
    0 -1px 0 rgba(0, 0, 0, 0.1);
}

.paper-bg {
  background-image: var(--texture-paper-fine);
}

.linen-bg {
  background-image: var(--texture-linen);
}

.section-well {
  background: var(--color-paper);
  background-image: var(--texture-linen);
  box-shadow: var(--shadow-inset);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
}

.section-well--flourished {
  position: relative;
}

.section-well--flourished::before,
.section-well--flourished::after {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  border: 1px solid var(--color-gold-pale);
  opacity: 0.4;
}

.section-well--flourished::before {
  top: 8px;
  left: 8px;
  border-right: none;
  border-bottom: none;
}

.section-well--flourished::after {
  bottom: 8px;
  right: 8px;
  border-left: none;
  border-top: none;
}

/* Section header with flourish underline */
.section-header--flourish::after {
  background: linear-gradient(
    to right,
    transparent,
    var(--color-gold-pale) 10%,
    var(--color-gold) 50%,
    var(--color-gold-pale) 90%,
    transparent
  );
  height: 2px;
}

/* Section header with decorative brackets */
.section-header--bracketed h2::before,
.section-header--bracketed h3::before {
  content: '[  ';
  color: var(--color-gold);
  opacity: 0.5;
  font-weight: 400;
}

.section-header--bracketed h2::after,
.section-header--bracketed h3::after {
  content: '  ]';
  color: var(--color-gold);
  opacity: 0.5;
  font-weight: 400;
}
```

### Step 1.5: Update reduced motion

- [ ] **Extend reduced motion preferences**

Update the `@media (prefers-reduced-motion: reduce)` block to include new animations:

```css
@media (prefers-reduced-motion: reduce) {
  .landing-section,
  .catalog-card,
  [class*="float"],
  [class*="flip"],
  [class*="shimmer"] {
    animation: none !important;
  }
  
  *,
  *::before,
  *::after {
    transition-duration: 0.01ms !important;
  }
}
```

### Step 1.6: Verify and commit

- [ ] **Run Astro check**

```bash
npx astro check
```

Expected: No errors related to CSS

- [ ] **Commit foundation**

```bash
git add src/styles/victorian.css
git commit -m "feat(styles): add elevation tokens, textures, and utility classes"
```

---

## Task 2: Cards — BookCard, MatchCard, card-ornate

**Dependency:** Task 1 (Foundation)

**Files:**
- Modify: `src/components/BookCard.svelte:70-120`
- Modify: `src/components/MatchCardIsland.svelte:159-205`
- Modify: `src/styles/victorian.css:206-250` (card-ornate)

### Step 2.1: Update BookCard styles

- [ ] **Update BookCard shadow and texture**

In `src/components/BookCard.svelte`, replace the `.book-card` styles:

```css
.book-card {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: var(--color-cream);
  background-image: var(--texture-paper-fine), var(--texture-aged);
  border: 1px solid var(--color-gold-pale);
  border-radius: var(--radius-md);
  position: relative;
  box-shadow: var(--shadow-resting);
  transition: all var(--transition-gentle);
}

.book-card.seeking {
  border-left: 3px solid var(--color-burgundy);
}

.book-card::before,
.book-card::after {
  content: '';
  position: absolute;
  width: 10px;
  height: 10px;
  border: 1px solid var(--color-gold);
  opacity: 0;
  transition: opacity var(--transition-gentle);
  pointer-events: none;
}

.book-card::before {
  top: 6px;
  left: 6px;
  border-right: none;
  border-bottom: none;
}

.book-card::after {
  bottom: 6px;
  right: 6px;
  border-left: none;
  border-top: none;
}

.book-card:hover {
  box-shadow: var(--shadow-hover);
  transform: translateY(-2px);
  border-color: var(--color-gold);
}

.book-card:hover::before,
.book-card:hover::after {
  opacity: 0.5;
}
```

### Step 2.2: Update MatchCard styles

- [ ] **Update MatchCardIsland shadow and add embossed border**

In `src/components/MatchCardIsland.svelte`, replace the `.match-card` styles:

```css
.match-card {
  padding: 1.25rem;
  background: var(--color-cream);
  background-image: var(--texture-paper-fine);
  border: 1px solid var(--color-gold-pale);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-gentle);
  box-shadow: var(--shadow-resting);
  position: relative;
}

.match-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 12px;
  right: 12px;
  height: 2px;
  background: linear-gradient(
    to right,
    transparent,
    var(--color-gold-pale) 20%,
    var(--color-gold) 50%,
    var(--color-gold-pale) 80%,
    transparent
  );
  opacity: 0;
  transition: opacity var(--transition-gentle);
}

.match-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--radius-md);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5), inset 0 -1px 0 rgba(0, 0, 0, 0.05);
  pointer-events: none;
}

.match-card:hover {
  box-shadow: var(--shadow-hover);
  transform: translateY(-2px);
  border-color: var(--color-gold);
}

.match-card:hover::before {
  opacity: 0.8;
}

.match-card.expanded {
  box-shadow: var(--shadow-elevated);
  border-color: var(--color-gold);
}

.match-card.expanded::before {
  opacity: 0.8;
}
```

### Step 2.3: Update card-ornate class

- [ ] **Update card-ornate in victorian.css**

Replace the `.card-ornate` block (~lines 206-250):

```css
/* Ornate Card — Elevated variant */
.card-ornate {
  background: var(--color-cream);
  background-image: var(--texture-paper-fine);
  border: 1px solid var(--color-gold-pale);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  position: relative;
  box-shadow: var(--shadow-resting);
  transition: all var(--transition-gentle);
}

/* Corner flourishes */
.card-ornate::before,
.card-ornate::after {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  border: 1px solid var(--color-gold);
  opacity: 0;
  transition: opacity var(--transition-gentle);
  pointer-events: none;
}

.card-ornate::before {
  top: 8px;
  left: 8px;
  border-right: none;
  border-bottom: none;
}

.card-ornate::after {
  bottom: 8px;
  right: 8px;
  border-left: none;
  border-top: none;
}

.card-ornate:hover {
  box-shadow: var(--shadow-hover);
  transform: translateY(-2px);
  border-color: var(--color-gold);
}

.card-ornate:hover::before,
.card-ornate:hover::after {
  opacity: 0.6;
}
```

### Step 2.4: Verify and commit

- [ ] **Visual verification**

```bash
npm run dev
```

Check: Open shelf page, hover over book cards — should lift with gold glow and corner flourishes appear.

- [ ] **Commit cards**

```bash
git add src/components/BookCard.svelte src/components/MatchCardIsland.svelte src/styles/victorian.css
git commit -m "feat(cards): add elevation, textures, and corner flourishes"
```

---

## Task 3: Chrome — Navigation & Layout

**Dependency:** Task 1 (Foundation)

**Files:**
- Modify: `src/layouts/Layout.astro:74-160`
- Modify: `src/styles/victorian.css:514-530` (vignette)

### Step 3.1: Update nav with leather texture and embossed logo

- [ ] **Update nav styles in Layout.astro**

In `src/layouts/Layout.astro`, update the `<style>` section. Replace the `nav` rule:

```css
nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.875rem 2rem;
  background: linear-gradient(
    to bottom,
    var(--color-mahogany-light) 0%,
    var(--color-mahogany) 30%,
    var(--color-mahogany-deep) 100%
  );
  border-bottom: 2px solid var(--color-gold);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    inset 0 -2px 6px rgba(0, 0, 0, 0.15),
    0 4px 12px rgba(44, 24, 16, 0.3);
  position: relative;
}

/* Leather + wood grain texture */
nav::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    var(--texture-leather),
    repeating-linear-gradient(
      88deg,
      transparent 0px,
      transparent 2px,
      rgba(139, 111, 92, 0.04) 2px,
      rgba(139, 111, 92, 0.04) 4px,
      transparent 4px,
      transparent 12px
    ),
    repeating-linear-gradient(
      92deg,
      transparent 0px,
      transparent 30px,
      rgba(0, 0, 0, 0.03) 30px,
      rgba(0, 0, 0, 0.03) 60px
    );
  pointer-events: none;
}
```

### Step 3.2: Update logo with embossed effect

- [ ] **Update logo styles**

Replace the `.logo` rule:

```css
.logo {
  font-family: var(--font-display);
  font-size: 1.4rem;
  font-weight: 600;
  font-style: italic;
  color: var(--color-gold);
  text-decoration: none;
  text-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.5),
    0 1px 0 rgba(255, 255, 255, 0.1);
  transition: all var(--transition-gentle);
  position: relative;
  z-index: 1;
}

.logo:hover {
  color: var(--color-gold-light);
  text-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.5),
    0 1px 0 rgba(255, 255, 255, 0.1),
    0 0 16px rgba(184, 134, 11, 0.4);
}
```

### Step 3.3: Update active nav item with gold glow

- [ ] **Update active link styles**

Replace the `.links a.active` rule:

```css
.links a.active {
  color: var(--color-ink);
  background: linear-gradient(
    to bottom,
    var(--color-gold-light),
    var(--color-gold) 60%,
    #9A7209
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.25),
    0 1px 3px rgba(0, 0, 0, 0.25),
    0 0 8px rgba(184, 134, 11, 0.3);
  text-shadow: none;
}
```

### Step 3.4: Update vignette

- [ ] **Deepen page vignette in victorian.css**

Replace the `body::after` vignette rule (~line 515):

```css
/* Warm vignette on page edges */
body::after {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  background: radial-gradient(
    ellipse at center,
    transparent 60%,
    rgba(74, 44, 42, 0.07) 100%
  ),
  radial-gradient(
    ellipse at center,
    transparent 70%,
    rgba(184, 134, 11, 0.02) 100%
  );
  z-index: 9998;
}
```

### Step 3.5: Verify and commit

- [ ] **Visual verification**

```bash
npm run dev
```

Check: Nav has richer texture, logo has depth, active item glows, page edges have warmer vignette.

- [ ] **Commit chrome**

```bash
git add src/layouts/Layout.astro src/styles/victorian.css
git commit -m "feat(chrome): add leather texture to nav, embossed logo, deeper vignette"
```

---

## Task 4: Interactive Elements — Buttons, Inputs, Badges

**Dependency:** Task 1 (Foundation)

**Files:**
- Modify: `src/styles/victorian.css:281-470` (buttons, inputs, badges)

### Step 4.1: Update Victorian button

- [ ] **Update btn-victorian with pressed/focus states and shimmer**

Replace the `.btn-victorian` rules (~lines 281-350):

```css
/* Victorian Button */
.btn-victorian {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: 0.625rem 1.25rem;
  font-family: var(--font-display);
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-cream);
  background: linear-gradient(
    to bottom,
    var(--color-burgundy-light),
    var(--color-burgundy),
    var(--color-burgundy-dark)
  );
  background-size: 100% 100%;
  border: 1px solid var(--color-burgundy-dark);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-gentle);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.15),
    0 2px 4px rgba(74, 44, 42, 0.3);
  text-shadow: 
    0 1px 1px rgba(0, 0, 0, 0.2),
    0 1px 0 rgba(255, 255, 255, 0.1);
}

.btn-victorian:hover {
  background: linear-gradient(
    to bottom,
    var(--color-burgundy),
    var(--color-burgundy-dark),
    #4A1F25
  );
  background-size: 200% 100%;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 4px 8px rgba(74, 44, 42, 0.4);
  transform: translateY(-1px);
  animation: shimmer 1.5s ease-in-out;
}

.btn-victorian:active {
  transform: translateY(0);
  box-shadow: var(--shadow-pressed);
}

.btn-victorian:focus-visible {
  outline: none;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.15),
    0 2px 4px rgba(74, 44, 42, 0.3),
    var(--shadow-gold-glow);
}

.btn-secondary {
  background: linear-gradient(
    to bottom,
    var(--color-forest-light),
    var(--color-forest),
    var(--color-forest-dark)
  );
  border-color: var(--color-forest-dark);
}

.btn-secondary:hover {
  background: linear-gradient(
    to bottom,
    var(--color-forest),
    var(--color-forest-dark),
    #152218
  );
}
```

### Step 4.2: Update Victorian input

- [ ] **Update input-victorian with texture and gold focus**

Replace the `.input-victorian` rules (~lines 352-378):

```css
/* Victorian Input */
.input-victorian {
  width: 100%;
  padding: 0.625rem 0.875rem;
  font-family: var(--font-body);
  font-size: 1rem;
  color: var(--color-ink);
  background: var(--color-paper);
  background-image: var(--texture-paper-fine);
  border: 1px solid var(--color-gold-pale);
  border-radius: var(--radius-sm);
  transition: all var(--transition-quick);
  box-shadow: inset 0 2px 4px rgba(44, 24, 16, 0.08);
}

.input-victorian::placeholder {
  color: var(--color-ink-light);
  font-style: italic;
}

.input-victorian:focus {
  outline: none;
  border-color: var(--color-gold);
  box-shadow:
    inset 0 2px 4px rgba(44, 24, 16, 0.08),
    var(--shadow-gold-glow);
}
```

### Step 4.3: Update Victorian select

- [ ] **Update select-victorian similarly**

Replace the `.select-victorian` rules (~lines 379-401):

```css
/* Victorian Select */
.select-victorian {
  appearance: none;
  width: 100%;
  padding: 0.625rem 2.5rem 0.625rem 0.875rem;
  font-family: var(--font-body);
  font-size: 1rem;
  color: var(--color-ink);
  background: var(--color-paper) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B5B4F' d='M6 8L1 3h10z'/%3E%3C/svg%3E") no-repeat right 0.875rem center;
  background-image: var(--texture-paper-fine), url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B5B4F' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-position: 0 0, right 0.875rem center;
  background-repeat: repeat, no-repeat;
  border: 1px solid var(--color-gold-pale);
  border-radius: var(--radius-sm);
  cursor: pointer;
  box-shadow: inset 0 2px 4px rgba(44, 24, 16, 0.08);
  transition: all var(--transition-quick);
}

.select-victorian:focus {
  outline: none;
  border-color: var(--color-gold);
  box-shadow:
    inset 0 2px 4px rgba(44, 24, 16, 0.08),
    var(--shadow-gold-glow);
}
```

### Step 4.4: Update badges

- [ ] **Update badge-seal with emboss effect**

Replace the `.badge-seal` rules (~lines 413-439):

```css
/* Badge — Wax Seal Style */
.badge-seal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem 0.625rem;
  font-family: var(--font-display);
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-cream);
  background: var(--color-burgundy);
  border-radius: 2px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.15),
    inset 0 -1px 0 rgba(0, 0, 0, 0.1),
    0 2px 3px rgba(0, 0, 0, 0.2);
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
}

.badge-seal.forest {
  background: var(--color-forest);
}

.badge-seal.gold {
  background: var(--color-gold);
  color: var(--color-ink);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.3);
}
```

### Step 4.5: Update brass tags

- [ ] **Update tag-brass with enhanced gradient**

Replace the `.tag-brass` rules (~lines 441-462):

```css
/* Brass Plate Tag */
.tag-brass {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: var(--color-ink);
  background: linear-gradient(
    to bottom,
    #E8D4A8 0%,
    var(--color-gold-light) 20%,
    var(--color-gold) 50%,
    var(--color-gold-light) 80%,
    #E8D4A8 100%
  );
  border: 1px solid var(--color-gold);
  border-radius: 2px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.5),
    inset 0 -1px 0 rgba(0, 0, 0, 0.1),
    0 1px 2px rgba(0, 0, 0, 0.15);
}
```

### Step 4.6: Update filter pills

- [ ] **Update filter-pill active states with emboss**

Update the `.filter-pill` active states (~end of file):

```css
.filter-pill.ownership.active {
  color: var(--color-cream);
  background: var(--color-forest);
  border-color: var(--color-forest-dark);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    inset 0 -1px 0 rgba(0, 0, 0, 0.1),
    0 1px 2px rgba(0, 0, 0, 0.2);
}

.filter-pill.intent.active {
  color: var(--color-cream);
  background: var(--color-burgundy);
  border-color: var(--color-burgundy-dark);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    inset 0 -1px 0 rgba(0, 0, 0, 0.1),
    0 1px 2px rgba(0, 0, 0, 0.2);
}

.filter-pill.visibility.active {
  color: var(--color-paper);
  background: var(--color-ink-faded);
  border-color: var(--color-ink);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    inset 0 -1px 0 rgba(0, 0, 0, 0.1),
    0 1px 2px rgba(0, 0, 0, 0.2);
}
```

### Step 4.7: Verify and commit

- [ ] **Visual verification**

```bash
npm run dev
```

Check: Buttons shimmer on hover, press feels tactile, inputs glow gold on focus, badges look embossed.

- [ ] **Commit interactive**

```bash
git add src/styles/victorian.css
git commit -m "feat(interactive): add shimmer, pressed states, gold focus, embossed badges"
```

---

## Task 5: Page-Specific Polish

**Dependency:** Tasks 1-4

**Files:**
- Modify: `src/components/LandingHero.svelte:100-150`
- Modify: `src/pages/index.astro`
- Modify: `src/components/ShelfIsland.svelte` (empty state)
- Modify: `src/components/ProfileIsland.svelte`
- Modify: `src/pages/how-it-works.astro`

### Step 5.1: Enhance LandingHero

- [ ] **Add richer hero glow and floating book shadows**

In `src/components/LandingHero.svelte`, update the `.hero` styles:

```css
.hero {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: var(--space-xl);
  position: relative;
  overflow: hidden;
  background: radial-gradient(
    ellipse at 50% 30%,
    rgba(184, 134, 11, 0.12) 0%,
    rgba(184, 134, 11, 0.04) 40%,
    transparent 70%
  );
}

.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(
      circle at 50% 100%,
      rgba(114, 47, 55, 0.08) 0%,
      transparent 50%
    ),
    radial-gradient(
      circle at 20% 20%,
      rgba(184, 134, 11, 0.05) 0%,
      transparent 30%
    ),
    radial-gradient(
      circle at 80% 30%,
      rgba(184, 134, 11, 0.05) 0%,
      transparent 30%
    );
  pointer-events: none;
}
```

Update `.floating-book`:

```css
.floating-book {
  position: absolute;
  left: var(--start-x);
  top: var(--y);
  opacity: 0;
  transform: translateX(0) rotate(0deg) scale(0.5);
  filter: drop-shadow(0 12px 24px rgba(74, 44, 42, 0.35));
  animation: floatInward 2.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: var(--delay);
  animation-play-state: paused;
}
```

### Step 5.2: Add ornate divider to landing page

- [ ] **Add divider before sign-in section in index.astro**

In `src/pages/index.astro`, before the SignInSection component, add:

```astro
<div class="divider-ornate">
  <div class="divider-ornate-motif"></div>
</div>
```

### Step 5.3: Add shimmer to CTA button

- [ ] **The CTA button in LandingHero already uses btn-victorian**

Verify the CTA button has the class. If it's a custom button, add:

```css
.cta {
  font-size: 1rem;
  padding: 0.75rem 1.75rem;
  /* Inherits shimmer from btn-victorian */
}
```

### Step 5.4: Check for empty shelf state

- [ ] **Check ShelfIsland for empty state**

```bash
grep -n "empty\|no books\|start adding" src/components/ShelfIsland.svelte
```

If an empty state exists, ensure it uses `.marginalia` class for the message.

### Step 5.5: Update ProfileIsland borrow style

- [ ] **Check ProfileIsland for borrow style quote**

```bash
grep -n "borrowStyle\|borrow-style" src/components/ProfileIsland.svelte
```

If present, ensure it uses marginalia-like styling with left border.

### Step 5.6: Add dividers to how-it-works

- [ ] **Check how-it-works.astro structure**

```bash
grep -n "section\|step\|feature" src/pages/how-it-works.astro | head -20
```

Add `.divider-ornate` between major sections where appropriate.

### Step 5.7: Final verification

- [ ] **Test all pages**

```bash
npm run dev
```

Navigate through:
- Landing page: Check hero glow, floating book shadows, divider before sign-in
- Shelf: Check filter pills, book cards, empty state (if no books)
- Matches: Check match cards lift/glow
- Profile: Check section styling
- How It Works: Check dividers and section styling

### Step 5.8: Commit pages

- [ ] **Commit page-specific changes**

```bash
git add src/components/LandingHero.svelte src/pages/index.astro src/components/ShelfIsland.svelte src/components/ProfileIsland.svelte src/pages/how-it-works.astro
git commit -m "feat(pages): add hero glow, ornate dividers, page-specific polish"
```

---

## Task 6: Final Integration & Cleanup

**Dependency:** Tasks 1-5

### Step 6.1: Run full build

- [ ] **Build and check for errors**

```bash
npm run build
```

Expected: Build succeeds with no CSS errors

### Step 6.2: Run type check

- [ ] **Astro check**

```bash
npx astro check
```

Expected: No errors

### Step 6.3: Visual QA

- [ ] **Test reduced motion**

In browser DevTools, enable "Reduce motion" preference. Verify:
- No animations play
- Transitions are instant
- Site remains functional

### Step 6.4: Mobile check

- [ ] **Test responsive behavior**

Open DevTools, test at 375px width:
- Cards still readable
- Nav hamburger works
- No horizontal overflow

### Step 6.5: Final commit

- [ ] **Create summary commit if needed**

If any touch-ups were made:

```bash
git add -A
git commit -m "fix(styles): polish and cleanup from visual QA"
```

---

## Acceptance Criteria Checklist

- [ ] All new tokens added to victorian.css in organized sections
- [ ] Cards lift and glow consistently on hover
- [ ] Nav has leather texture, logo is embossed
- [ ] Buttons/inputs have proper pressed/focus states
- [ ] At least one ornate divider visible per major page
- [ ] Empty states use marginalia styling
- [ ] No visual regressions on mobile
- [ ] Reduced motion preference respected for new animations
