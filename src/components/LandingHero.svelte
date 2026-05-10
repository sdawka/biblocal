<script lang="ts">
  let visible = $state(false);
  let heroElement: HTMLElement;

  const demoBooks = [
    { title: "Small Gods", cover: "https://covers.openlibrary.org/b/isbn/0062237373-M.jpg", side: "left", top: 8, size: "large" },
    { title: "Gödel, Escher, Bach", cover: "https://covers.openlibrary.org/b/isbn/0465026567-M.jpg", side: "right", top: 12, size: "medium" },
    { title: "Night Watch", cover: "https://covers.openlibrary.org/b/isbn/0060013125-M.jpg", side: "left", top: 25, size: "medium" },
    { title: "One Hundred Years of Solitude", cover: "https://covers.openlibrary.org/b/isbn/0060883286-M.jpg", side: "right", top: 30, size: "large" },
    { title: "The Unbearable Lightness of Being", cover: "https://covers.openlibrary.org/b/isbn/0061148520-M.jpg", side: "left", top: 45, size: "small" },
    { title: "Going Postal", cover: "https://covers.openlibrary.org/b/isbn/0060502932-M.jpg", side: "right", top: 50, size: "medium" },
    { title: "Beloved", cover: "https://covers.openlibrary.org/b/isbn/1400033411-M.jpg", side: "left", top: 62, size: "medium" },
    { title: "Guards! Guards!", cover: "https://covers.openlibrary.org/b/isbn/0062225758-M.jpg", side: "right", top: 68, size: "small" },
    { title: "The Master and Margarita", cover: "https://covers.openlibrary.org/b/isbn/0140455469-M.jpg", side: "left", top: 80, size: "small" },
    { title: "Mort", cover: "https://covers.openlibrary.org/b/isbn/0062225715-M.jpg", side: "right", top: 85, size: "medium" },
    { title: "The Dispossessed", cover: "https://covers.openlibrary.org/b/isbn/0061054887-M.jpg", side: "left", top: 18, size: "small" },
    { title: "If on a winter's night a traveler", cover: "https://covers.openlibrary.org/b/isbn/0156439611-M.jpg", side: "right", top: 40, size: "small" },
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
        class="floating-book {book.side} {book.size}"
        style="--delay: {0.2 + i * 0.25}s; top: {book.top}%;"
      >
        <img src={book.cover} alt={book.title} />
      </div>
    {/each}
  </div>

  <div class="hero-content">
    <p class="eyebrow">For people whose "to-read" pile has structural concerns</p>
    <h1>Your bookshelf<br/>is a conversation waiting to happen.</h1>
    <p class="subhead">
      Find the neighbors who also ugly-cried at that ending.<br/>
      Lend the book you can't shut up about. Finally meet your people.
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
    max-width: 700px;
  }

  .eyebrow {
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.15em;
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
    font-size: clamp(2.5rem, 7vw, 4.2rem);
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
    font-size: clamp(1.1rem, 2.5vw, 1.3rem);
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
    transition: all 1.2s cubic-bezier(0.4, 0, 0.2, 1);
    transition-delay: var(--delay);
    filter: drop-shadow(0 8px 24px rgba(74, 44, 42, 0.2));
  }

  .floating-book.left {
    left: 3%;
    transform: translateX(-100px) rotate(-15deg) scale(0.8);
  }

  .floating-book.right {
    right: 3%;
    transform: translateX(100px) rotate(15deg) scale(0.8);
  }

  .visible .floating-book.left {
    opacity: 0.85;
    transform: translateX(0) rotate(-4deg) scale(1);
  }

  .visible .floating-book.right {
    opacity: 0.85;
    transform: translateX(0) rotate(4deg) scale(1);
  }

  .floating-book.large img { width: 110px; }
  .floating-book.medium img { width: 90px; }
  .floating-book.small img { width: 70px; }

  .floating-book img {
    height: auto;
    border-radius: 3px;
    box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.15),
      inset 0 0 0 1px rgba(255, 255, 255, 0.1);
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
    animation: fadeIn 1s ease 3s forwards;
  }

  .scroll-hint svg {
    animation: gentleFloat 2s ease-in-out infinite;
  }

  @keyframes gentleFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(6px); }
  }

  @media (max-width: 900px) {
    .floating-book.large img { width: 85px; }
    .floating-book.medium img { width: 70px; }
    .floating-book.small img { width: 55px; }

    .floating-book.left { left: 1%; }
    .floating-book.right { right: 1%; }
  }

  @media (max-width: 600px) {
    .floating-book {
      display: none;
    }
  }
</style>
