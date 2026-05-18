<script lang="ts">
  import { initProfile, isOnboarded } from '../stores/profile';

  let name = $state('');
  let city = $state('Montreal');
  let error = $state('');

  const CITIES = [
    'Montreal',
    'Toronto',
    'Vancouver',
    'Ottawa',
    'Calgary',
    'Edmonton',
    'Quebec City',
    'Winnipeg',
    'Halifax',
    'Victoria',
  ];

  function handleSubmit() {
    if (!name.trim()) {
      error = 'Please enter your name';
      return;
    }

    initProfile(name.trim(), city);
    window.location.href = '/shelf';
  }
</script>

<div class="onboarding">
  <h1>Welcome to biblocal</h1>
  <p class="tagline">
    Build your living bookshelf. Find people nearby with similar taste.
  </p>

  <form
    onsubmit={(e) => {
      e.preventDefault();
      handleSubmit();
    }}
  >
    <div class="field">
      <label for="name">What should we call you?</label>
      <input
        id="name"
        type="text"
        bind:value={name}
        placeholder="Your name"
        autofocus
      />
    </div>

    <div class="field">
      <label for="city">Where are you?</label>
      <select id="city" bind:value={city}>
        {#each CITIES as c}
          <option value={c}>{c}</option>
        {/each}
      </select>
    </div>

    {#if error}
      <p class="error">{error}</p>
    {/if}

    <button type="submit">Start Your Shelf</button>
  </form>
</div>

<style>
  .onboarding {
    max-width: 440px;
    margin: 3rem auto;
    padding: 2.5rem;
    text-align: center;
    background: var(--color-cream);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lifted);
    position: relative;
    animation: fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Subtle corner dots */
  .onboarding::before,
  .onboarding::after {
    content: '';
    position: absolute;
    width: 5px;
    height: 5px;
    background: var(--color-gold);
    border-radius: 50%;
    opacity: 0.35;
  }

  .onboarding::before {
    top: 14px;
    left: 14px;
  }

  .onboarding::after {
    bottom: 14px;
    right: 14px;
  }

  h1 {
    margin: 0.5rem 0 0.5rem;
    font-family: var(--font-display);
    font-size: 2.25rem;
    font-weight: 700;
    font-style: italic;
    color: var(--color-burgundy);
  }

  .tagline {
    margin: 0 0 2rem;
    font-family: var(--font-body);
    font-size: 1.05rem;
    font-style: italic;
    color: var(--color-ink-faded);
    line-height: 1.5;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    text-align: left;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  label {
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-ink-faded);
    letter-spacing: 0.02em;
  }

  input,
  select {
    padding: 0.75rem 1rem;
    font-family: var(--font-body);
    font-size: 1rem;
    color: var(--color-ink);
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-sm);
    transition: all var(--transition-quick);
    box-shadow: var(--shadow-inset);
  }

  input::placeholder {
    color: var(--color-ink-light);
    font-style: italic;
  }

  select {
    appearance: none;
    padding-right: 2.5rem;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B5B4F' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 1rem center;
    cursor: pointer;
  }

  input:focus,
  select:focus {
    outline: none;
    border-color: var(--color-gold);
    box-shadow: var(--shadow-inset), 0 0 0 3px rgba(184, 134, 11, 0.2);
  }

  .error {
    margin: 0;
    font-family: var(--font-body);
    font-size: 0.875rem;
    color: #8B2500;
    font-style: italic;
  }

  button {
    margin-top: 0.5rem;
    padding: 0.875rem 1.5rem;
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-cream);
    background: linear-gradient(
      to bottom,
      var(--color-burgundy-light),
      var(--color-burgundy),
      var(--color-burgundy-dark)
    );
    border: 1px solid var(--color-burgundy-dark);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-gentle);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.15),
      0 3px 6px rgba(74, 44, 42, 0.3);
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
  }

  button:hover {
    background: linear-gradient(
      to bottom,
      var(--color-burgundy),
      var(--color-burgundy-dark),
      #4A1F25
    );
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.1),
      0 4px 10px rgba(74, 44, 42, 0.4);
    transform: translateY(-1px);
  }

  button:active {
    transform: translateY(0);
    box-shadow:
      inset 0 2px 4px rgba(0, 0, 0, 0.2),
      0 1px 2px rgba(74, 44, 42, 0.3);
  }

  button:focus {
    outline: 2px solid var(--color-gold);
    outline-offset: 2px;
  }
</style>
