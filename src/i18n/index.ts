// Framework-agnostic i18n helpers. Safe to import from Astro pages AND Svelte
// islands (no Astro-only globals).
import { ui } from './ui';

export const languages = { en: 'English', fr: 'Français', es: 'Español' } as const;
export const defaultLang = 'en';
export type Lang = keyof typeof languages;

export function isLang(value: string | undefined): value is Lang {
  return value !== undefined && Object.hasOwn(languages, value);
}

/** Derive the active language from a URL path ("/fr/about" -> "fr"). */
export function getLangFromUrl(url: URL | { pathname: string }): Lang {
  const seg = url.pathname.split('/')[1];
  return isLang(seg) ? seg : defaultLang;
}

/** Translations for a language (FR already falls back to EN in ui.ts). */
export function useTranslations(lang: Lang) {
  return ui[lang] ?? ui[defaultLang];
}

/** Translate canonical topic IDs while leaving user-authored labels untouched. */
export function localizeTopicLabel(topic: string, lang: Lang): string {
  const labels = useTranslations(lang).profile.topicPicker.labels as Record<string, string>;
  return labels[topic] ?? topic;
}

/** Translate the six generated lending styles while preserving custom overrides. */
export function localizeLendingPersonality(
  personality: string,
  lang: Lang,
  isOverride = false,
): string {
  if (isOverride) return personality;
  const labels = useTranslations(lang).profile.lendingStyle.autoLabels as Record<string, string>;
  return labels[personality] ?? personality;
}

/**
 * Prefix a site-absolute path with the locale. English (default) is unprefixed.
 * localizePath('/about', 'fr') -> '/fr/about'; localizePath('/', 'fr') -> '/fr'.
 */
export function localizePath(path: string, lang: Lang): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (lang === defaultLang) return clean;
  return clean === '/' ? `/${lang}` : `/${lang}${clean}`;
}

/** Strip any locale prefix from a path ("/fr/about" -> "/about"). */
export function stripLocale(path: string): string {
  const parts = path.split('/');
  if (isLang(parts[1])) {
    parts.splice(1, 1);
    const rest = parts.join('/');
    return rest === '' ? '/' : rest;
  }
  return path;
}

/** Languages with actual content for a path. Blog articles are editorially translated. */
export function getLanguagesForPath(path: string): Lang[] {
  const base = stripLocale(path);
  return base === '/blog' || base.startsWith('/blog/') ? ['en', 'fr'] : ['en', 'fr', 'es'];
}
