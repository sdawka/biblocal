import { persistentAtom } from '@nanostores/persistent';

export type ShelfView = 'covers' | 'details';

// Phase 1 default is 'details' so the page looks identical to today; a later
// phase flips the default to 'covers'.
export const shelfView = persistentAtom<ShelfView>('biblocal:shelf-view:v1', 'details', {
  encode: (v) => v,
  decode: (v) => (v === 'covers' || v === 'details' ? v : 'details'),
});

export function setShelfView(v: ShelfView) {
  shelfView.set(v);
}
