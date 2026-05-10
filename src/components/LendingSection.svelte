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
        <div class="scenario-card" style="--delay: {0.1 + i * 0.15}s">
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
    padding: var(--space-2xl);
    background: linear-gradient(
      to bottom,
      var(--color-aged-paper) 0%,
      var(--color-parchment) 100%
    );
  }

  .section-content {
    max-width: 1000px;
    margin: 0 auto;
    text-align: center;
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
    max-width: 650px;
    margin: 0 auto var(--space-2xl);
    line-height: 1.7;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1) 0.1s;
  }

  .visible .section-desc {
    opacity: 1;
    transform: translateY(0);
  }

  .scenarios-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--space-lg);
    margin-bottom: var(--space-xl);
  }

  .scenario-card {
    background: var(--color-cream);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-md);
    padding: var(--space-xl) var(--space-lg);
    text-align: center;
    box-shadow: var(--shadow-card);
    opacity: 0;
    transform: translateY(25px);
    transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    transition-delay: var(--delay);
  }

  .visible .scenario-card {
    opacity: 1;
    transform: translateY(0);
  }

  .scenario-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lifted);
    border-color: var(--color-gold);
  }

  .scenario-icon {
    font-size: 2.5rem;
    display: block;
    margin-bottom: var(--space-md);
  }

  .scenario-card h3 {
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-weight: 600;
    color: var(--color-ink);
    margin: 0 0 var(--space-sm);
  }

  .scenario-card p {
    font-family: var(--font-body);
    font-size: 0.95rem;
    color: var(--color-ink-faded);
    margin: 0;
    line-height: 1.6;
  }

  .section-note {
    margin: 0;
    opacity: 0;
    transition: opacity 0.5s ease 0.6s;
  }

  .visible .section-note {
    opacity: 1;
  }

  .marginalia {
    font-family: var(--font-handwritten);
    font-size: 1.1rem;
    color: var(--color-ink-light);
  }

  @media (max-width: 600px) {
    .scenarios-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
