<script lang="ts">
  // Independent ornate shelf furniture for the Covers view. Knows nothing
  // about books — it paints a single carved wooden ledge board under one
  // horizontally-scrolling row of spines, plus ornate end corbels, so an
  // empty section still looks like a shelf. The row (`.covers-row` in
  // ShelfIsland.svelte) is a fixed 198px tall (132px spine width × 2:3); the
  // board sits statically at its baseline while the row scrolls sideways
  // over it — the board belongs to this component's bay, not to the row.
  const BOARD_HEIGHT = 40;
  const ROW_HEIGHT = 198;
</script>

<div class="shelf-bay">
  <div class="bay-content">
    <slot />
  </div>

  <div class="ledge" style="height: {BOARD_HEIGHT}px" aria-hidden="true">
    <span class="corbel corbel-left">
      <svg width="30" height="100%" viewBox="0 0 30 64" preserveAspectRatio="none" role="presentation">
        <!-- Clean S-curve (ogee) bracket: a tidy scroll-shape carved corbel,
             not a heavy cartoon curl. -->
        <path
          d="M30 6
             C 20 6, 13 9, 11 16
             C 9 23, 15 25, 16 30
             C 17 35, 10 36, 9 42
             C 8 48, 13 49, 12 55
             C 11 60, 6 61, 3 64
             L 30 64 Z"
          fill="var(--shelf-wood-solid)"
        />
        <path
          d="M30 6
             C 20 6, 13 9, 11 16
             C 9 23, 15 25, 16 30
             C 17 35, 10 36, 9 42
             C 8 48, 13 49, 12 55
             C 11 60, 6 61, 3 64"
          fill="none"
          stroke="var(--hairline-strong)"
          stroke-width="1"
        />
        <!-- Lit edge catching the light along the curve's upper flank -->
        <path
          d="M29 7
             C 20 7, 14 10, 12 16.5"
          fill="none"
          stroke="oklch(1 0 0 / 0.4)"
          stroke-width="1"
          stroke-linecap="round"
        />
      </svg>
    </span>

    <svg class="board" viewBox="0 0 400 70" preserveAspectRatio="none" role="presentation">
      <defs>
        <linearGradient id="ledge-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--shelf-wood-lit)" />
          <stop offset="16%" stop-color="var(--shelf-wood-lit)" />
          <stop offset="48%" stop-color="var(--shelf-wood-mid)" />
          <stop offset="100%" stop-color="var(--shelf-wood-deep)" />
        </linearGradient>
        <linearGradient id="ledge-shadow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--drop-shadow-color)" stop-opacity="0.65" />
          <stop offset="100%" stop-color="var(--drop-shadow-color)" stop-opacity="0" />
        </linearGradient>
      </defs>

      <!-- Cast shadow beneath the board, on the page behind it — a touch
           deeper and taller so books read as resting ON the board, not
           floating above it. -->
      <rect x="0" y="30" width="400" height="20" fill="url(#ledge-shadow)" />

      <!-- Board body: bullnose-lit top surface + warmer, darker carved face -->
      <path d="M0 5 Q 0 0 5 0 L 395 0 Q 400 0 400 5 L 400 30 L 0 30 Z" fill="url(#ledge-face)" />

      <!-- Top lit hairline (the bullnose highlight catching light) -->
      <path d="M3 1 L 397 1" stroke="oklch(1 0 0 / 0.65)" stroke-width="1.2" />

      <!-- Bead line molding: a fine incised line below the bullnose, the
           tasteful stand-in for the old repeating dentil strip -->
      <path d="M0 12 L 400 12" stroke="var(--shelf-wood-deep)" stroke-width="1" stroke-opacity="0.6" />
      <path d="M0 13 L 400 13" stroke="oklch(1 0 0 / 0.3)" stroke-width="1" />

      <!-- Front face bottom edge -->
      <path d="M0 29.5 L 400 29.5" stroke="var(--shelf-wood-deep)" stroke-width="1" />

      <!-- Subtle wood grain: thin, low-opacity horizontal strokes, slightly
           irregular so the face doesn't read as a flat gradient -->
      <g stroke="var(--shelf-wood-deep)" stroke-opacity="0.3" stroke-width="0.7" fill="none">
        <path d="M0 16 Q 100 18 200 16.5 T 400 17" />
        <path d="M0 20.5 Q 120 19 240 21 T 400 19.5" />
        <path d="M0 24 Q 90 26 220 24.5 T 400 25.5" />
        <path d="M0 27 Q 140 25.5 260 27.5 T 400 26.5" />
      </g>
    </svg>

    <span class="corbel corbel-right">
      <svg width="30" height="100%" viewBox="0 0 30 64" preserveAspectRatio="none" role="presentation">
        <path
          d="M0 6
             C 10 6, 17 9, 19 16
             C 21 23, 15 25, 14 30
             C 13 35, 20 36, 21 42
             C 22 48, 17 49, 18 55
             C 19 60, 24 61, 27 64
             L 0 64 Z"
          fill="var(--shelf-wood-solid)"
        />
        <path
          d="M0 6
             C 10 6, 17 9, 19 16
             C 21 23, 15 25, 14 30
             C 13 35, 20 36, 21 42
             C 22 48, 17 49, 18 55
             C 19 60, 24 61, 27 64"
          fill="none"
          stroke="var(--hairline-strong)"
          stroke-width="1"
        />
        <path
          d="M1 7
             C 10 7, 16 10, 18 16.5"
          fill="none"
          stroke="oklch(1 0 0 / 0.4)"
          stroke-width="1"
          stroke-linecap="round"
        />
      </svg>
    </span>
  </div>
</div>

<style>
  .shelf-bay {
    position: relative;
    width: min(var(--maxw-shelf-wide), 100vw);
    margin-inline: calc(50% - min(var(--maxw-shelf-wide), 100vw) / 2);
    padding: 0 clamp(var(--s-6), 4vw, var(--s-10)) var(--s-7);
    overflow-x: clip;
    isolation: isolate;
  }

  .bay-content {
    position: relative;
    z-index: 1;
  }

  /* The single static ledge board, sitting directly under the row's
     baseline. It does not scroll — only the slotted .covers-row above it
     scrolls sideways, so books visually glide along a fixed shelf. */
  .ledge {
    position: relative;
    display: flex;
    align-items: stretch;
    margin-top: -1px; /* hairline overlap so there's no seam under the spines */
    filter: drop-shadow(0 3px 5px var(--drop-shadow-color));
  }

  .board {
    flex: 1 1 auto;
    width: 100%;
    height: 100%;
    display: block;
  }

  .corbel {
    flex: 0 0 auto;
    width: 30px;
    display: block;
  }

  .corbel svg {
    display: block;
    height: 100%;
  }

  @media (max-width: 820px) {
    .shelf-bay {
      padding-inline: var(--s-4);
    }
    .corbel {
      width: 18px;
    }
  }
</style>
