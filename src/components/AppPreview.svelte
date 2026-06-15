<script lang="ts">
  let visible = $state(false);
  let sectionElement: HTMLElement;
  let activeTab = $state<'shelf' | 'matches' | 'profile'>('shelf');
  let failedImages = $state<Set<number>>(new Set());

  function handleImageError(index: number) {
    failedImages = new Set([...failedImages, index]);
  }

  const demoShelf = [
    { title: "Small Gods", author: "Terry Pratchett", status: "Will discuss", cover: "/covers/0062237373.jpg" },
    { title: "Gödel, Escher, Bach", author: "Douglas Hofstadter", status: "Will lend", cover: "/covers/0465026567.jpg" },
    { title: "The Dispossessed", author: "Ursula K. Le Guin", status: "Looking for", cover: "/covers/0061054887.jpg" },
  ];

  const demoMatches = [
    {
      name: "Sarah K.",
      distance: "0.8 km",
      facets: [
        { icon: "📚", label: "Shelf Twin", count: 4 },
        { icon: "🤝", label: "Can Borrow", count: 7 },
      ],
      sharedBooks: ["Small Gods", "Night Watch", "Going Postal", "Mort"]
    },
    {
      name: "Corner Books",
      distance: "Kensington",
      isStore: true,
      facets: [
        { icon: "🔍", label: "Has What You Seek", count: 2 },
        { icon: "🏪", label: "In Stock", count: 340 },
      ],
      specialties: ["Sci-Fi", "Philosophy", "Used Books"]
    },
  ];

  const demoProfile = {
    name: "Alex Chen",
    city: "Vancouver",
    radius: "5 km",
    topics: ["Philosophy", "Science Fiction", "History of Science"],
    borrowStyle: "Happy to lend, just text first",
    currentObsession: "Anything by Ursula K. Le Guin"
  };

  $effect(() => {
    if (!sectionElement) return;
    const observer = new IntersectionObserver(
      ([entry]) => { visible = entry.isIntersecting; },
      { threshold: 0.2 }
    );
    observer.observe(sectionElement);
    return () => observer.disconnect();
  });
</script>

