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

  <!-- Ghost Books Preview -->
  <div class="ghost-shelf">
    <div class="ghost-books">
      <div class="ghost-book gold"></div>
      <div class="ghost-book burgundy"></div>
      <div class="ghost-book forest"></div>
    </div>
    <p class="ghost-hint">Your books will appear here</p>
  </div>

  <!-- Choice Cards -->
  <div class="choices">
    <button type="button" class="choice-card primary" onclick={scrollToAddBook}>
      <span class="corner-dot top-left"></span>
      <span class="corner-dot top-right"></span>
      <span class="icon">📖</span>
      <span class="title">Add a Book</span>
      <span class="subtitle">Scan barcode or search by title</span>
    </button>

    <button type="button" class="choice-card secondary" onclick={goToExplore}>
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

  /* Ghost Books Preview */
  .ghost-shelf {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem 1rem;
    margin-bottom: 1.25rem;
  }

  .ghost-books {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
  }

  .ghost-book {
    width: 50px;
    height: 75px;
    border-radius: 3px;
    box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.1);
  }

  .ghost-book.gold {
    background: linear-gradient(180deg, var(--color-gold-light) 0%, var(--color-brass) 100%);
    opacity: 0.5;
  }

  .ghost-book.burgundy {
    background: linear-gradient(180deg, var(--color-burgundy-light) 0%, var(--color-burgundy) 100%);
    opacity: 0.35;
  }

  .ghost-book.forest {
    background: linear-gradient(180deg, var(--color-forest-light) 0%, var(--color-forest) 100%);
    opacity: 0.25;
  }

  .ghost-hint {
    margin: 1rem 0 0;
    font-family: var(--font-body);
    font-size: 0.875rem;
    font-style: italic;
    color: var(--color-ink-light);
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
