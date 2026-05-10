# Empty State & ISBN Scanner UX Improvements

## Context

Users landing on an empty shelf see a functional but uninspiring empty state. The goal is to create visual anticipation by showing what a populated shelf looks like, and to reduce friction in adding books by enabling barcode scanning.

## Design

### 1. Ghost Shelf Preview

**Location:** `EmptyShelfIsland.svelte` — above or replacing current empty state content

**Visual:**
- 3 ghosted book spine shapes in a row
- Colors: gold (#c9a227), burgundy (#722f37), forest green (#228b22)
- Opacity decreasing left to right: 50% → 35% → 25%
- Subtle box shadow for depth
- Text below: "Your books will appear here"

**Behavior:**
- Displayed when `shelf` store is empty
- Existing CTAs ("Add a Book", "Explore Nearby") remain below
- Ghost books are decorative only (not clickable)

### 2. ISBN Scanner

**Trigger:** Camera icon button next to ISBN input field in `AddBookIsland.svelte`

**New component:** `ScannerIsland.svelte`

**Scanner UI:**
- Bottom sheet overlay (slides up from bottom)
- Dark background with camera viewfinder
- Targeting frame with gold (#c9a227) border
- "Point camera at ISBN barcode" instruction text
- "Upload Photo" button as fallback
- Drag handle at top, swipe down to dismiss

**Technical approach:**
- Library: `quagga2` (client-side barcode detection)
- Supports EAN-13 and EAN-10 (ISBN formats)
- Camera access via `navigator.mediaDevices.getUserMedia`
- Photo upload: file input → canvas → quagga2 decode

**Flow:**
1. User taps camera icon
2. Bottom sheet slides up, requests camera permission
3. Live viewfinder shows with targeting frame
4. On barcode detection → auto-fill ISBN field, close scanner, trigger lookup
5. If detection fails → user can upload photo or dismiss

**Fallback (photo upload):**
- User selects/takes photo
- Image loaded to canvas
- Quagga2 decodes from static image
- Same success/failure handling

### 3. Files to Modify

| File | Change |
|------|--------|
| `src/components/EmptyShelfIsland.svelte` | Add ghost book visuals above CTAs |
| `src/components/AddBookIsland.svelte` | Add camera icon button, scanner trigger |
| `src/components/ScannerIsland.svelte` | **New** — bottom sheet scanner component |
| `package.json` | Add `@ericblade/quagga2` dependency |

### 4. Verification

1. **Empty state:** Clear shelf, verify ghost books appear with correct colors/opacity
2. **Scanner trigger:** ISBN input shows camera icon, tapping opens bottom sheet
3. **Live scan:** Point at ISBN barcode, verify auto-detection and field population
4. **Photo upload:** Upload barcode image, verify extraction works
5. **Fallback:** Deny camera permission, verify photo upload still works
6. **Mobile:** Test on actual device for camera/gesture behavior
