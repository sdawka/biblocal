// Assembles the translation dictionary from per-namespace files so each page
// can own its own locale/<ns>.ts file without touching a shared index.
// Locales deep-merge over English, so any missing key falls back to EN.

type Dict = Record<string, any>;

const enModules = import.meta.glob('./en/*.ts', { eager: true }) as Record<string, { default: Dict }>;
const frModules = import.meta.glob('./fr/*.ts', { eager: true }) as Record<string, { default: Dict }>;
const esModules = import.meta.glob('./es/*.ts', { eager: true }) as Record<string, { default: Dict }>;

function namespaceFromPath(path: string): string {
  return path.replace(/^.*\/([^/]+)\.ts$/, '$1');
}

function assemble(modules: Record<string, { default: Dict }>): Dict {
  const out: Dict = {};
  for (const [path, mod] of Object.entries(modules)) {
    out[namespaceFromPath(path)] = mod.default;
  }
  return out;
}

function deepMerge<T extends Dict>(base: T, override: Dict): T {
  const result: Dict = Array.isArray(base) ? [...base] : { ...base };
  for (const key of Object.keys(override ?? {})) {
    const o = override[key];
    const b = result[key];
    result[key] =
      o && b && typeof o === 'object' && typeof b === 'object' && !Array.isArray(o)
        ? deepMerge(b, o)
        : o;
  }
  return result as T;
}

const en = assemble(enModules);
const fr = deepMerge(en, assemble(frModules));
const es = deepMerge(en, assemble(esModules));

export const ui = { en, fr, es } as const;
export type UiStrings = typeof en;
