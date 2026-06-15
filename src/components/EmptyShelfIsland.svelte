<script lang="ts">
  import { shelf, getShelfStats, type ShelfStats } from '../stores/shelf';

  let stats = $state<ShelfStats>({ total: 0, lendable: 0, discussable: 0 });

  $effect(() => {
    const unsub = shelf.subscribe(() => {
      stats = getShelfStats();
    });
    return unsub;
  });

  function scrollToAddBook() {
    const addBookSection = document.querySelector('.add-book-section');
    if (addBookSection) {
      addBookSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function goToExplore() {
    window.location.href = '/matches';
  }
</script>

<section class="empty-shelf">
  <!-- Stats Bar -->
  <div class="stats-bar card">
    <div class="stats-left">
      <span class="shelf-title serif">Your Shelf</span>
      <span class="pill" data-status="private">Private</span>
    </div>
    <div class="stats-right">
      <span>{stats.lendable} to lend</span>
      <span class="dot" aria-hidden="true">·</span>
      <span>{stats.discussable} to discuss</span>
      <span class="dot" aria-hidden="true">·</span>
      <span class="faint">no topics yet</span>
    </div>
  </div>

  <!-- Ghost Books Preview -->
  <div class="ghost-shelf">
    <div class="ghost-books" aria-hidden="true">
      <div class="ghost-book one"></div>
      <div class="ghost-book two"></div>
      <div class="ghost-book three"></div>
    </div>
    <p class="ghost-hint faint">Your books will appear here</p>
  </div>

  <!-- Choice Cards -->
  <div class="choices">
    <button type="button" class="choice-card card card-interactive primary" onclick={scrollToAddBook}>
      <span class="icon" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      </span>
      <span class="title serif">Add a Book</span>
      <span class="subtitle muted">Scan barcode or search by title</span>
    </button>

    <button type="button" class="choice-card card card-interactive secondary" onclick={goToExplore}>
      <span class="icon" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </span>
      <span class="title serif">Explore Nearby</span>
      <span class="subtitle muted">Books &amp; readers in your area</span>
    </button>
  </div>
</section>

<style>
  .empty-shelf {
    margin-top: var(--s-7);
  }

  /* Stats Bar */
  .stats-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--s-4);
    padding: var(--s-3) var(--s-4);
    margin-bottom: var(--s-5);
  }

  .stats-left {
    display: flex;
    align-items: center;
    gap: var(--s-2);
  }

  .shelf-title {
    font-size: 1.0625rem;
    font-weight: 500;
    color: var(--ink);
  }

  .stats-right {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    font-size: 0.8125rem;
    color: var(--ink-muted);
  }

  .dot {
    color: var(--ink-faint);
  }

  /* Choice Cards */
  .choices {
    display: flex;
    gap: var(--s-4);
  }

  .choice-card {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--s-6);
    font-family: inherit;
    text-align: center;
  }

  .choice-card.primary {
    background: var(--accent);
    border-color: var(--accent);
  }

  .choice-card.primary .icon,
  .choice-card.primary .title {
    color: var(--accent-on);
  }

  .choice-card.primary .subtitle {
    color: var(--accent-on);
    opacity: 0.85;
  }

  .choice-card.secondary {
    border-color: var(--hairline-strong);
  }

  .choice-card.secondary .icon {
    color: var(--accent);
  }

  .icon {
    display: inline-flex;
    margin-bottom: var(--s-3);
    color: var(--ink);
  }

  .title {
    font-size: 1.1875rem;
    font-weight: 500;
    letter-spacing: -0.01em;
    color: var(--ink);
  }

  .subtitle {
    font-size: 0.8125rem;
    margin-top: var(--s-1);
  }

  /* Ghost Books Preview */
  .ghost-shelf {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--s-6) var(--s-4);
    margin-bottom: var(--s-5);
  }

  .ghost-books {
    display: flex;
    gap: var(--s-3);
    justify-content: center;
  }

  .ghost-book {
    width: 50px;
    height: 75px;
    border-radius: var(--r-sm);
    box-shadow: var(--shadow-1);
    background: var(--accent-tint);
  }

  .ghost-book.one { opacity: 0.85; }
  .ghost-book.two { opacity: 0.6; }
  .ghost-book.three { opacity: 0.4; }

  .ghost-hint {
    margin: var(--s-4) 0 0;
    font-size: 0.875rem;
  }

  /* Responsive */
  @media (max-width: 600px) {
    .stats-bar {
      flex-direction: column;
      align-items: center;
      gap: var(--s-2);
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
