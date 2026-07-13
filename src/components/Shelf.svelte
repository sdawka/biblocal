<script lang="ts">
  // Independent ornate shelf furniture for the Covers view. Knows nothing
  // about books — it paints a single carved wooden ledge board under one
  // horizontally-scrolling row of spines, plus ornate end corbels, so an
  // empty section still looks like a shelf. The row (`.covers-row` in
  // ShelfIsland.svelte) is a fixed 198px tall (132px spine width × 2:3); the
  // board sits statically at its baseline while the row scrolls sideways
  // over it — the board belongs to this component's bay, not to the row.
  const BOARD_HEIGHT = 34;
  const ROW_HEIGHT = 198;
</script>

<div class="shelf-bay">
  <div class="bay-content">
    <slot />
  </div>

  <div class="ledge" style="height: {BOARD_HEIGHT}px" aria-hidden="true">
    <span class="corbel corbel-left">
      <svg width="30" height="100%" viewBox="0 0 30 60" preserveAspectRatio="none" role="presentation">
        <path
          d="M30 4 C 18 4, 10 10, 8 20 C 6 30, 14 32, 14 40 C 14 48, 4 48, 2 60 L 30 60 Z"
          fill="var(--shelf-wood-solid)"
        />
        <path
          d="M30 4 C 18 4, 10 10, 8 20 C 6 30, 14 32, 14 40 C 14 48, 4 48, 2 60"
          fill="none"
          stroke="var(--hairline-strong)"
          stroke-width="1"
        />
      </svg>
    </span>

    <svg class="board" viewBox="0 0 400 60" preserveAspectRatio="none" role="presentation">
      <defs>
        <linearGradient id="ledge-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--surface)" />
          <stop offset="18%" stop-color="var(--surface)" />
          <stop offset="45%" stop-color="var(--hairline-strong)" />
          <stop offset="100%" stop-color="var(--hairline)" />
        </linearGradient>
        <linearGradient id="ledge-shadow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--drop-shadow-color)" stop-opacity="0.5" />
          <stop offset="100%" stop-color="var(--drop-shadow-color)" stop-opacity="0" />
        </linearGradient>
      </defs>

      <!-- Cast shadow beneath the board, on the page behind it -->
      <rect x="0" y="26" width="400" height="14" fill="url(#ledge-shadow)" />

      <!-- Board body: bullnose-lit top surface + darker carved face -->
      <path d="M0 4 Q 0 0 4 0 L 396 0 Q 400 0 400 4 L 400 26 L 0 26 Z" fill="url(#ledge-face)" />

      <!-- Top lit hairline (the bullnose highlight catching light) -->
      <path d="M2 1 L 398 1" stroke="oklch(1 0 0 / 0.6)" stroke-width="1" />

      <!-- Bead line molding: a fine incised line below the bullnose, the
           tasteful stand-in for the old repeating dentil strip -->
      <path d="M0 10 L 400 10" stroke="var(--hairline-strong)" stroke-width="1" />
      <path d="M0 11 L 400 11" stroke="oklch(1 0 0 / 0.35)" stroke-width="1" />

      <!-- Front face bottom edge -->
      <path d="M0 25.5 L 400 25.5" stroke="var(--hairline-strong)" stroke-width="1" />

      <!-- Subtle wood grain: thin, low-opacity horizontal strokes -->
      <g stroke="var(--hairline-strong)" stroke-opacity="0.25" stroke-width="0.6">
        <path d="M0 14 Q 100 15.5 200 14 T 400 14.5" fill="none" />
        <path d="M0 18 Q 120 16.5 240 18 T 400 17" fill="none" />
        <path d="M0 21.5 Q 90 23 220 21.5 T 400 22.5" fill="none" />
      </g>
    </svg>

    <span class="corbel corbel-right">
      <svg width="30" height="100%" viewBox="0 0 30 60" preserveAspectRatio="none" role="presentation">
        <path
          d="M0 4 C 12 4, 20 10, 22 20 C 24 30, 16 32, 16 40 C 16 48, 26 48, 28 60 L 0 60 Z"
          fill="var(--shelf-wood-solid)"
        />
        <path
          d="M0 4 C 12 4, 20 10, 22 20 C 24 30, 16 32, 16 40 C 16 48, 26 48, 28 60"
          fill="none"
          stroke="var(--hairline-strong)"
          stroke-width="1"
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
    filter: drop-shadow(0 2px 3px var(--drop-shadow-color));
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
