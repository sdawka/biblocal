<script lang="ts">
  let visible = $state(false);
  let sectionElement: HTMLElement;

  const scenarios = [
    {
      icon: "📖",
      title: "Lend without the awkwardness",
      description: "Mark it 'will lend' and let people come to you. No more forgetting who has your copy of Dune."
    },
    {
      icon: "🔍",
      title: "Find that book you've been hunting",
      description: "Someone nearby probably owns it. We'll introduce you."
    },
    {
      icon: "🎁",
      title: "Give books a second life",
      description: "Some books need new homes. Mark them 'free to good home' and make someone's week."
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
    <h2 class="section-title">Books were meant to circulate.</h2>
    <p class="section-desc">
      The best books don't gather dust—they gather miles, coffee stains, and marginalia from three different owners.
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
      No shipping fees. No waiting for delivery. Just humans handing each other books like civilized primates.
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
