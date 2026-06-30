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

### Matches (`/matches`)
Split layout: map (Leaflet, sepia-tinted) + match cards panel.
- Map shows nearby users as markers
- Cards show match facets and can expand for details

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
