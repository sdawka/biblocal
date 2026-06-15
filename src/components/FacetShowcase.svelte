<script lang="ts">
  let visible = $state(false);
  let sectionElement: HTMLElement;
  let revealedCards = $state<number[]>([]);

  const facets = [
    {
      name: "Shelf Twin",
      icon: "📚",
      tagline: "Suspiciously similar shelves",
      example: "You both kept the same obscure Calvino. Coincidence doesn't cover it.",
      weight: 3,
    },
    {
      name: "Book Scout",
      icon: "🔭",
      tagline: "They've been where you're going",
      example: "Owns three books on your maybe-someday list",
      weight: 2,
    },
    {
      name: "Neighbor",
      icon: "🏡",
      tagline: "Walking distance",
      example: "800 meters away. Has the book. Likes coffee.",
      weight: 2,
    },
    {
      name: "Debate Partner",
      icon: "☕",
      tagline: "Productive disagreement",
      example: "You'll argue about Kundera for an hour and both enjoy it",
      weight: 1,
    },
    {
      name: "Syllabus Survivor",
      icon: "📝",
      tagline: "Shared academic scars",
      example: "Both required to read it. Both actually did.",
      weight: 1,
    },
  ];

  $effect(() => {
    if (!sectionElement) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !visible) {
          visible = true;
          facets.forEach((_, i) => {
            setTimeout(() => {
              revealedCards = [...revealedCards, i];
            }, 200 + i * 150);
          });
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(sectionElement);

    return () => observer.disconnect();
  });
</script>

<section class="facets-section" bind:this={sectionElement} class:visible>
  <div class="section-content">
    <p class="eyebrow">Find your people</p>
    <h2 class="section-title">Five ways we match you with the right people.</h2>
    <p class="section-desc">
      Not just who's nearby — who actually gets the reference.
    </p>

    <div class="facets-grid">
      {#each facets as facet, i}
        <div
          class="facet-card"
          class:revealed={revealedCards.includes(i)}
          style="--index: {i}"
        >
          <div class="card-inner">
            <div class="card-front">
              <span class="facet-icon">{facet.icon}</span>
              <span class="tap-hint">Tap to reveal</span>
            </div>
            <div class="card-back">
              <div class="weight-indicator">
                {#each Array(facet.weight) as _}
                  <span class="weight-dot"></span>
                {/each}
              </div>
              <h3 class="facet-name">{facet.name}</h3>
              <p class="facet-tagline">{facet.tagline}</p>
              <div class="facet-example">
                <span class="example-label">Example:</span>
                <span class="example-text">{facet.example}</span>
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>

    <svg class="connection-lines" viewBox="0 0 800 100" preserveAspectRatio="none">
      <path
        class="connection-path"
        class:animate={revealedCards.length === 5}
        d="M80,50 C200,20 300,80 400,50 C500,20 600,80 720,50"
        fill="none"
        stroke="url(#accentGradient)"
        stroke-width="2"
      />
      <defs>
        <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="transparent" />
          <stop offset="20%" stop-color="var(--accent)" />
          <stop offset="80%" stop-color="var(--accent)" />
          <stop offset="100%" stop-color="transparent" />
        </linearGradient>
      </defs>
    </svg>

    <p class="facets-note">
      <span class="marginalia">More dots = stronger connection. Simple as that.</span>
    </p>
  </div>
</section>

<style>
  .facets-section {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--s-10) var(--s-6) var(--s-12);
    background: var(--surface-sunken);
    position: relative;
  }

  .section-content {
    text-align: center;
    max-width: 1100px;
    width: 100%;
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
    font-size: 1.1rem;
    color: var(--ink-muted);
    margin: 0 auto var(--s-10);
    max-width: 600px;
    opacity: 0;
    transform: translateY(18px);
    transition: opacity var(--dur-3) var(--ease-out) 80ms, transform var(--dur-3) var(--ease-out) 80ms;
  }

  .visible .section-desc {
    opacity: 1;
    transform: translateY(0);
  }

  .facets-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: var(--s-4);
    margin-bottom: var(--s-5);
  }

  .facet-card {
    perspective: 1000px;
    height: 280px;
  }

  .card-inner {
    position: relative;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    transition: transform 0.8s var(--ease-out);
  }

  .facet-card.revealed .card-inner {
    transform: rotateY(180deg);
  }

  .card-front,
  .card-back {
    position: absolute;
    inset: 0;
    backface-visibility: hidden;
    border-radius: var(--r-lg);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--s-4);
  }

  .card-front {
    background: var(--accent);
    box-shadow: var(--shadow-2);
  }

  .facet-icon {
    font-size: 3rem;
    position: relative;
    z-index: 1;
  }

  .tap-hint {
    position: absolute;
    bottom: var(--s-4);
    font-family: var(--font-ui);
    font-size: 0.75rem;
    color: var(--accent-on);
    opacity: 0.75;
  }

  .card-back {
    background: var(--surface);
    border: 1px solid var(--hairline);
    transform: rotateY(180deg);
    box-shadow: var(--shadow-1);
  }

  .card-back::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--accent);
    border-radius: var(--r-lg) var(--r-lg) 0 0;
  }

  .weight-indicator {
    display: flex;
    gap: 4px;
    margin-bottom: var(--s-3);
  }

  .weight-dot {
    width: 8px;
    height: 8px;
    background: var(--accent);
    border-radius: var(--r-full);
  }

  .facet-name {
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-weight: 500;
    color: var(--ink);
    margin: 0 0 var(--s-1);
  }

  .facet-tagline {
    font-family: var(--font-ui);
    font-size: 0.9rem;
    color: var(--ink-muted);
    margin: 0 0 var(--s-3);
  }

  .facet-example {
    background: var(--surface-sunken);
    padding: var(--s-3);
    border-radius: var(--r-sm);
    border-left: 2px solid var(--accent);
    text-align: left;
  }

  .example-label {
    display: block;
    font-family: var(--font-ui);
    font-size: 0.65rem;
    font-weight: 640;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-faint);
    margin-bottom: 2px;
  }

  .example-text {
    font-family: var(--font-ui);
    font-size: 0.8rem;
    color: var(--ink-muted);
    line-height: 1.4;
  }

  .connection-lines {
    width: 100%;
    height: 60px;
    margin: var(--s-4) 0;
  }

  .connection-path {
    stroke-dasharray: 1000;
    stroke-dashoffset: 1000;
    opacity: 0.7;
  }

  .connection-path.animate {
    animation: drawLine 1.5s var(--ease-out) forwards;
  }

  @keyframes drawLine {
    to {
      stroke-dashoffset: 0;
    }
  }

  .facets-note {
    margin: 0;
  }

  .marginalia {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 1.1rem;
    color: var(--ink-muted);
    display: inline-block;
  }

  @media (max-width: 900px) {
    .facets-grid {
      grid-template-columns: repeat(3, 1fr);
    }

    .facet-card:nth-child(4),
    .facet-card:nth-child(5) {
      grid-column: span 1;
    }
  }

  @media (max-width: 600px) {
    .facets-grid {
      grid-template-columns: 1fr;
      gap: var(--s-4);
    }

    .facet-card {
      height: auto;
      min-height: 200px;
    }

    .card-inner {
      transform: rotateY(180deg);
    }

    .card-front {
      display: none;
    }

    .card-back {
      position: relative;
    }

    .connection-lines {
      display: none;
    }

    .section-title {
      font-size: 1.5rem;
    }
  }
</style>
