<script lang="ts">
  import { initProfile, isOnboarded } from '../stores/profile';

  let name = $state('');
  let city = $state('Demo City');
  let error = $state('');

  const CITIES = [
    'Demo City',
    'New York',
    'Los Angeles',
    'Chicago',
    'Houston',
    'Phoenix',
    'Philadelphia',
    'San Antonio',
    'San Diego',
    'Dallas',
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
    max-width: 400px;
    margin: 4rem auto;
    padding: 2rem;
    text-align: center;
  }

  h1 {
    margin: 0 0 0.5rem;
    font-size: 2rem;
  }

  .tagline {
    margin: 0 0 2rem;
    color: #666;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    text-align: left;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  label {
    font-size: 0.875rem;
    font-weight: 500;
  }

  input,
  select {
    padding: 0.75rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
  }

  .error {
    margin: 0;
    color: #dc2626;
    font-size: 0.875rem;
  }

  button {
    padding: 0.875rem;
    background: #0066cc;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
  }

  button:hover {
    background: #0055aa;
  }
</style>
