// @vitest-environment node
import { describe, it, expect } from 'vitest';
import config from '../../astro.config.mjs';

describe('route redirects', () => {
  it('redirects legacy shelf/matches paths to new routes', () => {
    const r = (config as any).redirects ?? {};
    expect(r['/shelf']).toBe('/biblio');
    expect(r['/matches']).toBe('/local');
    expect(r['/fr/shelf']).toBe('/fr/biblio');
    expect(r['/fr/matches']).toBe('/fr/local');
  });
});
