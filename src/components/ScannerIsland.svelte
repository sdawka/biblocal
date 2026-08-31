<script lang="ts">
  import Quagga, {
    type QuaggaJSCodeReader,
    type QuaggaJSResultObject,
  } from '@ericblade/quagga2';
  import { isBookEan13 } from '../lib/openLibrary';
  import { useTranslations, type Lang } from '../i18n';

  interface Props {
    onScan: (isbn: string) => void;
    onClose: () => void;
    lang?: Lang;
  }

  let { onScan, onClose, lang = 'en' as Lang }: Props = $props();
  const t = $derived(useTranslations(lang).shelf.scanner);

  let videoRef: HTMLDivElement | null = $state(null);
  let fileInputRef: HTMLInputElement | null = $state(null);
  let dialogRef: HTMLDivElement | null = $state(null);
  let hasCamera = $state(true);
  let error = $state('');
  let decoding = $state(false);
  let previousActiveElement: Element | null = null;

  // ISBNs are 13-digit EAN only. Dropping ean_8 stops the scanner from locking
  // onto short, non-book codes.
  const BARCODE_READERS: QuaggaJSCodeReader[] = ['ean_reader'];

  // A book's back cover usually has two barcodes and a single frame can misread,
  // so accept a code only after it reads cleanly on consecutive frames.
  const REQUIRED_CONFIRMATIONS = 2;
  const MAX_AVG_ERROR = 0.25;
  let lastCode = '';
  let confirmCount = 0;

  let mounted = false;

  // Quagga is a module singleton, so a handler left registered would survive
  // this component and re-fire onScan the next time the scanner opens. Keep a
  // reference so we can offDetected() it on cleanup and before invoking onScan.
  let detectionHandler: ((result: QuaggaJSResultObject) => void) | null = null;

  function removeDetectionHandler() {
    if (detectionHandler) {
      Quagga.offDetected(detectionHandler);
      detectionHandler = null;
    }
  }

  $effect(() => {
    mounted = true;
    if (videoRef) {
      initScanner(videoRef);
    }
    return () => {
      mounted = false;
      removeDetectionHandler();
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

  // Takes the container as a parameter so TS sees a non-null element (the
  // $effect only calls this once `videoRef` is bound).
  async function initScanner(target: HTMLDivElement) {
    try {
      await Quagga.init({
        inputStream: {
          type: 'LiveStream',
          target,
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

      // The component may have been destroyed while init() was awaiting; bail
      // before start() so we don't leak the camera MediaStream.
      if (!mounted) return;

      Quagga.start();

      const handler = (result: QuaggaJSResultObject) => {
        // Ignore live detections while a photo decode is in flight so the two
        // paths can't race each other into onScan.
        if (decoding) return;

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
          removeDetectionHandler();
          Quagga.stop();
          onScan(code);
        }
      };
      detectionHandler = handler;
      Quagga.onDetected(handler);
    } catch (err) {
      hasCamera = false;
      const name = err instanceof Error ? err.name : '';
      if (name === 'NotAllowedError') {
        error = t.errors.permissionDenied;
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        error = t.errors.notFound;
      } else {
        error = t.errors.unavailable;
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

  async function decodeFromImage(imageSrc: string) {
    if (decoding) return;
    decoding = true;
    error = '';
    try {
      const result = await Quagga.decodeSingle({
        src: imageSrc,
        numOfWorkers: 0,
        decoder: {
          readers: BARCODE_READERS,
        },
        locate: true,
      });
      const code = result?.codeResult?.code;
      if (code && isBookEan13(code)) {
        removeDetectionHandler();
        Quagga.stop();
        onScan(code);
      } else if (code) {
        error = t.errors.notIsbn;
      } else {
        error = t.errors.noDetect;
      }
    } catch {
      // decodeSingle rejects without calling back on an undecodable image
      // (e.g. HEIC); surface the same "nothing detected" message.
      error = t.errors.noDetect;
    } finally {
      decoding = false;
    }
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
  tabindex="-1"
  bind:this={dialogRef}
>
  <div class="scanner-sheet glass" role="document">
    <h2 id="scanner-title" class="visually-hidden">{t.title}</h2>
    <div class="drag-handle"></div>

    {#if hasCamera}
      <div class="viewfinder" bind:this={videoRef}>
        <div class="targeting-frame">
          <span class="scan-line"></span>
        </div>
      </div>
      <p class="instruction muted">{t.instruction}</p>
    {:else}
      <div class="no-camera">
        <span class="no-camera-icon" aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.5 4h2A1.5 1.5 0 0 1 18 5.5l1 1.5h1.5A1.5 1.5 0 0 1 22 8.5v9A1.5 1.5 0 0 1 20.5 19h-17A1.5 1.5 0 0 1 2 17.5v-9A1.5 1.5 0 0 1 3.5 7H5l1-1.5A1.5 1.5 0 0 1 7.5 4h2" />
            <circle cx="12" cy="12.5" r="3.5" />
            <path d="M2 2l20 20" />
          </svg>
        </span>
        <p class="muted">{t.cameraUnavailable}</p>
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
        aria-label={decoding ? t.uploadAriaScanning : t.uploadAriaIdle}
      >
        {decoding ? t.scanning : t.uploadPhoto}
      </button>
      <button
        type="button"
        class="btn btn-plain cancel-btn"
        onclick={onClose}
        aria-label={t.closeAriaLabel}
      >
        {t.cancel}
      </button>
    </div>

    <!-- No `capture` attribute: it would force the camera on iOS/Android,
         but this input is the fallback for when the camera is unavailable
         or denied — the photo library must stay reachable. -->
    <input
      type="file"
      accept="image/*"
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
    background: oklch(0.20 0.012 60 / 0.5);
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
    background: oklch(0.20 0.012 60);
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
