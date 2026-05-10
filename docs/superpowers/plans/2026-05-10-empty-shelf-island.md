# EmptyShelfIsland Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a rich empty shelf state that presents new users with two clear paths (add a book or explore nearby) and shows their evolving profile stats.

**Architecture:** New `EmptyShelfIsland.svelte` component conditionally rendered on `/shelf` when bookCount === 0. Stats computed via helpers in shelf store. "Add a Book" smooth-scrolls to existing AddBookIsland; "Explore Nearby" navigates to `/explore`.

**Tech Stack:** Svelte 5, nanostores, TypeScript

---

## File Structure

| File | Purpose |
|------|---------|
| `src/stores/shelf.ts` | Add `getShelfStats()` helper for lendable/discussable counts |
| `src/components/EmptyShelfIsland.svelte` | New component — empty state with stats bar + choice cards |
| `src/pages/shelf.astro` | Conditional render: EmptyShelfIsland when empty, ShelfIsland otherwise |

---

### Task 1: Add shelf stats helper

**Files:**
- Modify: `src/stores/shelf.ts:130-139` (after `getBookCount`)

- [ ] **Step 1: Add getShelfStats function**

Add this function after `getBookCount()` in `src/stores/shelf.ts`:

```typescript
export interface ShelfStats {
  total: number;
  lendable: number;
  discussable: number;
}

export function getShelfStats(): ShelfStats {
  const books = Object.values(shelf.get());
  return {
    total: books.length,
    lendable: books.filter(b => b.status === 'borrowable' || b.status === 'giftable').length,
    discussable: books.filter(b => b.status === 'discussable').length,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx astro check`
Expected: No errors related to shelf.ts

- [ ] **Step 3: Commit**

```bash
git add src/stores/shelf.ts
git commit -m "feat(shelf): add getShelfStats helper for empty state"
```

---

### Task 2: Create EmptyShelfIsland component

**Files:**
- Create: `src/components/EmptyShelfIsland.svelte`

- [ ] **Step 1: Create the component file**

Create `src/components/EmptyShelfIsland.svelte`:

```svelte
<script lang="ts">
  import { shelf, getShelfStats, type ShelfStats } from '../stores/shelf';
  import { profile } from '../stores/profile';
  import type { UserProfile } from '../lib/types';

  let stats = $state<ShelfStats>({ total: 0, lendable: 0, discussable: 0 });
  let userProfile = $state<UserProfile | null>(null);

  $effect(() => {
    const unsubShelf = shelf.subscribe(() => {
      stats = getShelfStats();
    });
    const unsubProfile = profile.subscribe((p) => {
      userProfile = p;
    });
    return () => {
      unsubShelf();
      unsubProfile();
    };
  });

  function scrollToAddBook() {
    const addBookSection = document.querySelector('.add-book-section');
    if (addBookSection) {
      addBookSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function goToExplore() {
    window.location.href = '/explore';
  }
</script>

<section class="empty-shelf">
  <!-- Stats Bar -->
  <div class="stats-bar">
    <div class="stats-left">
      <span class="shelf-title">Your Shelf</span>
      <span class="private-badge">Private</span>
    </div>
    <div class="stats-right">
      <span>{stats.lendable} to lend</span>
      <span class="dot">·</span>
      <span>{stats.discussable} to discuss</span>
      <span class="dot">·</span>
      <span class="muted">no topics yet</span>
    </div>
  </div>

  <!-- Choice Cards -->
  <div class="choices">
    <button class="choice-card primary" onclick={scrollToAddBook}>
      <span class="corner-dot top-left"></span>
      <span class="corner-dot top-right"></span>
      <span class="icon">📖</span>
      <span class="title">Add a Book</span>
      <span class="subtitle">Scan barcode or search by title</span>
    </button>

    <button class="choice-card secondary" onclick={goToExplore}>
      <span class="corner-dot top-left"></span>
      <span class="corner-dot top-right"></span>
      <span class="icon">🔍</span>
      <span class="title">Explore Nearby</span>
      <span class="subtitle">Books & readers in your area</span>
    </button>
  </div>
</section>

<style>
  .empty-shelf {
    margin-top: 2rem;
  }

  /* Stats Bar */
  .stats-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-inset);
    margin-bottom: 1.25rem;
  }

  .stats-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .shelf-title {
    font-family: var(--font-display);
    font-weight: 600;
    color: var(--color-ink);
  }

  .private-badge {
    background: var(--color-burgundy);
    color: var(--color-cream);
    padding: 0.125rem 0.625rem;
    border-radius: 12px;
    font-size: 0.6875rem;
    letter-spacing: 0.025em;
  }

  .stats-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.8125rem;
    color: var(--color-ink-faded);
  }

  .dot {
    color: var(--color-gold-pale);
  }

  .muted {
    color: var(--color-ink-light);
  }

  /* Choice Cards */
  .choices {
    display: flex;
    gap: 1rem;
  }

  .choice-card {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1.5rem;
    border-radius: var(--radius-md);
    cursor: pointer;
    position: relative;
    transition: all var(--transition-gentle);
    border: none;
    font-family: inherit;
  }

  .choice-card.primary {
    background: linear-gradient(to bottom, var(--color-forest), var(--color-forest-dark));
    color: var(--color-cream);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .choice-card.primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .choice-card.secondary {
    background: var(--color-paper);
    border: 2px solid var(--color-burgundy);
    color: var(--color-ink);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .choice-card.secondary:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    border-color: var(--color-burgundy-dark);
  }

  .corner-dot {
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    opacity: 0.2;
  }

  .primary .corner-dot {
    background: rgba(255, 255, 255, 1);
  }

  .secondary .corner-dot {
    background: var(--color-burgundy);
  }

  .top-left {
    top: 6px;
    left: 6px;
  }

  .top-right {
    top: 6px;
    right: 6px;
  }

  .icon {
    font-size: 2rem;
    margin-bottom: 0.75rem;
  }

  .title {
    font-family: var(--font-display);
    font-size: 1.125rem;
    font-weight: 600;
  }

  .choice-card.secondary .title {
    color: var(--color-burgundy);
  }

  .subtitle {
    font-size: 0.8125rem;
    margin-top: 0.375rem;
    opacity: 0.85;
  }

  .choice-card.secondary .subtitle {
    color: var(--color-ink-faded);
  }

  /* Focus states */
  .choice-card:focus {
    outline: 2px solid var(--color-gold);
    outline-offset: 2px;
  }

  /* Responsive */
  @media (max-width: 600px) {
    .stats-bar {
      flex-direction: column;
      gap: 0.5rem;
      text-align: center;
    }

    .stats-right {
      flex-wrap: wrap;
      justify-content: center;
    }

    .choices {
      flex-direction: column;
    }
  }
</style>
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx astro check`
Expected: No errors related to EmptyShelfIsland.svelte

