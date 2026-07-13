<script lang="ts">
  // Independent ornate shelf furniture for the Covers view. Knows nothing
  // about books — it paints a repeating wooden ledge + end corbels + a back
  // panel behind whatever is slotted in, so an empty shelf still looks like
  // a shelf. See docs/superpowers/plans for the row-pitch rationale: Covers
  // tiles are a fixed 132px wide / 2:3 tall (198px) with row-gap var(--s-6)
  // (32px), giving a constant row pitch of 230px that this component's
  // background is tuned to.
</script>

<div class="shelf-bay">
  <div class="grain" aria-hidden="true"></div>
  <span class="corbel corbel-left" aria-hidden="true">
    <svg width="28" height="100%" viewBox="0 0 28 230" preserveAspectRatio="none" role="presentation">
      <path
        d="M28 0
           C 14 6, 8 14, 8 26
           L 8 204
           C 8 216, 14 224, 28 230
           L 0 230
           L 0 0
           Z"
        fill="var(--shelf-wood-solid)"
      />
      <path
        d="M28 0 C 14 6, 8 14, 8 26 L 8 204 C 8 216, 14 224, 28 230"
        fill="none"
        stroke="var(--hairline-strong)"
        stroke-width="1"
      />
    </svg>
  </span>

  <div class="bay-content">
    <slot />
  </div>

  <span class="corbel corbel-right" aria-hidden="true">
    <svg width="28" height="100%" viewBox="0 0 28 230" preserveAspectRatio="none" role="presentation">
      <path
        d="M0 0
           C 14 6, 20 14, 20 26
           L 20 204
           C 20 216, 14 224, 0 230
           L 28 230
           L 28 0
           Z"
        fill="var(--shelf-wood-solid)"
      />
      <path
        d="M0 0 C 14 6, 20 14, 20 26 L 20 204 C 20 216, 14 224, 0 230"
        fill="none"
        stroke="var(--hairline-strong)"
        stroke-width="1"
      />
    </svg>
  </span>
</div>

<style>
  .shelf-bay {
    --shelf-pitch: 230px;
    /* Ledge lands at the bottom of each 198px-tall row of spines: the rail
       (+ molding) is anchored to the row baseline and repeats every pitch. */
    position: relative;
    width: min(var(--maxw-shelf-wide), 100vw);
    margin-inline: calc(50% - min(var(--maxw-shelf-wide), 100vw) / 2);
    padding-inline: clamp(var(--s-5), 4vw, var(--s-8));
    padding-block: var(--s-6);
    overflow-x: clip;
    isolation: isolate;

    background-color: var(--surface-sunken);
    background-image:
      /* Layer 1: carved wooden rail — lit top lip + soft cast shadow,
         stretched full width, repeating down the bay at the row pitch. */
      linear-gradient(
        180deg,
        var(--surface) 0%,
        var(--surface) 40%,
        var(--hairline-strong) 46%,
        var(--hairline-strong) 92%,
        var(--hairline) 100%
      ),
      /* Layer 2: dentil/bead molding on the rail front, fixed tile size so it
         reads as carved beads rather than a stretched smear. */
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='12' viewBox='0 0 18 12'%3E%3Crect x='1' y='2' width='7' height='8' rx='1.5' fill='none' stroke='black' stroke-opacity='0.16' stroke-width='1'/%3E%3Ccircle cx='13.5' cy='6' r='2.6' fill='none' stroke='black' stroke-opacity='0.16' stroke-width='1'/%3E%3C/svg%3E");
    background-repeat: repeat-y, repeat-x;
    background-size: 100% var(--shelf-pitch), 18px 12px;
    background-position:
      0 calc(198px + var(--s-6) - 12px),
      0 calc(198px + var(--s-6) - 12px);
  }

  /* Back panel: a very low-contrast sunken recess behind the whole bay,
     beneath the ledge layers so it reads as depth, not a stripe. */
  .shelf-bay::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -2;
    background: var(--surface-sunken);
  }

  /* Subtle film grain for wood-back atmosphere (idiom from LandingHero.svelte),
     theme-agnostic and very low opacity so it never fights book covers. */
  .grain {
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    opacity: 0.12;
    mix-blend-mode: soft-light;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }

  .bay-content {
    position: relative;
    z-index: 1;
  }

  /* End corbels: ornate S-curve bookcase side supports, spanning the bay
     height, sitting inside the padding so the carved ends show past the
     content. Fixed width; height stretches to match content via the SVG's
     preserveAspectRatio="none". */
  .corbel {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 28px;
    z-index: 2;
    pointer-events: none;
  }

  .corbel-left {
    left: 0;
  }

  .corbel-right {
    right: 0;
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
      width: 16px;
    }
  }
</style>
