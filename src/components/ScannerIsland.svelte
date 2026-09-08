<script module lang="ts">
  // Quagga is a module singleton, so keep a page-lifetime record of a denied
  // permission. Reopening the sheet should not make the browser prompt again
  // unless the reader deliberately asks us to retry.
  let cameraAccess: 'unknown' | 'granted' | 'denied' = 'unknown';
  // Serialize initialization across rapid close/reopen cycles: Quagga owns
  // a single camera, and a late init must be stopped before the next starts.
  let cameraInitQueue: Promise<void> = Promise.resolve();
</script>

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
  let dialogRef: HTMLDialogElement | null = $state(null);
  let hasCamera = $state(cameraAccess !== 'denied');
  let cameraDenied = $state(cameraAccess === 'denied');
  let shouldStartCamera = $state(cameraAccess !== 'denied');
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
  let scanCommitted = false;

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
    if (cameraAccess === 'denied') {
      error = t.errors.permissionDenied;
    }
    if (shouldStartCamera && videoRef) {
      const target = videoRef;
      cameraInitQueue = cameraInitQueue.then(async () => {
        if (mounted) await initScanner(target);
      });
    }
    return () => {
      mounted = false;
      removeDetectionHandler();
      const stopped = Quagga.stop();
      cameraInitQueue = cameraInitQueue.then(() => stopped);
    };
  });

  // Focus trap and restoration
  $effect(() => {
    if (!dialogRef) return;
    const dialog = dialogRef;
    previousActiveElement = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';

    // Focus the first focusable element in the dialog
    const focusableElements = dialogRef?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]):not([hidden]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements && focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      // Restore focus on close
      if (previousActiveElement && previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus();
      }
    };
  });

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key === 'Tab' && dialogRef) {
      const focusableElements = dialogRef.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]):not([hidden]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
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
      if (!mounted) {
        await Quagga.stop();
        return;
      }

      cameraAccess = 'granted';
      cameraDenied = false;
      error = '';
      Quagga.start();

      const handler = async (result: QuaggaJSResultObject) => {
        // Ignore live detections while a photo decode is in flight so the two
        // paths can't race each other into onScan.
        if (!mounted || decoding || scanCommitted) return;

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
          scanCommitted = true;
          removeDetectionHandler();
          await Quagga.stop();
          if (mounted) onScan(code);
        }
      };
      detectionHandler = handler;
      Quagga.onDetected(handler);
    } catch (err) {
      if (!mounted) return;
      hasCamera = false;
      const name = err instanceof Error ? err.name : '';
      if (name === 'NotAllowedError') {
        cameraAccess = 'denied';
        cameraDenied = true;
        shouldStartCamera = false;
        error = t.errors.permissionDenied;
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        error = t.errors.notFound;
      } else {
        error = t.errors.unavailable;
      }
    }
  }

  function retryCamera() {
    cameraAccess = 'unknown';
    cameraDenied = false;
    hasCamera = true;
    error = '';
    shouldStartCamera = true;
  }

  function handleFileUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      if (!mounted) return;
      const imageSrc = e.target?.result as string;
      decodeFromImage(imageSrc);
    };
    reader.readAsDataURL(file);
  }

  async function decodeFromImage(imageSrc: string) {
    if (!mounted || decoding || scanCommitted) return;
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
      if (!mounted) return;
      const code = result?.codeResult?.code;
      if (code && isBookEan13(code)) {
        scanCommitted = true;
        removeDetectionHandler();
        await Quagga.stop();
        if (mounted) onScan(code);
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

<dialog
  class="scanner-backdrop"
  onclick={handleBackdropClick}
  onkeydown={handleKeyDown}
  oncancel={(event) => { event.preventDefault(); onClose(); }}
  aria-modal="true"
  aria-labelledby="scanner-title"
  bind:this={dialogRef}
>
  <div class="scanner-sheet" role="document">
    <h2 id="scanner-title">{t.title}</h2>

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
      {#if cameraDenied}
        <button type="button" class="btn btn-outline retry-btn" onclick={retryCamera}>
          {t.retryCamera}
        </button>
      {/if}
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
</dialog>

<style>
  .scanner-backdrop {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100dvh;
    max-width: none;
    max-height: none;
    margin: 0;
    padding: max(var(--s-4), env(safe-area-inset-top)) max(var(--s-4), env(safe-area-inset-right)) max(var(--s-4), env(safe-area-inset-bottom)) max(var(--s-4), env(safe-area-inset-left));
    box-sizing: border-box;
    border: 0;
    background: transparent;
    color: var(--ink);
    overflow: auto;
    animation: fadeIn var(--dur-2) var(--ease-soft);
  }

  .scanner-backdrop[open] {
    display: grid;
    place-items: center;
  }

  .scanner-backdrop::backdrop {
    background: oklch(0.20 0.012 60 / 0.65);
  }

  .scanner-sheet {
    width: 100%;
    max-width: 500px;
    min-width: 0;
    box-sizing: border-box;
    background: var(--surface);
    border: 1px solid var(--hairline);
    border-radius: var(--r-xl);
    padding: clamp(16px, 4vw, 24px);
    box-shadow: var(--shadow-4);
  }

  h2 {
    margin: 0 0 var(--s-4);
    font-size: 1.25rem;
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

  .viewfinder :global(canvas) {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
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
    flex-wrap: wrap;
    gap: var(--s-3);
    margin-top: var(--s-4);
  }

  .upload-btn,
  .retry-btn,
  .cancel-btn {
    flex: 1 1 120px;
    white-space: normal;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    .scanner-sheet, .scanner-backdrop { animation: none; }
    .scan-line { animation: none; }
  }
</style>
