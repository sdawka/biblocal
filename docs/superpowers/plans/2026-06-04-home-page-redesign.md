# Home Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the landing page with clearer copy, fewer sections (8→5), strategic CTAs, and improved animations.

**Architecture:** Update copy in 4 Svelte components, remove 3 sections from index.astro, add a mid-page CTA component, adjust animation timings, and add mobile hero visuals.

**Tech Stack:** Astro 6, Svelte 5, CSS animations

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/pages/index.astro` | Remove 3 sections, add mid-page CTA |
| Modify | `src/components/LandingHero.svelte` | Update copy, reduce books, add mobile visuals |
| Modify | `src/components/BookshelfDemo.svelte` | Update copy, increase section padding |
| Modify | `src/components/FacetShowcase.svelte` | Update copy, speed up card timing |
| Modify | `src/components/LocalMapPreview.svelte` | Update copy, remove aside, increase padding |
| Modify | `src/components/Footer.astro` | Add HowItWorks link |
| Create | `src/components/MidPageCTA.svelte` | Subtle CTA between FacetShowcase and LocalMapPreview |

---

### Task 1: Update LandingHero Copy

**Files:**
- Modify: `src/components/LandingHero.svelte:82-87`

- [ ] **Step 1: Update eyebrow text**

Change line 82 from:
```svelte
<p class="eyebrow">A place for book people to find each other</p>
```
To:
```svelte
<p class="eyebrow">The local network for readers</p>
```

- [ ] **Step 2: Update headline**

Change line 83 from:
```svelte
<h1>The right book finds you.<br/>So do the right people.</h1>
```
To:
```svelte
<h1>You are what you read.<br/>So are they.</h1>
```

- [ ] **Step 3: Update subhead**

Change lines 84-87 from:
```svelte
<p class="subhead">
  Somewhere nearby, someone else finished that book at 2am and needed to talk about it.<br/>
  This is how you find them.
</p>
```
To:
```svelte
<p class="subhead">
  Share your shelf. Find readers nearby with shared taste.<br/>
  Lend books, borrow books, talk books.
</p>
```

- [ ] **Step 4: Run dev server and verify**

Run: `npm run dev`
Open: http://localhost:4321
Verify: Hero displays new copy correctly

- [ ] **Step 5: Commit**

```bash
git add src/components/LandingHero.svelte
git commit -m "feat(landing): update hero copy for clarity"
```

---

### Task 2: Simplify Hero Animation (Reduce Books)

**Files:**
- Modify: `src/components/LandingHero.svelte:10-34`

- [ ] **Step 1: Reduce demoBooks array to 10 items**

Replace the `demoBooks` array (lines 10-34) with:
```typescript
const demoBooks = [
  // Left column
  { title: "Small Gods", cover: "/covers/0062237373.jpg", x: -5, y: 10, endX: 5, size: "medium", delay: 0.05 },
  { title: "Gödel, Escher, Bach", cover: "/covers/0465026567.jpg", x: -8, y: 30, endX: 8, size: "large", delay: 0.1 },
  { title: "Beloved", cover: "/covers/1400033411.jpg", x: -6, y: 55, endX: 6, size: "medium", delay: 0.15 },
  { title: "The Dispossessed", cover: "/covers/0061054887.jpg", x: -5, y: 78, endX: 5, size: "medium", delay: 0.2 },
  { title: "Dune", cover: "/covers/0441172717.jpg", x: -3, y: 45, endX: 14, size: "small", delay: 0.25 },

  // Right column
  { title: "One Hundred Years", cover: "/covers/0060883286.jpg", x: 105, y: 10, endX: 86, size: "medium", delay: 0.1 },
  { title: "The Unbearable Lightness", cover: "/covers/0061148520.jpg", x: 108, y: 30, endX: 83, size: "large", delay: 0.15 },
  { title: "Guards! Guards!", cover: "/covers/0062225758.jpg", x: 106, y: 55, endX: 85, size: "medium", delay: 0.2 },
  { title: "Master and Margarita", cover: "/covers/0140455469.jpg", x: 105, y: 78, endX: 86, size: "medium", delay: 0.25 },
  { title: "House of Leaves", cover: "/covers/0375703764.jpg", x: 103, y: 45, endX: 78, size: "small", delay: 0.3 },
];
```

- [ ] **Step 2: Run dev server and verify**

Run: `npm run dev`
Open: http://localhost:4321
Verify: Fewer books animate in, animation completes faster (max delay 0.3s vs 0.95s)

- [ ] **Step 3: Commit**

```bash
git add src/components/LandingHero.svelte
git commit -m "feat(landing): reduce hero books for faster animation"
```

---

### Task 3: Add Mobile Hero Visuals

**Files:**
- Modify: `src/components/LandingHero.svelte:51-78` (template)
- Modify: `src/components/LandingHero.svelte:362-378` (styles)

- [ ] **Step 1: Add mobile books markup after hero-content div**

After the closing `</div>` of `.hero-content` (around line 91), add:
```svelte
<div class="mobile-books">
  <img src="/covers/0465026567.jpg" alt="Book cover" class="mobile-book left" />
  <img src="/covers/0061148520.jpg" alt="Book cover" class="mobile-book right" />
