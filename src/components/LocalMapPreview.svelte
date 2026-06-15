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

<section class="local-section" bind:this={sectionElement} class:visible aria-labelledby="local-title">
  <div class="section-content">
    <div class="text-content">
      <p class="eyebrow"><span class="rule"></span><span class="num">03</span>&nbsp;— Right next door</p>

      <h2 id="local-title" class="section-title">
        The people who read like you<br />
        are <em>closer than you think</em>.
      </h2>

      <p class="section-desc">
        biblocal maps your shelf against the readers and bookshops around you —
        so a new book, and maybe a new friend, is only a short walk away.
      </p>

      <ul class="legend" aria-hidden="true">
        <li><span class="key reader"></span>Readers nearby</li>
        <li><span class="key store"></span>Local bookshops</li>
        <li><span class="key you"></span>You</li>
      </ul>
    </div>

    <div class="map-container">
      <div class="map-frame card">
        <div class="map-chrome" aria-hidden="true">
          <span class="map-chrome-title">Within 5km of downtown</span>
          <span class="map-chrome-tag">Live</span>
        </div>

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

      <p class="map-caption marginalia">A neighbourhood of fellow readers.</p>
    </div>
  </div>
</section>

<style>
  .local-section {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: clamp(5rem, 12vh, 9rem) clamp(1.25rem, 5vw, 5rem);
    background: var(--canvas);
  }

  .section-content {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
    gap: clamp(2.5rem, 6vw, 5.5rem);
    width: 100%;
    max-width: 1240px;
    margin: 0 auto;
    align-items: center;
  }

  /* ── Editorial copy ─────────────────────────────────── */
  .text-content {
    opacity: 0;
    transform: translateY(20px);
    transition: opacity var(--dur-4) var(--ease-out), transform var(--dur-4) var(--ease-out);
  }

  .visible .text-content {
    opacity: 1;
    transform: translateY(0);
  }

  /* Numbered left-aligned header — mirrors the hero eyebrow. */
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
    font-family: var(--font-display);
    font-weight: 500;
    font-size: clamp(2rem, 4.5vw, 3.2rem);
    line-height: 1.04;
    letter-spacing: -0.03em;
    color: var(--ink);
    margin: 0 0 var(--s-5);
  }
  .section-title em {
    font-style: italic;
    font-weight: 500;
    color: var(--accent);
  }

  .section-desc {
    font-family: var(--font-ui);
    font-size: 1.15rem;
    color: var(--ink-muted);
    line-height: 1.6;
    max-width: 46ch;
    margin: 0;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-5);
    margin: var(--s-6) 0 0;
    padding: 0;
    list-style: none;
    font-family: var(--font-ui);
    font-size: 0.8rem;
    font-weight: 540;
    color: var(--ink-muted);
  }
  .legend li {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }
  .legend .key {
    width: 10px;
    height: 10px;
    border-radius: var(--r-full);
    flex: none;
  }
  .legend .key.reader {
    background: var(--st-borrowable-fg);
    box-shadow: 0 0 0 3px var(--st-borrowable-bg);
  }
  .legend .key.store {
    background: var(--st-giftable-fg);
    box-shadow: 0 0 0 3px var(--st-giftable-bg);
  }
  .legend .key.you {
    background: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-tint);
  }

  /* ── Map product mock ───────────────────────────────── */
  .map-container {
    opacity: 0;
    transform: translateY(28px);
    transition: opacity var(--dur-4) var(--ease-out) 150ms, transform var(--dur-4) var(--ease-out) 150ms;
  }

  .visible .map-container {
    opacity: 1;
    transform: translateY(0);
  }

  /* Framed, elevated product surface — reads as a polished screenshot. */
  .map-frame {
    padding: 0;
    border-radius: var(--r-xl);
    box-shadow: var(--shadow-3);
    overflow: hidden;
  }
  .visible .map-frame {
    box-shadow: var(--shadow-4);
    transition: box-shadow var(--dur-4) var(--ease-out) 200ms;
  }

  .map-chrome {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-3);
    padding: 0.7rem 1rem;
    border-bottom: 1px solid var(--hairline);
    background: var(--surface);
  }
  .map-chrome-title {
    font-family: var(--font-ui);
    font-size: 0.78rem;
    font-weight: 590;
    letter-spacing: 0.01em;
    color: var(--ink-muted);
  }
  .map-chrome-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-family: var(--font-ui);
    font-size: 0.68rem;
    font-weight: 640;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .map-chrome-tag::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: var(--r-full);
    background: var(--accent);
    box-shadow: 0 0 0 0 var(--accent-tint);
    animation: liveBlink 2.4s var(--ease-soft) infinite;
  }
  @keyframes liveBlink {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 var(--accent-tint); }
    50% { opacity: 0.55; box-shadow: 0 0 0 4px transparent; }
  }

  .map-surface {
    position: relative;
    width: 100%;
    padding-bottom: 72%;
    background:
      radial-gradient(60% 55% at 55% 45%, var(--accent-tint) 0%, transparent 60%),
      var(--surface-sunken);
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
    opacity: 0.55;
    -webkit-mask-image: radial-gradient(120% 120% at 50% 45%, #000 55%, transparent 100%);
    mask-image: radial-gradient(120% 120% at 50% 45%, #000 55%, transparent 100%);
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
    padding: 0.25rem 0.5rem;
    white-space: nowrap;
    text-align: center;
    background: var(--glass-bg);
    -webkit-backdrop-filter: blur(8px) saturate(1.6);
    backdrop-filter: blur(8px) saturate(1.6);
    border: 1px solid var(--hairline);
    border-radius: var(--r-sm);
    box-shadow: var(--shadow-1);
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

  /* Caption now lives inside the frame chrome; keep marginalia as a quiet echo. */
  .map-caption {
    text-align: right;
    margin: var(--s-3) 0 0;
  }

  .marginalia {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 1.05rem;
    color: var(--ink-faint);
  }

  @media (max-width: 800px) {
    .section-content {
      grid-template-columns: 1fr;
      gap: clamp(2.5rem, 8vw, 4rem);
    }
    .map-caption { text-align: center; }
  }
</style>
