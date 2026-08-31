import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';
import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';
import { qaBypassAllowed } from './lib/auth';
import { getLangFromUrl, localizePath } from './i18n';

const isPublicRoute = createRouteMatcher([
  '/',
  '/about',
  '/how-it-works',
  '/blog',
  '/blog/(.*)',
  // French (/fr) variants of the public marketing surface.
  '/fr',
  '/fr/about',
  '/fr/how-it-works',
  '/fr/blog',
  '/fr/blog/(.*)',
  // Spanish UI routes. Blog articles remain editorially available in EN/FR.
  '/es',
  '/es/about',
  '/es/how-it-works',
  '/signed-out',
  '/api/(.*)',
]);

const clerkAuthMiddleware = clerkMiddleware((auth, context) => {
  const { userId } = auth();
  const url = new URL(context.request.url);
  const lang = getLangFromUrl(url);
  const homePath = localizePath('/', lang);
  const isHome = url.pathname === homePath || (homePath !== '/' && url.pathname === `${homePath}/`);

  // Signed-in users on a home page → redirect to the shelf (same locale).
  if (userId && isHome) {
    return context.redirect(localizePath('/biblio', lang));
  }

  // Protected routes: require auth, bouncing to the same-locale home.
  if (!isPublicRoute(context.request) && !userId) {
    return context.redirect(homePath);
  }
});

export const onRequest = defineMiddleware((context, next) => {
  const isQaMode = (env as { QA_MODE?: string })?.QA_MODE === 'true';

  // Honor the QA bypass only when it is explicitly requested AND the
  // environment is on the allowlist (fail closed in production).
  if (isQaMode && qaBypassAllowed(env as { ENVIRONMENT?: string })) {
    // QA mode: bypass Clerk entirely, inject fake user
    context.locals.qaUserId = (env as { QA_USER_ID?: string })?.QA_USER_ID || 'qa-test-user';
    return next();
  }

  // Normal mode: use Clerk authentication
  return clerkAuthMiddleware(context, next);
});
