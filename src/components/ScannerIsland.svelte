<script lang="ts">
  import Quagga from '@ericblade/quagga2';

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

  const BARCODE_READERS = ['ean_reader', 'ean_8_reader'];

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

<div
  class="scanner-backdrop"
  onclick={handleBackdropClick}
  onkeydown={handleKeyDown}
  role="dialog"
  aria-modal="true"
  aria-labelledby="scanner-title"
  bind:this={dialogRef}
>
  <div class="scanner-sheet" role="document">
    <h2 id="scanner-title" class="visually-hidden">Scan ISBN Barcode</h2>
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
      <p class="error" role="alert">{error}</p>
    {/if}

    <div class="actions">
      <button
        type="button"
        class="upload-btn"
        onclick={triggerFileInput}
        disabled={decoding}
        aria-label={decoding ? 'Scanning barcode image' : 'Upload a photo of ISBN barcode'}
      >
        {decoding ? 'Scanning...' : '📷 Upload Photo'}
      </button>
      <button
        type="button"
        class="cancel-btn"
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
    color: var(--color-burgundy-dark);
    font-style: italic;
  }

  .upload-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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
