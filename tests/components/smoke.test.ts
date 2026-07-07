import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import AddBookIsland from '../../src/components/AddBookIsland.svelte';

describe('component test harness', () => {
  it('mounts AddBookIsland', () => {
    const { container } = render(AddBookIsland, { props: { lang: 'en' } });
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });
});
