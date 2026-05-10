<script lang="ts">
  let visible = $state(false);
  let sectionElement: HTMLElement;
  let activeTab = $state<'shelf' | 'matches' | 'profile'>('shelf');

  const demoShelf = [
    { title: "Small Gods", author: "Terry Pratchett", status: "Will discuss", cover: "https://covers.openlibrary.org/b/isbn/0062237373-M.jpg" },
    { title: "Gödel, Escher, Bach", author: "Douglas Hofstadter", status: "Will lend", cover: "https://covers.openlibrary.org/b/isbn/0465026567-M.jpg" },
    { title: "The Dispossessed", author: "Ursula K. Le Guin", status: "Looking for", cover: "https://covers.openlibrary.org/b/isbn/0061054887-M.jpg" },
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

    <div class="preview-tabs">
      <button
        class="tab"
        class:active={activeTab === 'shelf'}
        onclick={() => activeTab = 'shelf'}
      >
        Your Shelf
      </button>
      <button
        class="tab"
        class:active={activeTab === 'matches'}
        onclick={() => activeTab = 'matches'}
      >
        Your Matches
      </button>
      <button
        class="tab"
        class:active={activeTab === 'profile'}
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
              {#each demoShelf as book}
                <div class="book-card-preview">
                  <img src={book.cover} alt={book.title} />
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
    padding: var(--space-2xl);
    background: linear-gradient(
      to bottom,
      var(--color-parchment) 0%,
      var(--color-aged-paper) 100%
    );
  }

  .section-content {
    max-width: 800px;
    margin: 0 auto;
    text-align: center;
  }

  .section-title {
    font-family: var(--font-display);
    font-size: clamp(1.8rem, 4vw, 2.5rem);
    font-weight: 600;
    color: var(--color-ink);
    margin: 0 0 var(--space-md);
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .visible .section-title {
    opacity: 1;
    transform: translateY(0);
  }

  .section-desc {
    font-family: var(--font-body);
    font-size: 1.1rem;
    color: var(--color-ink-faded);
    margin: 0 0 var(--space-xl);
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1) 0.1s;
  }

  .visible .section-desc {
    opacity: 1;
    transform: translateY(0);
  }

  .preview-tabs {
    display: flex;
    justify-content: center;
    gap: var(--space-sm);
    margin-bottom: var(--space-lg);
    flex-wrap: wrap;
  }

  .tab {
    padding: var(--space-sm) var(--space-lg);
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-ink-faded);
    background: transparent;
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-quick);
  }

  .tab:hover {
    border-color: var(--color-gold);
    color: var(--color-ink);
  }

  .tab.active {
    background: var(--color-gold);
    border-color: var(--color-gold);
    color: var(--color-ink);
  }

  .preview-frame {
    background: var(--color-cream);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: var(--shadow-lifted);
    text-align: left;
  }

  .frame-header {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-sm) var(--space-md);
    background: var(--color-mahogany);
    border-bottom: 2px solid var(--color-gold);
  }

  .frame-dots {
    display: flex;
    gap: 6px;
  }

  .frame-dots span {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--color-gold-pale);
    opacity: 0.5;
  }

  .frame-title {
    font-family: var(--font-display);
    font-size: 0.85rem;
    font-style: italic;
    color: var(--color-gold);
  }

  .frame-content {
    padding: var(--space-lg);
    min-height: 320px;
  }

  /* Shelf Preview */
  .shelf-preview .shelf-header,
  .matches-preview .matches-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-md);
  }

  .shelf-header h3,
  .matches-header h3 {
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-ink);
    margin: 0;
  }

  .book-count, .match-count {
    font-family: var(--font-body);
    font-size: 0.85rem;
    color: var(--color-ink-faded);
  }

  .books-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: var(--space-md);
  }

  .book-card-preview {
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .book-card-preview img {
    width: 100%;
    height: 120px;
    object-fit: cover;
  }

  .book-info {
    padding: var(--space-sm);
  }

  .book-title {
    display: block;
    font-family: var(--font-display);
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .book-author {
    display: block;
    font-family: var(--font-body);
    font-size: 0.7rem;
    color: var(--color-ink-faded);
    font-style: italic;
  }

  .book-status {
    display: inline-block;
    margin-top: var(--space-xs);
    padding: 2px 6px;
    font-family: var(--font-display);
    font-size: 0.6rem;
    text-transform: uppercase;
    background: var(--color-forest);
    color: var(--color-cream);
    border-radius: 2px;
  }

  .book-card-preview.add-more {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 180px;
    border-style: dashed;
    color: var(--color-ink-light);
    font-family: var(--font-body);
    font-size: 0.85rem;
  }

  .plus {
    font-size: 2rem;
    opacity: 0.5;
  }

  /* Matches Preview */
  .match-card-preview {
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-sm);
    padding: var(--space-md);
    margin-bottom: var(--space-md);
  }

  .match-card-preview.store {
    border-left: 3px solid var(--color-burgundy);
  }

  .match-header {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    margin-bottom: var(--space-sm);
  }

  .store-icon {
    font-size: 1.1rem;
  }

  .match-name {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-ink);
    flex: 1;
  }

  .match-distance {
    font-family: var(--font-body);
    font-size: 0.8rem;
    color: var(--color-ink-faded);
  }

  .specialties {
    display: flex;
    gap: var(--space-xs);
    margin-bottom: var(--space-sm);
    flex-wrap: wrap;
  }

  .specialty {
    padding: 2px 8px;
    font-family: var(--font-body);
    font-size: 0.7rem;
    background: var(--color-aged-paper);
    border-radius: 10px;
    color: var(--color-ink-faded);
  }

  .match-facets {
    display: flex;
    gap: var(--space-sm);
    flex-wrap: wrap;
  }

  .facet-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: linear-gradient(to bottom, var(--color-gold-pale), var(--color-gold-light));
    border: 1px solid var(--color-gold);
    border-radius: 3px;
    font-size: 0.75rem;
  }

  .facet-icon { font-size: 0.9rem; }
  .facet-label { font-family: var(--font-display); color: var(--color-ink); }
  .facet-count { font-family: var(--font-body); color: var(--color-ink-faded); }

  .shared-books {
    margin-top: var(--space-sm);
    font-family: var(--font-body);
    font-size: 0.8rem;
    color: var(--color-ink-faded);
  }

  .shared-label {
    font-weight: 600;
    color: var(--color-ink-light);
  }

  /* Profile Preview */
  .profile-header {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    margin-bottom: var(--space-lg);
    padding-bottom: var(--space-md);
    border-bottom: 1px solid var(--color-gold-pale);
  }

  .avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: var(--color-burgundy);
    color: var(--color-cream);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 600;
  }

  .profile-info h3 {
    font-family: var(--font-display);
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--color-ink);
    margin: 0 0 4px;
  }

  .location {
    font-family: var(--font-body);
    font-size: 0.85rem;
    color: var(--color-ink-faded);
  }

  .profile-section {
    margin-bottom: var(--space-md);
  }

  .profile-section .label {
    display: block;
    font-family: var(--font-display);
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-ink-light);
    margin-bottom: var(--space-xs);
  }

  .profile-section .value {
    font-family: var(--font-body);
    font-size: 0.95rem;
    color: var(--color-ink);
    margin: 0;
  }

  .profile-section .value.italic {
    font-style: italic;
  }

  .topics {
    display: flex;
    gap: var(--space-xs);
    flex-wrap: wrap;
  }

  .topic-tag {
    padding: 4px 10px;
    font-family: var(--font-body);
    font-size: 0.8rem;
    background: var(--color-forest);
    color: var(--color-cream);
    border-radius: 12px;
  }

  .preview-note {
    margin-top: var(--space-lg);
  }

  .marginalia {
    font-family: var(--font-handwritten);
    font-size: 1.1rem;
    color: var(--color-ink-light);
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
      padding: 3px 8px;
    }
  }
</style>
