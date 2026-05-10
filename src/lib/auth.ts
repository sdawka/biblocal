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
