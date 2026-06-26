<script lang="ts">
  import { useTranslations, type Lang } from '../i18n';

  let { lang = 'en' as Lang } = $props();
  const t = $derived(useTranslations(lang).home.midCta);
  const tc = $derived(useTranslations(lang).common);

  function scrollToSignIn() {
    document.getElementById('signin-section')?.scrollIntoView({ behavior: 'smooth' });
  }
</script>

<section class="mid-cta" aria-labelledby="mid-cta-title">
  <div class="cta-inner">
    <p class="cta-kicker"><span class="rule"></span>{t.kicker}</p>
    <h2 id="mid-cta-title" class="cta-title">
      {t.titleLead}<em>{t.titleAccent}</em>
    </h2>
    <button class="cta-btn btn btn-filled btn-lg" onclick={scrollToSignIn}>
      {tc.cta.startShelf}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  </div>
</section>

<style>
  .mid-cta {
    padding: clamp(3.5rem, 9vh, 6rem) clamp(1.25rem, 5vw, 5rem);
    background: var(--accent-tint);
  }

  .cta-inner {
    max-width: 1240px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .cta-kicker {
    display: inline-flex;
    align-items: center;
    gap: 0.7rem;
    margin: 0 0 var(--s-4);
    font-family: var(--font-ui);
    font-size: 0.78rem;
    font-weight: 590;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-muted);
  }
  .cta-kicker .rule {
    width: 30px;
    height: 1.5px;
    background: var(--accent);
    border-radius: 2px;
    flex: none;
  }

  .cta-title {
    margin: 0 0 var(--s-6);
    max-width: 18ch;
    font-family: var(--font-display);
    font-weight: 500;
    font-size: clamp(1.9rem, 4vw, 2.9rem);
    line-height: 1.05;
    letter-spacing: -0.03em;
    color: var(--ink);
  }
  .cta-title em {
    font-style: italic;
    font-weight: 500;
    color: var(--accent);
  }

  .cta-btn {
    gap: 0.5rem;
    padding-inline: 1.5rem;
    transition: background var(--dur-2) var(--ease-soft),
                box-shadow var(--dur-2) var(--ease-soft);
  }
  .cta-btn svg { transition: transform var(--dur-2) var(--ease-spring); }
  .cta-btn:hover svg { transform: translateX(3px); }
</style>