<section class="preview-section" bind:this={sectionElement} class:visible>
  <div class="section-content">
    <h2 class="section-title">See what you're building</h2>
    <p class="section-desc">
      A shelf that says who you are. Matches that actually make sense. A profile that's more than a bio.
    </p>

    <div class="preview-tabs segmented">
      <button
        class="tab"
        class:active={activeTab === 'shelf'}
        aria-pressed={activeTab === 'shelf'}
        onclick={() => activeTab = 'shelf'}
      >
        Your Shelf
      </button>
      <button
        class="tab"
        class:active={activeTab === 'matches'}
        aria-pressed={activeTab === 'matches'}
        onclick={() => activeTab = 'matches'}
      >
        Your Matches
      </button>
      <button
        class="tab"
        class:active={activeTab === 'profile'}
        aria-pressed={activeTab === 'profile'}
        onclick={() => activeTab = 'profile'}
      >
        Your Profile
      </button>
    </div>

    <div class="preview-frame">
      <div class="frame-header">
        <div class="frame-dots">
          <span></span><span></span><span></span>
        </div>
        <span class="frame-title">biblocal</span>
      </div>

      <div class="frame-content">
        {#if activeTab === 'shelf'}
          <div class="shelf-preview">
            <div class="shelf-header">
              <h3>Your Shelf</h3>
              <span class="book-count">24 books</span>
            </div>
            <div class="books-grid">
              {#each demoShelf as book, i}
                <div class="book-card-preview">
                  {#if failedImages.has(i)}
                    <div class="cover-placeholder">
                      <span>{book.title.charAt(0)}</span>
                    </div>
                  {:else}
                    <img
                      src={book.cover}
                      alt={book.title}
                      width="140"
                      height="120"
                      loading="lazy"
                      onerror={() => handleImageError(i)}
                    />
                  {/if}
                  <div class="book-info">
                    <span class="book-title">{book.title}</span>
                    <span class="book-author">{book.author}</span>
                    <span class="book-status">{book.status}</span>
                  </div>
                </div>
              {/each}
              <div class="book-card-preview add-more">
                <span class="plus">+</span>
                <span>Add book</span>
              </div>
            </div>
          </div>

        {:else if activeTab === 'matches'}
          <div class="matches-preview">
            <div class="matches-header">
              <h3>Nearby Matches</h3>
              <span class="match-count">12 matches</span>
            </div>
            {#each demoMatches as match}
              <div class="match-card-preview" class:store={match.isStore}>
                <div class="match-header">
                  {#if match.isStore}<span class="store-icon">🏪</span>{/if}
                  <span class="match-name">{match.name}</span>
                  <span class="match-distance">{match.distance}</span>
                </div>
                {#if match.specialties}
                  <div class="specialties">
                    {#each match.specialties as s}
                      <span class="specialty">{s}</span>
                    {/each}
                  </div>
                {/if}
                <div class="match-facets">
                  {#each match.facets as facet}
                    <span class="facet-badge">
                      <span class="facet-icon">{facet.icon}</span>
                      <span class="facet-label">{facet.label}</span>
                      <span class="facet-count">{facet.count}</span>
                    </span>
                  {/each}
                </div>
                {#if match.sharedBooks}
                  <div class="shared-books">
                    <span class="shared-label">Shared:</span>
                    {match.sharedBooks.slice(0, 2).join(", ")}...
                  </div>
                {/if}
              </div>
            {/each}
          </div>

        {:else}
          <div class="profile-preview">
            <div class="profile-header">
              <div class="avatar">{demoProfile.name.charAt(0)}</div>
              <div class="profile-info">
                <h3>{demoProfile.name}</h3>
                <span class="location">{demoProfile.city} · {demoProfile.radius} radius</span>
              </div>
            </div>
            <div class="profile-section">
              <span class="label">Topics I love</span>
              <div class="topics">
                {#each demoProfile.topics as topic}
                  <span class="topic-tag">{topic}</span>
                {/each}
              </div>
            </div>
            <div class="profile-section">
              <span class="label">Borrowing style</span>
              <p class="value">{demoProfile.borrowStyle}</p>
            </div>
            <div class="profile-section">
              <span class="label">Current obsession</span>
              <p class="value italic">{demoProfile.currentObsession}</p>
            </div>
          </div>
        {/if}
      </div>
    </div>

    <p class="preview-note marginalia">
      All yours to customize. No algorithmic manipulation. Just books and humans.
    </p>
  </div>
</section>

<style>
  .preview-section {
    padding: var(--s-10) var(--s-6);
    background: var(--canvas);
  }

  .section-content {
    max-width: 800px;
    margin: 0 auto;
    text-align: center;
  }

  .section-title {
    font-size: clamp(1.8rem, 4vw, 2.5rem);
    margin: 0 0 var(--s-4);
    opacity: 0;
    transform: translateY(18px);
    transition: opacity var(--dur-3) var(--ease-out), transform var(--dur-3) var(--ease-out);
  }

  .visible .section-title {
    opacity: 1;
    transform: translateY(0);
  }

  .section-desc {
    font-family: var(--font-ui);
    font-size: 1.1rem;
    color: var(--ink-muted);
    margin: 0 0 var(--s-7);
    opacity: 0;
    transform: translateY(18px);
    transition: opacity var(--dur-3) var(--ease-out) 80ms, transform var(--dur-3) var(--ease-out) 80ms;
  }

  .visible .section-desc {
    opacity: 1;
    transform: translateY(0);
  }

  .preview-tabs {
    margin-bottom: var(--s-5);
    flex-wrap: wrap;
  }

  .preview-frame {
    background: var(--surface);
    border: 1px solid var(--hairline);
    border-radius: var(--r-xl);
    overflow: hidden;
    box-shadow: var(--shadow-3);
    text-align: left;
  }

  .frame-header {
    display: flex;
    align-items: center;
    gap: var(--s-4);
    padding: var(--s-3) var(--s-4);
    background: var(--surface-sunken);
    border-bottom: 1px solid var(--hairline);
  }

  .frame-dots {
    display: flex;
    gap: 6px;
  }

  .frame-dots span {
    width: 10px;
    height: 10px;
    border-radius: var(--r-full);
    background: var(--hairline-strong);
  }

  .frame-title {
    font-family: var(--font-display);
    font-size: 0.9rem;
    color: var(--ink-muted);
  }

  .frame-content {
    padding: var(--s-5);
    min-height: 320px;
  }

  /* Shelf Preview */
  .shelf-preview .shelf-header,
  .matches-preview .matches-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--s-4);
  }

  .shelf-header h3,
  .matches-header h3 {
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-weight: 500;
    color: var(--ink);
    margin: 0;
  }

  .book-count, .match-count {
    font-family: var(--font-ui);
    font-size: 0.85rem;
    color: var(--ink-muted);
  }

  .books-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: var(--s-4);
  }

  .book-card-preview {
    background: var(--surface-sunken);
    border: 1px solid var(--hairline);
    border-radius: var(--r-md);
    overflow: hidden;
  }

  .book-card-preview img {
    width: 100%;
    height: 120px;
    object-fit: cover;
  }

  .cover-placeholder {
    width: 100%;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--accent-tint);
  }

  .cover-placeholder span {
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 500;
    color: var(--accent);
  }

  .book-info {
    padding: var(--s-3);
  }

  .book-title {
    display: block;
    font-family: var(--font-display);
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .book-author {
    display: block;
    font-family: var(--font-ui);
    font-size: 0.7rem;
    color: var(--ink-muted);
  }

  .book-status {
    display: inline-block;
    margin-top: var(--s-1);
    padding: 0.15rem 0.5rem;
    font-family: var(--font-ui);
    font-size: 0.65rem;
    font-weight: 590;
    background: var(--accent-tint);
    color: var(--accent);
    border-radius: var(--r-full);
  }

  .book-card-preview.add-more {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 180px;
    border-style: dashed;
    border-color: var(--hairline-strong);
    color: var(--ink-faint);
    font-family: var(--font-ui);
    font-size: 0.85rem;
  }

  .plus {
    font-size: 2rem;
    opacity: 0.6;
  }

  /* Matches Preview */
  .match-card-preview {
    background: var(--surface-sunken);
    border: 1px solid var(--hairline);
    border-radius: var(--r-md);
    padding: var(--s-4);
    margin-bottom: var(--s-4);
  }

  .match-card-preview.store {
    border-left: 3px solid var(--accent);
  }

  .match-header {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    margin-bottom: var(--s-3);
  }

  .store-icon {
    font-size: 1.1rem;
  }

  .match-name {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 500;
    color: var(--ink);
    flex: 1;
  }

  .match-distance {
    font-family: var(--font-ui);
    font-size: 0.8rem;
    color: var(--ink-muted);
  }

  .specialties {
    display: flex;
    gap: var(--s-2);
    margin-bottom: var(--s-3);
    flex-wrap: wrap;
  }

  .specialty {
    padding: 0.15rem 0.6rem;
    font-family: var(--font-ui);
    font-size: 0.7rem;
    background: var(--surface);
    border: 1px solid var(--hairline);
    border-radius: var(--r-full);
    color: var(--ink-muted);
  }

  .match-facets {
    display: flex;
    gap: var(--s-3);
    flex-wrap: wrap;
  }

  .facet-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0.25rem 0.65rem;
    background: var(--accent-tint);
    border-radius: var(--r-full);
    font-size: 0.75rem;
  }

  .facet-icon { font-size: 0.9rem; }
  .facet-label { font-family: var(--font-ui); font-weight: 590; color: var(--accent); }
  .facet-count { font-family: var(--font-ui); color: var(--ink-muted); }

  .shared-books {
    margin-top: var(--s-3);
    font-family: var(--font-ui);
    font-size: 0.8rem;
    color: var(--ink-muted);
  }

  .shared-label {
    font-weight: 590;
    color: var(--ink-faint);
  }

  /* Profile Preview */
  .profile-header {
    display: flex;
    align-items: center;
    gap: var(--s-4);
    margin-bottom: var(--s-5);
    padding-bottom: var(--s-4);
    border-bottom: 1px solid var(--hairline);
  }

  .avatar {
    width: 60px;
    height: 60px;
    border-radius: var(--r-full);
    background: var(--accent);
    color: var(--accent-on);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 500;
  }

  .profile-info h3 {
    font-family: var(--font-display);
    font-size: 1.2rem;
    font-weight: 500;
    color: var(--ink);
    margin: 0 0 4px;
  }

  .location {
    font-family: var(--font-ui);
    font-size: 0.85rem;
    color: var(--ink-muted);
  }

  .profile-section {
    margin-bottom: var(--s-4);
  }

  .profile-section .label {
    display: block;
    font-family: var(--font-ui);
    font-size: 0.75rem;
    font-weight: 590;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--ink-faint);
    margin-bottom: var(--s-1);
  }

  .profile-section .value {
    font-family: var(--font-ui);
    font-size: 0.95rem;
    color: var(--ink);
    margin: 0;
  }

  .profile-section .value.italic {
    font-family: var(--font-display);
    font-style: italic;
  }

  .topics {
    display: flex;
    gap: var(--s-2);
    flex-wrap: wrap;
  }

  .topic-tag {
    padding: 0.25rem 0.65rem;
    font-family: var(--font-ui);
    font-size: 0.8rem;
    background: var(--accent-tint);
    color: var(--accent);
    border-radius: var(--r-full);
  }

  .preview-note {
    margin-top: var(--s-5);
  }

  .marginalia {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 1.1rem;
    color: var(--ink-faint);
  }

  /* Mobile */
  @media (max-width: 600px) {
    .books-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .book-card-preview.add-more {
      min-height: 140px;
    }

    .facet-badge {
      font-size: 0.7rem;
      padding: 0.2rem 0.55rem;
    }
  }
</style>
