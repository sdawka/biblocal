<script lang="ts">
  let visible = $state(false);
  let sectionElement: HTMLElement;

  function scrollToSignIn() {
    document.getElementById('signin-section')?.scrollIntoView({ behavior: 'smooth' });
  }

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

<section class="mid-cta" bind:this={sectionElement} class:visible aria-labelledby="mid-cta-title">
  <div class="cta-inner">
    <p class="cta-kicker"><span class="rule"></span>Your shelf is waiting</p>
    <h2 id="mid-cta-title" class="cta-title">
      Stop reading alone. <em>Find your people.</em>
    </h2>
    <button class="cta-btn btn btn-filled btn-lg" onclick={scrollToSignIn}>
      Start your shelf
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  </div>
</section>

<style>
  .mid-cta {
    padding: clamp(3.5rem, 9vh, 6rem) clamp(1.25rem, 5vw, 5rem);
    background: var(--accent-tint);
  }

  .cta-inner {
    max-width: 1240px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .cta-kicker {
    display: inline-flex;
    align-items: center;
    gap: 0.7rem;
    margin: 0 0 var(--s-4);
    font-family: var(--font-ui);
    font-size: 0.78rem;
    font-weight: 590;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-muted);
    opacity: 0;
    transform: translateY(12px);
    transition: opacity var(--dur-3) var(--ease-out), transform var(--dur-3) var(--ease-out);
  }
  .cta-kicker .rule {
    width: 30px;
    height: 1.5px;
    background: var(--accent);
    border-radius: 2px;
    flex: none;
  }

  .cta-title {
    margin: 0 0 var(--s-6);
    max-width: 18ch;
    font-family: var(--font-display);
    font-weight: 500;
    font-size: clamp(1.9rem, 4vw, 2.9rem);
    line-height: 1.05;
    letter-spacing: -0.03em;
    color: var(--ink);
    opacity: 0;
    transform: translateY(16px);
    transition: opacity var(--dur-3) var(--ease-out) 70ms, transform var(--dur-3) var(--ease-out) 70ms;
  }
  .cta-title em {
    font-style: italic;
    font-weight: 500;
    color: var(--accent);
  }

  .cta-btn {
    gap: 0.5rem;
    padding-inline: 1.5rem;
    opacity: 0;
    transform: translateY(14px);
    transition: opacity var(--dur-3) var(--ease-out) 140ms,
                transform var(--dur-3) var(--ease-out) 140ms,
                background var(--dur-2) var(--ease-soft),
                box-shadow var(--dur-2) var(--ease-soft);
  }
  .cta-btn svg { transition: transform var(--dur-2) var(--ease-spring); }
  .cta-btn:hover svg { transform: translateX(3px); }

  .visible .cta-kicker,
  .visible .cta-title,
  .visible .cta-btn {
    opacity: 1;
    transform: translateY(0);
  }

  @media (prefers-reduced-motion: reduce) {
    .cta-kicker,
    .cta-title,
    .cta-btn {
      transition: none;
      opacity: 1;
      transform: none;
    }
  }
</style>
