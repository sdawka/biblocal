<script lang="ts">
  // Independent ornate shelf furniture for the Covers view. Knows nothing
  // about books — it paints a crisp wooden ledge under each row + ornate end
  // corbels behind whatever is slotted in, so empty gaps and empty shelves
  // still look like a shelf. Covers tiles are a fixed 132px wide / 2:3 tall
  // (198px) with a fixed 32px row-gap (ShelfIsland.svelte pins `.grid.covers`
  // row-gap to 32px, NOT var(--s-6), specifically so it can't diverge from
  // this pitch) → --shelf-pitch: 230px MUST equal 132px×1.5 (198px tile) +
  // 32px row-gap, exactly, at any root font size, or the ledge drifts off
  // the rows. Keep both sides of that equation in sync if either changes.
</script>

<div class="shelf-bay">
  <span class="corbel corbel-left" aria-hidden="true">
    <svg width="26" height="100%" viewBox="0 0 26 240" preserveAspectRatio="none" role="presentation">
      <path d="M26 0 C 13 8, 7 16, 7 30 L 7 210 C 7 224, 13 232, 26 240 L 0 240 L 0 0 Z" fill="var(--shelf-wood-solid)" />
      <path d="M26 0 C 13 8, 7 16, 7 30 L 7 210 C 7 224, 13 232, 26 240" fill="none" stroke="var(--hairline)" stroke-width="1" />
    </svg>
  </span>

  <div class="bay-content">
    <slot />
  </div>

  <span class="corbel corbel-right" aria-hidden="true">
    <svg width="26" height="100%" viewBox="0 0 26 240" preserveAspectRatio="none" role="presentation">
      <path d="M0 0 C 13 8, 19 16, 19 30 L 19 210 C 19 224, 13 232, 0 240 L 26 240 L 26 0 Z" fill="var(--shelf-wood-solid)" />
      <path d="M0 0 C 13 8, 19 16, 19 30 L 19 210 C 19 224, 13 232, 0 240" fill="none" stroke="var(--hairline)" stroke-width="1" />
    </svg>
  </span>
</div>

<style>
  .shelf-bay {
    --shelf-pitch: 230px;
    position: relative;
    width: min(var(--maxw-shelf-wide), 100vw);
    margin-inline: calc(50% - min(var(--maxw-shelf-wide), 100vw) / 2);
    /* No top padding so the ledge tiles align with the spine rows. Bottom pad
       leaves room for the last row's ledge + a touch of shelf below it. */
    padding: 0 clamp(var(--s-6), 4vw, var(--s-10)) var(--s-7);
    overflow-x: clip;
    isolation: isolate;

    /* Two layered backgrounds, both tiling at the 230px row pitch, spanning the
       full bay width (into the margins) so the shelf exists with or without
       books. Layer 1 (on top): carved dentil molding along the board face.
       Layer 2: the wooden board itself — lit top lip, wood face, cast shadow. */
    background-image:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='230' viewBox='0 0 16 230'%3E%3Crect x='2.5' y='201' width='5' height='7' rx='1.2' fill='none' stroke='black' stroke-opacity='0.16' stroke-width='1'/%3E%3Ccircle cx='11.5' cy='204.5' r='2.1' fill='none' stroke='black' stroke-opacity='0.16' stroke-width='1'/%3E%3C/svg%3E"),
      linear-gradient(
        180deg,
        transparent 0 197px,
        oklch(1 0 0 / 0.55) 197px 199px,
        var(--hairline-strong) 199px 209px,
        oklch(0 0 0 / 0.22) 209px 214px,
        oklch(0 0 0 / 0.06) 214px 219px,
        transparent 219px 230px
      );
    background-repeat: repeat, repeat-y;
    background-size: 16px var(--shelf-pitch), 100% var(--shelf-pitch);
    background-origin: border-box;
    background-position: 0 0, 0 0;
  }

  /* The dentil molding's stroke='black' vanishes against the dark wood board.
     Swap layer 1 to a light stroke for dark mode (explicit toggle + OS-follow,
     mirroring theme.css); the wood gradient layer (layer 2) is unchanged since
     it already rides on theme variables. Light mode keeps the black stroke. */
  :global([data-theme="dark"]) .shelf-bay {
    background-image:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='230' viewBox='0 0 16 230'%3E%3Crect x='2.5' y='201' width='5' height='7' rx='1.2' fill='none' stroke='white' stroke-opacity='0.16' stroke-width='1'/%3E%3Ccircle cx='11.5' cy='204.5' r='2.1' fill='none' stroke='white' stroke-opacity='0.16' stroke-width='1'/%3E%3C/svg%3E"),
      linear-gradient(
        180deg,
        transparent 0 197px,
        oklch(1 0 0 / 0.55) 197px 199px,
        var(--hairline-strong) 199px 209px,
        oklch(0 0 0 / 0.22) 209px 214px,
        oklch(0 0 0 / 0.06) 214px 219px,
        transparent 219px 230px
      );
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .shelf-bay {
      background-image:
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='230' viewBox='0 0 16 230'%3E%3Crect x='2.5' y='201' width='5' height='7' rx='1.2' fill='none' stroke='white' stroke-opacity='0.16' stroke-width='1'/%3E%3Ccircle cx='11.5' cy='204.5' r='2.1' fill='none' stroke='white' stroke-opacity='0.16' stroke-width='1'/%3E%3C/svg%3E"),
        linear-gradient(
          180deg,
          transparent 0 197px,
          oklch(1 0 0 / 0.55) 197px 199px,
          var(--hairline-strong) 199px 209px,
          oklch(0 0 0 / 0.22) 209px 214px,
          oklch(0 0 0 / 0.06) 214px 219px,
          transparent 219px 230px
        );
    }
  }

  .bay-content {
    position: relative;
    z-index: 1;
  }

  /* Ornate end corbels: bookcase side supports spanning the bay height, sitting
     inside the padding so their carved profile shows past the books. */
  .corbel {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 26px;
    z-index: 0;
    pointer-events: none;
    filter: drop-shadow(0 2px 3px var(--drop-shadow-color));
  }

  .corbel-left { left: 0; }
  .corbel-right { right: 0; }
  .corbel svg { display: block; height: 100%; }

  @media (max-width: 820px) {
    .shelf-bay {
      padding-inline: var(--s-4);
    }
    .corbel { width: 16px; }
  }
</style>
