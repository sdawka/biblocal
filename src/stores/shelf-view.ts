import { persistentAtom } from '@nanostores/persistent';

export type ShelfView = 'covers' | 'details';

// Default is 'covers' — a fresh cover-first bookshelf; returning users keep
// whatever view they last picked via persistence.
export const shelfView = persistentAtom<ShelfView>('biblocal:shelf-view:v1', 'covers', {
  encode: (v) => v,
  decode: (v) => (v === 'covers' || v === 'details' ? v : 'covers'),
});

export function setShelfView(v: ShelfView) {
  shelfView.set(v);
}
