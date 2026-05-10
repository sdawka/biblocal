import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/api/(.*)',
]);

export const onRequest = clerkMiddleware((auth, context) => {
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
