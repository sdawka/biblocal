import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';
import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';

const isPublicRoute = createRouteMatcher([
  '/',
  '/about',
  '/how-it-works',
  '/api/(.*)',
]);

const clerkAuthMiddleware = clerkMiddleware((auth, context) => {
  const { userId } = auth();
  const url = new URL(context.request.url);

  // Signed-in users on home page → redirect to shelf
  if (userId && url.pathname === '/') {
    return context.redirect('/shelf');
  }

  // Protected routes: require auth
  if (!isPublicRoute(context.request) && !userId) {
    return context.redirect('/');
  }
});

export const onRequest = defineMiddleware((context, next) => {
  const isQaMode = (env as { QA_MODE?: string })?.QA_MODE === 'true';

  if (isQaMode) {
    // QA mode: bypass Clerk entirely, inject fake user
    context.locals.qaUserId = (env as { QA_USER_ID?: string })?.QA_USER_ID || 'qa-test-user';
    return next();
  }

  // Normal mode: use Clerk authentication
  return clerkAuthMiddleware(context, next);
});
