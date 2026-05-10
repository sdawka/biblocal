<script lang="ts">
  let visible = $state(false);
  let heroElement: HTMLElement;

  const demoBooks = [
    // Left column - stacked vertically with no overlap
    { title: "Small Gods", cover: "https://covers.openlibrary.org/b/isbn/0062237373-M.jpg", x: -5, y: 5, endX: 3, size: "medium", delay: 0.1 },
    { title: "Gödel, Escher, Bach", cover: "https://covers.openlibrary.org/b/isbn/0465026567-M.jpg", x: -8, y: 22, endX: 6, size: "large", delay: 0.2 },
    { title: "Beloved", cover: "https://covers.openlibrary.org/b/isbn/1400033411-M.jpg", x: -6, y: 42, endX: 4, size: "medium", delay: 0.3 },
    { title: "Night Watch", cover: "https://covers.openlibrary.org/b/isbn/0060013125-M.jpg", x: -5, y: 60, endX: 5, size: "small", delay: 0.4 },
    { title: "The Dispossessed", cover: "https://covers.openlibrary.org/b/isbn/0061054887-M.jpg", x: -7, y: 76, endX: 3, size: "medium", delay: 0.5 },

    // Right column - stacked vertically with no overlap
    { title: "One Hundred Years", cover: "https://covers.openlibrary.org/b/isbn/0060883286-M.jpg", x: 105, y: 5, endX: 88, size: "medium", delay: 0.15 },
    { title: "The Unbearable Lightness", cover: "https://covers.openlibrary.org/b/isbn/0061148520-M.jpg", x: 108, y: 22, endX: 85, size: "large", delay: 0.25 },
    { title: "Guards! Guards!", cover: "https://covers.openlibrary.org/b/isbn/0062225758-M.jpg", x: 106, y: 42, endX: 87, size: "medium", delay: 0.35 },
    { title: "Master and Margarita", cover: "https://covers.openlibrary.org/b/isbn/0140455469-M.jpg", x: 105, y: 60, endX: 86, size: "small", delay: 0.45 },
    { title: "If on a winter's night", cover: "https://covers.openlibrary.org/b/isbn/0156439611-M.jpg", x: 107, y: 76, endX: 88, size: "medium", delay: 0.55 },

    // Second layer left - offset inward
    { title: "Mort", cover: "https://covers.openlibrary.org/b/isbn/0062225715-M.jpg", x: -3, y: 12, endX: 12, size: "small", delay: 0.7 },
    { title: "Dune", cover: "https://covers.openlibrary.org/b/isbn/0441172717-M.jpg", x: -4, y: 50, endX: 13, size: "small", delay: 0.8 },
    { title: "Borges", cover: "https://covers.openlibrary.org/b/isbn/0140286802-M.jpg", x: -3, y: 85, endX: 11, size: "small", delay: 0.9 },

    // Second layer right - offset inward
    { title: "Going Postal", cover: "https://covers.openlibrary.org/b/isbn/0060502932-M.jpg", x: 103, y: 12, endX: 80, size: "small", delay: 0.75 },
    { title: "House of Leaves", cover: "https://covers.openlibrary.org/b/isbn/0375703764-M.jpg", x: 104, y: 50, endX: 79, size: "small", delay: 0.85 },
    { title: "Sapiens", cover: "https://covers.openlibrary.org/b/isbn/0062316095-M.jpg", x: 103, y: 85, endX: 81, size: "small", delay: 0.95 },
  ];

  $effect(() => {
    if (!heroElement) return;
    const observer = new IntersectionObserver(
      ([entry]) => { visible = entry.isIntersecting; },
      { threshold: 0.2 }
    );
    observer.observe(heroElement);
    return () => observer.disconnect();
  });

  function scrollToSignIn() {
    document.getElementById('signin-section')?.scrollIntoView({ behavior: 'smooth' });
  }
</script>

