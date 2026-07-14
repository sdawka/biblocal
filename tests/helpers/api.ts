/**
 * Minimal harness for invoking real Astro APIRoute handlers in tests.
 *
 * Builds a genuine Request and a locals object, calls the handler, and
 * returns the status + parsed JSON body so tests can assert on both.
 */

import type { APIRoute } from 'astro';

type Locals = {
  qaUserId?: string;
  auth?: () => { userId: string | null };
};

interface CallOptions {
  method?: string;
  url?: string;
  body?: unknown;
  /** Raw body (e.g. FormData or a string); takes precedence over `body`. */
  rawBody?: BodyInit;
  /** Extra request headers, merged after any body-derived defaults. */
  headers?: Record<string, string>;
  locals?: Locals;
  params?: Record<string, string>;
}

interface CallResult {
  status: number;
  json: unknown;
}

export async function callApi(
  handler: APIRoute,
  options: CallOptions = {},
): Promise<CallResult> {
  const {
    method = 'GET',
    url = 'http://localhost/api/test',
    body,
    rawBody,
    headers,
    locals = {},
    params = {},
  } = options;

  const init: RequestInit = { method };
  if (rawBody !== undefined) {
    init.body = rawBody;
  } else if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json' };
  }

  const request = new Request(url, init);
  if (headers) {
    for (const [name, value] of Object.entries(headers)) {
      request.headers.set(name, value);
    }
  }

  const response = await handler({
    request,
    locals: locals as Parameters<APIRoute>[0]['locals'],
    params,
    // The remaining fields are not used by the book handlers; provide stubs.
    redirect: (url: string) => Response.redirect(url),
    rewrite: async () => new Response(),
    cookies: {} as Parameters<APIRoute>[0]['cookies'],
    site: undefined,
    generator: 'astro',
    url: new URL(url),
    clientAddress: '127.0.0.1',
    props: {},
    currentLocale: undefined,
    preferredLocale: undefined,
    preferredLocaleList: undefined,
    routePattern: '',
    isPrerendered: false,
    slots: { has: () => false, render: async () => '' },
  } as unknown as Parameters<APIRoute>[0]);

  const json = await (response as Response).json().catch(() => null);
  return { status: (response as Response).status, json };
}

/** Convenience: authenticated callApi with a qaUserId. */
export function callApiAs(
  userId: string,
  handler: APIRoute,
  options: Omit<CallOptions, 'locals'> = {},
): Promise<CallResult> {
  return callApi(handler, { ...options, locals: { qaUserId: userId } });
}
