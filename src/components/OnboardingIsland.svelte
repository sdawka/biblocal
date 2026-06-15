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

<div class="onboarding card rise">
  <p class="eyebrow">Welcome</p>
  <h1 class="serif">Welcome to biblocal</h1>
  <p class="tagline muted">
    Build your living bookshelf. Find people nearby with similar taste.
  </p>

  <form
    onsubmit={(e) => {
      e.preventDefault();
      handleSubmit();
    }}
  >
    <div class="field">
      <label class="label" for="name">What should we call you?</label>
      <input
        id="name"
        class="input"
        type="text"
        bind:value={name}
        placeholder="Your name"
        autofocus
      />
    </div>

    <div class="field">
      <label class="label" for="city">Where are you?</label>
      <select id="city" class="select" bind:value={city}>
        {#each CITIES as c}
          <option value={c}>{c}</option>
        {/each}
      </select>
    </div>

    {#if error}
      <p class="error" role="alert">{error}</p>
    {/if}

    <button type="submit" class="btn btn-filled btn-lg">Start Your Shelf</button>
  </form>
</div>

<style>
  .onboarding {
    max-width: 440px;
    margin: var(--s-8) auto;
    padding: var(--s-7);
    text-align: center;
  }

  .eyebrow {
    margin-bottom: var(--s-2);
  }

  h1 {
    margin: 0 0 var(--s-3);
    font-size: clamp(1.875rem, 4vw, 2.25rem);
  }

  .tagline {
    margin: 0 0 var(--s-6);
    font-size: 1.05rem;
    line-height: 1.5;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: var(--s-5);
    text-align: left;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
  }

  .error {
    margin: 0;
    font-size: 0.875rem;
    color: var(--danger);
  }

  button[type='submit'] {
    margin-top: var(--s-2);
    width: 100%;
  }
</style>
