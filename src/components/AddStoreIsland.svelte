<script lang="ts">
  import { CURATED_TOPICS } from '../stores/topics';
  import { useTranslations, type Lang } from '../i18n';

  interface Props {
    onSuccess?: (storeId: string) => void;
    lang?: Lang;
  }

  let { onSuccess, lang = 'en' as Lang }: Props = $props();
  const t = $derived(useTranslations(lang).stores);

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
      error = t.form.validationRequired;
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
        const data: { error?: string } = await res.json();
        throw new Error(data.error || t.form.errorAddFailed);
      }

      const data: { id: string } = await res.json();
      success = true;

      if (onSuccess) {
        onSuccess(data.id);
      }
    } catch (e) {
      error = e instanceof Error ? e.message : t.form.errorGeneric;
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
  <span class="eyebrow">{t.form.eyebrow}</span>
  <h2 class="serif">{t.form.title}</h2>
  <p class="subtitle muted">{t.form.subtitle}</p>

  {#if success}
    <div class="success-message">
      <span class="icon" aria-hidden="true">✓</span>
      <p>{t.form.successMessage}</p>
      <button type="button" class="btn btn-tinted" onclick={reset}>{t.form.addAnother}</button>
    </div>
  {:else}
    <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      <div class="field">
        <label class="label" for="name">{t.form.nameLabel}</label>
        <input
          class="input"
          id="name"
          type="text"
          bind:value={name}
          placeholder={t.form.namePlaceholder}
          disabled={loading}
          aria-required="true"
          aria-invalid={error && !name.trim() ? 'true' : undefined}
          aria-describedby={error ? 'store-error' : undefined}
        />
      </div>

      <div class="field">
        <label class="label" for="neighborhood">{t.form.neighborhoodLabel}</label>
        <select
          class="select"
          id="neighborhood"
          bind:value={neighborhood}
          disabled={loading}
          aria-required="true"
          aria-invalid={error && !neighborhood ? 'true' : undefined}
          aria-describedby={error ? 'store-error' : undefined}
        >
          <option value="">{t.form.neighborhoodPlaceholder}</option>
          {#each MONTREAL_NEIGHBORHOODS as hood}
            <option value={hood}>{hood}</option>
          {/each}
        </select>
      </div>

      <div class="field">
        <label class="label" for="address">{t.form.addressLabel}</label>
        <input
          class="input"
          id="address"
          type="text"
          bind:value={address}
          placeholder={t.form.addressPlaceholder}
          disabled={loading}
          aria-required="true"
          aria-invalid={error && !address.trim() ? 'true' : undefined}
          aria-describedby={error ? 'store-error' : undefined}
        />
      </div>

      <div class="field">
        <label class="label" for="website">{t.form.websiteLabel}</label>
        <input
          class="input"
          id="website"
          type="url"
          bind:value={website}
          placeholder={t.form.websitePlaceholder}
          disabled={loading}
        />
      </div>

      <div class="field">
        <label class="label" for="phone">{t.form.phoneLabel}</label>
        <input
          class="input"
          id="phone"
          type="tel"
          bind:value={phone}
          placeholder={t.form.phonePlaceholder}
          disabled={loading}
        />
      </div>

      <div class="field specialties-field">
        <span class="label">{t.form.specialtiesLabel} <span class="hint faint">{t.form.specialtiesHint}</span></span>
        <div class="specialties-grid">
          {#each CURATED_TOPICS as topic}
            <button
              type="button"
              class="chip"
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
        {loading ? t.form.submitting : t.form.submit}
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

  /* Specialty toggles use the shared .chip from theme.css (no local styles needed). */

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
