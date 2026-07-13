<script lang="ts">
  // Independent ornate shelf furniture for the Covers view. Knows nothing
  // about books — it paints a crisp wooden ledge under each row + ornate end
  // corbels behind whatever is slotted in, so empty gaps and empty shelves
  // still look like a shelf. Covers tiles are a fixed 132px wide / 2:3 tall
  // (198px) with row-gap var(--s-6) (32px) → a constant 230px row pitch that
  // the repeating ledge background is tuned to: the wooden board lands in the
  // gap directly beneath each row of spines.
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
