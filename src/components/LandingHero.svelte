<script lang="ts">
  import { useTranslations, type Lang } from '../i18n';

  let { lang = 'en' as Lang } = $props();
  const t = $derived(useTranslations(lang).home.hero);

  let failedImages = $state<Set<number>>(new Set());

  const handleImageError = (i: number) => {
    failedImages = new Set([...failedImages, i]);
  };

  // A curated wall of covers, arranged as a composed shelf (not scattered).
  const wall = [
    { title: 'Gödel, Escher, Bach', cover: '/covers/0465026567.jpg' },
    { title: 'One Hundred Years of Solitude', cover: '/covers/0060883286.jpg' },
    { title: 'The Unbearable Lightness of Being', cover: '/covers/0061148520.jpg' },
    { title: 'Small Gods', cover: '/covers/0062237373.jpg' },
    { title: 'Beloved', cover: '/covers/1400033411.jpg' },
    { title: 'Dune', cover: '/covers/0441172717.jpg' },
    { title: 'The Dispossessed', cover: '/covers/0061054887.jpg' },
    { title: 'The Master and Margarita', cover: '/covers/0140455469.jpg' },
    { title: 'House of Leaves', cover: '/covers/0375703764.jpg' },
  ];

  const scrollToSignIn = () =>
    document.getElementById('signin-section')?.scrollIntoView({ behavior: 'smooth' });
  const scrollDown = () =>
    window.scrollTo({ top: window.innerHeight * 0.92, behavior: 'smooth' });
</script>