</div>
```

- [ ] **Step 2: Add mobile books styles**

Add before the closing `</style>` tag:
```css
.mobile-books {
  display: none;
}

@media (max-width: 600px) {
  .mobile-books {
    display: flex;
    justify-content: center;
    gap: var(--space-lg);
    margin-top: var(--space-lg);
    opacity: 0;
    animation: fadeIn 0.8s ease 0.3s forwards;
  }

  .mobile-book {
    width: 70px;
    height: auto;
    border-radius: 3px;
    box-shadow: 0 4px 12px rgba(74, 44, 42, 0.3);
  }

  .mobile-book.left {
    transform: rotate(-5deg);
  }

  .mobile-book.right {
    transform: rotate(5deg);
  }
}
```

- [ ] **Step 3: Test on mobile viewport**

Run: `npm run dev`
Open: http://localhost:4321
Use browser dev tools to simulate mobile (< 600px)
Verify: Two book covers appear below the CTA button

- [ ] **Step 4: Commit**

```bash
git add src/components/LandingHero.svelte
git commit -m "feat(landing): add mobile hero book visuals"
```

---

### Task 4: Update BookshelfDemo Copy and Padding

**Files:**
- Modify: `src/components/BookshelfDemo.svelte:68-72`
- Modify: `src/components/BookshelfDemo.svelte:113` (padding)

- [ ] **Step 1: Update section title**

Change line 68 from:
```svelte
<h2 class="section-title">Start with your shelf. The rest follows.</h2>
```
To:
```svelte
<h2 class="section-title">Your shelf tells people who you are.</h2>
```

- [ ] **Step 2: Update section description**

Change lines 69-72 from:
```svelte
<p class="section-desc">
  Add the books that matter. Mark the ones you'd lend, discuss, or give away.<br/>
  The rest is just connecting people who should probably meet.
</p>
```
To:
```svelte
<p class="section-desc">
  Every shelf is a branch of the neighborhood library. Add your books, mark what you'll share —<br/>
  that's how matches find you.
</p>
```

- [ ] **Step 3: Increase section padding**

Change line 118 (in `.bookshelf-section` styles) from:
```css
padding: var(--space-2xl);
```
To:
```css
padding: var(--space-2xl) var(--space-2xl) calc(var(--space-2xl) * 1.2);
```

- [ ] **Step 4: Run dev server and verify**

Run: `npm run dev`
Verify: BookshelfDemo shows new copy with slightly more bottom padding

- [ ] **Step 5: Commit**

```bash
git add src/components/BookshelfDemo.svelte
git commit -m "feat(landing): update bookshelf copy with decentralized library concept"
```

---

### Task 5: Update FacetShowcase Copy and Timing

**Files:**
- Modify: `src/components/FacetShowcase.svelte:66-71`
- Modify: `src/components/FacetShowcase.svelte:51` (timing)
- Modify: `src/components/FacetShowcase.svelte:128` (padding)

- [ ] **Step 1: Update section title**

Change line 66 from:
```svelte
<h2 class="section-title">You know that feeling when someone actually gets the reference?</h2>
```
To:
```svelte
<h2 class="section-title">Five ways we match you with the right people.</h2>
```

- [ ] **Step 2: Update section description**

Change lines 67-70 from:
```svelte
<p class="section-desc">
  We find those people. The ones who read the footnotes. Who have opinions about translation choices. Who understand why you kept that paperback.
