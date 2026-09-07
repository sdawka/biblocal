import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import ConnectionRequestsIsland from '../../src/components/ConnectionRequestsIsland.svelte';
import { currentUserId } from '../../src/stores/auth';
import { authorizedContacts, connectionRequests } from '../../src/stores/connections';
import type { ConnectionRequest } from '../../src/lib/types';

const acceptedRequest: ConnectionRequest = {
  id: 'accepted-request',
  fromUserId: 'sender',
  toUserId: 'recipient',
  status: 'accepted',
  createdAt: 1,
  respondedAt: 2,
  fromUser: {
    id: 'sender',
    name: 'Sender',
    city: 'Toronto',
    radiusKm: 5,
    topics: { curated: [], freeform: [], inferred: [] },
  },
};

describe('ConnectionRequestsIsland', () => {
  let priorUserId: string | null;
  let priorRequests: ConnectionRequest[];
  let priorContacts: ReturnType<typeof authorizedContacts.get>;

  beforeEach(() => {
    priorUserId = currentUserId.get();
    priorRequests = connectionRequests.get();
    priorContacts = authorizedContacts.get();
    currentUserId.set('recipient');
    connectionRequests.set([acceptedRequest]);
    authorizedContacts.set({});
    vi.mocked(fetch).mockImplementation(async (url: string | URL | Request) => {
      if (String(url) === '/api/connections') {
        return { ok: true, json: async () => ({ connections: [acceptedRequest] }) } as Response;
      }
      if (String(url) === '/api/users/sender') {
        return {
          ok: true,
          json: async () => ({
            profile: { contactMethod: 'email', contactValue: 'sender@example.test' },
          }),
        } as Response;
      }
      throw new Error(`Unexpected request: ${String(url)}`);
    });
  });

  afterEach(() => {
    currentUserId.set(priorUserId);
    connectionRequests.set(priorRequests);
    authorizedContacts.set(priorContacts);
  });

  it('keeps an accepted connection actionable in the existing inbox', async () => {
    render(ConnectionRequestsIsland, { props: { lang: 'en' } });

    await fireEvent.click(screen.getByRole('button', { name: 'View contact' }));
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /sender@example\.test/ }).getAttribute('href')).toBe(
        'mailto:sender@example.test'
      );
    });
  });

  it('offers an inbox retry after relationship loading fails', async () => {
    connectionRequests.set([]);
    vi.mocked(fetch).mockResolvedValue({ ok: false, json: async () => ({ error: 'offline' }) } as Response);
    render(ConnectionRequestsIsland, { props: { lang: 'en' } });

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('Couldn’t load connections. Try again.');
    });
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ connections: [] }) } as Response);
    await fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => {
      expect(screen.queryByRole('alert')).toBeNull();
    });
  });
});
