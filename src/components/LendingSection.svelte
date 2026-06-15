<script lang="ts">
  let visible = $state(false);
  let sectionElement: HTMLElement;

  const scenarios = [
    {
      icon: "📖",
      title: "Lend it properly this time",
      description: "Mark it 'will lend' — and actually remember who borrowed it. Revolutionary, we know."
    },
    {
      icon: "🔍",
      title: "Find that elusive copy",
      description: "The universe put it on someone's shelf three streets away. We just connect the dots."
    },
    {
      icon: "🎁",
      title: "Let it go (kindly)",
      description: "Some books have done their work. Send them off to change someone else's mind."
    }
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

<section class="lending-section" bind:this={sectionElement} class:visible>
  <div class="section-content">
    <h2 class="section-title">Books move. That's sort of their thing.</h2>
    <p class="section-desc">
      A book on a shelf is just waiting. The interesting part happens when it changes hands.
    </p>

    <div class="scenarios-grid">
      {#each scenarios as scenario, i}
        <div class="scenario-card card" style="--delay: {0.1 + i * 0.15}s">
          <span class="scenario-icon">{scenario.icon}</span>
          <h3>{scenario.title}</h3>
          <p>{scenario.description}</p>
        </div>
      {/each}
    </div>

    <p class="section-note marginalia">
      No shipping. No waiting. Just people handing each other books, the way it worked before algorithms.
    </p>
  </div>
</section>

<style>
  .lending-section {
    padding: var(--s-10) var(--s-6);
    background: var(--canvas);
  }

  .section-content {
    max-width: 1000px;
    margin: 0 auto;
    text-align: center;
  }

  .section-title {
    font-size: clamp(1.8rem, 4vw, 2.5rem);
    margin: 0 0 var(--s-4);
    opacity: 0;
    transform: translateY(18px);
    transition: opacity var(--dur-3) var(--ease-out), transform var(--dur-3) var(--ease-out);
  }

  .visible .section-title {
    opacity: 1;
    transform: translateY(0);
  }

  .section-desc {
    font-family: var(--font-ui);
    font-size: 1.15rem;
    color: var(--ink-muted);
    max-width: 650px;
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

  .scenarios-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--s-5);
    margin-bottom: var(--s-8);
  }

  .scenario-card {
    padding: var(--s-7) var(--s-5);
    text-align: center;
    opacity: 0;
    transform: translateY(24px);
    transition: opacity var(--dur-3) var(--ease-out),
                transform var(--dur-3) var(--ease-out),
                box-shadow var(--dur-2) var(--ease-out),
                border-color var(--dur-2) var(--ease-out);
    transition-delay: var(--delay);
  }

  .visible .scenario-card {
    opacity: 1;
    transform: translateY(0);
  }

  .scenario-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-2);
    border-color: var(--hairline-strong);
  }

  .scenario-icon {
    font-size: 2.5rem;
    display: block;
    margin-bottom: var(--s-4);
  }

  .scenario-card h3 {
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-weight: 500;
    color: var(--ink);
    margin: 0 0 var(--s-2);
  }

  .scenario-card p {
    font-family: var(--font-ui);
    font-size: 0.95rem;
    color: var(--ink-muted);
    margin: 0;
    line-height: 1.6;
  }

  .section-note {
    margin: 0;
    opacity: 0;
    transition: opacity var(--dur-3) var(--ease-soft) 600ms;
  }

  .visible .section-note {
    opacity: 1;
  }

  .marginalia {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 1.1rem;
    color: var(--ink-faint);
  }

  @media (max-width: 600px) {
    .scenarios-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