- [ ] **Step 3: Commit**

```bash
git add src/components/EmptyShelfIsland.svelte
git commit -m "feat: add EmptyShelfIsland component"
```

---

### Task 3: Wire up conditional rendering in shelf.astro

**Files:**
- Modify: `src/pages/shelf.astro`

- [ ] **Step 1: Import EmptyShelfIsland**

In `src/pages/shelf.astro`, add the import after line 4:

```astro
import EmptyShelfIsland from '../components/EmptyShelfIsland.svelte';
```

- [ ] **Step 2: Add class to AddBookIsland for scroll targeting**

Change the AddBookIsland line from:

```astro
<AddBookIsland client:load />
```

To:

```astro
<div class="add-book-section">
  <AddBookIsland client:load />
</div>
```

- [ ] **Step 3: Create ShelfContainer component for conditional render**

Since Astro pages are static and we need client-side reactivity, we'll create a small wrapper. Create `src/components/ShelfContainer.svelte`:

```svelte
<script lang="ts">
  import { shelf } from '../stores/shelf';
  import ShelfIsland from './ShelfIsland.svelte';
  import EmptyShelfIsland from './EmptyShelfIsland.svelte';

  let isEmpty = $state(true);

  $effect(() => {
    const unsub = shelf.subscribe((s) => {
      isEmpty = Object.keys(s).length === 0;
    });
    return unsub;
  });
</script>

{#if isEmpty}
  <EmptyShelfIsland />
{:else}
  <ShelfIsland />
{/if}
```

- [ ] **Step 4: Update shelf.astro to use ShelfContainer**

Replace the full content of `src/pages/shelf.astro`:

```astro
---
import Layout from '../layouts/Layout.astro';
import AddBookIsland from '../components/AddBookIsland.svelte';
import ShelfContainer from '../components/ShelfContainer.svelte';
import PromptIsland from '../components/PromptIsland.svelte';
import { Show, UserButton } from '@clerk/astro/components';
---

<Layout title="Your Shelf | biblocal">
  <Show when="signed-out">
    <script>window.location.href = '/';</script>
  </Show>
  <Show when="signed-in">
    <main>
      <div class="header-row">
        <h1>Your Shelf</h1>
        <UserButton />
      </div>

      <PromptIsland client:load context="shelf" />

      <div class="add-book-section">
        <AddBookIsland client:load />
      </div>

      <ShelfContainer client:load />
    </main>
  </Show>
</Layout>

<style>
  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
</style>
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx astro check`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/components/ShelfContainer.svelte src/pages/shelf.astro
git commit -m "feat: conditional render EmptyShelfIsland when shelf empty"
```

---

### Task 4: Manual verification

**Files:** None (testing only)

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Clear localStorage to simulate new user**

In browser console:
```javascript
localStorage.clear();
location.reload();
```

- [ ] **Step 3: Complete onboarding and verify empty state**

1. Go to `/` and complete onboarding (enter name, city)
2. Land on `/shelf`
3. Verify: stats bar shows "Your Shelf [Private] 0 to lend · 0 to discuss · no topics yet"
4. Verify: two choice cards appear (Add a Book, Explore Nearby)

- [ ] **Step 4: Test "Add a Book" scroll**

1. Click "Add a Book" card
2. Verify: page smooth-scrolls to AddBookIsland

- [ ] **Step 5: Test "Explore Nearby" navigation**

1. Click "Explore Nearby" card
2. Verify: navigates to `/explore` (may show 404 if not built — that's expected)

- [ ] **Step 6: Test transition to populated shelf**

1. Go back to `/shelf`
2. Add a book (use manual entry: title "Test Book", author "Test Author")
3. Verify: EmptyShelfIsland disappears
4. Verify: ShelfIsland appears with the book

- [ ] **Step 7: Test responsive layout**

1. Resize browser to mobile width (~375px)
2. Verify: stats bar stacks vertically
3. Verify: choice cards stack vertically

- [ ] **Step 8: Final commit if any fixes needed**

If you made any fixes during testing:
```bash
git add -A
git commit -m "fix: polish EmptyShelfIsland after testing"
```

---

## Verification Complete

All tasks implement the spec at `docs/superpowers/specs/2026-05-10-empty-shelf-state-design.md`. The `/explore` page is out of scope for this plan.
