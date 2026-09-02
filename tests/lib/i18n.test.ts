// @vitest-environment node
import { describe, expect, it } from 'vitest';
import * as i18n from '../../src/i18n';

type TranslationModule = { default: Record<string, unknown> };

const enModules = import.meta.glob<TranslationModule>('../../src/i18n/en/*.ts', { eager: true });
const esModules = import.meta.glob<TranslationModule>('../../src/i18n/es/*.ts', { eager: true });

function namespace(path: string): string {
  return path.match(/\/([^/]+)\.ts$/)?.[1] ?? path;
}

function leafPaths(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value) || value === null || typeof value !== 'object') return [prefix];

  return Object.entries(value).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('Spanish locale routing', () => {
  it('keeps Spanish paths in the Spanish locale', () => {
    expect(i18n.isLang('es')).toBe(true);
    expect(i18n.getLangFromUrl(new URL('https://biblocal.com/es/biblio'))).toBe('es');
    expect(i18n.localizePath('/profile', 'es' as i18n.Lang)).toBe('/es/profile');
    expect(i18n.stripLocale('/es/stores/new')).toBe('/stores/new');
  });

  it('rejects inherited object properties as locale codes', () => {
    expect(i18n.isLang('toString')).toBe(false);
    expect(i18n.getLangFromUrl(new URL('https://biblocal.com/toString/profile'))).toBe('en');
  });

  it('offers Spanish for app pages but not untranslated editorial articles', () => {
    const getLanguagesForPath = (i18n as any).getLanguagesForPath;

    expect(getLanguagesForPath('/about')).toEqual(['en', 'fr', 'es']);
    expect(getLanguagesForPath('/es/biblio')).toEqual(['en', 'fr', 'es']);
    expect(getLanguagesForPath('/blog')).toEqual(['en', 'fr']);
    expect(getLanguagesForPath('/fr/blog/local-book-sharing-beats-algorithmic-feeds')).toEqual([
      'en',
      'fr',
    ]);
  });
});

describe('Spanish interface copy', () => {
  it('provides every key used by the application UI', () => {
    const english = Object.fromEntries(
      Object.entries(enModules)
        .map(([path, module]) => [namespace(path), module.default])
        .filter(([name]) => name !== 'blog'),
    );
    const spanish = Object.fromEntries(
      Object.entries(esModules).map(([path, module]) => [namespace(path), module.default]),
    );

    expect(Object.keys(spanish).sort()).toEqual(Object.keys(english).sort());
    for (const [name, strings] of Object.entries(english)) {
      expect(leafPaths(spanish[name]).sort(), `${name} Spanish keys`).toEqual(
        leafPaths(strings).sort(),
      );
    }
  });

  it('translates every application namespace instead of falling back to English', () => {
    const es = i18n.useTranslations('es' as i18n.Lang);

    expect(es.common.nav.about).toBe('Acerca de');
    expect(es.home.hero.start).toBe('Crea tu estantería');
    expect(es.about.hero.back).toBe('← Volver al inicio');
    expect(es.howItWorks.hero.eyebrow).toBe('Cómo funciona');
    expect(es.matches.views.people).toBe('Personas');
    expect(es.profile.page.heading).toBe('Tu perfil');
    expect(es.shelf.page.zoneTitle).toBe('Añadir un libro');
    expect(es.stores.index.title).toBe('Librerías');
  });

  it('localizes stable system labels without changing user-provided values', () => {
    expect(i18n.localizeTopicLabel('science-fiction', 'es')).toBe('Ciencia ficción');
    expect(i18n.localizeTopicLabel('science-fiction', 'fr')).toBe('Science-fiction');
    expect(i18n.localizeTopicLabel('Le Guin fan', 'es')).toBe('Le Guin fan');
    expect(i18n.localizeLendingPersonality('Generous lender', 'es')).toBe(
      'Prestamista generoso',
    );
    expect(i18n.localizeLendingPersonality('Generous lender', 'es', true)).toBe(
      'Generous lender',
    );
    expect(i18n.localizeLendingPersonality('Custom style', 'es')).toBe('Custom style');
  });

  it('localizes assistive labels that were previously hard-coded in English', () => {
    const es = i18n.useTranslations('es' as i18n.Lang);

    expect(es.common.appNav.toggleNavigation).toBe('Abrir o cerrar el menú de navegación');
    expect(es.home.hero.scrollAria).toBe('Seguir leyendo');
    expect(es.shelf.page.closeAdd).toBe('Cerrar');
    expect(es.matches.map.chooseView).toBe('Elegir vista de descubrimiento');
  });

  it('continues to use English blog chrome while Spanish articles are unavailable', () => {
    const es = i18n.useTranslations('es' as i18n.Lang);

    expect(es.blog.journal).toBe('The biblocal Journal');
  });
});
