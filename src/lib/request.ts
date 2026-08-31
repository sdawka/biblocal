/**
 * Request-body parsing helpers for API endpoints.
 */

export type JsonBodyResult =
  | { ok: true; body: unknown }
  | { ok: false; response: Response };

/**
 * Parse a JSON request body without letting a client error become a 500.
 * Malformed JSON — or a body that isn't a JSON object — yields a ready-to-send
 * 400 response instead of throwing.
 */
export async function readJsonBody(request: Request): Promise<JsonBodyResult> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, response: invalidJsonResponse() };
  }
  if (body === null || typeof body !== 'object') {
    return { ok: false, response: invalidJsonResponse() };
  }
  return { ok: true, body };
}

function invalidJsonResponse(): Response {
  return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}
