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
      { threshold: 0.5 }
    );
    observer.observe(sectionElement);

    return () => observer.disconnect();
  });
</script>

<div class="mid-cta" bind:this={sectionElement} class:visible>
  <button class="cta-link" onclick={scrollToSignIn}>
    Ready to find your people? <span class="arrow">→</span>
  </button>
</div>

<style>
  .mid-cta {
    text-align: center;
    padding: var(--space-xl) var(--space-lg);
    background: var(--color-parchment);
  }

  .cta-link {
    font-family: var(--font-handwritten);
    font-size: 1.2rem;
    color: var(--color-ink-faded);
    background: none;
    border: none;
    cursor: pointer;
    opacity: 0;
    transform: translateY(10px);
    transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .visible .cta-link {
    opacity: 1;
    transform: translateY(0);
  }

  .cta-link:hover {
    color: var(--color-ink);
  }

  .arrow {
    display: inline-block;
    transition: transform 0.3s ease;
  }

  .cta-link:hover .arrow {
    transform: translateX(4px);
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
</style>
