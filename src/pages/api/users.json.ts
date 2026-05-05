import type { APIRoute } from 'astro';
import seedUsers from '../../data/seed-users.json';

export const GET: APIRoute = () => {
  return new Response(JSON.stringify(seedUsers), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
