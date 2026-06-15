<script lang="ts">
  import { CURATED_TOPICS } from '../stores/topics';

  interface Props {
    onSuccess?: (storeId: string) => void;
  }

  let { onSuccess }: Props = $props();

  let name = $state('');
  let neighborhood = $state('');
  let address = $state('');
  let website = $state('');
  let phone = $state('');
  let selectedSpecialties = $state<string[]>([]);
  let loading = $state(false);
  let error = $state('');
  let success = $state(false);

  const MONTREAL_NEIGHBORHOODS = [
    'Mile End',
    'Plateau Mont-Royal',
    'Rosemont',
    'Villeray',
    'Saint-Henri',
    'Verdun',
    'NDG',
    'Westmount',
    'Outremont',
    'McGill Ghetto',
    'Shaughnessy Village',
    'Old Montreal',
    'Downtown',
    'Griffintown',
    'Little Italy',
    'Hochelaga',
    'Pointe-Saint-Charles',
    'Other',
  ];

  function toggleSpecialty(topic: string) {
    if (selectedSpecialties.includes(topic)) {
      selectedSpecialties = selectedSpecialties.filter((t) => t !== topic);
    } else if (selectedSpecialties.length < 6) {
      selectedSpecialties = [...selectedSpecialties, topic];
    }
  }

  async function handleSubmit() {
    if (!name.trim() || !neighborhood || !address.trim()) {
      error = 'Name, neighborhood, and address are required';
      return;
    }

    loading = true;
    error = '';

    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          neighborhood,
          address: address.trim(),
          website: website.trim() || undefined,
          phone: phone.trim() || undefined,
          specialties: selectedSpecialties.length > 0 ? selectedSpecialties : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add store');
      }

      const data = await res.json();
      success = true;

      if (onSuccess) {
        onSuccess(data.id);
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Something went wrong';
    } finally {
      loading = false;
    }
  }

  function reset() {
    name = '';
    neighborhood = '';
    address = '';
    website = '';
    phone = '';
    selectedSpecialties = [];
    success = false;
    error = '';
  }
</script>

<div class="add-store card">
  <span class="eyebrow">Local</span>
  <h2 class="serif">Add a Bookstore</h2>
  <p class="subtitle muted">Know a great local bookstore? Add it to help others discover it.</p>

  {#if success}
    <div class="success-message">
      <span class="icon" aria-hidden="true">✓</span>
      <p>Store added! It will appear in matches for users with similar interests.</p>
      <button type="button" class="btn btn-tinted" onclick={reset}>Add another</button>
    </div>
  {:else}
    <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      <div class="field">
        <label class="label" for="name">Store name *</label>
        <input
          class="input"
          id="name"
          type="text"
          bind:value={name}
          placeholder="e.g., Argo Bookshop"
          disabled={loading}
          aria-required="true"
          aria-invalid={error && !name.trim() ? 'true' : undefined}
          aria-describedby={error ? 'store-error' : undefined}
        />
      </div>

      <div class="field">
        <label class="label" for="neighborhood">Neighborhood *</label>
        <select
          class="select"
          id="neighborhood"
          bind:value={neighborhood}
          disabled={loading}
          aria-required="true"
          aria-invalid={error && !neighborhood ? 'true' : undefined}
          aria-describedby={error ? 'store-error' : undefined}
        >
          <option value="">Select neighborhood...</option>
          {#each MONTREAL_NEIGHBORHOODS as hood}
            <option value={hood}>{hood}</option>
          {/each}
        </select>
      </div>

      <div class="field">
        <label class="label" for="address">Address *</label>
        <input
          class="input"
          id="address"
          type="text"
          bind:value={address}
          placeholder="e.g., 1915 Ste-Catherine O, Montreal"
          disabled={loading}
          aria-required="true"
          aria-invalid={error && !address.trim() ? 'true' : undefined}
          aria-describedby={error ? 'store-error' : undefined}
        />
      </div>

      <div class="field">
        <label class="label" for="website">Website</label>
        <input
          class="input"
          id="website"
          type="url"
          bind:value={website}
          placeholder="https://"
          disabled={loading}
        />
      </div>

      <div class="field">
        <label class="label" for="phone">Phone</label>
        <input
          class="input"
          id="phone"
          type="tel"
          bind:value={phone}
          placeholder="514-..."
          disabled={loading}
        />
      </div>

      <div class="field specialties-field">
        <span class="label">Specialties <span class="hint faint">(select up to 6)</span></span>
        <div class="specialties-grid">
          {#each CURATED_TOPICS as topic}
            <button
              type="button"
              class="specialty-chip"
              class:selected={selectedSpecialties.includes(topic)}
              aria-pressed={selectedSpecialties.includes(topic)}
              onclick={() => toggleSpecialty(topic)}
              disabled={loading || (!selectedSpecialties.includes(topic) && selectedSpecialties.length >= 6)}
            >
              {topic.replace(/-/g, ' ')}
            </button>
          {/each}
        </div>
      </div>

      {#if error}
        <p class="error" id="store-error" role="alert">{error}</p>
      {/if}

      <button type="submit" class="btn btn-filled btn-lg" disabled={loading}>
        {loading ? 'Adding...' : 'Add Store'}
      </button>
    </form>
  {/if}
</div>

<style>
  .add-store {
    max-width: 560px;
    margin: 0 auto;
    padding: var(--s-6);
  }

  h2 {
    margin: var(--s-1) 0 var(--s-1);
    font-size: 1.5rem;
  }

  .subtitle {
    margin: 0 0 var(--s-6);
    font-family: var(--font-ui);
    font-size: 0.9rem;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: var(--s-5);
  }

  .field {
    display: flex;
    flex-direction: column;
  }

  .hint {
    font-weight: 400;
  }

  .specialties-grid {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-2);
    max-height: 200px;
    overflow-y: auto;
    padding: var(--s-3);
    background: var(--surface-sunken);
    border: 1px solid var(--hairline);
    border-radius: var(--r-md);
  }

  .specialty-chip {
    padding: 0.5rem 0.85rem;
    min-height: 40px;
    font-family: var(--font-ui);
    font-size: 0.8125rem;
    font-weight: 540;
    color: var(--ink-muted);
    background: var(--surface);
    border: 1px solid var(--hairline-strong);
    border-radius: var(--r-full);
    cursor: pointer;
    transition: color var(--dur-1) var(--ease-soft),
                background var(--dur-2) var(--ease-out),
                border-color var(--dur-1) var(--ease-soft),
                transform var(--dur-1) var(--ease-spring);
    display: inline-flex;
    align-items: center;
  }

  .specialty-chip:active {
    transform: scale(0.96);
  }

  .specialty-chip:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--accent);
  }

  .specialty-chip.selected {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-on);
  }

  .specialty-chip.selected:hover:not(:disabled) {
    background: var(--accent-hover);
    border-color: var(--accent-hover);
    color: var(--accent-on);
  }

  .specialty-chip:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error {
    margin: 0;
    font-family: var(--font-ui);
    font-size: 0.875rem;
    color: var(--danger);
  }

  .success-message {
    text-align: center;
    padding: var(--s-6) var(--s-4);
  }

  .success-message .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    font-size: 1.5rem;
    background: var(--accent);
    color: var(--accent-on);
    border-radius: var(--r-full);
    margin-bottom: var(--s-4);
  }

  .success-message p {
    margin: 0 0 var(--s-5);
    font-family: var(--font-ui);
    color: var(--ink);
  }
</style>
