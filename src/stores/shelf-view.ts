import { persistentAtom } from '@nanostores/persistent';

export type ShelfView = 'covers' | 'details';
export type ShelfViewPreference = 'auto' | ShelfView;
export type ShelfSort = 'recent' | 'title' | 'shareable';

// A new shelf chooses the presentation that fits the screen: compact details
// on phones, cover browsing on larger displays. Explicit choices continue to
// win, including choices made before this preference was introduced.
export const shelfView = persistentAtom<ShelfViewPreference>('biblocal:shelf-view:v2', 'auto', {
  encode: (v) => v,
  decode: (v) => (v === 'auto' || v === 'covers' || v === 'details' ? v : 'auto'),
});

// Preserve an existing person's deliberate v1 choice when they first load the
// v2 preference. This is deliberately browser-only so Workers SSR stays safe.
if (typeof localStorage !== 'undefined') {
  try {
    const current = localStorage.getItem('biblocal:shelf-view:v2');
    const legacy = localStorage.getItem('biblocal:shelf-view:v1');
    if (current === null && (legacy === 'covers' || legacy === 'details')) {
      shelfView.set(legacy);
    }
  } catch {
    // Storage can be disabled; the in-memory auto default is still usable.
  }
}

export const shelfSort = persistentAtom<ShelfSort>('biblocal:shelf-sort:v1', 'recent', {
  encode: (v) => v,
  decode: (v) => (v === 'recent' || v === 'title' || v === 'shareable' ? v : 'recent'),
});

export function resolveShelfView(preference: ShelfViewPreference, isMobile: boolean): ShelfView {
  return preference === 'auto' ? (isMobile ? 'details' : 'covers') : preference;
}

export function setShelfView(v: ShelfViewPreference) {
  shelfView.set(v);
}

export function setShelfSort(v: ShelfSort) {
  shelfSort.set(v);
}
