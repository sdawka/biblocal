<script lang="ts">
  import Quagga from '@ericblade/quagga2';
  import { isBookEan13 } from '../lib/openLibrary';

  interface Props {
    onScan: (isbn: string) => void;
    onClose: () => void;
  }

  let { onScan, onClose }: Props = $props();

  let videoRef: HTMLDivElement | null = $state(null);
  let fileInputRef: HTMLInputElement | null = $state(null);
  let dialogRef: HTMLDivElement | null = $state(null);
  let hasCamera = $state(true);
  let error = $state('');
  let decoding = $state(false);
  let previousActiveElement: Element | null = null;

  // ISBNs are 13-digit EAN only. Dropping ean_8 stops the scanner from locking
  // onto short, non-book codes.
  const BARCODE_READERS = ['ean_reader'];

  // A book's back cover usually has two barcodes and a single frame can misread,
  // so accept a code only after it reads cleanly on consecutive frames.
  const REQUIRED_CONFIRMATIONS = 2;
  const MAX_AVG_ERROR = 0.25;
  let lastCode = '';
  let confirmCount = 0;

  $effect(() => {
    if (videoRef) {
      initScanner();
    }
    return () => {
      Quagga.stop();
    };
  });

  // Focus trap and restoration
  $effect(() => {
    previousActiveElement = document.activeElement;

    // Focus the first focusable element in the dialog
    const focusableElements = dialogRef?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements && focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    return () => {
      // Restore focus on close
      if (previousActiveElement && previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus();
      }
    };
  });

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onClose();
      return;
    }

    if (event.key === 'Tab' && dialogRef) {
      const focusableElements = dialogRef.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  }

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
          readers: BARCODE_READERS,
        },
        locate: true,
      });

      Quagga.start();

      Quagga.onDetected((result) => {
        const code = result?.codeResult?.code;
        if (!code) return;

        // Reject low-confidence reads (Quagga reports a per-segment decode error).
        const decoded = (result.codeResult.decodedCodes ?? []) as Array<{ error?: number }>;
        const errors = decoded
          .map((c) => c.error)
          .filter((e): e is number => typeof e === 'number');
        if (errors.length > 0) {
          const avgError = errors.reduce((sum, e) => sum + e, 0) / errors.length;
          if (avgError > MAX_AVG_ERROR) {
            lastCode = '';
            confirmCount = 0;
            return;
          }
        }

        // Only accept the ISBN, never the price/UPC barcode beside it.
        if (!isBookEan13(code)) return;

        // Require the same code on consecutive frames before committing.
        if (code === lastCode) {
          confirmCount += 1;
        } else {
          lastCode = code;
          confirmCount = 1;
        }
        if (confirmCount >= REQUIRED_CONFIRMATIONS) {
          Quagga.stop();
          onScan(code);
        }
      });
    } catch (err) {
      hasCamera = false;
      const name = err instanceof Error ? err.name : '';
      if (name === 'NotAllowedError') {
        error = 'Camera permission denied. Allow camera access or upload a photo.';
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        error = 'No camera found. Try uploading a photo.';
      } else {
        error = 'Camera not available. Try uploading a photo.';
      }
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
    decoding = true;
    error = '';
    Quagga.decodeSingle(
      {
        src: imageSrc,
        numOfWorkers: 0,
        decoder: {
          readers: BARCODE_READERS,
        },
        locate: true,
      },
      (result) => {
        decoding = false;
        const code = result?.codeResult?.code;
        if (code && isBookEan13(code)) {
          onScan(code);
        } else if (code) {
          error = 'That barcode is not an ISBN. Scan the one starting 978 or 979.';
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

<div
  class="scanner-backdrop"
  onclick={handleBackdropClick}
  onkeydown={handleKeyDown}
  role="dialog"
  aria-modal="true"
  aria-labelledby="scanner-title"
  bind:this={dialogRef}
>
  <div class="scanner-sheet glass" role="document">
    <h2 id="scanner-title" class="visually-hidden">Scan ISBN Barcode</h2>
    <div class="drag-handle"></div>

    {#if hasCamera}
      <div class="viewfinder" bind:this={videoRef}>
        <div class="targeting-frame">
          <span class="scan-line"></span>
        </div>
      </div>
      <p class="instruction muted">Aim at the ISBN barcode, the one starting 978</p>
    {:else}
      <div class="no-camera">
        <span class="no-camera-icon" aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.5 4h2A1.5 1.5 0 0 1 18 5.5l1 1.5h1.5A1.5 1.5 0 0 1 22 8.5v9A1.5 1.5 0 0 1 20.5 19h-17A1.5 1.5 0 0 1 2 17.5v-9A1.5 1.5 0 0 1 3.5 7H5l1-1.5A1.5 1.5 0 0 1 7.5 4h2" />
            <circle cx="12" cy="12.5" r="3.5" />
            <path d="M2 2l20 20" />
          </svg>
        </span>
        <p class="muted">Camera not available</p>
      </div>
    {/if}

    {#if error}
      <p class="error" role="alert">{error}</p>
    {/if}

    <div class="actions">
      <button
        type="button"
        class="btn btn-outline upload-btn"
        onclick={triggerFileInput}
        disabled={decoding}
        aria-label={decoding ? 'Scanning barcode image' : 'Upload a photo of ISBN barcode'}
      >
        {decoding ? 'Scanning…' : 'Upload Photo'}
      </button>
      <button
        type="button"
        class="btn btn-plain cancel-btn"
        onclick={onClose}
        aria-label="Close scanner"
      >
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
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .scanner-backdrop {
    position: fixed;
    inset: 0;
    background: oklch(0.18 0.012 270 / 0.5);
    z-index: 1000;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    animation: fadeIn var(--dur-2) var(--ease-soft);
  }

  .scanner-sheet {
    width: 100%;
    max-width: 500px;
    background: var(--surface);
    border: 1px solid var(--hairline);
    border-bottom: none;
    border-radius: var(--r-xl) var(--r-xl) 0 0;
    padding: var(--s-4) var(--s-5) var(--s-6);
    box-shadow: var(--shadow-4);
    animation: sheetUp var(--dur-3) var(--ease-out);
  }

  .drag-handle {
    width: 40px;
    height: 4px;
    background: var(--hairline-strong);
    border-radius: var(--r-full);
    margin: 0 auto var(--s-4);
  }

  .viewfinder {
    position: relative;
    width: 100%;
    height: 200px;
    background: oklch(0.18 0.012 270);
    border-radius: var(--r-md);
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
    border: 2px solid var(--accent);
    border-radius: var(--r-sm);
    pointer-events: none;
  }

  .scan-line {
    position: absolute;
    top: 0;
    left: 10%;
    right: 10%;
    height: 2px;
    background: var(--accent);
    animation: scanMove 2s ease-in-out infinite;
  }

  @keyframes scanMove {
    0%, 100% { top: 0; }
    50% { top: calc(100% - 2px); }
  }

  .no-camera {
    width: 100%;
    height: 200px;
    background: var(--surface-sunken);
    border: 1px solid var(--hairline);
    border-radius: var(--r-md);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--s-2);
    color: var(--ink-muted);
  }

  .no-camera-icon {
    display: inline-flex;
    color: var(--ink-faint);
  }

  .no-camera p {
    margin: 0;
    font-size: 0.9rem;
  }

  .instruction {
    text-align: center;
    margin: var(--s-4) 0;
    font-size: 0.9rem;
  }

  .error {
    text-align: center;
    margin: var(--s-2) 0;
    font-size: 0.875rem;
    color: var(--st-giftable-fg);
  }

  .upload-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .actions {
    display: flex;
    gap: var(--s-3);
    margin-top: var(--s-4);
  }

  .upload-btn,
  .cancel-btn {
    flex: 1;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes sheetUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }

  @media (prefers-reduced-motion: reduce) {
    .scanner-sheet, .scanner-backdrop { animation: none; }
    .scan-line { animation: none; }
  }
</style>
