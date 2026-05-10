# Empty State & ISBN Scanner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ghost book preview to empty shelf state and ISBN barcode scanning to AddBookIsland.

**Architecture:** Ghost books are pure CSS shapes added to EmptyShelfIsland. Scanner is a new ScannerIsland component using quagga2 for barcode detection, triggered via camera icon button in AddBookIsland. Communication via callback prop.

**Tech Stack:** Svelte 5, @ericblade/quagga2, existing victorian.css design system

---

## File Structure

| File | Role |
|------|------|
| `src/components/EmptyShelfIsland.svelte` | Modify: add ghost book shapes above choice cards |
| `src/components/AddBookIsland.svelte` | Modify: add camera icon button, scanner open state, callback |
| `src/components/ScannerIsland.svelte` | Create: bottom sheet with camera viewfinder + photo upload |
| `package.json` | Modify: add @ericblade/quagga2 dependency |

---

### Task 1: Add Ghost Book Visuals to EmptyShelfIsland

**Files:**
- Modify: `src/components/EmptyShelfIsland.svelte`

- [ ] **Step 1: Add ghost books HTML between stats-bar and choices**

In `src/components/EmptyShelfIsland.svelte`, add this section after `</div>` (closing stats-bar) and before `<!-- Choice Cards -->`:

```svelte
  <!-- Ghost Books Preview -->
  <div class="ghost-shelf">
    <div class="ghost-books">
      <div class="ghost-book gold"></div>
      <div class="ghost-book burgundy"></div>
      <div class="ghost-book forest"></div>
    </div>
    <p class="ghost-hint">Your books will appear here</p>
  </div>
```

- [ ] **Step 2: Add ghost book CSS styles**

Add these styles inside the `<style>` block in `EmptyShelfIsland.svelte`:

```css
  /* Ghost Books Preview */
  .ghost-shelf {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem 1rem;
    margin-bottom: 1.25rem;
  }

  .ghost-books {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
  }

  .ghost-book {
    width: 50px;
    height: 75px;
    border-radius: 3px;
    box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.1);
  }

  .ghost-book.gold {
    background: linear-gradient(180deg, #d4a84b 0%, #c9a227 100%);
    opacity: 0.5;
  }

  .ghost-book.burgundy {
    background: linear-gradient(180deg, #8b3d47 0%, #722f37 100%);
    opacity: 0.35;
  }

  .ghost-book.forest {
    background: linear-gradient(180deg, #3d5f4d 0%, #2d4739 100%);
    opacity: 0.25;
  }

  .ghost-hint {
    margin: 1rem 0 0;
    font-family: var(--font-body);
    font-size: 0.875rem;
    font-style: italic;
    color: var(--color-ink-light);
  }
```

- [ ] **Step 3: Verify ghost books render**

Run: `npm run dev`

Open http://localhost:4321/shelf with an empty shelf. Verify:
- 3 book shapes appear (gold, burgundy, forest green)
- Opacity decreases left to right (50%, 35%, 25%)
- "Your books will appear here" text below
- Choice cards still visible below ghost shelf

- [ ] **Step 4: Commit**

```bash
git add src/components/EmptyShelfIsland.svelte
git commit -m "feat: add ghost book preview to empty shelf state"
```

---

### Task 2: Install quagga2 Dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install @ericblade/quagga2**

Run: `npm install @ericblade/quagga2`

- [ ] **Step 2: Verify installation**

Run: `npm ls @ericblade/quagga2`

Expected: Shows `@ericblade/quagga2@1.x.x` in dependency tree

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add @ericblade/quagga2 for barcode scanning"
```

---

### Task 3: Create ScannerIsland Component

**Files:**
- Create: `src/components/ScannerIsland.svelte`

- [ ] **Step 1: Create ScannerIsland.svelte with base structure**

Create `src/components/ScannerIsland.svelte`:

```svelte
<script lang="ts">
  import Quagga from '@ericblade/quagga2';

  interface Props {
    onScan: (isbn: string) => void;
    onClose: () => void;
  }

  let { onScan, onClose }: Props = $props();

  let videoRef: HTMLDivElement | null = $state(null);
  let fileInputRef: HTMLInputElement | null = $state(null);
  let hasCamera = $state(true);
  let error = $state('');

  $effect(() => {
    if (videoRef) {
      initScanner();
    }
    return () => {
      Quagga.stop();
    };
  });

  async function initScanner() {
    try {
      await Quagga.init({
        inputStream: {
          type: 'LiveStream',
          target: videoRef,
          constraints: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        decoder: {
          readers: ['ean_reader', 'ean_8_reader'],
        },
        locate: true,
      });

      Quagga.start();

      Quagga.onDetected((result) => {
        if (result?.codeResult?.code) {
          Quagga.stop();
          onScan(result.codeResult.code);
        }
      });
    } catch (err) {
      hasCamera = false;
      error = 'Camera not available. Try uploading a photo.';
    }
  }

  function handleFileUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageSrc = e.target?.result as string;
      decodeFromImage(imageSrc);
    };
    reader.readAsDataURL(file);
  }

  function decodeFromImage(imageSrc: string) {
    Quagga.decodeSingle(
      {
        src: imageSrc,
        numOfWorkers: 0,
        decoder: {
          readers: ['ean_reader', 'ean_8_reader'],
        },
        locate: true,
      },
      (result) => {
        if (result?.codeResult?.code) {
          onScan(result.codeResult.code);
        } else {
          error = 'Could not detect barcode. Try again.';
        }
      }
    );
  }

  function triggerFileInput() {
    fileInputRef?.click();
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }
</script>

