import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';
import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';
import { qaBypassAllowed } from './lib/auth';

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
  '/api/(.*)',
]);

const clerkAuthMiddleware = clerkMiddleware((auth, context) => {
  const { userId } = auth();
  const url = new URL(context.request.url);
  const isFr = url.pathname === '/fr' || url.pathname.startsWith('/fr/');
  const homePath = isFr ? '/fr' : '/';

  // Signed-in users on a home page → redirect to the shelf (same locale).
  if (userId && (url.pathname === '/' || url.pathname === '/fr')) {
    return context.redirect(isFr ? '/fr/biblio' : '/biblio');
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
