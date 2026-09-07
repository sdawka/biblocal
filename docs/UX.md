# biblocal UX

## Screens

### Login (`/`)
Email-based passwordless auth. User enters email, receives 6-digit code, verifies to sign in. Redirects to `/shelf` on success.

### Shelf (`/shelf`)
Main screen after login. Three parts:
- **PromptIsland** — contextual prompts/suggestions
- **AddBookIsland** — add books via ISBN lookup (OpenLibrary API) or manual entry. Set status on add.
- **ShelfIsland** — grid of book cards with filter dropdown

**Book statuses:**
| Status | Meaning |
|--------|---------|
| `private` | Only you see it |
| `visible` | Others see you own it |
| `borrowable` | You'll lend it |
| `discussable` | You want to discuss it |
| `giftable` | Free to a good home |
| `seeking-home` | You're looking for this book |

### Profile (`/profile`)
Three sections:
1. **Basic info** — name, city (dropdown), search radius (1-20 km slider)
2. **Interests** — topic picker (curated + freeform) plus auto-inferred topics from shelf
3. **Optional** — lending style, current obsessions

### Local (`/local`)
Discovery starts with the profile's city and radius. Stored coordinates take precedence; a known city uses an approximate city center. Cities without known coordinates use an explicitly approximate same-city scope. Without a location, show a profile link and an explicit worldwide option.
- Books, People, and Bookstores use the same geographic scope on desktop and mobile.
- Worldwide browsing is an explicit choice. Panning the map does not silently change the selected scope.
- People without coordinates remain identified separately; a city-only result does not imply a measured distance.
- Discovery includes people with a taste match or a visible book to share.
- Hidden contact rejects incoming connection requests on the backend.

### Bookstore contributions (`/stores/new`)
Require an explicit city, freeform neighborhood, name, and address. Show the city in the directory and detail page; never infer it from an address or default it to Montreal.

### Book editing (`/biblio`)
Closing a book's detail sheet preserves unfinished title, author, and new-note drafts in memory for reopening during the current page session. Explicit cancel discards the relevant draft. Drafts do not survive reloads or account changes.

**Match facets:**
- Shelf twin — shared books
- Reading mentor — complementary expertise
- Local source — they have books you want
- Discussion match — overlapping "discussable" books
- Class chain — teaching/learning connections

## Navigation
Auth-gated: if not onboarded, redirects to `/`. Nav between shelf/profile/matches via layout header (not shown in pages, likely in `Layout.astro`).

## Visual style
Victorian library aesthetic — cream/gold/burgundy palette, display serif headings, inset shadows, subtle animations on load.
