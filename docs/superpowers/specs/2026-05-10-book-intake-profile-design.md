# Book Intake & Profile Auto-Construction Design

## Context

The current book intake flow has friction: too many steps, a confusing 7-option status dropdown, and a data model that treats status as single-value when intents should overlap. Profile construction is manual when it could be auto-derived from the shelf.

This design streamlines intake to scan → quick intent pills → done, fixes the schema to support overlapping intents, and auto-constructs profile fields from shelf data.

## Data Model

### Current (broken)
```typescript
status: 'private' | 'visible' | 'borrowable' | 'discussable' | 'giftable' | 'class-resource' | 'seeking-home'
```
Single value - can't express "borrowable AND discussable".

### New Model
```typescript
interface Book {
  // ...existing fields (id, title, author, isbn, coverUrl, subjects, notes, addedVia, addedAt)
  
  visibility: 'private' | 'visible';
  ownership: 'have' | 'seeking';
  intents: ('borrowable' | 'discussable' | 'giftable' | 'class-resource')[];
}
```

**Three orthogonal dimensions:**
- **Visibility**: private (only you see it) or visible (discoverable in matches)
- **Ownership**: you have it, or you're seeking it
- **Intents**: what you're offering/seeking (can stack)

For "seeking" books, intents flip meaning: "borrowable" = "looking for someone who would lend to me".

### Schema Migration

```sql
-- Add new columns
ALTER TABLE books ADD COLUMN visibility TEXT NOT NULL DEFAULT 'visible';
ALTER TABLE books ADD COLUMN ownership TEXT NOT NULL DEFAULT 'have';
ALTER TABLE books ADD COLUMN intents TEXT DEFAULT '[]';

-- Migrate existing data
UPDATE books SET visibility = 'private', ownership = 'have', intents = '[]' WHERE status = 'private';
UPDATE books SET visibility = 'visible', ownership = 'have', intents = '[]' WHERE status = 'visible';
UPDATE books SET visibility = 'visible', ownership = 'have', intents = '["borrowable"]' WHERE status = 'borrowable';
UPDATE books SET visibility = 'visible', ownership = 'have', intents = '["discussable"]' WHERE status = 'discussable';
UPDATE books SET visibility = 'visible', ownership = 'have', intents = '["giftable"]' WHERE status = 'giftable';
UPDATE books SET visibility = 'visible', ownership = 'have', intents = '["class-resource"]' WHERE status = 'class-resource';
UPDATE books SET visibility = 'visible', ownership = 'seeking', intents = '[]' WHERE status = 'seeking-home';

-- Drop old column (after verifying migration)
ALTER TABLE books DROP COLUMN status;
```

## Book Intake Flow

### Step 1: Entry
- Camera button prominent (primary action for ISBN scan)
- Manual entry secondary (title + author fields)
- Scanner uses Quagga2 (existing)

### Step 2: Book Card Preview
After scan/lookup from OpenLibrary:
```
┌─────────────────────────────┐
│ [Cover]  Title              │
│          Author             │
│          ISBN: xxx          │
└─────────────────────────────┘
```

### Step 3: Intent Selection
```
I [have this] [am seeking]        ← ownership toggle (mutually exclusive)

[🤝 Lend] [💬 Discuss] [🎁 Gift]   ← intent pills (multi-select, glow when active)

[🔒 Private]                      ← visibility toggle (off = visible)

            [Add to Shelf]
```

### Defaults
- Ownership: "have this"
- Intents: none selected
- Visibility: visible

### Zero-Friction Path
Scan → tap "Add to Shelf" → done (book visible, no specific intents)

## Shelf Display

### Book Cards
- Cover + title + author (existing)
- Intent pills as small badges
- "Seeking" badge if ownership = 'seeking'
- Tap to edit opens same intent picker

### Filtering
Replace single-status dropdown with multi-select pills:
```
Show: [All] [Lending] [Discussing] [Gifting] [Seeking] [Private]
```
Filters combine with OR logic.

## Profile Auto-Construction

### Auto-Derived Fields

| Field | Source | Logic |
|-------|--------|-------|
| Topics (inferred) | Book subjects | Existing keyword mapping: OpenLibrary subjects → 52 curated topics |
| Lending personality | Intent frequency | "Generous lender" if >50% have 'borrowable', "Selective" if <20%, "Discussion-focused" if discussable > borrowable |
| Reading now | Recent books | Last 3 books added with ownership='have' |

### Profile Page Structure
```
Your Profile
├── Name, City, Radius (manual entry)
├── Topics
│   ├── From your books: [fiction] [philosophy] ... (auto-inferred, removable)
│   └── Add more: [topic picker]
├── Lending Style: "Generous lender" (auto-derived, editable text)
└── Reading Now: [Book1] [Book2] [Book3] (from recent adds, editable)
```

### Override Behavior
All auto-derived fields show as suggestions. User can:
- Accept (keep as-is)
- Edit (free text override)
- Clear (remove the auto-derived value)

Once manually edited, field stops auto-updating.

## Matching Algorithm Updates

### Existing Match Types (unchanged logic)
- **Shelf Twin**: Same book, both ownership='have'
- **Reading Mentor**: Topic overlap + their 'discussable' intent
- **Class Connection**: Both have 'class-resource' intent on related books

### Updated Match Types
- **Local Source**: Your ownership='seeking' ↔ their ownership='have' with 'borrowable' or 'giftable' intent

### New Signal: Intent Alignment
When matching seeker ↔ owner:
- Seeker's intents express what they're looking for
- Owner's intents express what they're offering
- Direct alignment (seeker wants gift ↔ owner offers giftable) boosts match score
- Multiple aligned intents increase strength

## Files to Modify

### Schema & Types
- `src/db/schema.ts` - Add visibility, ownership, intents columns
- `src/lib/types.ts` - Update Book interface, add Intent type
- New migration file in `migrations/`

### Book Intake
- `src/components/AddBookIsland.svelte` - Replace dropdown with pill chips
- `src/stores/shelf.ts` - Update addBook, updateBook for new fields

### Shelf Display
- `src/components/BookCard.svelte` - Show intent badges, handle new model
- `src/components/ShelfIsland.svelte` - Multi-select filtering

### Profile
- `src/stores/profile.ts` - Add lending personality derivation
- `src/components/ProfileIsland.svelte` - Show auto-derived fields with override UI

### Matching
- `src/lib/matching.ts` - Update match scoring for intent alignment

### API
- `src/pages/api/books/index.ts` - Accept new fields
- `src/pages/api/books/[id].ts` - Update allowed fields

## Verification

1. **Schema migration**: Run migration, verify existing books mapped correctly
2. **Intake flow**: Scan a book, set intents, verify saved to DB with correct structure
3. **Shelf display**: Check filters work, badges show correctly
4. **Profile auto-fill**: Add books, verify topics/lending style auto-populate
5. **Matching**: Create test users with complementary intents, verify matches found
