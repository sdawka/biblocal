# Home Page Redesign Spec

## Overview

Redesign the biblocal landing page to improve clarity while preserving the literary personality. Based on 2026 landing page design principles research, the changes focus on:

1. Immediate clarity (5-second comprehension)
2. Reduced section count (8 → 5)
3. Strategic CTA placement (hero, mid-page, end)
4. Sharper copy that explains what biblocal is

## New Structure

```
Hero (with CTA)
    ↓
BookshelfDemo
    ↓
FacetShowcase
    ↓
Mid-page CTA (subtle link)
    ↓
LocalMapPreview
    ↓
SignInSection (with CTA)
```

### Sections Removed

- **LendingSection** — redundant with BookshelfDemo's status badges
- **AppPreview** — duplicates BookshelfDemo functionality
- **HowItWorksLink** — move to footer navigation

## Copy Changes

### Hero (`LandingHero.svelte`)

| Element | Current | New |
|---------|---------|-----|
| Eyebrow | "A place for book people to find each other" | "The local network for readers" |
| Headline | "The right book finds you. So do the right people." | "You are what you read. So are they." |
| Subhead | "Somewhere nearby, someone else finished that book at 2am and needed to talk about it. This is how you find them." | "Share your shelf. Find readers nearby with shared taste. Lend books, borrow books, talk books." |
| CTA | "Start Here" | "Start Here" (unchanged) |

### BookshelfDemo (`BookshelfDemo.svelte`)

| Element | Current | New |
|---------|---------|-----|
| Title | "Start with your shelf. The rest follows." | "Your shelf tells people who you are." |
| Description | "Add the books that matter. Mark the ones you'd lend, discuss, or give away. The rest is just connecting people who should probably meet." | "Every shelf is a branch of the neighborhood library. Add your books, mark what you'll share — that's how matches find you." |

### FacetShowcase (`FacetShowcase.svelte`)

| Element | Current | New |
|---------|---------|-----|
| Title | "You know that feeling when someone actually gets the reference?" | "Five ways we match you with the right people." |
| Description | "We find those people. The ones who read the footnotes. Who have opinions about translation choices. Who understand why you kept that paperback." | "Not just who's nearby — who actually gets the reference." |

### LocalMapPreview (`LocalMapPreview.svelte`)

| Element | Current | New |
|---------|---------|-----|
| Title | "It turns out books are easier to share in person." | "See who is reading what near you." |
| Description | "Here's who's nearby. Some have books you want. Some want books you have. All of them read, which is already a good sign." | "Find a new book and maybe a new friend." |
| Aside | "Turns out the internet is pretty good at connecting neighbors." | Remove |

## New Component: Mid-Page CTA

Add a subtle CTA after FacetShowcase, before LocalMapPreview.

**Copy:** "Ready to find your people? →"

**Style:** Text link or small button, not a full section. Should match the Victorian aesthetic — perhaps styled like the existing marginalia.

**Behavior:** Scrolls to SignInSection (same as hero CTA).

## Files to Modify

1. `src/pages/index.astro` — remove LendingSection, AppPreview, HowItWorksLink; add mid-page CTA
2. `src/components/LandingHero.svelte` — update eyebrow, headline, subhead
3. `src/components/BookshelfDemo.svelte` — update title and description
4. `src/components/FacetShowcase.svelte` — update title and description
5. `src/components/LocalMapPreview.svelte` — update title, description; remove aside
6. `src/components/Footer.astro` — add HowItWorks link

## Files to Delete (or keep unused)

- `src/components/LendingSection.svelte` — no longer used on landing page
- `src/components/AppPreview.svelte` — no longer used on landing page
- `src/components/HowItWorksLink.astro` — functionality moved to footer

## Visual & Motion Improvements

### Hero Animation Simplification

**Current:** 16 floating book covers with staggered delays up to 0.95s, hidden on mobile.

**Changes:**
- Reduce to 8-10 books for less visual noise
- Reduce max animation delay from 0.95s to 0.5s for faster perceived load
- Keep the gentle sway animation

### Mobile Hero Visual

**Current:** Floating books hidden via `display: none` on mobile (< 600px).

**Changes:**
- Add 2-3 book covers flanking the headline on mobile
- Static positioning, subtle fade-in on load
- Maintains the literary atmosphere without complex animation

### Section Rhythm

**Changes:**
- Increase `padding` between sections by ~20% (fewer sections = more room to breathe)
- Consistent vertical rhythm throughout

### Facet Card Timing

**Current:** Auto-flip with 200ms stagger between cards (~1.3s total for all 5).

**Changes:**
- Reduce stagger to 150ms (~1s total)
- Keep the 0.8s flip animation duration

### Mid-CTA Motion

**Changes:**
- Fade in after FacetShowcase cards finish revealing (delay ~1.2s after section enters viewport)
- Subtle pulse or gold glow on the arrow to draw attention
- Match marginalia styling (handwritten font)

## What Stays the Same

- Overall Victorian aesthetic and color palette
- Interactive bookshelf demo with hover marginalia
- Facet flip cards (with adjusted timing)
- Animated local map with connection lines and pulsing dots
- SignIn section with Clerk integration
- Existing CSS variables and design tokens
- Core mobile responsive behavior

## Success Criteria

- Hero communicates "what is this" within 5 seconds
- Page loads with 5 sections instead of 8
- Three CTAs present: hero, mid-page, sign-in section
- "Decentralized library" concept appears in BookshelfDemo
- HowItWorks link accessible from footer
- Hero animation completes within 1s of page load
- Mobile hero has visual treatment (not blank)
- Facet cards fully revealed within 1.5s of section entering viewport
