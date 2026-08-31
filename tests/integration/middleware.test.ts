/**
 * Integration tests for src/middleware.ts.
 *
 * The real onRequest middleware is invoked with mocked framework seams:
 * - `astro:middleware` resolves to tests/mocks/astro-middleware.ts (vitest
 *   alias), whose defineMiddleware is an identity wrapper
 * - `@clerk/astro/server` is mocked so we can control the Clerk userId and
 *   observe whether the Clerk path ran at all
 * - `cloudflare:workers` resolves to tests/mocks/cloudflare-workers.ts (via
 *   the vitest alias); we mutate its `env` to flip QA_MODE per test.
 *
 * Note: qaBypassAllowed() always allows the bypass under vitest because
 * import.meta.env.DEV is true, so QA_MODE alone controls the branch here.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const clerk = vi.hoisted(() => ({
  userId: null as string | null,
  handlerRan: false,
}));

vi.mock('@clerk/astro/server', () => ({
  clerkMiddleware:
    (handler: (auth: () => { userId: string | null }, context: unknown) => Response | undefined) =>
    (context: { request: Request }, next: () => Promise<Response>) => {
      clerk.handlerRan = true;
      const result = handler(() => ({ userId: clerk.userId }), context);
      return result ?? next();
    },
  createRouteMatcher: (patterns: string[]) => {
    const regexes = patterns.map(
      (p) => new RegExp(`^${p.replace(/\(\.\*\)/g, '.*')}$`)
    );
    return (request: Request) => {
      const path = new URL(request.url).pathname;
      return regexes.some((r) => r.test(path));
    };
  },
}));

import { onRequest } from '../../src/middleware';
import { env } from '../mocks/cloudflare-workers';

type TestContext = {
  request: Request;
  locals: Record<string, unknown>;
  redirect: ReturnType<typeof vi.fn>;
};

function makeContext(path: string): TestContext {
  return {
    request: new Request(`http://localhost${path}`),
    locals: {},
    redirect: vi.fn(
      (to: string) => new Response(null, { status: 302, headers: { Location: to } })
    ),
  };
}

const mutableEnv = env as unknown as Record<string, unknown>;

async function run(ctx: TestContext): Promise<{ response: Response; next: ReturnType<typeof vi.fn> }> {
  const next = vi.fn(async () => new Response('downstream'));
  const middleware = onRequest as unknown as (
    context: TestContext,
    next: () => Promise<Response>
  ) => Promise<Response> | Response;
  const response = await middleware(ctx, next);
  return { response, next };
}

beforeEach(() => {
  clerk.userId = null;
  clerk.handlerRan = false;
});

afterEach(() => {
  delete mutableEnv.QA_MODE;
  delete mutableEnv.QA_USER_ID;
});

describe('middleware — QA mode', () => {
  it('injects the default qaUserId and skips Clerk entirely when QA_MODE=true', async () => {
    mutableEnv.QA_MODE = 'true';

    const ctx = makeContext('/biblio');
    const { next } = await run(ctx);

    expect(ctx.locals.qaUserId).toBe('qa-test-user');
    expect(next).toHaveBeenCalledOnce();
    expect(clerk.handlerRan).toBe(false);
    expect(ctx.redirect).not.toHaveBeenCalled();
  });

  it('honors a QA_USER_ID override', async () => {
    mutableEnv.QA_MODE = 'true';
    mutableEnv.QA_USER_ID = 'custom-qa-user';

    const ctx = makeContext('/biblio');
    await run(ctx);

    expect(ctx.locals.qaUserId).toBe('custom-qa-user');
  });

  it('does not bypass Clerk when QA_MODE is any value other than "true"', async () => {
    mutableEnv.QA_MODE = 'TRUE';

    const ctx = makeContext('/about');
    await run(ctx);

    expect(ctx.locals.qaUserId).toBeUndefined();
    expect(clerk.handlerRan).toBe(true);
  });
});

describe('middleware — Clerk path (QA_MODE off)', () => {
  it('lets unauthenticated users through on public routes', async () => {
    const ctx = makeContext('/about');
    const { next } = await run(ctx);

    expect(clerk.handlerRan).toBe(true);
    expect(ctx.locals.qaUserId).toBeUndefined();
    expect(ctx.redirect).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

  it('redirects unauthenticated users off protected routes to home', async () => {
    const ctx = makeContext('/biblio');
    const { next } = await run(ctx);

    expect(ctx.redirect).toHaveBeenCalledWith('/');
    expect(next).not.toHaveBeenCalled();
  });

  it('redirects unauthenticated users on protected French routes to /fr', async () => {
    const ctx = makeContext('/fr/biblio');
    await run(ctx);

    expect(ctx.redirect).toHaveBeenCalledWith('/fr');
  });

  it('redirects signed-in users from the home page to the shelf', async () => {
    clerk.userId = 'clerk-user-123';

    const ctx = makeContext('/');
    const { next } = await run(ctx);

    expect(ctx.redirect).toHaveBeenCalledWith('/biblio');
    expect(next).not.toHaveBeenCalled();
  });

  it('redirects signed-in users from /fr to the French shelf', async () => {
    clerk.userId = 'clerk-user-123';

    const ctx = makeContext('/fr');
    await run(ctx);

    expect(ctx.redirect).toHaveBeenCalledWith('/fr/biblio');
  });

  it('lets signed-in users through on protected routes', async () => {
    clerk.userId = 'clerk-user-123';

    const ctx = makeContext('/biblio');
    const { next } = await run(ctx);

    expect(ctx.redirect).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

  it('treats API routes as public at the middleware layer (handlers do their own auth)', async () => {
    const ctx = makeContext('/api/books');
    const { next } = await run(ctx);

    expect(ctx.redirect).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });
});
