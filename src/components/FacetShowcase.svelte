<script lang="ts">
  let visible = $state(false);
  let sectionElement: HTMLElement;
  let revealedCards = $state<number[]>([]);

  const facets = [
    {
      name: "Shelf Twin",
      icon: "📚",
      tagline: "Same books, different shelf",
      example: "You both love Middlemarch, Beloved, and The Brothers Karamazov",
      weight: 3,
    },
    {
      name: "Reading Mentor",
      icon: "🎓",
      tagline: "They have what you seek",
      example: "They own 3 books on your 'looking for' list",
      weight: 2,
    },
    {
      name: "Local Source",
      icon: "🤝",
      tagline: "Borrow from your neighbor",
      example: "They're 0.8km away and lending 12 books",
      weight: 2,
    },
    {
      name: "Discussion Match",
      icon: "💬",
      tagline: "Talk philosophy over coffee",
      example: "Shared interests: Victorian literature, climate science",
      weight: 1,
    },
    {
      name: "Class Chain",
      icon: "🎒",
      tagline: "Alumni of the same syllabi",
      example: "Both have class resources for Intro to Psychology",
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
            }, 300 + i * 200);
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
    <h2 class="section-title">Five ways to find your people</h2>
    <p class="section-desc">
      Our matching algorithm finds connections through the books you read, not just the genres you like.
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
        stroke="url(#goldGradient)"
        stroke-width="2"
      />
      <defs>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="transparent" />
          <stop offset="20%" stop-color="var(--color-gold)" />
          <stop offset="80%" stop-color="var(--color-gold)" />
          <stop offset="100%" stop-color="transparent" />
        </linearGradient>
      </defs>
    </svg>

    <p class="facets-note">
      <span class="marginalia">The more dots, the stronger the signal</span>
    </p>
  </div>
</section>

<style>
  .facets-section {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-2xl);
    background: var(--color-parchment);
    position: relative;
  }

  .section-content {
    text-align: center;
    max-width: 1100px;
    width: 100%;
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
    font-size: 1.1rem;
    color: var(--color-ink-faded);
    margin: 0 0 var(--space-2xl);
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1) 0.1s;
  }

  .visible .section-desc {
    opacity: 1;
    transform: translateY(0);
  }

  .facets-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: var(--space-md);
    margin-bottom: var(--space-lg);
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
    transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .facet-card.revealed .card-inner {
    transform: rotateY(180deg);
  }

  .card-front,
  .card-back {
    position: absolute;
    inset: 0;
    backface-visibility: hidden;
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-md);
  }

  .card-front {
    background: linear-gradient(
      135deg,
      var(--color-mahogany) 0%,
      var(--color-mahogany-deep) 100%
    );
    box-shadow:
      0 4px 16px rgba(74, 44, 42, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .card-front::before {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--wood-grain);
    opacity: 0.3;
    border-radius: var(--radius-md);
  }

  .facet-icon {
    font-size: 3rem;
    position: relative;
    z-index: 1;
  }

  .tap-hint {
    position: absolute;
    bottom: var(--space-md);
    font-family: var(--font-body);
    font-size: 0.75rem;
    color: var(--color-gold-pale);
    font-style: italic;
    opacity: 0.7;
  }

  .card-back {
    background: var(--color-cream);
    border: 1px solid var(--color-gold-pale);
    transform: rotateY(180deg);
    box-shadow: 0 4px 16px rgba(74, 44, 42, 0.15);
  }

  .card-back::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(
      to right,
      var(--color-burgundy),
      var(--color-gold) 50%,
      var(--color-burgundy)
    );
    border-radius: var(--radius-md) var(--radius-md) 0 0;
  }

  .weight-indicator {
    display: flex;
    gap: 4px;
    margin-bottom: var(--space-sm);
  }

  .weight-dot {
    width: 8px;
    height: 8px;
    background: var(--color-gold);
    border-radius: 50%;
    box-shadow: 0 0 8px rgba(184, 134, 11, 0.4);
  }

  .facet-name {
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-ink);
    margin: 0 0 var(--space-xs);
  }

  .facet-tagline {
    font-family: var(--font-body);
    font-size: 0.9rem;
    color: var(--color-ink-faded);
    font-style: italic;
    margin: 0 0 var(--space-md);
  }

  .facet-example {
    background: var(--color-aged-paper);
    padding: var(--space-sm);
    border-radius: var(--radius-sm);
    border-left: 2px solid var(--color-gold-pale);
  }

  .example-label {
    display: block;
    font-family: var(--font-display);
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-ink-light);
    margin-bottom: 2px;
  }

  .example-text {
    font-family: var(--font-body);
    font-size: 0.8rem;
    color: var(--color-ink-faded);
    line-height: 1.4;
  }

  .connection-lines {
    width: 100%;
    height: 60px;
    margin: var(--space-md) 0;
  }

  .connection-path {
    stroke-dasharray: 1000;
    stroke-dashoffset: 1000;
    opacity: 0.6;
  }

  .connection-path.animate {
    animation: drawLine 1.5s ease forwards;
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
    font-family: var(--font-handwritten);
    font-size: 1.1rem;
    color: var(--color-ink-faded);
    transform: rotate(-1deg);
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
      grid-template-columns: repeat(2, 1fr);
    }

    .facet-card {
      height: 240px;
    }

    .connection-lines {
      display: none;
    }
  }
</style>
