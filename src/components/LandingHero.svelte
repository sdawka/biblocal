<script lang="ts">
  let visible = $state(false);
  let heroElement: HTMLElement;

  const demoBooks = [
    { title: "The Master and Margarita", author: "Bulgakov", cover: "https://covers.openlibrary.org/b/isbn/0140455469-M.jpg", side: "left" },
    { title: "Beloved", author: "Morrison", cover: "https://covers.openlibrary.org/b/isbn/1400033411-M.jpg", side: "right" },
    { title: "Sapiens", author: "Harari", cover: "https://covers.openlibrary.org/b/isbn/0062316095-M.jpg", side: "left" },
    { title: "Station Eleven", author: "Mandel", cover: "https://covers.openlibrary.org/b/isbn/0385353308-M.jpg", side: "right" },
    { title: "The Remains of the Day", author: "Ishiguro", cover: "https://covers.openlibrary.org/b/isbn/0679731725-M.jpg", side: "left" },
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
        class="floating-book {book.side}"
        style="--delay: {i * 0.15}s; --offset: {(i % 3) * 30}px;"
      >
        <img src={book.cover} alt={book.title} />
        <span class="book-label">{book.title}</span>
      </div>
    {/each}
  </div>

  <div class="hero-content">
    <h1>Find your people<br/>through what you read.</h1>
    <p class="subhead">
      Build a living bookshelf. Match with neighbors who share your taste.<br/>
      Borrow, discuss, and discover locally.
    </p>
    <button class="cta btn-victorian" onclick={scrollToSignIn}>
      Start Your Shelf
    </button>
  </div>

  <div class="scroll-hint">
    <span>Scroll to discover</span>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  </div>
</section>

<style>
  .hero {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: var(--space-2xl);
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
    max-width: 800px;
  }

  h1 {
    font-family: var(--font-display);
    font-size: clamp(2.5rem, 7vw, 4.5rem);
    font-weight: 600;
    font-style: italic;
    color: var(--color-ink);
    line-height: 1.15;
    margin: 0 0 var(--space-lg);
    opacity: 0;
    transform: translateY(30px);
    transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .visible h1 {
    opacity: 1;
    transform: translateY(0);
  }

  .subhead {
    font-family: var(--font-body);
    font-size: clamp(1.1rem, 2.5vw, 1.35rem);
    color: var(--color-ink-faded);
    line-height: 1.7;
    margin: 0 0 var(--space-xl);
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.2s;
  }

  .visible .subhead {
    opacity: 1;
    transform: translateY(0);
  }

  .cta {
    font-size: 1.1rem;
    padding: 0.875rem 2rem;
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
    opacity: 0;
    transition: all 1s cubic-bezier(0.4, 0, 0.2, 1);
    transition-delay: var(--delay);
    filter: drop-shadow(0 8px 24px rgba(74, 44, 42, 0.25));
  }

  .floating-book.left {
    left: 5%;
    transform: translateX(-80px) rotate(-12deg);
  }

  .floating-book.right {
    right: 5%;
    transform: translateX(80px) rotate(12deg);
  }

  .visible .floating-book.left {
    opacity: 0.9;
    transform: translateX(0) rotate(-3deg);
  }

  .visible .floating-book.right {
    opacity: 0.9;
    transform: translateX(0) rotate(3deg);
  }

  .floating-book:nth-child(1) { top: 10%; }
  .floating-book:nth-child(2) { top: 15%; }
  .floating-book:nth-child(3) { top: 45%; }
  .floating-book:nth-child(4) { top: 55%; }
  .floating-book:nth-child(5) { top: 75%; }

  .floating-book img {
    width: 100px;
    height: auto;
    border-radius: 3px;
    box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.15),
      inset 0 0 0 1px rgba(255, 255, 255, 0.1);
  }

  .book-label {
    display: none;
    position: absolute;
    bottom: -24px;
    left: 50%;
    transform: translateX(-50%);
    font-family: var(--font-handwritten);
    font-size: 0.9rem;
    color: var(--color-ink-faded);
    white-space: nowrap;
  }

  .floating-book:hover .book-label {
    display: block;
  }

  .scroll-hint {
    position: absolute;
    bottom: var(--space-xl);
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
    animation: fadeIn 1s ease 1.5s forwards;
  }

  .scroll-hint svg {
    animation: gentleFloat 2s ease-in-out infinite;
  }

  @keyframes gentleFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(6px); }
  }

  @media (max-width: 768px) {
    .floating-book img {
      width: 70px;
    }

    .floating-book.left { left: 2%; }
    .floating-book.right { right: 2%; }
  }
</style>
