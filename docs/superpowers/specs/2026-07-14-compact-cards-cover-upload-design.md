# Compact unified book cards + custom cover upload

Date: 2026-07-14
Status: approved

## Goal

Book cards in Biblio become compact, uniform-size, and consistent: in both views a card is a door to the same edit modal. The modal becomes the full editor for a book, including uploading a custom cover stored on Cloudflare Images. The bulky 4-row filter card is replaced by a slim toolbar; full filter UI is deferred to a future public-profile page.

## 1. Cards

- **Covers view**: `BookSpine` unchanged in behavior (fixed 132px, click → modal).
- **Details view**: `BookCard` rebuilt as a compact fixed-size card — 52×78 cover thumb, 2-line title, author, intent dots (same dot language as the spine peek), small seeking/private markers. Whole card is a single `<button>` with `aria-haspopup="dialog"`, calls `onOpen(book.id)`. All inline editing (intent pills, notes accordion, hover-delete) is removed from the card.
- Grid: `repeat(auto-fill, minmax(0, 230px))` fixed tracks (was `minmax(240px, 1fr)` stretchy).
- `ShelfIsland` keeps single `openBookId`; both `BookSpine` and `BookCard` receive `onOpen`.

## 2. Toolbar

One slim row replacing the filter card: title + count left; right side has the Covers/Details segmented toggle and a **Filter** button opening a popover with the existing chips (ownership, intents, private-only, clear all). Active-filter count badge on the button. Escape / click-outside closes. Store logic (`activeFilters`, toggle fns) reused untouched.

## 3. Modal = full editor

`BookDetailSheet` gains, above existing intents/notes/delete:

- **Cover block**: current cover, "Change cover" (file picker → upload → optimistic URL swap), "Reset" shown only when the current cover is a custom (imagedelivery.net) URL and an original fetched URL is known.
- **Title/author** inline edit (pencil → input → save on Enter/blur, escape cancels).
- **Ownership** (have/seeking) and **visibility** (visible/private) toggles — wire the existing unused `BookDetail` props.

All writes go through the existing optimistic `updateBook` → PATCH `/api/books/:id`. `title`/`author` added to the PATCH allow-list if absent.

To support "Reset", `Book` gains optional `fetchedCoverUrl` (the original OpenLibrary URL) persisted alongside `coverUrl` — new nullable D1 column `fetched_cover_url`, set at add-time; when a custom cover is uploaded, `coverUrl` changes and `fetchedCoverUrl` keeps the fallback.

## 4. Cover upload (Cloudflare Images)

- `wrangler.jsonc`: `"images": { "binding": "IMAGES" }` at top level and in `env.qa`.
- `POST /api/books/[id]/cover` (multipart, field `file`):
  1. Auth (Clerk or QA mode) + book ownership check → 401/403/404.
  2. Validate content type `image/*` and size ≤ 10 MB → 400/413.
  3. `env.IMAGES.hosted.upload(stream, { metadata: { userId, bookId } })`.
  4. Use returned variant delivery URL (prefer `public` variant).
  5. Update `books.cover_url` in D1; if the previous `cover_url` was an `imagedelivery.net` URL, delete that hosted image (best-effort).
  6. Return `{ coverUrl }`.
- `DELETE /api/books/[id]` also best-effort deletes a hosted cover.
- Client: `uploadCover(bookId, file)` in the shelf store — posts, then `updateBook`-style local write of the returned URL (no optimistic blob preview; show uploading state in modal).
- Dev/QA: `wrangler dev` serves the hosted-images binding from a local mock; QA/prod share account Images storage (uploads metadata-tagged).

## Error handling

- Upload failure → toast via existing `reportSyncError`, modal keeps old cover.
- Hosted-image deletion failures are logged, never block the request.
- PATCH rollback semantics unchanged (rollbackFields).

## Testing

- Vitest: store tests for new update paths + `uploadCover`; API tests for cover route (ownership rejection, bad type/size, happy path with mocked IMAGES binding).
- QA journey `02-shelf.sh` updated: slim toolbar, modal opens from details view, edit fields in modal.

## Out of scope

- Public profile / other-user shelf page (filters' future home).
- Image moderation, cropping UI, multiple variants.
