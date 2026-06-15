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

<div class="mid-cta" bind:this={sectionElement} class:visible>
  <button class="cta-link btn btn-tinted btn-lg" onclick={scrollToSignIn}>
    Ready to find your people? <span class="arrow">→</span>
  </button>
</div>

<style>
  .mid-cta {
    text-align: center;
    padding: var(--s-8) var(--s-5);
    background: var(--surface-sunken);
  }

  .cta-link {
    opacity: 0;
    transform: translateY(10px);
    transition: opacity var(--dur-3) var(--ease-out),
                transform var(--dur-3) var(--ease-out),
                background var(--dur-2) var(--ease-soft),
                box-shadow var(--dur-2) var(--ease-soft);
  }

  .visible .cta-link {
    opacity: 1;
    transform: translateY(0);
  }

  .arrow {
    display: inline-block;
    transition: transform var(--dur-2) var(--ease-spring);
  }

  .cta-link:hover .arrow {
    transform: translateX(4px);
  }
</style>
