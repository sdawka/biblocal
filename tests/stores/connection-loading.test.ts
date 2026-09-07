import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  connectionRequests,
  connectionsError,
  loadConnections,
  loadAuthorizedContact,
  authorizedContacts,
} from '../../src/stores/connections';
import { currentUserId } from '../../src/stores/auth';
import type { ConnectionRequest } from '../../src/lib/types';

const accepted: ConnectionRequest = {
  id: 'accepted-1',
  fromUserId: 'reader-a',
  toUserId: 'reader-b',
  status: 'accepted',
  createdAt: 1,
  respondedAt: 2,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('connection loading', () => {
  let priorUserId: string | null;
  let priorRequests: ConnectionRequest[];
  let priorContacts: ReturnType<typeof authorizedContacts.get>;
  let priorError: ReturnType<typeof connectionsError.get>;

  beforeEach(() => {
    priorUserId = currentUserId.get();
    priorRequests = connectionRequests.get();
    priorContacts = authorizedContacts.get();
    priorError = connectionsError.get();
    currentUserId.set('reader-a');
    connectionRequests.set([]);
    authorizedContacts.set({});
    connectionsError.set(null);
  });

  afterEach(() => {
    currentUserId.set(priorUserId);
    connectionRequests.set(priorRequests);
    authorizedContacts.set(priorContacts);
    connectionsError.set(priorError);
  });

  it('retries a failed relationship load before publishing its session data', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ connections: [accepted] }),
      } as Response);

    const loaded = await loadConnections({ retries: 1 });

    expect(loaded).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(connectionRequests.get()).toEqual([accepted]);
  });

  it('never publishes an old session relationship response after the viewer changes', async () => {
    const response = deferred<Response>();
    vi.mocked(fetch).mockReturnValueOnce(response.promise);

    const loading = loadConnections();
    currentUserId.set('reader-c');
    response.resolve({
      ok: true,
      json: async () => ({ connections: [accepted] }),
    } as Response);

    await expect(loading).resolves.toBe(false);
    expect(connectionRequests.get()).toEqual([]);
  });

  it('retries an authorized contact request after a transient failure', async () => {
    connectionRequests.set([accepted]);
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'offline' }) } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          profile: { contactMethod: 'email', contactValue: 'reader-b@example.test' },
        }),
      } as Response);

    await expect(loadAuthorizedContact('reader-b')).resolves.toMatchObject({ success: false });
    await expect(loadAuthorizedContact('reader-b')).resolves.toMatchObject({
      success: true,
      contact: { method: 'email', value: 'reader-b@example.test' },
    });
    expect(authorizedContacts.get()).toEqual({
      'reader-b': { method: 'email', value: 'reader-b@example.test' },
    });
  });

  it('does not retain an authorized contact resolved after the viewer changes', async () => {
    connectionRequests.set([accepted]);
    const response = deferred<Response>();
    vi.mocked(fetch).mockReturnValueOnce(response.promise);

    const loading = loadAuthorizedContact('reader-b');
    currentUserId.set('reader-c');
    response.resolve({
      ok: true,
      json: async () => ({
        profile: { contactMethod: 'email', contactValue: 'reader-b@example.test' },
      }),
    } as Response);

    await expect(loading).resolves.toMatchObject({ success: false });
    expect(authorizedContacts.get()).toEqual({});
  });

  it('rejects a contact response from an earlier A-to-B-to-A session', async () => {
    connectionRequests.set([accepted]);
    const response = deferred<Response>();
    vi.mocked(fetch).mockReturnValueOnce(response.promise);

    const loading = loadAuthorizedContact('reader-b');
    currentUserId.set('reader-c');
    currentUserId.set('reader-a');
    connectionRequests.set([accepted]);
    response.resolve({
      ok: true,
      json: async () => ({
        profile: { contactMethod: 'email', contactValue: 'reader-b@example.test' },
      }),
    } as Response);

    await expect(loading).resolves.toMatchObject({ success: false });
    expect(authorizedContacts.get()).toEqual({});
  });

  it('prunes cached contact after a retried relationship refresh reports revocation', async () => {
    connectionRequests.set([accepted]);
    authorizedContacts.set({
      'reader-b': { method: 'email', value: 'reader-b@example.test' },
    });
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'offline' }) } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ connections: [{ ...accepted, status: 'declined' }] }),
      } as Response);

    await expect(loadConnections({ retries: 1 })).resolves.toBe(true);
    expect(connectionRequests.get()[0].status).toBe('declined');
    expect(authorizedContacts.get()).toEqual({});
  });

  it('exposes a retryable error only after connection retries are exhausted', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'offline' }) } as Response)
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'offline' }) } as Response);

    await expect(loadConnections({ retries: 1 })).resolves.toBe(false);
    expect(connectionsError.get()).toBe('Could not load connections');
  });
});
