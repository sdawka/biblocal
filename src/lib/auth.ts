import type { AstroGlobal } from 'astro';

type Locals = AstroGlobal['locals'] & {
  qaUserId?: string;
  auth?: () => { userId: string | null };
};

export function getUserId(locals: Locals): string | null {
  // QA mode: use injected QA user ID
  if (locals.qaUserId) {
    return locals.qaUserId;
  }

  // Normal mode: use Clerk auth
  if (locals.auth) {
    return locals.auth().userId;
  }

  return null;
}

/**
 * Allowlist guard for the QA auth bypass. Fails closed: the bypass is permitted
 * ONLY in the dedicated QA environment (or local dev). Any other ENVIRONMENT
 * value — including 'production', missing, or unknown — returns false.
 */
export function qaBypassAllowed(env: { ENVIRONMENT?: string } | undefined): boolean {
  // Local dev (astro dev / vitest) is always allowed.
  if (import.meta.env.DEV) {
    return true;
  }
  return env?.ENVIRONMENT === 'qa';
}
