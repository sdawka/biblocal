/**
 * Smoke tests for Shelf.svelte: the independent, book-agnostic ornate shelf
 * furniture used by the Covers view. It renders a single static carved
 * ledge board + two end corbels + a slot for the (separately scrolling)
 * row of books, regardless of what (if anything) is slotted into it.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Shelf from '../../src/components/Shelf.svelte';
import ShelfWithChild from './fixtures/ShelfWithChild.svelte';

describe('Shelf', () => {
  it('renders the bay wrapper, ledge board, and corbels with zero slotted content', () => {
    const { container } = render(Shelf);

    expect(container.querySelector('.shelf-bay')).toBeTruthy();
    expect(container.querySelector('.bay-content')).toBeTruthy();
    expect(container.querySelector('.ledge')).toBeTruthy();
    expect(container.querySelector('.board')).toBeTruthy();
    expect(container.querySelectorAll('.corbel')).toHaveLength(2);
  });

  it('marks the ledge furniture aria-hidden so it is invisible to assistive tech', () => {
    const { container } = render(Shelf);

    const ledge = container.querySelector('.ledge');
    expect(ledge?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders slotted children inside the bay content, above the static ledge', () => {
    const { getByTestId, container } = render(ShelfWithChild);

    expect(container.querySelector('.bay-content')).toBeTruthy();
    expect(getByTestId('slotted-child').textContent).toBe('hello');
    // The ledge is a sibling of bay-content, not nested inside it — it stays
    // static while whatever scrolls inside bay-content moves independently.
    expect(container.querySelector('.bay-content .ledge')).toBeNull();
  });
});
