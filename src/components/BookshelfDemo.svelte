<script lang="ts">
  let failedImages = $state<Set<number>>(new Set());

  function handleImageError(index: number) {
    failedImages = new Set([...failedImages, index]);
  }

  const demoBooks = [
    {
      title: "Small Gods",
      author: "Terry Pratchett",
      status: "discussable",
      statusLabel: "Let's discuss",
      cover: "/covers/0062237373.jpg",
      note: "Om is my favorite tortoise philosopher"
    },
    {
      title: "Gödel, Escher, Bach",
      author: "Douglas Hofstadter",
      status: "borrowable",
      statusLabel: "Will lend",
      cover: "/covers/0465026567.jpg",
      note: "You'll either love it or pretend to"
    },
    {
      title: "The Unbearable Lightness of Being",
      author: "Milan Kundera",
      status: "visible",
      statusLabel: "On my shelf",
      cover: "/covers/0061148520.jpg",
      note: "Every reading reveals something new"
    },
    {
      title: "Guards! Guards!",
      author: "Terry Pratchett",
      status: "giftable",
      statusLabel: "Free to good home",
      cover: "/covers/0062225758.jpg",
      note: "Own too many copies. A good problem."
    },
    {
      title: "The Dispossessed",
      author: "Ursula K. Le Guin",
      status: "seeking-home",
      statusLabel: "Looking for this",
      cover: "/covers/0061054887.jpg",
      note: "The ambiguous utopia awaits"
    },
  ];
</script>