<div class="scanner-backdrop" onclick={handleBackdropClick} role="presentation">
  <div class="scanner-sheet">
    <div class="drag-handle"></div>

    {#if hasCamera}
      <div class="viewfinder" bind:this={videoRef}>
        <div class="targeting-frame">
          <span class="scan-line"></span>
        </div>
      </div>
      <p class="instruction">Point camera at ISBN barcode</p>
    {:else}
      <div class="no-camera">
        <p>📷</p>
        <p>Camera not available</p>
      </div>
    {/if}

    {#if error}
      <p class="error">{error}</p>
    {/if}

    <div class="actions">
      <button type="button" class="upload-btn" onclick={triggerFileInput}>
        📷 Upload Photo
      </button>
      <button type="button" class="cancel-btn" onclick={onClose}>
        Cancel
      </button>
    </div>

    <input
      type="file"
      accept="image/*"
      capture="environment"
      bind:this={fileInputRef}
      onchange={handleFileUpload}
      hidden
    />
  </div>
</div>

<style>
  .scanner-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 1000;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    animation: fadeIn 0.2s ease;
  }

  .scanner-sheet {
    width: 100%;
    max-width: 500px;
    background: var(--color-cream);
    border-radius: 16px 16px 0 0;
    padding: 1rem 1.5rem 2rem;
    animation: slideUp 0.3s ease;
  }

  .drag-handle {
    width: 40px;
    height: 4px;
    background: var(--color-gold-pale);
    border-radius: 2px;
    margin: 0 auto 1rem;
  }

  .viewfinder {
    position: relative;
    width: 100%;
    height: 200px;
    background: #1a1a1a;
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .viewfinder :global(video) {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .targeting-frame {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80%;
    height: 60px;
    border: 2px solid var(--color-brass);
    border-radius: 4px;
    pointer-events: none;
  }

  .scan-line {
    position: absolute;
    top: 0;
    left: 10%;
    right: 10%;
    height: 2px;
    background: var(--color-brass);
    animation: scanMove 2s ease-in-out infinite;
  }

  @keyframes scanMove {
    0%, 100% { top: 0; }
    50% { top: calc(100% - 2px); }
  }

  .no-camera {
    width: 100%;
    height: 200px;
    background: var(--color-aged-paper);
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--color-ink-faded);
  }

  .no-camera p:first-child {
    font-size: 2rem;
    margin: 0;
  }

  .no-camera p:last-child {
    margin: 0.5rem 0 0;
    font-size: 0.9rem;
  }

  .instruction {
    text-align: center;
    margin: 1rem 0;
    font-size: 0.9rem;
    color: var(--color-ink-faded);
  }

  .error {
    text-align: center;
    margin: 0.5rem 0;
    font-size: 0.875rem;
    color: #8B2500;
    font-style: italic;
  }

  .actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .upload-btn,
  .cancel-btn {
    flex: 1;
    padding: 0.75rem 1rem;
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-weight: 500;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-quick);
  }

  .upload-btn {
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
    color: var(--color-ink);
  }

  .upload-btn:hover {
    border-color: var(--color-gold);
    background: var(--color-gold-pale);
  }

  .cancel-btn {
    background: transparent;
    border: 1px solid var(--color-ink-light);
    color: var(--color-ink-faded);
  }

  .cancel-btn:hover {
    border-color: var(--color-ink-faded);
    color: var(--color-ink);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
</style>
```

- [ ] **Step 2: Verify file created**

Run: `ls src/components/ScannerIsland.svelte`

Expected: File exists

- [ ] **Step 3: Commit**

```bash
git add src/components/ScannerIsland.svelte
git commit -m "feat: add ScannerIsland component for ISBN barcode scanning"
```

---

### Task 4: Add Camera Icon and Scanner Trigger to AddBookIsland

**Files:**
- Modify: `src/components/AddBookIsland.svelte`

- [ ] **Step 1: Import ScannerIsland and add state**

At the top of the `<script>` block in `AddBookIsland.svelte`, add the import:

```typescript
  import ScannerIsland from './ScannerIsland.svelte';
```

After the existing state declarations (around line 14), add:

```typescript
  let showScanner = $state(false);
```

- [ ] **Step 2: Add scan handler function**

After the `switchMode` function, add:

```typescript
  function handleScanResult(scannedIsbn: string) {
    isbn = scannedIsbn;
    showScanner = false;
    handleIsbnSubmit();
  }

  function openScanner() {
    showScanner = true;
  }

  function closeScanner() {
    showScanner = false;
  }
```

- [ ] **Step 3: Add camera button to ISBN input row**

Replace the ISBN form (lines 93-113) with this version that includes the camera button:

```svelte
  {#if mode === 'isbn'}
    <form
      onsubmit={(e) => {
        e.preventDefault();
        handleIsbnSubmit();
      }}
    >
      <div class="isbn-row">
        <input
          type="text"
          bind:value={isbn}
          placeholder="Enter ISBN (e.g., 9780465026562)"
          disabled={loading}
        />
        <button
          type="button"
          class="scan-btn"
          onclick={openScanner}
          title="Scan barcode"
        >
          📷
        </button>
      </div>
      <select bind:value={status}>
        {#each STATUS_OPTIONS as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
      <button type="submit" disabled={loading}>
        {loading ? 'Looking up...' : 'Add Book'}
      </button>
    </form>
  {:else}
```

- [ ] **Step 4: Add ScannerIsland render at bottom**

Just before the closing `</div>` of the `.add-book` container (before `</div>` and `<style>`), add:

```svelte
  {#if showScanner}
    <ScannerIsland onScan={handleScanResult} onClose={closeScanner} />
  {/if}
```

- [ ] **Step 5: Add CSS for isbn-row and scan-btn**

Add these styles inside the `<style>` block:

```css
  .isbn-row {
    display: flex;
    gap: 0.5rem;
  }

  .isbn-row input {
    flex: 1;
  }

  .scan-btn {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    background: var(--color-paper);
    border: 1px solid var(--color-gold-pale);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-quick);
  }

  .scan-btn:hover {
    border-color: var(--color-gold);
    background: var(--color-gold-pale);
  }

  .scan-btn:focus {
    outline: 2px solid var(--color-gold);
    outline-offset: 2px;
  }
```

- [ ] **Step 6: Test scanner integration**

Run: `npm run dev`

Open http://localhost:4321/shelf:
1. Click camera icon next to ISBN input
2. Verify bottom sheet slides up
3. Camera should request permission (or show fallback)
4. Upload Photo button should be visible
5. Cancel closes the sheet

- [ ] **Step 7: Commit**

```bash
git add src/components/AddBookIsland.svelte
git commit -m "feat: add camera button to trigger ISBN barcode scanner"
```

---

### Task 5: End-to-End Verification

**Files:** None (testing only)

- [ ] **Step 1: Test empty state ghost books**

1. Clear localStorage: `localStorage.clear()` in browser console
2. Refresh /shelf page
3. Verify ghost books (gold/burgundy/forest) appear with decreasing opacity
4. Verify "Your books will appear here" text
5. Verify "Add a Book" and "Explore Nearby" cards below

- [ ] **Step 2: Test scanner with photo upload**

1. Find an image of an ISBN barcode (search "ISBN barcode image" online)
2. Click camera icon in AddBookIsland
3. Click "Upload Photo"
4. Select the barcode image
5. Verify ISBN is extracted and book lookup runs

- [ ] **Step 3: Test scanner camera (mobile or with webcam)**

1. On a device with camera, click camera icon
2. Grant camera permission
3. Point at a book's ISBN barcode
4. Verify auto-detection and field population

- [ ] **Step 4: Test fallback when camera denied**

1. Click camera icon
2. Deny camera permission
3. Verify "Camera not available" message appears
4. Verify Upload Photo button still works

- [ ] **Step 5: Final commit**

```bash
git add -A
git status
# If any uncommitted changes, commit them
git commit -m "chore: minor cleanup after scanner integration"
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Ghost book visuals in EmptyShelfIsland |
| 2 | Install @ericblade/quagga2 |
| 3 | Create ScannerIsland component |
| 4 | Add camera button to AddBookIsland |
| 5 | End-to-end verification |
