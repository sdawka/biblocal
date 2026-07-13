/**
 * Smoke tests for Shelf.svelte: the independent, book-agnostic ornate shelf
 * furniture used by the Covers view. It should render its bay wrapper and
 * furniture regardless of what (if anything) is slotted into it.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Shelf from '../../src/components/Shelf.svelte';
import ShelfWithChild from './fixtures/ShelfWithChild.svelte';

describe('Shelf', () => {
  it('renders the bay wrapper and furniture with zero slotted content', () => {
    const { container } = render(Shelf);

    expect(container.querySelector('.shelf-bay')).toBeTruthy();
    expect(container.querySelector('.bay-content')).toBeTruthy();
    expect(container.querySelectorAll('.corbel')).toHaveLength(2);
  });

  it('marks furniture aria-hidden so it is invisible to assistive tech', () => {
    const { container } = render(Shelf);

    const grain = container.querySelector('.grain');
    const corbels = container.querySelectorAll('.corbel');
    expect(grain?.getAttribute('aria-hidden')).toBe('true');
    corbels.forEach((corbel) => {
      expect(corbel.getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('renders slotted children inside the bay content', () => {
    const { getByTestId, container } = render(ShelfWithChild);

    expect(container.querySelector('.bay-content')).toBeTruthy();
    expect(getByTestId('slotted-child').textContent).toBe('hello');
  });
});
