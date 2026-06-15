<script lang="ts">
  let visible = $state(false);
  let sectionElement: HTMLElement;
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

  $effect(() => {
    if (!sectionElement) return;

    const observer = new IntersectionObserver(
      ([entry]) => { visible = entry.isIntersecting; },
      { threshold: 0.3 }
    );
    observer.observe(sectionElement);

    return () => observer.disconnect();
  });
</script>

<section class="bookshelf-section" bind:this={sectionElement} class:visible>
  <div class="section-content">
    <p class="eyebrow">Your shelf</p>
    <h2 class="section-title">Your shelf tells people who you are.</h2>
    <p class="section-desc">
      Every shelf is a branch of the neighborhood library. Add your books, mark what you'll share —
      that's how matches find you.
    </p>

    <div class="shelf-container">
      <div class="books-row">
        {#each demoBooks as book, i}
          <div
            class="book-spine"
            style="--delay: {i * 0.12}s"
          >
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
    </div>

    <p class="shelf-caption">Hover to see the marginalia</p>
  </div>
</section>

<style>
  .bookshelf-section {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--s-10) var(--s-6) var(--s-12);
    background: var(--canvas);
  }

  .section-content {
    text-align: center;
    max-width: 1000px;
  }

  .eyebrow {
    margin: 0 0 var(--s-3);
    opacity: 0;
    transform: translateY(14px);
    transition: opacity var(--dur-3) var(--ease-out), transform var(--dur-3) var(--ease-out);
  }

  .section-title {
    font-size: clamp(1.8rem, 4vw, 2.5rem);
    margin: 0 0 var(--s-4);
    opacity: 0;
    transform: translateY(18px);
    transition: opacity var(--dur-3) var(--ease-out), transform var(--dur-3) var(--ease-out);
  }

  .visible .eyebrow,
  .visible .section-title {
    opacity: 1;
    transform: translateY(0);
  }

  .section-desc {
    font-family: var(--font-ui);
    font-size: 1.15rem;
    color: var(--ink-muted);
    max-width: 640px;
    margin: 0 auto var(--s-10);
    line-height: 1.6;
    opacity: 0;
    transform: translateY(18px);
    transition: opacity var(--dur-3) var(--ease-out) 80ms, transform var(--dur-3) var(--ease-out) 80ms;
  }

  .visible .section-desc {
    opacity: 1;
    transform: translateY(0);
  }

  .shelf-container {
    position: relative;
    padding: var(--s-4) 0 var(--s-6);
    margin-bottom: var(--s-5);
  }

  .books-row {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    gap: var(--s-6);
    position: relative;
  }

  .book-spine {
    width: 140px;
    opacity: 0;
    transform: translateY(28px);
    transition: opacity var(--dur-3) var(--ease-out), transform var(--dur-3) var(--ease-out);
    transition-delay: var(--delay);
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--s-3);
  }

  .visible .book-spine {
    opacity: 1;
    transform: translateY(0);
  }

  .book-spine:hover {
    z-index: 10;
  }

  .book-front {
    position: relative;
    border-radius: var(--r-sm);
    overflow: hidden;
    box-shadow: var(--shadow-2);
    transition: transform var(--dur-2) var(--ease-spring), box-shadow var(--dur-2) var(--ease-out);
    width: 120px;
  }

  .book-spine:hover .book-front {
    transform: translateY(-6px);
    box-shadow: var(--shadow-3);
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
  }

  .shelf-caption {
    font-family: var(--font-ui);
    font-size: 0.9rem;
    color: var(--ink-faint);
    margin: 0;
    opacity: 0;
    transition: opacity var(--dur-3) var(--ease-soft) 600ms;
  }

  .visible .shelf-caption {
    opacity: 1;
  }

  @media (max-width: 768px) {
    .books-row {
      flex-wrap: wrap;
      gap: var(--s-4);
    }

    .book-spine {
      width: 92px;
    }

    .book-front,
    .book-front img,
    .cover-placeholder {
      width: 92px;
    }

    .book-front img,
    .cover-placeholder {
      height: 138px;
    }

    .book-note {
      display: none;
    }

    .shelf-caption {
      display: none;
    }
  }
</style>
