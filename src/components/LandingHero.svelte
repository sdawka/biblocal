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

  <div class="hero-content glass">
    <p class="eyebrow">The local network for readers</p>
    <h1>You are what you read.<br/>So are they.</h1>
    <p class="subhead">
      Share your shelf. Find readers nearby with shared taste.<br/>
      Lend books, borrow books, talk books.
    </p>
    <button class="cta btn btn-filled btn-lg" onclick={scrollToSignIn}>
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
    padding: var(--s-10) var(--s-6);
    position: relative;
    overflow: hidden;
    background:
      radial-gradient(ellipse at 50% 38%, var(--accent-tint) 0%, transparent 60%),
      var(--canvas);
  }

  .hero-content {
    position: relative;
    z-index: 10;
    max-width: 720px;
    padding: var(--s-8) var(--s-7);
    border-radius: var(--r-xl);
    border: 1px solid var(--hairline);
    box-shadow: var(--shadow-2);
  }

  .eyebrow {
    margin: 0 0 var(--s-4);
    animation: heroRise 0.6s var(--ease-out) both;
  }

  h1 {
    font-size: clamp(2.25rem, 5.5vw, 3.5rem);
    line-height: 1.1;
    letter-spacing: -0.02em;
    margin: 0 0 var(--s-5);
    animation: heroRise 0.8s var(--ease-out) 0.1s both;
  }

  .subhead {
    font-family: var(--font-ui);
    font-size: clamp(1.05rem, 2vw, 1.2rem);
    color: var(--ink-muted);
    line-height: 1.65;
    margin: 0 0 var(--s-7);
    animation: heroRise 0.8s var(--ease-out) 0.25s both;
  }

  .cta {
    animation: heroRise 0.8s var(--ease-out) 0.4s both;
  }

  @keyframes heroRise {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
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
    filter: drop-shadow(0 14px 28px oklch(0.26 0.02 270 / 0.30));
    animation: floatInward 2.5s var(--ease-out) forwards;
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
      opacity: 0.85;
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
      floatInward 2.5s var(--ease-out) forwards,
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
    border-radius: var(--r-sm);
    box-shadow: var(--shadow-2);
  }

  .cover-placeholder {
    width: 80px;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--accent-tint);
    border-radius: var(--r-sm);
    box-shadow: var(--shadow-2);
  }

  .cover-placeholder span {
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 500;
    color: var(--accent);
  }

  .floating-book.large .cover-placeholder { width: 100px; height: 150px; }
  .floating-book.medium .cover-placeholder { width: 80px; height: 120px; }
  .floating-book.small .cover-placeholder { width: 65px; height: 98px; }
  .floating-book.tiny .cover-placeholder { width: 50px; height: 75px; }

  .scroll-hint {
    position: absolute;
    bottom: var(--s-8);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--s-2);
    color: var(--ink-faint);
    font-family: var(--font-ui);
    font-size: 0.85rem;
    opacity: 0;
    animation: heroFadeIn 1s ease 2s forwards;
  }

  .scroll-hint svg {
    animation: gentleFloat 2s ease-in-out infinite;
  }

  @keyframes gentleFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(6px); }
  }

  @keyframes heroFadeIn {
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
      padding: var(--s-8) var(--s-5);
    }

    .hero-content {
      padding: var(--s-7) var(--s-5);
    }

    .floating-book {
      display: none;
    }

    .subhead br {
      display: none;
    }

    .scroll-hint {
      bottom: var(--s-5);
    }
  }

  .mobile-books {
    display: none;
  }

  @media (max-width: 600px) {
    .mobile-books {
      display: flex;
      justify-content: center;
      gap: var(--s-6);
      margin-top: var(--s-6);
      opacity: 0;
      animation: heroFadeIn 0.8s ease 0.3s forwards;
    }

    .mobile-book {
      width: 80px;
      height: auto;
      border-radius: var(--r-sm);
      box-shadow: var(--shadow-2);
    }

    .mobile-book.left {
      transform: rotate(-4deg);
    }

    .mobile-book.right {
      transform: rotate(4deg);
    }
  }
</style>
