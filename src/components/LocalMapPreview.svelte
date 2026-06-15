<script lang="ts">
  let visible = $state(false);
  let sectionElement: HTMLElement;

  const matchPoints = [
    { x: 35, y: 40, type: 'reader', label: 'Sarah K.', books: 7 },
    { x: 62, y: 28, type: 'store', label: 'Corner Books', books: 340 },
    { x: 48, y: 65, type: 'reader', label: 'Marcus T.', books: 12 },
    { x: 75, y: 55, type: 'reader', label: 'Priya M.', books: 5 },
    { x: 25, y: 70, type: 'store', label: "Reader's Haven", books: 520 },
    { x: 55, y: 45, type: 'you', label: 'You', books: 0 },
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

<section class="local-section" bind:this={sectionElement} class:visible>
  <div class="section-content">
    <div class="text-content">
      <p class="eyebrow">Nearby</p>
      <h2 class="section-title">See who is reading what near you.</h2>
      <p class="section-desc">
        Find a new book and maybe a new friend.
      </p>
    </div>

    <div class="map-container">
      <div class="map-frame">
        <div class="map-surface">
          {#each matchPoints as point, i}
            <div
              class="map-point {point.type}"
              class:visible
              style="left: {point.x}%; top: {point.y}%; --delay: {0.3 + i * 0.15}s;"
            >
              <div class="point-glow"></div>
              <div class="point-dot"></div>
              <div class="point-label">
                <span class="label-name">{point.label}</span>
                {#if point.books > 0}
                  <span class="label-books">{point.books} books</span>
                {/if}
              </div>
            </div>
          {/each}

          <svg class="connection-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line class="connection-line" class:visible x1="55" y1="45" x2="35" y2="40" />
            <line class="connection-line" class:visible x1="55" y1="45" x2="62" y2="28" />
            <line class="connection-line" class:visible x1="55" y1="45" x2="48" y2="65" />
            <line class="connection-line" class:visible x1="55" y1="45" x2="75" y2="55" />
          </svg>
        </div>
      </div>

      <p class="map-caption marginalia">Within 5km of downtown</p>
    </div>
  </div>
</section>

<style>
  .local-section {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--s-12) var(--s-6);
    background: var(--canvas);
  }

  .section-content {
    display: grid;
    grid-template-columns: 1fr 1.2fr;
    gap: var(--s-10);
    max-width: 1100px;
    align-items: center;
  }

  .text-content {
    opacity: 0;
    transform: translateX(-30px);
    transition: opacity var(--dur-4) var(--ease-out), transform var(--dur-4) var(--ease-out);
  }

  .visible .text-content {
    opacity: 1;
    transform: translateX(0);
  }

  .eyebrow {
    margin: 0 0 var(--s-3);
  }

  .section-title {
    font-size: clamp(2rem, 4vw, 2.8rem);
    line-height: 1.15;
    margin: 0 0 var(--s-5);
  }

  .section-desc {
    font-family: var(--font-ui);
    font-size: 1.15rem;
    color: var(--ink-muted);
    line-height: 1.6;
    margin: 0;
  }

  .map-container {
    opacity: 0;
    transform: translateX(30px);
    transition: opacity var(--dur-4) var(--ease-out) 150ms, transform var(--dur-4) var(--ease-out) 150ms;
  }

  .visible .map-container {
    opacity: 1;
    transform: translateX(0);
  }

  .map-frame {
    background: var(--surface);
    border: 1px solid var(--hairline);
    border-radius: var(--r-xl);
    padding: var(--s-2);
    box-shadow: var(--shadow-3);
  }

  .map-surface {
    position: relative;
    width: 100%;
    padding-bottom: 75%;
    background: var(--surface-sunken);
    border-radius: var(--r-lg);
    overflow: hidden;
  }

  .map-surface::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      repeating-linear-gradient(
        0deg,
        transparent 0px,
        transparent 40px,
        var(--hairline) 40px,
        var(--hairline) 41px
      ),
      repeating-linear-gradient(
        90deg,
        transparent 0px,
        transparent 40px,
        var(--hairline) 40px,
        var(--hairline) 41px
      );
    opacity: 0.6;
    pointer-events: none;
  }

  .connection-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .connection-line {
    stroke: var(--accent);
    stroke-width: 0.3;
    stroke-dasharray: 2 2;
    opacity: 0;
    transition: opacity 1s var(--ease-soft) 1s;
  }

  .connection-line.visible {
    opacity: 0.45;
  }

  .map-point {
    position: absolute;
    transform: translate(-50%, -50%);
    z-index: 2;
  }

  .point-glow {
    position: absolute;
    width: 40px;
    height: 40px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: var(--r-full);
    background: radial-gradient(
      circle,
      var(--accent-tint) 0%,
      transparent 70%
    );
    opacity: 0;
    transition: opacity 0.5s var(--ease-soft);
    transition-delay: var(--delay);
  }

  .visible .point-glow {
    opacity: 1;
    animation: pulseGlow 3s ease-in-out infinite;
    animation-delay: var(--delay);
  }

  @keyframes pulseGlow {
    0%, 100% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 0.5;
    }
    50% {
      transform: translate(-50%, -50%) scale(1.3);
      opacity: 0.8;
    }
  }

  .point-dot {
    width: 12px;
    height: 12px;
    border-radius: var(--r-full);
    position: relative;
    opacity: 0;
    transform: scale(0);
    transition: opacity var(--dur-2) var(--ease-spring), transform var(--dur-2) var(--ease-spring);
    transition-delay: var(--delay);
  }

  .visible .point-dot {
    opacity: 1;
    transform: scale(1);
  }

  .map-point.reader .point-dot {
    background: var(--st-borrowable-fg);
    box-shadow: 0 0 0 3px var(--st-borrowable-bg);
  }

  .map-point.store .point-dot {
    background: var(--st-giftable-fg);
    box-shadow: 0 0 0 3px var(--st-giftable-bg);
  }

  .map-point.you .point-dot {
    background: var(--accent);
    box-shadow: 0 0 0 4px var(--accent-tint);
    width: 16px;
    height: 16px;
  }

  .point-label {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 8px;
    white-space: nowrap;
    text-align: center;
    opacity: 0;
    transition: opacity var(--dur-2) var(--ease-soft);
    transition-delay: calc(var(--delay) + 0.3s);
  }

  .visible .point-label {
    opacity: 1;
  }

  .label-name {
    display: block;
    font-family: var(--font-ui);
    font-size: 0.75rem;
    font-weight: 590;
    color: var(--ink);
  }

  .label-books {
    display: block;
    font-family: var(--font-ui);
    font-size: 0.65rem;
    color: var(--ink-muted);
  }

  .map-caption {
    text-align: center;
    margin: var(--s-4) 0 0;
  }

  .marginalia {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 1.1rem;
    color: var(--ink-muted);
  }

  @media (max-width: 800px) {
    .section-content {
      grid-template-columns: 1fr;
      text-align: center;
    }
  }
</style>
