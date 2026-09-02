<script lang="ts">
  /**
   * Test double for ScannerIsland (see AddBookIsland.test.ts, which vi.mocks
   * the real module with this file). Simulates a completed camera scan by
   * calling onScan with a fixed ISBN as soon as the scanner mounts, so tests
   * can exercise AddBookIsland's scan-provenance handling without Quagga.
   */
  interface Props {
    onScan: (isbn: string) => void;
    onClose: () => void;
    lang?: string;
  }

  let { onScan }: Props = $props();

  // Keep in sync with SCANNED_ISBN in AddBookIsland.test.ts.
  $effect(() => {
    onScan('9780140449136');
  });
</script>

<div data-testid="fake-scanner"></div>