<section class="bookshelf-section">
  <div class="section-content">
    <div class="lede-col">
      <p class="eyebrow">
        <span class="rule"></span>
        <span class="num">01</span>
        <span class="label">— Your shelf</span>
      </p>

      <h2 class="section-title">
        Your shelf tells people <em>who you are.</em>
      </h2>

      <p class="section-desc">
        Every shelf is a branch of the neighborhood library. Add your books, mark what you'll share.
        That's how matches find you.
      </p>

      <p class="scan-hint">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M14.5 4h2A1.5 1.5 0 0 1 18 5.5l1 1.5h1.5A1.5 1.5 0 0 1 22 8.5v9A1.5 1.5 0 0 1 20.5 19h-17A1.5 1.5 0 0 1 2 17.5v-9A1.5 1.5 0 0 1 3.5 7H5l1-1.5A1.5 1.5 0 0 1 7.5 4h2" />
          <circle cx="12" cy="12.5" r="3.5" />
        </svg>
        Point your phone at the barcode on the back of any book. It appears.
      </p>

      <p class="shelf-caption">Hover a cover to see the marginalia</p>
    </div>

    <div class="shelf-col">
      <div class="shelf-container">
        <div class="books-row">
          {#each demoBooks as book, i}
            <div class="book-spine">
              <div class="book-front">
                {#if failedImages.has(i)}
                  <div class="cover-placeholder">
                    <span>{book.title.charAt(0)}</span>
                  </div>
                {:else}
                  <img
                    src={book.cover}
                    alt={book.title}
                    width="120"
                    height="180"
                    loading="lazy"
                    onerror={() => handleImageError(i)}
                  />
                {/if}
              </div>
              <span class="pill" data-status={book.status}>{book.statusLabel}</span>
              <div class="book-note">
                <span class="marginalia">{book.note}</span>
              </div>
            </div>
          {/each}
        </div>
        <div class="shelf-plane" aria-hidden="true"></div>
      </div>
    </div>
  </div>
</section>

<style>
  .bookshelf-section {
    padding: clamp(5rem, 12vh, 9rem) clamp(1.25rem, 5vw, 5rem);
    background: var(--canvas);
  }

  .section-content {
    width: 100%;
    max-width: 1240px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
    align-items: center;
    gap: clamp(2.5rem, 6vw, 6rem);
  }

  /* ── Editorial header (left) ───────────────────────── */
  .lede-col {
    max-width: 32rem;
  }

  .eyebrow {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    margin: 0 0 var(--s-5);
    font-family: var(--font-ui);
    font-size: 0.78rem;
    font-weight: 590;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .eyebrow .rule {
    width: 30px;
    height: 1.5px;
    background: var(--accent);
    border-radius: 2px;
  }
  .eyebrow .num { color: var(--accent); }
  .eyebrow .label { color: var(--ink-muted); }

  .section-title {
    margin: 0 0 var(--s-5);
    font-family: var(--font-display);
    font-weight: 500;
    font-size: clamp(2rem, 4.5vw, 3.2rem);
    line-height: 1.04;
    letter-spacing: -0.03em;
    color: var(--ink);
  }
  .section-title em {
    font-style: italic;
    font-weight: 500;
    color: var(--accent);
  }

  .section-desc {
    margin: 0 0 var(--s-6);
    max-width: 46ch;
    font-family: var(--font-ui);
    font-size: 1.15rem;
    line-height: 1.6;
    color: var(--ink-muted);
  }

  .scan-hint {
    display: inline-flex;
    align-items: center;
    gap: var(--s-2);
    margin: 0 0 var(--s-5);
    padding: var(--s-2) var(--s-4);
    background: var(--accent-tint);
    border-radius: var(--r-full);
    font-family: var(--font-ui);
    font-size: 0.95rem;
    line-height: 1.4;
    color: var(--ink-muted);
  }
  .scan-hint svg {
    flex-shrink: 0;
    color: var(--accent);
  }

  .shelf-caption {
    font-family: var(--font-ui);
    font-size: 0.9rem;
    color: var(--ink-faint);
    margin: 0;
  }

  /* ── Composed shelf (right) ────────────────────────── */
  .shelf-col {
    min-width: 0;
  }

  .shelf-container {
    position: relative;
    padding: var(--s-5) 0 var(--s-8);
  }

  .books-row {
    display: flex;
    justify-content: flex-start;
    align-items: flex-end;
    position: relative;
    z-index: 1;
  }

  .book-spine {
    width: 120px;
    flex: 0 0 auto;
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--s-3);
  }
  /* Slightly-overlapping shelf row with a gentle alternating lift for depth. */
  .book-spine:not(:first-child) { margin-left: -22px; }
  .book-spine:nth-child(even) { margin-bottom: 14px; }

  .book-spine:hover {
    z-index: 10;
  }

  .book-front {
    position: relative;
    border-radius: var(--r-sm);
    overflow: hidden;
    box-shadow:
      0 1px 1px oklch(0 0 0 / 0.16),
      0 14px 30px var(--drop-shadow-color);
    transition: transform var(--dur-2) var(--ease-spring), box-shadow var(--dur-2) var(--ease-out);
    width: 120px;
  }

  .book-spine:hover .book-front {
    transform: translateY(-8px);
    box-shadow:
      0 2px 3px oklch(0 0 0 / 0.18),
      0 22px 46px var(--drop-shadow-color);
  }

  .book-front img {
    width: 120px;
    height: 180px;
    object-fit: cover;
    display: block;
  }

  .cover-placeholder {
    width: 120px;
    height: 180px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--accent-tint);
  }

  .cover-placeholder span {
    font-family: var(--font-display);
    font-size: 2.5rem;
    font-weight: 500;
    color: var(--accent);
  }

  /* Grounding "shelf" baseline beneath the covers. */
  .shelf-plane {
    position: absolute;
    left: -4%;
    right: -4%;
    bottom: var(--s-6);
    height: 1.5px;
    background: var(--hairline-strong);
    z-index: 0;
  }
  .shelf-plane::after {
    content: '';
    position: absolute;
    left: 6%;
    right: 6%;
    top: 1.5px;
    height: 26px;
    background: radial-gradient(60% 100% at 50% 0%, var(--drop-shadow-color) 0%, transparent 72%);
  }

  .book-note {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translate(-50%, -8px);
    width: 160px;
    margin-top: var(--s-2);
    background: var(--surface);
    border: 1px solid var(--hairline);
    border-radius: var(--r-md);
    box-shadow: var(--shadow-3);
    padding: var(--s-3);
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--dur-2) var(--ease-out), transform var(--dur-2) var(--ease-spring);
    z-index: 20;
  }

  .book-spine:hover .book-note {
    opacity: 1;
    transform: translate(-50%, 0);
  }

  .marginalia {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 0.95rem;
    color: var(--ink-muted);
    text-align: center;
    line-height: 1.4;
    display: block;
  }

  /* ── Responsive ────────────────────────────────────── */
  @media (max-width: 920px) {
    .section-content {
      grid-template-columns: 1fr;
      gap: clamp(2rem, 7vw, 3.5rem);
    }
    .lede-col { max-width: none; }
    .shelf-col { overflow-x: auto; }
    .books-row { justify-content: center; }
  }

  @media (max-width: 768px) {
    .books-row {
      flex-wrap: wrap;
      justify-content: center;
      align-items: flex-start;
      gap: var(--s-4);
    }

    .book-spine {
      width: 92px;
    }
    .book-spine:not(:first-child) { margin-left: 0; }
    .book-spine:nth-child(even) { margin-bottom: 0; }

    .book-front,
    .book-front img,
    .cover-placeholder {
      width: 92px;
    }

    .book-front img,
    .cover-placeholder {
      height: 138px;
    }

    .shelf-plane { display: none; }

    .book-note {
      display: none;
    }

    .shelf-caption {
      display: none;
    }
  }
</style>
