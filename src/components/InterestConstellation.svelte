<script lang="ts">
  interface Props {
    curated?: string[];
    freeform?: string[];
    inferred?: string[];
  }

  let { curated = [], freeform = [], inferred = [] }: Props = $props();

  interface Star {
    id: string;
    label: string;
    type: 'curated' | 'freeform' | 'inferred';
    x: number;
    y: number;
    size: number;
    delay: number;
  }

  interface Connection {
    from: Star;
    to: Star;
    strength: number;
  }

  function generateConstellation(
    curated: string[],
    freeform: string[],
    inferred: string[]
  ): { stars: Star[]; connections: Connection[] } {
    const stars: Star[] = [];
    const width = 100;
    const height = 100;
    const padding = 12;
    const usableWidth = width - padding * 2;
    const usableHeight = height - padding * 2;

    let index = 0;
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed * 9999) * 10000;
      return x - Math.floor(x);
    };

    const allTopics = [
      ...curated.map(t => ({ label: t, type: 'curated' as const })),
      ...freeform.map(t => ({ label: t, type: 'freeform' as const })),
      ...inferred.map(t => ({ label: t, type: 'inferred' as const })),
    ];

    // Distribute in a spiral pattern from center
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(usableWidth, usableHeight) / 2 - 5;

    allTopics.forEach((topic, i) => {
      const angle = i * 2.4; // Golden angle approximation
      const radiusFactor = 0.3 + (i / allTopics.length) * 0.7;
      const radius = maxRadius * radiusFactor;
      const jitterX = (seededRandom(i * 7) - 0.5) * 8;
      const jitterY = (seededRandom(i * 13) - 0.5) * 8;

      stars.push({
        id: `star-${i}`,
        label: topic.label,
        type: topic.type,
        x: centerX + Math.cos(angle) * radius + jitterX,
        y: centerY + Math.sin(angle) * radius + jitterY,
        size: topic.type === 'curated' ? 4 : topic.type === 'freeform' ? 3.5 : 2.5,
        delay: i * 0.1,
      });
    });

    // Create connections between nearby stars
    const connections: Connection[] = [];
    for (let i = 0; i < stars.length; i++) {
      for (let j = i + 1; j < stars.length; j++) {
        const dx = stars[i].x - stars[j].x;
        const dy = stars[i].y - stars[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Connect if close enough, prefer connecting different types
        const threshold = stars[i].type !== stars[j].type ? 35 : 25;
        if (dist < threshold && connections.length < allTopics.length * 1.5) {
          connections.push({
            from: stars[i],
            to: stars[j],
            strength: 1 - dist / threshold,
          });
        }
      }
    }

    return { stars, connections };
  }

  let constellation = $derived(generateConstellation(curated, freeform, inferred));
  let hasTopics = $derived(curated.length + freeform.length + inferred.length > 0);
</script>

{#if hasTopics}
  <div class="constellation-container">
    <svg viewBox="0 0 100 100" class="constellation">
      <defs>
        <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="var(--color-gold)" stop-opacity="0.8" />
          <stop offset="100%" stop-color="var(--color-gold)" stop-opacity="0" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="0.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <!-- Connection lines -->
      {#each constellation.connections as conn}
        <line
          x1={conn.from.x}
          y1={conn.from.y}
          x2={conn.to.x}
          y2={conn.to.y}
          class="connection"
          style="--strength: {conn.strength}"
        />
      {/each}

      <!-- Stars -->
      {#each constellation.stars as star}
        <g class="star-group" style="--delay: {star.delay}s">
          <circle
            cx={star.x}
            cy={star.y}
            r={star.size * 1.5}
            class="star-glow"
          />
          <circle
            cx={star.x}
            cy={star.y}
            r={star.size}
            class="star {star.type}"
            filter="url(#glow)"
          />
          <text
            x={star.x}
            y={star.y + star.size + 4}
            class="star-label {star.type}"
          >
            {star.label.replace('-', ' ')}
          </text>
        </g>
      {/each}
    </svg>

    <div class="legend">
      <span class="legend-item curated"><span class="dot"></span> Selected</span>
      <span class="legend-item freeform"><span class="dot"></span> Custom</span>
      <span class="legend-item inferred"><span class="dot"></span> From books</span>
    </div>
  </div>
{:else}
  <div class="empty-constellation">
    <p>Add interests to see your constellation</p>
  </div>
{/if}

<style>
  .constellation-container {
    background: linear-gradient(
      135deg,
      var(--color-ink) 0%,
      #1a1612 50%,
      var(--color-mahogany-deep) 100%
    );
    border-radius: var(--radius-md);
    padding: var(--space-md);
    position: relative;
    overflow: hidden;
  }

  .constellation-container::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: radial-gradient(
      1px 1px at 20% 30%,
      rgba(255, 255, 255, 0.15) 0%,
      transparent 100%
    ),
    radial-gradient(
      1px 1px at 70% 60%,
      rgba(255, 255, 255, 0.1) 0%,
      transparent 100%
    ),
    radial-gradient(
      1px 1px at 40% 80%,
      rgba(255, 255, 255, 0.12) 0%,
      transparent 100%
    );
    pointer-events: none;
  }

  .constellation {
    width: 100%;
    height: auto;
    aspect-ratio: 1;
    max-height: 280px;
  }

  .connection {
    stroke: var(--color-gold-pale);
    stroke-width: 0.3;
    opacity: calc(0.15 + var(--strength) * 0.25);
  }

  .star-group {
    opacity: 0;
    animation: starAppear 0.6s ease forwards;
    animation-delay: var(--delay);
  }

  @keyframes starAppear {
    from {
      opacity: 0;
      transform: scale(0.5);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .star-glow {
    fill: url(#starGlow);
    opacity: 0.4;
  }

  .star {
    transition: r 0.2s ease;
  }

  .star.curated {
    fill: var(--color-gold);
  }

  .star.freeform {
    fill: var(--color-burgundy-light, #c77d7d);
  }

  .star.inferred {
    fill: var(--color-cream);
    opacity: 0.7;
  }

  .star-group:hover .star {
    r: 5;
  }

  .star-label {
    font-family: var(--font-body);
    font-size: 2.5px;
    text-anchor: middle;
    fill: var(--color-cream);
    opacity: 0.8;
    text-transform: capitalize;
    pointer-events: none;
  }

  .star-label.curated {
    fill: var(--color-gold-pale);
    font-weight: 500;
  }

  .star-label.inferred {
    opacity: 0.6;
  }

  .legend {
    display: flex;
    justify-content: center;
    gap: var(--space-md);
    margin-top: var(--space-sm);
    padding-top: var(--space-sm);
    border-top: 1px solid rgba(184, 134, 11, 0.2);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-family: var(--font-body);
    font-size: 0.7rem;
    color: var(--color-cream);
    opacity: 0.7;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .legend-item.curated .dot {
    background: var(--color-gold);
  }

  .legend-item.freeform .dot {
    background: var(--color-burgundy-light, #c77d7d);
  }

  .legend-item.inferred .dot {
    background: var(--color-cream);
    opacity: 0.7;
  }

  .empty-constellation {
    background: var(--color-aged-paper);
    border-radius: var(--radius-md);
    padding: var(--space-xl);
    text-align: center;
  }

  .empty-constellation p {
    font-family: var(--font-body);
    font-size: 0.9rem;
    color: var(--color-ink-light);
    font-style: italic;
    margin: 0;
  }
</style>
