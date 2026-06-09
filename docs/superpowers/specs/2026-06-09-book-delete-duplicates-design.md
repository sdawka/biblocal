# Book Delete & Duplicate Prevention

## Summary

Add the ability to delete books from the shelf and prevent duplicate additions.

## Delete UI

### Desktop (hover)

- Delete icon appears in top-right corner of BookCard on hover
- Click shows confirmation: "Remove from shelf?" with Cancel/Remove buttons
- Styled with burgundy for destructive action, matching existing card aesthetic

### Mobile (swipe)

- Swipe left reveals red "Delete" action area
- Tap revealed area to confirm deletion (single gesture, no extra modal)
- Implemented with CSS transforms + touch events (no external library)

### Shared behavior

- New `onDelete?: (id: string) => void` callback prop on BookCard
- Hidden when `readonly={true}` (same pattern as intent toggling)

## Duplicate Detection

### Detection logic (`shelf.ts`)

New function: `findDuplicate(isbn?: string, title: string, author: string): Book | null`

1. If ISBN provided, check for exact ISBN match first
2. Then check title+author using normalized strings (lowercase, trimmed, collapsed whitespace)
3. Returns existing book if found, `null` otherwise

No fuzzy/Levenshtein matching — exact normalized match only to avoid false positives.

### UI flow (`AddBookIsland.svelte`)

1. Check `findDuplicate()` when user clicks "Add to Shelf"
2. If duplicate found, show inline warning: "You already have **{title}** on your shelf"
3. Two actions:
   - "View Existing" — closes add form, highlights existing card
   - "Add Anyway" — proceeds with normal add (for different editions)

## Data Flow

### Delete

1. User triggers delete (swipe or hover-click)
2. `onDelete(book.id)` callback fires
3. Parent calls `removeBook(id)` from shelf store
4. Store updates local state immediately (optimistic)
5. `syncRemoveBook` sends `DELETE /api/books/:id` in background
6. Sync failures logged, no rollback (matches existing pattern)

### Duplicate check

1. User previews book, clicks "Add to Shelf"
2. `findDuplicate()` checks current shelf
3. If match: show warning, block add until user chooses
4. "Add Anyway" → normal `addBook()`
5. "View Existing" → close form, scroll to existing card, briefly pulse its border (CSS animation, 1s)

## Edge Cases

- **Books without ISBN**: Skip ISBN check, match on title+author only
- **Deleted then re-added**: No issue — delete removes from store, add creates fresh
- **Offline**: Delete queues like other syncs (existing pattern)

## Files to Modify

- `src/stores/shelf.ts` — add `findDuplicate()` function
- `src/components/BookCard.svelte` — add delete UI (hover + swipe)
- `src/components/AddBookIsland.svelte` — add duplicate check and warning UI
- `src/components/ShelfIsland.svelte` — wire up `onDelete` callback
