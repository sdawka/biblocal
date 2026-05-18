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
      status: "seeking",
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
    <h2 class="section-title">Start with your shelf. The rest follows.</h2>
    <p class="section-desc">
      Add the books that matter. Mark the ones you'd lend, discuss, or give away.<br/>
      The rest is just connecting people who should probably meet.
    </p>

    <div class="shelf-container">
      <div class="shelf-back"></div>
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
              <span class="status-badge {book.status}">{book.statusLabel}</span>
            </div>
            <div class="book-page">
              <span class="marginalia">{book.note}</span>
            </div>
          </div>
        {/each}
      </div>
      <div class="shelf-front"></div>
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
    padding: var(--space-2xl);
    background: linear-gradient(
      to bottom,
      var(--color-parchment) 0%,
      var(--color-aged-paper) 100%
    );
  }

  .section-content {
    text-align: center;
    max-width: 1000px;
  }

  .section-title {
    font-family: var(--font-display);
    font-size: clamp(1.8rem, 4vw, 2.5rem);
    font-weight: 600;
    color: var(--color-ink);
    margin: 0 0 var(--space-md);
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .visible .section-title {
    opacity: 1;
    transform: translateY(0);
  }

  .section-desc {
    font-family: var(--font-body);
    font-size: 1.15rem;
    color: var(--color-ink-faded);
    margin: 0 0 var(--space-2xl);
    font-style: italic;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1) 0.1s;
  }

  .visible .section-desc {
    opacity: 1;
    transform: translateY(0);
  }

  .shelf-container {
    position: relative;
    padding: var(--space-xl) var(--space-lg) var(--space-lg);
    margin-bottom: var(--space-lg);
  }

  .shelf-back {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      var(--color-mahogany-deep) 0%,
      var(--color-mahogany) 40%,
      var(--color-mahogany-light) 100%
    );
    border-radius: var(--radius-md);
    box-shadow:
      inset 0 2px 10px rgba(0, 0, 0, 0.3),
      0 4px 20px rgba(74, 44, 42, 0.25);
  }

  .shelf-back::before {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--wood-grain);
    opacity: 0.5;
    border-radius: var(--radius-md);
  }

  .books-row {
    display: flex;
    justify-content: center;
    gap: var(--space-xl);
    position: relative;
    z-index: 2;
    padding-bottom: var(--space-md);
  }

  .shelf-front {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 20px;
    background: linear-gradient(
      to bottom,
      var(--color-mahogany-light),
      var(--color-mahogany)
    );
    border-radius: 0 0 var(--radius-md) var(--radius-md);
    box-shadow:
      0 4px 8px rgba(0, 0, 0, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    z-index: 3;
  }

  .shelf-front::before {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--wood-grain-subtle);
    border-radius: 0 0 var(--radius-md) var(--radius-md);
  }

  .book-spine {
    width: 120px;
    perspective: 800px;
    opacity: 0;
    transform: translateY(30px);
    transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    transition-delay: var(--delay);
    position: relative;
    z-index: 1;
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
    transform-origin: left center;
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: var(--radius-sm);
    overflow: hidden;
    box-shadow:
      4px 4px 12px rgba(0, 0, 0, 0.25),
      inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  }

  .book-spine:hover .book-front {
    transform: rotateY(-25deg) translateX(10px);
  }

  .book-front img {
    width: 100%;
    height: 180px;
    object-fit: cover;
    display: block;
  }

  .cover-placeholder {
    width: 100%;
    height: 180px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(to bottom, var(--color-mahogany-light), var(--color-mahogany));
  }

  .cover-placeholder span {
    font-family: var(--font-display);
    font-size: 2.5rem;
    font-weight: 600;
    font-style: italic;
    color: var(--color-gold);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  .status-badge {
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    padding: 0.2rem 0.5rem;
    font-family: var(--font-display);
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-radius: 2px;
    white-space: nowrap;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .status-badge.borrowable {
    background: var(--color-forest);
    color: var(--color-cream);
  }

  .status-badge.discussable {
    background: var(--color-gold);
    color: var(--color-ink);
  }

  .status-badge.giftable {
    background: var(--color-burgundy);
    color: var(--color-cream);
  }

  .status-badge.seeking {
    background: var(--color-brass);
    color: var(--color-ink);
  }

  .status-badge.visible {
    background: var(--color-ink-faded);
    color: var(--color-cream);
  }

  .book-page {
    position: absolute;
    top: 10px;
    left: 100%;
    width: 90px;
    height: 160px;
    background: var(--color-aged-paper);
    border-radius: 0 2px 2px 0;
    padding: var(--space-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transform: translateX(-20px);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.15s;
    box-shadow: inset 2px 0 8px rgba(0, 0, 0, 0.1);
    z-index: 5;
  }

  .book-spine:hover .book-page {
    opacity: 1;
    transform: translateX(-10px);
  }

  .marginalia {
    font-family: var(--font-handwritten);
    font-size: 1rem;
    color: var(--color-ink-faded);
    text-align: center;
    line-height: 1.4;
    transform: rotate(-2deg);
  }

  .shelf-caption {
    font-family: var(--font-body);
    font-size: 0.9rem;
    color: var(--color-ink-light);
    font-style: italic;
    margin: 0;
    opacity: 0;
    transition: opacity 0.5s ease 0.8s;
  }

  .visible .shelf-caption {
    opacity: 1;
  }

  @media (max-width: 768px) {
    .books-row {
      flex-wrap: wrap;
      gap: var(--space-sm);
    }

    .book-spine {
      width: 90px;
    }

    .book-front img {
      height: 140px;
    }

    .book-page {
      display: none;
    }

    .shelf-caption {
      display: none;
    }
  }
</style>
