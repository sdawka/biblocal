<script lang="ts">
  let visible = $state(false);
  let heroElement: HTMLElement;

  const demoBooks = [
    // Wave 1: Outer edges - appear first, drift inward
    { title: "Small Gods", cover: "https://covers.openlibrary.org/b/isbn/0062237373-M.jpg", x: 2, y: 8, endX: 18, size: "medium", delay: 0.1 },
    { title: "Gödel, Escher, Bach", cover: "https://covers.openlibrary.org/b/isbn/0465026567-M.jpg", x: 98, y: 12, endX: 82, size: "large", delay: 0.15 },
    { title: "Night Watch", cover: "https://covers.openlibrary.org/b/isbn/0060013125-M.jpg", x: 1, y: 78, endX: 20, size: "small", delay: 0.2 },
    { title: "One Hundred Years", cover: "https://covers.openlibrary.org/b/isbn/0060883286-M.jpg", x: 99, y: 75, endX: 80, size: "medium", delay: 0.25 },
    { title: "Dune", cover: "https://covers.openlibrary.org/b/isbn/0441172717-M.jpg", x: 3, y: 45, endX: 22, size: "small", delay: 0.3 },
    { title: "House of Leaves", cover: "https://covers.openlibrary.org/b/isbn/0375703764-M.jpg", x: 97, y: 50, endX: 78, size: "medium", delay: 0.35 },

    // Wave 2: Mid-distance - crowd closer
    { title: "Beloved", cover: "https://covers.openlibrary.org/b/isbn/1400033411-M.jpg", x: 8, y: 25, endX: 28, size: "medium", delay: 0.6 },
    { title: "Going Postal", cover: "https://covers.openlibrary.org/b/isbn/0060502932-M.jpg", x: 92, y: 30, endX: 72, size: "small", delay: 0.65 },
    { title: "The Unbearable Lightness", cover: "https://covers.openlibrary.org/b/isbn/0061148520-M.jpg", x: 5, y: 60, endX: 26, size: "small", delay: 0.7 },
    { title: "Guards! Guards!", cover: "https://covers.openlibrary.org/b/isbn/0062225758-M.jpg", x: 95, y: 65, endX: 74, size: "medium", delay: 0.75 },
    { title: "Piranesi", cover: "https://covers.openlibrary.org/b/isbn/1635575636-M.jpg", x: 10, y: 85, endX: 30, size: "tiny", delay: 0.8 },
    { title: "Kafka on the Shore", cover: "https://covers.openlibrary.org/b/isbn/1400079276-M.jpg", x: 90, y: 88, endX: 70, size: "tiny", delay: 0.85 },

    // Wave 3: Getting close - tighten the circle
    { title: "Mort", cover: "https://covers.openlibrary.org/b/isbn/0062225715-M.jpg", x: 15, y: 18, endX: 32, size: "small", delay: 1.1 },
    { title: "Master and Margarita", cover: "https://covers.openlibrary.org/b/isbn/0140455469-M.jpg", x: 85, y: 20, endX: 68, size: "small", delay: 1.15 },
    { title: "The Dispossessed", cover: "https://covers.openlibrary.org/b/isbn/0061054887-M.jpg", x: 12, y: 70, endX: 30, size: "small", delay: 1.2 },
    { title: "If on a winter's night", cover: "https://covers.openlibrary.org/b/isbn/0156439611-M.jpg", x: 88, y: 72, endX: 70, size: "small", delay: 1.25 },
    { title: "Invisible Cities", cover: "https://covers.openlibrary.org/b/isbn/0156453800-M.jpg", x: 18, y: 40, endX: 34, size: "tiny", delay: 1.3 },
    { title: "The Name of the Rose", cover: "https://covers.openlibrary.org/b/isbn/0156001314-M.jpg", x: 82, y: 42, endX: 66, size: "tiny", delay: 1.35 },

    // Wave 4: Final crush - crowd the center
    { title: "Borges", cover: "https://covers.openlibrary.org/b/isbn/0140286802-M.jpg", x: 22, y: 32, endX: 38, size: "tiny", delay: 1.6 },
    { title: "Sapiens", cover: "https://covers.openlibrary.org/b/isbn/0062316095-M.jpg", x: 78, y: 35, endX: 62, size: "tiny", delay: 1.65 },
    { title: "Zen and the Art", cover: "https://covers.openlibrary.org/b/isbn/0060839872-M.jpg", x: 25, y: 55, endX: 40, size: "tiny", delay: 1.7 },
    { title: "Confederacy of Dunces", cover: "https://covers.openlibrary.org/b/isbn/0802130208-M.jpg", x: 75, y: 58, endX: 60, size: "tiny", delay: 1.75 },
    { title: "Slaughterhouse-Five", cover: "https://covers.openlibrary.org/b/isbn/0385333846-M.jpg", x: 28, y: 68, endX: 42, size: "tiny", delay: 1.8 },
    { title: "Catch-22", cover: "https://covers.openlibrary.org/b/isbn/0684833395-M.jpg", x: 72, y: 70, endX: 58, size: "tiny", delay: 1.85 },
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
    <p class="eyebrow">For people whose "to-read" pile has structural concerns</p>
    <h1>You are what you read.<br/>Let's find out who else is.</h1>
    <p class="subhead">
      Turn your shelf into a signal. Find neighbors who ugly-cried at the same endings.<br/>
      Lend the book that changed you. Meet the people who get your references.
    </p>
    <button class="cta btn-victorian" onclick={scrollToSignIn}>
      Build Your Shelf
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
    max-width: 700px;
    padding: 0 var(--space-md);
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

  .visible .floating-book {
    animation-play-state: running;
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

  .floating-book:nth-child(odd) { --final-rotate: 3deg; }
  .floating-book:nth-child(even) { --final-rotate: -2deg; }
  .floating-book:nth-child(3n) { --final-rotate: -4deg; }

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
