<script lang="ts">
  let visible = $state(true);
  let heroElement: HTMLElement;
  let failedImages = $state<Set<number>>(new Set());

  function handleImageError(index: number) {
    failedImages = new Set([...failedImages, index]);
  }

  const demoBooks = [
    // Left column
    { title: "Small Gods", cover: "/covers/0062237373.jpg", x: -5, y: 10, endX: 5, size: "medium", delay: 0.05 },
    { title: "Gödel, Escher, Bach", cover: "/covers/0465026567.jpg", x: -8, y: 30, endX: 8, size: "large", delay: 0.1 },
    { title: "Beloved", cover: "/covers/1400033411.jpg", x: -6, y: 55, endX: 6, size: "medium", delay: 0.15 },
    { title: "The Dispossessed", cover: "/covers/0061054887.jpg", x: -5, y: 78, endX: 5, size: "medium", delay: 0.2 },
    { title: "Dune", cover: "/covers/0441172717.jpg", x: -3, y: 45, endX: 14, size: "small", delay: 0.25 },

    // Right column
    { title: "One Hundred Years", cover: "/covers/0060883286.jpg", x: 105, y: 10, endX: 86, size: "medium", delay: 0.1 },
    { title: "The Unbearable Lightness", cover: "/covers/0061148520.jpg", x: 108, y: 30, endX: 83, size: "large", delay: 0.15 },
    { title: "Guards! Guards!", cover: "/covers/0062225758.jpg", x: 106, y: 55, endX: 85, size: "medium", delay: 0.2 },
    { title: "Master and Margarita", cover: "/covers/0140455469.jpg", x: 105, y: 78, endX: 86, size: "medium", delay: 0.25 },
    { title: "House of Leaves", cover: "/covers/0375703764.jpg", x: 103, y: 45, endX: 78, size: "small", delay: 0.3 },
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
        {#if failedImages.has(i)}
          <div class="cover-placeholder">
            <span>{book.title.charAt(0)}</span>
          </div>
        {:else}
          <img
            src={book.cover}
            alt={book.title}
            width="80"
            height="120"
            loading="lazy"
            onerror={() => handleImageError(i)}
          />
        {/if}
      </div>
    {/each}
  </div>

  <div class="hero-content">
    <p class="eyebrow">The local network for readers</p>
    <h1>You are what you read.<br/>So are they.</h1>
    <p class="subhead">
      Share your shelf. Find readers nearby with shared taste.<br/>
      Lend books, borrow books, talk books.
    </p>
    <button class="cta btn-victorian" onclick={scrollToSignIn}>
      Start Here
    </button>
  </div>

  <div class="mobile-books">
    <img src="/covers/0465026567.jpg" alt="Gödel, Escher, Bach book cover" class="mobile-book left" width="70" height="105" />
    <img src="/covers/0061148520.jpg" alt="The Unbearable Lightness of Being book cover" class="mobile-book right" width="70" height="105" />
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
    padding: var(--space-2xl) var(--space-xl);
    position: relative;
    overflow: hidden;
    background: radial-gradient(
      ellipse at 50% 40%,
      rgba(184, 134, 11, 0.08) 0%,
      rgba(184, 134, 11, 0.03) 50%,
      transparent 80%
    );
  }

  .hero::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(
        circle at 50% 100%,
        rgba(114, 47, 55, 0.06) 0%,
        transparent 40%
      ),
      radial-gradient(
        circle at 15% 25%,
        rgba(184, 134, 11, 0.04) 0%,
        transparent 25%
      ),
      radial-gradient(
        circle at 85% 25%,
        rgba(184, 134, 11, 0.04) 0%,
        transparent 25%
      );
    pointer-events: none;
  }

  .hero-content {
    position: relative;
    z-index: 10;
    max-width: 720px;
    padding: var(--space-2xl) var(--space-2xl);
    background: radial-gradient(
      ellipse at center,
      rgba(253, 251, 247, 0.9) 0%,
      rgba(253, 251, 247, 0.5) 60%,
      transparent 100%
    );
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .eyebrow {
    font-family: var(--font-display);
    font-size: clamp(0.75rem, 1.5vw, 0.875rem);
    font-weight: 400;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--color-burgundy);
    margin: 0 0 var(--space-lg);
    animation: fadeSlideIn 0.6s cubic-bezier(0.4, 0, 0.2, 1) both;
  }

  h1 {
    font-family: var(--font-display);
    font-size: clamp(2.25rem, 5.5vw, 3.5rem);
    font-weight: 400;
    font-style: italic;
    color: var(--color-ink);
    line-height: 1.2;
    margin: 0 0 var(--space-xl);
    animation: fadeSlideIn 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.1s both;
  }

  .subhead {
    font-family: var(--font-body);
    font-size: clamp(1.05rem, 2vw, 1.2rem);
    color: var(--color-ink-faded);
    line-height: 1.8;
    margin: 0 0 var(--space-2xl);
    animation: fadeSlideIn 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.25s both;
  }

  .cta {
    font-size: 1.05rem;
    padding: 0.875rem 2rem;
    animation: fadeSlideIn 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.4s both;
  }

  @keyframes fadeSlideIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
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
    filter: drop-shadow(0 12px 24px rgba(74, 44, 42, 0.35));
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

  .cover-placeholder {
    width: 80px;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(to bottom, var(--color-mahogany-light), var(--color-mahogany));
    border-radius: 3px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .cover-placeholder span {
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 600;
    font-style: italic;
    color: var(--color-gold);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  .floating-book.large .cover-placeholder { width: 100px; height: 150px; }
  .floating-book.medium .cover-placeholder { width: 80px; height: 120px; }
  .floating-book.small .cover-placeholder { width: 65px; height: 98px; }
  .floating-book.tiny .cover-placeholder { width: 50px; height: 75px; }

  .scroll-hint {
    position: absolute;
    bottom: var(--space-2xl);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-sm);
    color: var(--color-ink-light);
    font-family: var(--font-body);
    font-size: 0.85rem;
    font-style: italic;
    opacity: 0;
    animation: fadeIn 1s ease 2s forwards;
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
      padding: var(--space-xl) var(--space-lg);
    }

    .hero-content {
      padding: var(--space-xl) var(--space-lg);
    }

    .floating-book {
      display: none;
    }

    .subhead br {
      display: none;
    }

    .scroll-hint {
      bottom: var(--space-lg);
    }
  }

  .mobile-books {
    display: none;
  }

  @media (max-width: 600px) {
    .mobile-books {
      display: flex;
      justify-content: center;
      gap: var(--space-xl);
      margin-top: var(--space-xl);
      opacity: 0;
      animation: fadeIn 0.8s ease 0.3s forwards;
    }

    .mobile-book {
      width: 80px;
      height: auto;
      border-radius: var(--radius-sm);
      box-shadow: 0 6px 16px rgba(74, 44, 42, 0.25);
    }

    .mobile-book.left {
      transform: rotate(-4deg);
    }

    .mobile-book.right {
      transform: rotate(4deg);
    }
  }
</style>