</p>
```
To:
```svelte
<p class="section-desc">
  Not just who's nearby — who actually gets the reference.
</p>
```

- [ ] **Step 3: Speed up card reveal timing**

Change line 51 from:
```typescript
}, 300 + i * 200);
```
To:
```typescript
}, 200 + i * 150);
```

- [ ] **Step 4: Increase section padding**

Change the padding in `.facets-section` (around line 129) from:
```css
padding: var(--space-2xl);
```
To:
```css
padding: var(--space-2xl) var(--space-2xl) calc(var(--space-2xl) * 1.2);
```

- [ ] **Step 5: Run dev server and verify**

Run: `npm run dev`
Verify: FacetShowcase shows new copy, cards flip faster (~1s total vs ~1.3s)

- [ ] **Step 6: Commit**

```bash
git add src/components/FacetShowcase.svelte
git commit -m "feat(landing): update facet copy and speed up card reveals"
```

---

### Task 6: Create MidPageCTA Component

**Files:**
- Create: `src/components/MidPageCTA.svelte`

- [ ] **Step 1: Create the component file**

Create `src/components/MidPageCTA.svelte`:
```svelte
<script lang="ts">
  let visible = $state(false);
  let sectionElement: HTMLElement;

  function scrollToSignIn() {
    document.getElementById('signin-section')?.scrollIntoView({ behavior: 'smooth' });
  }

  $effect(() => {
    if (!sectionElement) return;

    const observer = new IntersectionObserver(
      ([entry]) => { visible = entry.isIntersecting; },
      { threshold: 0.5 }
    );
    observer.observe(sectionElement);

    return () => observer.disconnect();
  });
</script>

<div class="mid-cta" bind:this={sectionElement} class:visible>
  <button class="cta-link" onclick={scrollToSignIn}>
    Ready to find your people? <span class="arrow">→</span>
  </button>
</div>

