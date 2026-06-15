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

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !visible) {
          visible = true;
          facets.forEach((_, i) => {
            timeouts.push(
              setTimeout(() => {
                revealedCards = [...revealedCards, i];
              }, 200 + i * 120)
            );
          });
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(sectionElement);

    return () => {
      observer.disconnect();
      timeouts.forEach((id) => clearTimeout(id));
    };
  });
</script>

<section class="facets-section" bind:this={sectionElement} class:visible aria-labelledby="facets-title">
  <div class="section-inner">
    <header class="section-head">
      <p class="eyebrow"><span class="rule"></span><span class="num">02</span> — Find your people</p>
      <h2 id="facets-title" class="section-title">
        Five ways we match you with <em>the right people.</em>
      </h2>
      <p class="section-lede">
        Not just who's nearby — who actually gets the reference. Each signal adds
        weight; together they find the readers worth meeting.
      </p>
    </header>

    <ol class="facets-grid">
      {#each facets as facet, i}
        <li
          class="facet-card"
          class:revealed={revealedCards.includes(i)}
          style="--index: {i}"
        >
          <div class="facet-top">
            <span class="facet-icon" aria-hidden="true">{facet.icon}</span>
            <span class="weight-indicator" aria-label="Connection strength {facet.weight} of 3">
              {#each Array(3) as _, w}
                <span class="weight-dot" class:on={w < facet.weight}></span>
              {/each}
            </span>
          </div>

          <h3 class="facet-name">{facet.name}</h3>
          <p class="facet-tagline">{facet.tagline}</p>

          <div class="facet-example">
            <span class="example-label">Example</span>
            <span class="example-text">{facet.example}</span>
          </div>
        </li>
      {/each}
    </ol>

    <p class="facets-note">
      <span class="marginalia">More dots, stronger connection — simple as that.</span>
    </p>
  </div>
</section>

<style>
  .facets-section {
    position: relative;
    padding: clamp(5rem, 12vh, 9rem) clamp(1.25rem, 5vw, 5rem);
    background: var(--surface-sunken);
  }

  .section-inner {
    max-width: 1240px;
    margin: 0 auto;
  }

  /* ── Editorial header ───────────────────────────────── */
  .section-head {
    max-width: 52rem;
    margin-bottom: clamp(2.5rem, 5vw, 4rem);
  }

  .eyebrow {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    margin: 0 0 var(--s-5);
    font-family: var(--font-ui);
    font-size: 0.78rem;
    font-weight: 590;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-muted);
    opacity: 0;
    transform: translateY(14px);
    transition: opacity var(--dur-3) var(--ease-out), transform var(--dur-3) var(--ease-out);
  }
  .eyebrow .rule {
    width: 30px;
    height: 1.5px;
    background: var(--accent);
    border-radius: 2px;
    flex: none;
  }
  .eyebrow .num { color: var(--accent); }

  .section-title {
    margin: 0 0 var(--s-5);
    font-family: var(--font-display);
    font-weight: 500;
    font-size: clamp(2rem, 4.5vw, 3.2rem);
    line-height: 1.04;
    letter-spacing: -0.03em;
    color: var(--ink);
    opacity: 0;
    transform: translateY(18px);
    transition: opacity var(--dur-3) var(--ease-out) 60ms, transform var(--dur-3) var(--ease-out) 60ms;
  }
  .section-title em {
    font-style: italic;
    font-weight: 500;
    color: var(--accent);
  }

  .section-lede {
    margin: 0;
    max-width: 46ch;
    font-family: var(--font-ui);
    font-size: 1.15rem;
    line-height: 1.55;
    color: var(--ink-muted);
    opacity: 0;
    transform: translateY(18px);
    transition: opacity var(--dur-3) var(--ease-out) 120ms, transform var(--dur-3) var(--ease-out) 120ms;
  }

  .visible .eyebrow,
  .visible .section-title,
  .visible .section-lede {
    opacity: 1;
    transform: translateY(0);
  }

  /* ── Facet grid ─────────────────────────────────────── */
  .facets-grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: clamp(0.9rem, 1.6vw, 1.5rem);
  }

  .facet-card {
    display: flex;
    flex-direction: column;
    padding: clamp(1.4rem, 2vw, 1.9rem);
    background: var(--surface);
    border: 1px solid var(--hairline);
    border-radius: var(--r-lg);
    box-shadow: var(--shadow-1);
    opacity: 0;
    transform: translateY(22px);
    transition: opacity var(--dur-4) var(--ease-out),
                transform var(--dur-4) var(--ease-out),
                border-color var(--dur-2) var(--ease-out),
                box-shadow var(--dur-2) var(--ease-out);
  }
  .facet-card.revealed {
    opacity: 1;
    transform: translateY(0);
  }
  .facet-card:hover {
    border-color: var(--hairline-strong);
    box-shadow: var(--shadow-2);
  }

  /* The first facet (strongest signal) is emphasized with an accent wash. */
  .facet-card:nth-child(1) {
    background:
      radial-gradient(120% 90% at 100% 0%, var(--accent-tint) 0%, transparent 60%),
      var(--surface);
  }
  .facet-example { margin-top: auto; }

  .facet-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--s-5);
  }

  .facet-icon {
    font-size: 1.9rem;
    line-height: 1;
  }
  .facet-card:nth-child(1) .facet-icon { font-size: 2.6rem; }

  .weight-indicator {
    display: inline-flex;
    gap: 5px;
  }
  .weight-dot {
    width: 7px;
    height: 7px;
    border-radius: var(--r-full);
    background: var(--hairline-strong);
    transition: background var(--dur-2) var(--ease-out);
  }
  .weight-dot.on { background: var(--accent); }

  .facet-name {
    margin: 0 0 var(--s-1);
    font-family: var(--font-display);
    font-weight: 500;
    font-size: clamp(1.25rem, 1.8vw, 1.5rem);
    line-height: 1.1;
    letter-spacing: -0.01em;
    color: var(--ink);
  }
  .facet-card:nth-child(1) .facet-name { font-size: clamp(1.5rem, 2.4vw, 2rem); }

  .facet-tagline {
    margin: 0 0 var(--s-4);
    font-family: var(--font-ui);
    font-size: 0.95rem;
    color: var(--ink-muted);
  }

  .facet-example {
    margin-top: auto;
    padding-left: var(--s-4);
    border-left: 2px solid var(--accent);
  }
  .example-label {
    display: block;
    font-family: var(--font-ui);
    font-size: 0.65rem;
    font-weight: 640;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-faint);
    margin-bottom: 3px;
  }
  .example-text {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 1rem;
    line-height: 1.4;
    color: var(--ink-muted);
  }

  .facets-note {
    margin: clamp(2rem, 4vw, 3rem) 0 0;
  }
  .marginalia {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 1.05rem;
    color: var(--ink-faint);
  }

  /* ── Responsive ─────────────────────────────────────── */
  @media (max-width: 880px) {
    .facets-grid { grid-template-columns: repeat(2, 1fr); }
    .facet-card:nth-child(1) {
      grid-row: auto;
      grid-column: span 2;
    }
  }

  @media (max-width: 560px) {
    .facets-grid { grid-template-columns: 1fr; }
    .facet-card:nth-child(1) { grid-column: auto; }
  }

  @media (prefers-reduced-motion: reduce) {
    .eyebrow,
    .section-title,
    .section-lede,
    .facet-card {
      transition: none;
      opacity: 1;
      transform: none;
    }
  }
</style>
