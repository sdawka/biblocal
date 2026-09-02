/**
 * Component test for LocalDiscovery: now a thin host that renders
 * MatchMapIsland (the map-anchored hub) directly — the old Books/People/Map
 * tab switcher and standalone book feed have been retired.
 *
 * MatchMapIsland can't mount under jsdom — Leaflet throws ("Map has no
 * maxZoom specified") because jsdom has no real layout/canvas — so we don't
 * render LocalDiscovery here. The panel behavior it delegates to is already
 * covered by tests/components/MatchMapIsland.test.ts (the extracted
 * LocalPanel). This just asserts the module loads and exports a component,
 * which is what LocalPage.astro depends on.
 */

import { describe, it, expect } from 'vitest';
import LocalDiscovery from '../../src/components/LocalDiscovery.svelte';

describe('LocalDiscovery', () => {
  it('imports cleanly and exports a Svelte component', () => {
    expect(LocalDiscovery).toBeTruthy();
    expect(['function', 'object']).toContain(typeof LocalDiscovery);
  });
});