<style>
  .mid-cta {
    text-align: center;
    padding: var(--space-xl) var(--space-lg);
    background: var(--color-parchment);
  }

  .cta-link {
    font-family: var(--font-handwritten);
    font-size: 1.2rem;
    color: var(--color-ink-faded);
    background: none;
    border: none;
    cursor: pointer;
    opacity: 0;
    transform: translateY(10px);
    transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .visible .cta-link {
    opacity: 1;
    transform: translateY(0);
  }

  .cta-link:hover {
    color: var(--color-ink);
  }

  .arrow {
    display: inline-block;
    transition: transform 0.3s ease;
  }

  .cta-link:hover .arrow {
    transform: translateX(4px);
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/MidPageCTA.svelte
git commit -m "feat(landing): add mid-page CTA component"
```

---

### Task 7: Update LocalMapPreview Copy and Padding

**Files:**
- Modify: `src/components/LocalMapPreview.svelte:29-37`
- Modify: `src/components/LocalMapPreview.svelte:75` (padding)

- [ ] **Step 1: Update section title**

Change line 30 from:
```svelte
<h2 class="section-title">It turns out books are easier<br/>to share in person.</h2>
```
To:
```svelte
<h2 class="section-title">See who is reading what near you.</h2>
```

- [ ] **Step 2: Update section description**

Change lines 31-34 from:
```svelte
<p class="section-desc">
  Here's who's nearby. Some have books you want. Some want books you have.
  All of them read, which is already a good sign.
</p>
```
To:
```svelte
<p class="section-desc">
  Find a new book and maybe a new friend.
</p>
```

- [ ] **Step 3: Remove the aside element**

Delete lines 35-37:
```svelte
<p class="section-aside">
  Turns out the internet is pretty good at connecting neighbors.
</p>
```

- [ ] **Step 4: Increase section padding**

Change the padding in `.local-section` (around line 75) from:
```css
padding: var(--space-2xl);
```
To:
```css
padding: calc(var(--space-2xl) * 1.2) var(--space-2xl);
```

- [ ] **Step 5: Run dev server and verify**

Run: `npm run dev`
Verify: LocalMapPreview shows new copy, aside is removed

- [ ] **Step 6: Commit**

```bash
git add src/components/LocalMapPreview.svelte
git commit -m "feat(landing): update local map copy and remove aside"
```

---

### Task 8: Add HowItWorks Link to Footer

**Files:**
- Modify: `src/components/Footer.astro`

- [ ] **Step 1: Read current Footer structure**

Run: `cat src/components/Footer.astro`

- [ ] **Step 2: Add HowItWorks link**

Add a "How It Works" link to the footer navigation. The exact location depends on current footer structure — add it alongside any existing nav links:
```astro
<a href="/how-it-works">How It Works</a>
```

- [ ] **Step 3: Run dev server and verify**

Run: `npm run dev`
Scroll to footer and verify "How It Works" link appears and navigates correctly

- [ ] **Step 4: Commit**

```bash
git add src/components/Footer.astro
git commit -m "feat(landing): add how-it-works link to footer"
```

---

### Task 9: Update index.astro Structure

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Add MidPageCTA import**

Add to the imports at the top:
```astro
import MidPageCTA from '../components/MidPageCTA.svelte';
```

- [ ] **Step 2: Remove unused imports**

Remove these import lines:
```astro
import LendingSection from '../components/LendingSection.svelte';
import AppPreview from '../components/AppPreview.svelte';
import HowItWorksLink from '../components/HowItWorksLink.astro';
```

- [ ] **Step 3: Update the main content structure**

Replace the `<main>` content with:
```astro
<main>
  <!-- 1. Hook -->
  <LandingHero client:load />

  <!-- 2. Personal: Organize your shelf -->
  <BookshelfDemo client:visible />

  <!-- 3. Community: Find your people -->
  <FacetShowcase client:visible />

  <!-- 4. Mid-page CTA -->
  <MidPageCTA client:visible />

  <!-- 5. Local: It's all nearby -->
  <LocalMapPreview client:visible />

  <!-- Ornate divider before sign-in -->
  <div class="divider-ornate">
    <div class="divider-ornate-motif"></div>
  </div>

  <!-- 6. Sign up -->
  <SignInSection />

  <Footer />
</main>
```

- [ ] **Step 4: Run dev server and verify full page**

Run: `npm run dev`
Open: http://localhost:4321
Verify:
- Page has 5 main sections (Hero, BookshelfDemo, FacetShowcase, LocalMapPreview, SignIn)
- Mid-page CTA appears between FacetShowcase and LocalMapPreview
- LendingSection, AppPreview, and HowItWorksLink are gone
- All animations work correctly

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(landing): restructure to 5 sections with mid-page CTA"
```

---

### Task 10: Final Verification and Cleanup

**Files:**
- Review all modified files

- [ ] **Step 1: Run full dev build**

Run: `npm run build`
Verify: Build completes without errors

- [ ] **Step 2: Run type check**

Run: `npx astro check`
Verify: No TypeScript errors

- [ ] **Step 3: Test mobile responsiveness**

Run: `npm run dev`
Test at these breakpoints:
- Desktop (> 900px)
- Tablet (600-900px)
- Mobile (< 600px)

Verify:
- Hero shows floating books on desktop, static books on mobile
- All sections stack properly on mobile
- CTAs are tappable on mobile

- [ ] **Step 4: Verify all CTAs work**

Test each CTA scrolls to sign-in:
- Hero "Start Here" button
- Mid-page "Ready to find your people?" link
- Verify SignIn section Clerk integration still works

- [ ] **Step 5: Create final commit if any fixes needed**

If fixes were made:
```bash
git add -A
git commit -m "fix(landing): address final review issues"
```

---

## Summary

After completing all tasks:
- **Structure:** 5 sections instead of 8
- **Copy:** Clearer hero, "decentralized library" in BookshelfDemo, sharper section headlines
- **CTAs:** 3 strategic placements (hero, mid-page, sign-in)
- **Animation:** Faster hero (10 books, 0.3s max delay), faster facet cards (150ms stagger)
- **Mobile:** Hero has visual treatment instead of blank space
- **Footer:** Includes HowItWorks link
