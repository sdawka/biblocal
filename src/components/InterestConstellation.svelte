<script lang="ts">
  import { localizeTopicLabel, useTranslations, type Lang } from '../i18n';

  interface Props {
    curated?: string[];
    freeform?: string[];
    inferred?: string[];
    lang?: Lang;
  }

  let { curated = [], freeform = [], inferred = [], lang = 'en' as Lang }: Props = $props();
  const t = $derived(useTranslations(lang).profile.constellation);

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
      ...curated.map(t => ({ label: localizeTopicLabel(t, lang), type: 'curated' as const })),
      ...freeform.map(t => ({ label: t, type: 'freeform' as const })),
      ...inferred.map(t => ({ label: localizeTopicLabel(t, lang), type: 'inferred' as const })),
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
    <svg viewBox="0 0 100 100" class="constellation" role="img" aria-label={t.ariaLabel}>
      <defs>
        <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.8" />
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0" />
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
          aria-hidden="true"
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
            {star.label}
          </text>
        </g>
      {/each}
    </svg>

    <div class="legend">
      <span class="legend-item curated"><span class="dot"></span> {t.legendSelected}</span>
      <span class="legend-item freeform"><span class="dot"></span> {t.legendCustom}</span>
      <span class="legend-item inferred"><span class="dot"></span> {t.legendFromBooks}</span>
    </div>
  </div>
{:else}
  <div class="empty-constellation">
    <p>{t.empty}</p>
  </div>
{/if}

<style>
  .constellation-container {
    background:
      radial-gradient(ellipse at 30% 20%, oklch(0.30 0.07 55) 0%, transparent 55%),
      oklch(0.18 0.03 58);
    border-radius: var(--r-lg);
    padding: var(--s-4);
    position: relative;
    overflow: hidden;
    border: 1px solid var(--hairline);
  }

  .constellation-container::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: radial-gradient(
      1px 1px at 20% 30%,
      oklch(1 0 0 / 0.18) 0%,
      transparent 100%
    ),
    radial-gradient(
      1px 1px at 70% 60%,
      oklch(1 0 0 / 0.12) 0%,
      transparent 100%
    ),
    radial-gradient(
      1px 1px at 40% 80%,
      oklch(1 0 0 / 0.14) 0%,
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
    stroke: var(--accent);
    stroke-width: 0.3;
    opacity: calc(0.18 + var(--strength) * 0.28);
  }

  .star-group {
    opacity: 0;
    animation: starAppear 0.6s var(--ease-out) forwards;
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
    opacity: 0.45;
  }

  .star {
    transition: r 0.2s ease;
  }

  .star.curated {
    fill: oklch(0.80 0.13 74);
  }

  .star.freeform {
    fill: oklch(0.74 0.09 48);
  }

  .star.inferred {
    fill: oklch(0.96 0.006 85);
    opacity: 0.7;
  }

  .star-group:hover .star {
    r: 5;
  }

  .star-label {
    font-family: var(--font-ui);
    font-size: 2.5px;
    text-anchor: middle;
    fill: oklch(0.96 0.006 85);
    opacity: 0.8;
    text-transform: capitalize;
    pointer-events: none;
  }

  .star-label.curated {
    fill: oklch(0.84 0.10 74);
    font-weight: 500;
  }

  .star-label.inferred {
    opacity: 0.6;
  }

  .legend {
    display: flex;
    justify-content: center;
    gap: var(--s-4);
    margin-top: var(--s-3);
    padding-top: var(--s-3);
    border-top: 1px solid oklch(1 0 0 / 0.12);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-family: var(--font-ui);
    font-size: 0.7rem;
    color: oklch(0.96 0.006 85);
    opacity: 0.75;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: var(--r-full);
  }

  .legend-item.curated .dot {
    background: oklch(0.80 0.13 74);
  }

  .legend-item.freeform .dot {
    background: oklch(0.74 0.09 48);
  }

  .legend-item.inferred .dot {
    background: oklch(0.96 0.006 85);
    opacity: 0.7;
  }

  .empty-constellation {
    background: var(--surface-sunken);
    border: 1px solid var(--hairline);
    border-radius: var(--r-lg);
    padding: var(--s-7);
    text-align: center;
  }

  .empty-constellation p {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 0.95rem;
    color: var(--ink-faint);
    margin: 0;
  }
</style>
