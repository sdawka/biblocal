/**
 * Component-level tests for ScannerIsland: camera init error mapping, the
 * two-consecutive-frame confirmation before onScan, detection-handler cleanup
 * on destroy, and the photo-upload (decodeSingle) fallback path.
 *
 * The harness (vitest.config.ts) uses svelte({ hot: false }) + svelteTesting()
 * and jsdom. Quagga2 is fully mocked — jsdom has no camera — so tests drive
 * the component through the mocked init/onDetected/decodeSingle surface.
 *
 * Note: @testing-library/jest-dom is NOT installed; assertions use standard
 * vitest matchers. `getByText` throws if the element is absent, so it
 * self-asserts presence. Negative checks use `queryByText` with `.toBeNull()`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';

vi.mock('@ericblade/quagga2', () => ({
  default: {
    init: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onDetected: vi.fn(),
    offDetected: vi.fn(),
    decodeSingle: vi.fn(),
  },
}));

import Quagga from '@ericblade/quagga2';
import ScannerIsland from '../../src/components/ScannerIsland.svelte';

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Real ISBN-13s (valid EAN-13 check digits with 978 prefix), so they pass
// the component's isBookEan13 gate.
const ISBN_A = '9780140449136'; // Crime and Punishment
const ISBN_B = '9780465026562'; // Gödel, Escher, Bach
// Valid EAN-13 check digit but no 978/979 prefix — a store/price barcode.
const NON_ISBN_EAN = '4006381333931';

type DetectionHandler = (result: unknown) => void;

/** Quagga detection result with per-segment decode errors under the
 *  confidence threshold (MAX_AVG_ERROR = 0.25) unless overridden. */
function makeDetection(code: string, error = 0.05): unknown {
  return {
    codeResult: {
      code,
      decodedCodes: [{ error }, { error }, { error }],
    },
  };
}

function renderScanner() {
  const onScan = vi.fn();
  const onClose = vi.fn();
  const utils = render(ScannerIsland, { props: { onScan, onClose, lang: 'en' } });
  return { onScan, onClose, ...utils };
}

/** Waits for initScanner to finish registering and returns the live handler. */
async function getDetectionHandler(): Promise<DetectionHandler> {
  await waitFor(() => expect(vi.mocked(Quagga.onDetected)).toHaveBeenCalledTimes(1));
  return vi.mocked(Quagga.onDetected).mock.calls[0][0] as DetectionHandler;
}

