import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import AddStoreIsland from '../../src/components/AddStoreIsland.svelte';
import StoreDetailIsland from '../../src/components/StoreDetailIsland.svelte';
import { useTranslations } from '../../src/i18n';

const store = {
  id: 'store-corner',
  name: 'The Corner Books',
  neighborhood: 'Mile End',
  address: '123 Saint-Laurent Blvd',
  specialties: [],
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function storeResponse(canEdit = false) {
  return response({ store, books: [], canEdit });
}

describe('store journey audit', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
  });

  it('offers a localized details link while retaining the add-another action', async () => {
    const t = useTranslations('fr');
    vi.mocked(fetch).mockResolvedValueOnce(response({ id: 'store-fr-123' }, 201));

    render(AddStoreIsland, { props: { lang: 'fr' } });
    await fireEvent.input(screen.getByLabelText(t.stores.form.nameLabel), {
      target: { value: 'Librairie du coin' },
    });
    await fireEvent.change(screen.getByLabelText(t.stores.form.neighborhoodLabel), {
      target: { value: 'Mile End' },
    });
    await fireEvent.input(screen.getByLabelText(t.stores.form.addressLabel), {
      target: { value: '123 boulevard Saint-Laurent' },
    });
    await fireEvent.click(screen.getByRole('button', { name: t.stores.form.submit }));

    const viewStore = await screen.findByRole('link', { name: t.matches.card.viewStoreDetails });
    expect(viewStore.getAttribute('href')).toBe('/fr/store/store-fr-123');
    expect(screen.getByRole('button', { name: t.stores.form.addAnother })).toBeTruthy();
  });

  it('returns a missing store to the localized bookstore directory', async () => {
    const t = useTranslations('fr');
    expect(t.stores.detail.notFound).toBeTruthy();
    vi.mocked(fetch).mockResolvedValueOnce(response({ error: 'Store not found' }, 404));

    render(StoreDetailIsland, { props: { storeId: 'missing-store', lang: 'fr' } });

    expect(await screen.findByText(t.stores.detail.notFound)).toBeTruthy();
    const directory = screen.getByRole('link', { name: t.stores.index.title });
    expect(directory.getAttribute('href')).toBe('/fr/stores');
    expect(screen.queryByRole('button', { name: t.stores.detail.retry })).toBeNull();
  });

  it('offers retry after a network error and loads the store on retry', async () => {
    const t = useTranslations('en');
    expect(t.stores.detail.retry).toBeTruthy();
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(storeResponse());

    render(StoreDetailIsland, { props: { storeId: store.id, lang: 'en' } });

    const retry = await screen.findByRole('button', { name: t.stores.detail.retry });
    await fireEvent.click(retry);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: store.name })).toBeTruthy();
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('keeps a failed add-book draft in place and allows retrying it', async () => {
    const t = useTranslations('en');
    vi.mocked(fetch)
      .mockResolvedValueOnce(storeResponse(true))
      .mockResolvedValueOnce(response({ error: 'temporary failure' }, 500))
      .mockResolvedValueOnce(response({
        book: {
          id: 'book-retried',
          title: 'A Book To Keep',
          author: 'A Reader',
          visibility: 'visible',
          ownership: 'have',
          intents: [],
        },
      }, 201));

    render(StoreDetailIsland, { props: { storeId: store.id, lang: 'en' } });
    await screen.findByRole('heading', { name: store.name });
    await fireEvent.click(screen.getByRole('button', { name: t.stores.detail.addBook }));

    const title = screen.getByLabelText(t.stores.detail.bookTitlePlaceholder) as HTMLInputElement;
    const author = screen.getByLabelText(t.stores.detail.authorPlaceholder) as HTMLInputElement;
    const isbn = screen.getByLabelText(t.stores.detail.isbnPlaceholder) as HTMLInputElement;
    await fireEvent.input(title, { target: { value: 'A Book To Keep' } });
    await fireEvent.input(author, { target: { value: 'A Reader' } });
    await fireEvent.input(isbn, { target: { value: '9780000000001' } });

    await fireEvent.click(screen.getByRole('button', { name: t.stores.detail.addToShelf }));
    await screen.findByRole('alert');
    expect(title.value).toBe('A Book To Keep');
    expect(author.value).toBe('A Reader');
    expect(isbn.value).toBe('9780000000001');

    await fireEvent.click(screen.getByRole('button', { name: t.stores.detail.addToShelf }));
    await waitFor(() => {
      expect(screen.queryByLabelText(t.stores.detail.bookTitlePlaceholder)).toBeNull();
      expect(screen.getByText('A Book To Keep')).toBeTruthy();
    });
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
