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

<div class="add-store">
  <h2>Add a Bookstore</h2>
  <p class="subtitle">Know a great local bookstore? Add it to help others discover it.</p>

  {#if success}
    <div class="success-message">
      <span class="icon">✓</span>
      <p>Store added! It will appear in matches for users with similar interests.</p>
      <button type="button" onclick={reset}>Add another</button>
    </div>
  {:else}
    <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      <div class="field">
        <label for="name">Store name *</label>
        <input
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
        <label for="neighborhood">Neighborhood *</label>
        <select
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
        <label for="address">Address *</label>
        <input
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
        <label for="website">Website</label>
        <input
          id="website"
          type="url"
          bind:value={website}
          placeholder="https://"
          disabled={loading}
        />
      </div>

      <div class="field">
        <label for="phone">Phone</label>
        <input
          id="phone"
          type="tel"
          bind:value={phone}
          placeholder="514-..."
          disabled={loading}
        />
      </div>

      <div class="field specialties-field">
        <label>Specialties <span class="hint">(select up to 6)</span></label>
        <div class="specialties-grid">
          {#each CURATED_TOPICS as topic}
            <button
              type="button"
              class="specialty-chip"
              class:selected={selectedSpecialties.includes(topic)}
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

      <button type="submit" class="submit-btn" disabled={loading}>
        {loading ? 'Adding...' : 'Add Store'}
      </button>
    </form>
  {/if}
</div>

<style>
  .add-store {
    max-width: 560px;
    margin: 0 auto;
    padding: 2rem;
    background: var(--color-cream);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-card);
  }

  h2 {
    margin: 0 0 0.25rem;
    font-family: var(--font-display);
    font-size: 1.5rem;
    color: var(--color-ink);
  }

  .subtitle {
    margin: 0 0 1.5rem;
    font-family: var(--font-body);
    font-size: 0.9rem;
    color: var(--color-ink-faded);
    font-style: italic;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
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
    color: var(--color-ink);
  }

  .hint {
    font-weight: 400;
    font-style: italic;
    color: var(--color-ink-faded);
  }

  input,
  select {
    padding: 0.625rem 0.875rem;
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

  input:focus,
  select:focus {
    outline: none;
    border-color: var(--color-gold);
    box-shadow: var(--shadow-inset), 0 0 0 3px rgba(184, 134, 11, 0.15);
  }

  select {
    appearance: none;
    padding-right: 2.5rem;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B5B4F' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.875rem center;
    cursor: pointer;
  }

  .specialties-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    max-height: 180px;
    overflow-y: auto;
    padding: 0.5rem;
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-sm);
  }

  .specialty-chip {
    padding: 0.5rem 0.75rem;
    min-height: 44px;
    font-family: var(--font-body);
    font-size: 0.75rem;
    color: var(--color-ink-faded);
    background: var(--color-cream);
    border: 1px solid var(--color-gold-pale);
    border-radius: 2px;
    cursor: pointer;
    transition: all var(--transition-quick);
    display: inline-flex;
    align-items: center;
  }

  .specialty-chip:hover:not(:disabled) {
    border-color: var(--color-gold);
    color: var(--color-ink);
  }

  .specialty-chip.selected {
    background: var(--color-burgundy, #722f37);
    border-color: var(--color-burgundy, #722f37);
    color: var(--color-cream);
  }

  .specialty-chip:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .submit-btn {
    padding: 0.875rem 1.5rem;
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-cream);
    background: linear-gradient(
      to bottom,
      #8B3A3A,
      #722F37,
      #5A252C
    );
    border: 1px solid #5A252C;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-gentle);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.15),
      0 2px 4px rgba(90, 37, 44, 0.3);
  }

  .submit-btn:hover:not(:disabled) {
    background: linear-gradient(
      to bottom,
      #722F37,
      #5A252C,
      #421B21
    );
    transform: translateY(-1px);
  }

  .submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error {
    margin: 0;
    font-family: var(--font-body);
    font-size: 0.875rem;
    color: #8B2500;
  }

  .success-message {
    text-align: center;
    padding: 2rem;
  }

  .success-message .icon {
    display: inline-block;
    width: 48px;
    height: 48px;
    line-height: 48px;
    font-size: 1.5rem;
    background: var(--color-forest, #2C4A39);
    color: var(--color-cream);
    border-radius: 50%;
    margin-bottom: 1rem;
  }

  .success-message p {
    margin: 0 0 1.5rem;
    font-family: var(--font-body);
    color: var(--color-ink);
  }

  .success-message button {
    padding: 0.5rem 1rem;
    font-family: var(--font-display);
    font-size: 0.9rem;
    color: var(--color-ink);
    background: var(--color-paper);
    border: 1px solid var(--color-gold);
    border-radius: var(--radius-sm);
    cursor: pointer;
  }

  .success-message button:hover {
    background: var(--color-gold-pale);
  }
</style>