<section class="hero" bind:this={heroElement} class:visible>
  <div class="floating-books">
    {#each demoBooks as book, i}
      <div
        class="floating-book {book.size}"
        style="
          --start-x: {book.x}%;
          --end-x: {book.endX}%;
          --y: {book.y}%;
          --delay: {book.delay}s;
        "
      >
        <img src={book.cover} alt={book.title} />
      </div>
    {/each}
  </div>

  <div class="hero-content">
    <p class="eyebrow">A place for book people to find each other</p>
    <h1>The right book finds you.<br/>So do the right people.</h1>
    <p class="subhead">
      Somewhere nearby, someone else finished that book at 2am and needed to talk about it.<br/>
      This is how you find them.
    </p>
    <button class="cta btn-victorian" onclick={scrollToSignIn}>
      Start Here
    </button>
  </div>

  <div class="scroll-hint">
    <span>See how it works</span>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  </div>
</section>

<style>
  .hero {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: var(--space-xl);
    position: relative;
    overflow: hidden;
    background: radial-gradient(
      ellipse at 50% 30%,
      rgba(184, 134, 11, 0.08) 0%,
      transparent 60%
    );
  }

  .hero::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle at 50% 100%,
      rgba(114, 47, 55, 0.06) 0%,
      transparent 50%
    );
    pointer-events: none;
  }

  .hero-content {
    position: relative;
    z-index: 10;
    max-width: 680px;
    padding: var(--space-lg) var(--space-xl);
    background: radial-gradient(
      ellipse at center,
      rgba(253, 251, 247, 0.85) 0%,
      rgba(253, 251, 247, 0.4) 70%,
      transparent 100%
    );
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }

  .eyebrow {
    font-family: var(--font-display);
    font-size: clamp(0.7rem, 2vw, 0.9rem);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-burgundy);
    margin: 0 0 var(--space-md);
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .visible .eyebrow {
    opacity: 1;
    transform: translateY(0);
  }

  h1 {
    font-family: var(--font-display);
    font-size: clamp(1.8rem, 6vw, 4rem);
    font-weight: 600;
    font-style: italic;
    color: var(--color-ink);
    line-height: 1.1;
    margin: 0 0 var(--space-lg);
    opacity: 0;
    transform: translateY(30px);
    transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.1s;
  }

  .visible h1 {
    opacity: 1;
    transform: translateY(0);
  }

  .subhead {
    font-family: var(--font-body);
    font-size: clamp(0.95rem, 2.5vw, 1.25rem);
    color: var(--color-ink-faded);
    line-height: 1.7;
    margin: 0 0 var(--space-xl);
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.25s;
  }

  .visible .subhead {
    opacity: 1;
    transform: translateY(0);
  }

  .cta {
    font-size: 1rem;
    padding: 0.75rem 1.75rem;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.4s;
  }

  .visible .cta {
    opacity: 1;
    transform: translateY(0);
  }

  .floating-books {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 1;
  }

  .floating-book {
    position: absolute;
    left: var(--start-x);
    top: var(--y);
    opacity: 0;
    transform: translateX(0) rotate(0deg) scale(0.5);
    filter: drop-shadow(0 8px 20px rgba(74, 44, 42, 0.25));
    animation: floatInward 2.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    animation-delay: var(--delay);
    animation-play-state: paused;
  }

  @keyframes floatInward {
    0% {
      opacity: 0;
      left: var(--start-x);
      transform: rotate(-12deg) scale(0.5);
    }
    20% {
      opacity: 0.95;
      transform: rotate(-4deg) scale(1.05);
    }
    60% {
      opacity: 0.9;
      left: var(--end-x);
      transform: rotate(1deg) scale(1);
    }
    100% {
      opacity: 0.8;
      left: var(--end-x);
      transform: rotate(var(--final-rotate, 2deg)) scale(1);
    }
  }

  .floating-book:nth-child(odd) { --final-rotate: 3deg; --sway-amount: 4px; --sway-duration: 4s; }
  .floating-book:nth-child(even) { --final-rotate: -2deg; --sway-amount: -3px; --sway-duration: 5s; }
  .floating-book:nth-child(3n) { --final-rotate: -4deg; --sway-amount: 5px; --sway-duration: 6s; }
  .floating-book:nth-child(5n) { --sway-amount: -4px; --sway-duration: 4.5s; }

  .visible .floating-book {
    animation:
      floatInward 2.5s cubic-bezier(0.16, 1, 0.3, 1) forwards,
      gentleSway var(--sway-duration, 5s) ease-in-out calc(var(--delay) + 2.5s) infinite;
  }

  @keyframes gentleSway {
    0%, 100% {
      transform: rotate(var(--final-rotate, 2deg)) scale(1) translateY(0);
    }
    50% {
      transform: rotate(var(--final-rotate, 2deg)) scale(1) translateY(var(--sway-amount, 3px));
    }
  }

  .floating-book.large img { width: 100px; }
  .floating-book.medium img { width: 80px; }
  .floating-book.small img { width: 65px; }
  .floating-book.tiny img { width: 50px; }

  .floating-book img {
    height: auto;
    border-radius: 3px;
    box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.15),
      inset 0 0 0 1px rgba(255, 255, 255, 0.1);
  }

  .scroll-hint {
    position: absolute;
    bottom: var(--space-lg);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-xs);
    color: var(--color-ink-light);
    font-family: var(--font-body);
    font-size: 0.8rem;
    font-style: italic;
    opacity: 0;
    animation: fadeIn 1s ease 3s forwards;
  }

  .scroll-hint svg {
    animation: gentleFloat 2s ease-in-out infinite;
  }

  @keyframes gentleFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(6px); }
  }

  @keyframes fadeIn {
    to { opacity: 1; }
  }

  /* Tablet */
  @media (max-width: 900px) {
    .floating-book.large img { width: 80px; }
    .floating-book.medium img { width: 65px; }
    .floating-book.small img { width: 50px; }
    .floating-book.tiny img { width: 40px; }
  }

  /* Mobile */
  @media (max-width: 600px) {
    .hero {
      padding: var(--space-lg) var(--space-md);
    }

    .floating-book {
      display: none;
    }

    .subhead br {
      display: none;
    }

    .scroll-hint {
      bottom: var(--space-md);
    }
  }
</style>
