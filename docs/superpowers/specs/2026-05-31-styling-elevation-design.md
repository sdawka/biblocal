# Styling Elevation Design

Elevate biblocal's visual polish through layered depth, decorative flourishes, and rich textures — applied consistently across all pages.

## Goals

- Deepen the Victorian library aesthetic without becoming kitschy
- Create cohesive elevation/shadow system for perceived depth
- Add tasteful decorative elements that reinforce the theme
- Improve tactile quality through textures and material effects

## Non-Goals

- Redesigning the color palette or typography choices
- Adding new features or functionality
- Dark mode (separate initiative)
- Performance optimization (though we'll avoid heavy assets)

---

## 1. Foundation: Design Tokens

Add to `src/styles/victorian.css` in an organized structure.

### 1.1 Shadow Vocabulary

```css
/* Elevation system */
--shadow-resting: 0 1px 3px rgba(74, 44, 42, 0.08), 0 1px 2px rgba(74, 44, 42, 0.12);
--shadow-hover: 0 4px 12px rgba(74, 44, 42, 0.15), 0 0 8px rgba(184, 134, 11, 0.1);
--shadow-pressed: inset 0 2px 4px rgba(44, 24, 16, 0.15);
--shadow-elevated: 0 8px 24px rgba(74, 44, 42, 0.18), 0 0 12px rgba(184, 134, 11, 0.08);
--shadow-gold-glow: 0 0 0 3px rgba(184, 134, 11, 0.2), 0 0 12px rgba(184, 134, 11, 0.15);
```

### 1.2 Texture Patterns

```css
/* Textures */
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

### 1.3 Decorative Elements

Corner flourish approach using CSS borders:
```css
.flourish-corner::before,
.flourish-corner::after {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  border: 1px solid var(--color-gold);
  opacity: 0.4;
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
```

Divider with center motif:
```css
.divider-ornate {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}
.divider-ornate::before,
.divider-ornate::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, var(--color-gold-pale), transparent);
}
.divider-ornate .motif {
  width: 8px;
  height: 8px;
  background: var(--color-gold);
  transform: rotate(45deg);
  opacity: 0.5;
}
```

### 1.4 Animations

```css
@keyframes shimmer {
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
}

.shimmer-hover:hover {
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out;
}
```

### 1.5 Utility Classes

```css
.marginalia {
  font-family: var(--font-handwritten);
  font-size: 1rem;
  color: var(--color-ink-faded);
  transform: rotate(-1deg);
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
```

---

## 2. Cards & Containers

### 2.1 BookCard (`src/components/BookCard.svelte`)

Changes:
- Replace `--shadow-card` with `--shadow-resting`
- Add `--texture-paper-fine` to background
- On hover: `--shadow-hover`, border becomes `--color-gold`, corner flourishes fade to 0.6 opacity
- Add subtle `--texture-aged` overlay at 0.3 opacity

### 2.2 MatchCardIsland (`src/components/MatchCardIsland.svelte`)

Changes:
- Same shadow treatment as BookCard
- Add decorative top accent line on hover (already partially exists)
- Calling-card style: subtle embossed border effect

### 2.3 card-ornate class (`src/styles/victorian.css`)

Changes:
- Update shadow to use new vocabulary
- Add paper texture
- Corner dots become corner flourishes (L-shaped brackets)
- Hover shows gold glow

### 2.4 Section Containers

New utility class `.section-well`:
- Inset shadow
- Linen texture background
- Optional corner flourishes via modifier `.section-well--flourished`

---

## 3. Navigation & Layout Chrome

### 3.1 Nav Bar (`src/layouts/Layout.astro`)

Changes:
- Layer leather texture over existing wood grain
- Add embossed effect on logo text
- Active nav item gets subtle gold glow underline
- Deepen bottom border shadow

### 3.2 Page Vignette (`src/styles/victorian.css`)

Update `body::after` vignette:
- Increase intensity slightly (0.05 -> 0.07)
- Add subtle warm tint

### 3.3 Footer (if needed)

Add decorative top border with gradient fade.

---

## 4. Interactive Elements

### 4.1 Buttons (`.btn-victorian`)

Changes:
- `:active` state uses `--shadow-pressed`
- `:focus-visible` uses `--shadow-gold-glow`
- Add `.embossed-text` effect
- Subtle gradient animation on hover (shimmer)

### 4.2 Inputs (`.input-victorian`)

Changes:
- Add `--texture-paper-fine` to background
- Deepen inset shadow
- Focus ring uses `--shadow-gold-glow`

### 4.3 Selects (`.select-victorian`)

Same treatment as inputs.

### 4.4 Badges

`.badge-seal`:
- Add subtle emboss effect (inner highlight, outer shadow)

`.tag-brass`:
- Enhance gradient for shinier appearance
- Add subtle reflection highlight

---

## 5. Decorative Elements

### 5.1 Dividers

New `.divider-ornate` class with center diamond motif.
Update existing `.divider` to use refined gradient.

### 5.2 Empty States

Components with empty states (ShelfIsland, etc.):
- Use `.marginalia` class for friendly messages
- Add faded decorative pattern or icon

### 5.3 Section Headers

`.section-header`:
- Add flourish underline option
- Optional decorative brackets: `[  Title  ]`

---

## 6. Page-Specific Enhancements

### 6.1 Landing Page (`index.astro`, `LandingHero.svelte`)

- Hero: richer radial glow behind content
- Floating books: enhanced drop shadows
- Add `.divider-ornate` before sign-in section
- CTA button: add shimmer animation on hover

### 6.2 Shelf Page (`shelf.astro`, `ShelfIsland.svelte`)

- Filter pills: embossed active state
- Book grid: alternate cards get subtle patina variation
- Empty shelf: marginalia message

### 6.3 Matches Page (`matches.astro`, `MatchMapIsland.svelte`)

- Map container: decorative border frame
- Match cards: calling-card flourishes
- Section dividers between map and list

### 6.4 Profile Page (`profile.astro`, `ProfileIsland.svelte`)

- Section dividers between profile areas
- Borrow style quote: styled with left border + marginalia feel
- Topic tags: brass plate treatment

### 6.5 How It Works Page (`how-it-works.astro`)

- Step numbers: ornate circular treatment
- Feature boxes: decorative corner brackets
- Section transitions: ornate dividers

---

## Implementation Strategy

This work parallelizes well across 5 subagents:

| Agent | Scope | Files |
|-------|-------|-------|
| **foundation** | Design tokens, utility classes | `victorian.css` |
| **cards** | BookCard, MatchCard, card-ornate | `BookCard.svelte`, `MatchCardIsland.svelte`, `victorian.css` |
| **chrome** | Nav, layout, vignette | `Layout.astro`, `LandingLayout.astro`, `victorian.css` |
| **interactive** | Buttons, inputs, badges | `victorian.css`, component touch-ups |
| **pages** | Page-specific polish | All page files and their primary components |

**Dependency**: `foundation` must complete first; others can run in parallel after.

---

## Acceptance Criteria

- [ ] All new tokens added to victorian.css in organized sections
- [ ] Cards lift and glow consistently on hover
- [ ] Nav has leather texture, logo is embossed
- [ ] Buttons/inputs have proper pressed/focus states
- [ ] At least one ornate divider visible per major page
- [ ] Empty states use marginalia styling
- [ ] No visual regressions on mobile
- [ ] Reduced motion preference respected for new animations