<section class="hero" aria-label="biblocal">
  <div class="grain" aria-hidden="true"></div>

  <div class="grid">
    <div class="copy">
      <p class="eyebrow"><span class="rule"></span>{t.eyebrow}</p>

      <h1>
        {#each t.titleLines as line}
          <span class="line">{line}</span>
        {/each}
        <span class="line accent"><em>{t.titleAccent}</em></span>
      </h1>

      <p class="meta">
        {#each t.meta as m, i}{#if i > 0}<i></i>{/if}<span>{m}</span>{/each}
      </p>

      <p class="lede">
        {t.lede}
      </p>

      <div class="actions">
        <button class="btn btn-filled btn-lg start" onclick={scrollToSignIn}>
          {t.start}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="ghost" onclick={scrollDown}>{t.how}</button>
      </div>

    </div>

    <div class="wall" aria-hidden="true">
      <div class="wall-inner">
        {#each wall as book, i}
          <figure class="tile" style={`--i:${i}`}>
            {#if failedImages.has(i)}
              <div class="cover ph"><span>{book.title.charAt(0)}</span></div>
            {:else}
              <img
                src={book.cover}
                alt=""
                width="160"
                height="240"
                loading="eager"
                decoding="async"
                onerror={() => handleImageError(i)}
              />
            {/if}
          </figure>
        {/each}
      </div>
    </div>
  </div>

  <button class="scroll-hint" onclick={scrollDown} aria-label={t.scrollAria}>
    <span>{t.scroll}</span>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M6 13l6 6 6-6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>
</section>

<style>
  .hero {
    position: relative;
    min-height: 100vh;
    min-height: 100svh;
    display: flex;
    align-items: center;
    overflow: hidden;
    padding: clamp(2rem, 6vh, 5rem) clamp(1.25rem, 5vw, 5rem);
    background:
      radial-gradient(58% 50% at 82% 26%, var(--accent-tint) 0%, transparent 68%),
      radial-gradient(46% 44% at 8% 88%, var(--surface-sunken) 0%, transparent 70%),
      var(--canvas);
  }

  /* Subtle film grain for atmosphere/depth (token-agnostic, theme-safe). */
  .grain {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    opacity: 0.4;
    mix-blend-mode: soft-light;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }

  .grid {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 1240px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
    align-items: center;
    gap: clamp(2rem, 5vw, 5rem);
  }

  /* ── Copy ───────────────────────────────────────────── */
  .copy { max-width: 34rem; }

  .eyebrow {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    margin: 0 0 var(--s-5);
  }
  .eyebrow .rule {
    width: 30px;
    height: 1.5px;
    background: var(--accent);
    border-radius: 2px;
  }

  h1 {
    margin: 0 0 var(--s-5);
    font-family: var(--font-display);
    font-weight: 500;
    font-size: clamp(2.7rem, 6.4vw, 5rem);
    line-height: 0.98;
    letter-spacing: -0.035em;
    color: var(--ink);
  }
  h1 .line { display: block; }
  h1 .accent { color: var(--accent); }
  h1 .accent em { font-style: italic; font-weight: 500; }

  .lede {
    margin: 0 0 var(--s-6);
    max-width: 30rem;
    font-family: var(--font-ui);
    font-size: clamp(1.05rem, 1.4vw, 1.22rem);
    line-height: 1.6;
    color: var(--ink-muted);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: var(--s-4);
    flex-wrap: wrap;
    margin-bottom: var(--s-6);
  }
  .start { gap: 0.5rem; padding-inline: 1.5rem; }
  .start svg { transition: transform var(--dur-2) var(--ease-spring); }
  .start:hover svg { transform: translateX(3px); }

  .ghost {
    appearance: none;
    background: none;
    border: none;
    padding: 0.4rem 0.2rem;
    font-family: var(--font-ui);
    font-size: 0.95rem;
    font-weight: 590;
    color: var(--ink);
    cursor: pointer;
    position: relative;
  }
  .ghost::after {
    content: '';
    position: absolute;
    left: 0.2rem;
    right: 0.2rem;
    bottom: 0.15rem;
    height: 1.5px;
    background: var(--ink);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform var(--dur-2) var(--ease-out);
  }
  .ghost:hover::after { transform: scaleX(1); }

  .meta {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin: 0 0 var(--s-5);
    font-family: var(--font-ui);
    font-size: 0.78rem;
    font-weight: 590;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .meta i { width: 4px; height: 4px; border-radius: 50%; background: var(--accent); opacity: 0.8; }

  /* ── Cover wall ─────────────────────────────────────── */
  .wall {
    perspective: 1600px;
    justify-self: end;
    width: 100%;
  }
  .wall-inner {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: clamp(0.6rem, 1.1vw, 1rem);
    transform: rotateY(-12deg) rotateX(2deg) rotate(-1deg);
    transform-style: preserve-3d;
  }
  /* Stagger the columns so it reads as a built shelf, not a flat grid. */
  .wall-inner .tile:nth-child(3n + 2) { transform: translateY(26px); }
  .wall-inner .tile:nth-child(3n) { transform: translateY(52px); }

  .tile {
    position: relative;
    margin: 0;
    aspect-ratio: 2 / 3;
    transition: transform var(--dur-2) var(--ease-out);
  }
  .tile:hover { z-index: 5; }
  .tile img,
  .tile .cover.ph {
    width: 100%;
    height: 100%;
    border-radius: 6px;
    box-shadow:
      0 1px 1px oklch(0 0 0 / 0.18),
      0 18px 34px var(--drop-shadow-color);
    transition: transform var(--dur-2) var(--ease-spring), box-shadow var(--dur-2) var(--ease-out);
  }
  .tile img { object-fit: cover; display: block; }
  .tile:hover img,
  .tile:hover .cover.ph {
    transform: translateY(-10px) scale(1.04);
    box-shadow:
      0 2px 5px oklch(0 0 0 / 0.22),
      0 30px 52px var(--drop-shadow-color);
  }
  .tile .cover.ph {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--accent-tint);
  }
  .tile .cover.ph span {
    font-family: var(--font-display);
    font-size: 1.8rem;
    color: var(--accent);
  }

  /* ── Scroll hint ────────────────────────────────────── */
  .scroll-hint {
    position: absolute;
    bottom: clamp(1rem, 3vh, 2rem);
    left: 50%;
    transform: translateX(-50%);
    z-index: 2;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    appearance: none;
    background: none;
    border: none;
    cursor: pointer;
    font-family: var(--font-ui);
    font-size: 0.8rem;
    font-weight: 640;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink-faint);
    opacity: 0;
    animation: fadeIn 1s ease 1.6s forwards;
  }
  .scroll-hint svg { animation: bob 2.2s ease-in-out infinite; }
  @keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(5px); } }
  @keyframes fadeIn { to { opacity: 1; } }

  /* ── Responsive ─────────────────────────────────────── */
  @media (max-width: 920px) {
    .grid { grid-template-columns: 1fr; gap: clamp(2.5rem, 8vw, 4rem); }
    .copy { max-width: none; }
    .wall { perspective: none; justify-self: stretch; }
    .wall-inner {
      grid-template-columns: repeat(5, 1fr);
      transform: none;
      gap: 0.6rem;
    }
    .wall-inner .tile:nth-child(3n + 2),
    .wall-inner .tile:nth-child(3n) { transform: none; }
    /* Show the first 5 as a tidy shelf strip on tablet/mobile. */
    .wall-inner .tile:nth-child(n + 6) { display: none; }
  }

  @media (max-width: 920px) and (min-width: 561px) {
    .scroll-hint { display: none; }
  }

  @media (max-width: 560px) {
    .hero { padding-top: clamp(3rem, 12vh, 6rem); }
    .wall-inner { grid-template-columns: repeat(4, 1fr); }
    .wall-inner .tile:nth-child(n + 5) { display: none; }
    .scroll-hint { display: none; }
  }
</style>