function makeInitError(name: string): Error {
  const err = new Error(name);
  err.name = name;
  return err;
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('ScannerIsland', () => {
  beforeEach(() => {
    // vi.clearAllMocks() (setup.ts beforeEach) clears call history but not
    // implementations; re-set defaults so one test's override can't leak.
    vi.mocked(Quagga.init).mockResolvedValue(undefined as never);
    vi.mocked(Quagga.start).mockImplementation((() => {}) as never);
    vi.mocked(Quagga.stop).mockImplementation((() => {}) as never);
    vi.mocked(Quagga.onDetected).mockImplementation((() => {}) as never);
    vi.mocked(Quagga.offDetected).mockImplementation((() => {}) as never);
    vi.mocked(Quagga.decodeSingle).mockResolvedValue(null as never);
  });

  // ── 1. Camera init error → message mapping ───────────────────────────────

  describe('camera init error mapping', () => {
    it('NotFoundError → no-camera-found message', async () => {
      vi.mocked(Quagga.init).mockRejectedValue(makeInitError('NotFoundError'));
      renderScanner();

      await waitFor(() => {
        expect(screen.getByText('No camera found. Try uploading a photo.')).toBeTruthy();
      });
    });

    it('OverconstrainedError → no-camera-found message', async () => {
      vi.mocked(Quagga.init).mockRejectedValue(makeInitError('OverconstrainedError'));
      renderScanner();

      await waitFor(() => {
        expect(screen.getByText('No camera found. Try uploading a photo.')).toBeTruthy();
      });
    });

    it('generic error → camera-unavailable message', async () => {
      vi.mocked(Quagga.init).mockRejectedValue(makeInitError('SomeOtherError'));
      renderScanner();

      await waitFor(() => {
        expect(screen.getByText('Camera not available. Try uploading a photo.')).toBeTruthy();
      });
    });
  });

  // ── 2. Two-consecutive-frame confirmation ────────────────────────────────

  describe('detection confirmation logic', () => {
    it('does not fire onScan on a single frame; fires after the same code on two consecutive frames', async () => {
      const { onScan } = renderScanner();
      const handler = await getDetectionHandler();

      handler(makeDetection(ISBN_A));
      expect(onScan).not.toHaveBeenCalled();

      handler(makeDetection(ISBN_A));
      expect(onScan).toHaveBeenCalledTimes(1);
      expect(onScan).toHaveBeenCalledWith(ISBN_A);

      // Committing a scan must detach the handler and stop the camera so the
      // module-singleton Quagga can't re-fire onScan later.
      expect(vi.mocked(Quagga.offDetected)).toHaveBeenCalledWith(handler);
      expect(vi.mocked(Quagga.stop)).toHaveBeenCalled();
    });

    it('a different code between frames resets the confirmation counter', async () => {
      const { onScan } = renderScanner();
      const handler = await getDetectionHandler();

      handler(makeDetection(ISBN_A));
      handler(makeDetection(ISBN_B));
      expect(onScan).not.toHaveBeenCalled();

      handler(makeDetection(ISBN_B));
      expect(onScan).toHaveBeenCalledWith(ISBN_B);
    });

    it('ignores non-ISBN EAN-13 codes (price/store barcodes) entirely', async () => {
      const { onScan } = renderScanner();
      const handler = await getDetectionHandler();

      handler(makeDetection(NON_ISBN_EAN));
      handler(makeDetection(NON_ISBN_EAN));
      handler(makeDetection(NON_ISBN_EAN));
      expect(onScan).not.toHaveBeenCalled();
    });

    it('rejects low-confidence frames (avg decode error above threshold)', async () => {
      const { onScan } = renderScanner();
      const handler = await getDetectionHandler();

      handler(makeDetection(ISBN_A, 0.5));
      handler(makeDetection(ISBN_A, 0.5));
      expect(onScan).not.toHaveBeenCalled();

      // A noisy frame also resets the streak: one clean frame after it is
      // not enough on its own.
      handler(makeDetection(ISBN_A));
      expect(onScan).not.toHaveBeenCalled();
      handler(makeDetection(ISBN_A));
      expect(onScan).toHaveBeenCalledWith(ISBN_A);
    });
  });

  // ── 3. Cleanup on destroy ────────────────────────────────────────────────

  describe('cleanup on destroy', () => {
    it('calls Quagga.offDetected with the registered handler and stops the camera on unmount', async () => {
      const { unmount } = renderScanner();
      const handler = await getDetectionHandler();

      expect(vi.mocked(Quagga.offDetected)).not.toHaveBeenCalled();
      unmount();

      expect(vi.mocked(Quagga.offDetected)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(Quagga.offDetected)).toHaveBeenCalledWith(handler);
      expect(vi.mocked(Quagga.stop)).toHaveBeenCalled();
    });
  });

  // ── 4. Photo-upload fallback (decodeSingle) ──────────────────────────────

  describe('photo upload decoding', () => {
    function uploadPhoto(container: HTMLElement): Promise<boolean> {
      const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
      const file = new File(['fake-image-bytes'], 'barcode.jpg', { type: 'image/jpeg' });
      return fireEvent.change(input, { target: { files: [file] } });
    }

    it('decode success with a book ISBN → fires onScan and detaches the live handler', async () => {
      vi.mocked(Quagga.decodeSingle).mockResolvedValue(makeDetection(ISBN_A) as never);
      const { onScan, container } = renderScanner();
      const handler = await getDetectionHandler();

      await uploadPhoto(container);

      await waitFor(() => expect(onScan).toHaveBeenCalledWith(ISBN_A));
      expect(vi.mocked(Quagga.offDetected)).toHaveBeenCalledWith(handler);
      expect(vi.mocked(Quagga.stop)).toHaveBeenCalled();
    });

    it('decode resolves with no code → "nothing detected" error and decoding resets', async () => {
      vi.mocked(Quagga.decodeSingle).mockResolvedValue(null as never);
      const { onScan, container } = renderScanner();
      await getDetectionHandler();

      await uploadPhoto(container);

      await waitFor(() => {
        expect(screen.getByText('Could not detect barcode. Try again.')).toBeTruthy();
      });
      expect(onScan).not.toHaveBeenCalled();

      // decoding flag reset: button shows idle label again and is enabled
      const uploadBtn = screen.getByText('Upload Photo') as HTMLButtonElement;
      expect(uploadBtn.disabled).toBe(false);
      expect(screen.queryByText('Scanning…')).toBeNull();
    });

    it('decode resolves with a non-ISBN code → "not an ISBN" error, no onScan', async () => {
      vi.mocked(Quagga.decodeSingle).mockResolvedValue(makeDetection(NON_ISBN_EAN) as never);
      const { onScan, container } = renderScanner();
      await getDetectionHandler();

      await uploadPhoto(container);

      await waitFor(() => {
        expect(
          screen.getByText('That barcode is not an ISBN. Scan the one starting 978 or 979.'),
        ).toBeTruthy();
      });
      expect(onScan).not.toHaveBeenCalled();
    });

    it('decodeSingle rejection (undecodable image) → error shows and decoding resets for a retry', async () => {
      // decodeSingle rejects without calling back on e.g. an HEIC image.
      vi.mocked(Quagga.decodeSingle).mockRejectedValue(new Error('undecodable image'));
      const { onScan, container } = renderScanner();
      await getDetectionHandler();

      await uploadPhoto(container);

      await waitFor(() => {
        expect(screen.getByText('Could not detect barcode. Try again.')).toBeTruthy();
      });
      expect(onScan).not.toHaveBeenCalled();

      const uploadBtn = screen.getByText('Upload Photo') as HTMLButtonElement;
      expect(uploadBtn.disabled).toBe(false);

      // A retry after the rejection must reach decodeSingle again (the
      // `decoding` guard was released by the finally block).
      vi.mocked(Quagga.decodeSingle).mockResolvedValue(makeDetection(ISBN_B) as never);
      await uploadPhoto(container);
      await waitFor(() => expect(onScan).toHaveBeenCalledWith(ISBN_B));
    });
  });

  // ── 5. Cancel / close ────────────────────────────────────────────────────

  describe('cancel', () => {
    it('the Cancel button calls onClose', async () => {
      const { onClose } = renderScanner();
      await getDetectionHandler();

      await fireEvent.click(screen.getByText('Cancel'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('Escape calls onClose', async () => {
      const { onClose } = renderScanner();
      await getDetectionHandler();

      await fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── 6. Permission denial persists for this page session ─────────────────

  it('does not request a denied camera again on remount, but retries on request', async () => {
    vi.mocked(Quagga.init).mockRejectedValueOnce(makeInitError('NotAllowedError'));
    const firstScanner = renderScanner();

    await waitFor(() => {
      expect(
        screen.getByText('Camera permission denied. Allow camera access or upload a photo.'),
      ).toBeTruthy();
    });
    expect(screen.getByText('Camera not available')).toBeTruthy();
    expect(vi.mocked(Quagga.start)).not.toHaveBeenCalled();

    firstScanner.unmount();
    const retriedScanner = renderScanner();

    await waitFor(() => expect(vi.mocked(Quagga.init)).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Camera permission denied. Allow camera access or upload a photo.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try camera again' })).toBeTruthy();

    await fireEvent.click(screen.getByRole('button', { name: 'Try camera again' }));
    await waitFor(() => expect(vi.mocked(Quagga.init)).toHaveBeenCalledTimes(2));
    await waitFor(() => {
      expect(screen.queryByText('Camera permission denied. Allow camera access or upload a photo.')).toBeNull();
    });
    expect(screen.queryByRole('button', { name: 'Try camera again' })).toBeNull();

    const handler = await getDetectionHandler();
    retriedScanner.unmount();
    expect(vi.mocked(Quagga.offDetected)).toHaveBeenLastCalledWith(handler);
    expect(vi.mocked(Quagga.stop)).toHaveBeenCalled();
  });
});
