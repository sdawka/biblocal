import type { APIRoute } from 'astro';

export const prerender = false;
import { env } from 'cloudflare:workers';

type Env = { DB: D1Database; ENVIRONMENT?: string };

import { eq } from 'drizzle-orm';
import { getDb } from '../../db/client';
import { users } from '../../db/schema';
import { qaBypassAllowed } from '../../lib/auth';

const MONTREAL_STORES = [
  {
    id: 'store-argo',
    name: 'Argo Bookshop',
    email: 'store-argo@biblocal.local',
    city: 'Montreal',
    neighborhood: 'Shaughnessy Village',
    address: '1915 Ste-Catherine O, Montreal',
    website: 'https://argobookshop.ca',
    specialties: ['poetry', 'philosophy', 'linguistics', 'Japan', 'marginalized voices'],
  },
  {
    id: 'store-dandq',
    name: 'Librairie Drawn & Quarterly',
    email: 'store-dandq@biblocal.local',
    city: 'Montreal',
    neighborhood: 'Mile End',
    address: '176 Bernard O, Montreal',
    website: 'https://mtl.drawnandquarterly.com',
    specialties: ['graphic novels', 'comics', 'indie lit', 'art books'],
  },
  {
    id: 'store-theword',
    name: 'The Word',
    email: 'store-theword@biblocal.local',
    city: 'Montreal',
    neighborhood: 'McGill Ghetto',
    address: '469 Milton, Montreal',
    website: null,
    specialties: ['used books', 'literature', 'philosophy', 'poetry'],
  },
  {
    id: 'store-sainthenri',
    name: 'Librairie Saint-Henri Books',
    email: 'store-sainthenri@biblocal.local',
    city: 'Montreal',
    neighborhood: 'Saint-Henri',
    address: '3820 Notre-Dame O, Montreal',
    website: 'https://www.sainthenribooks.com',
    specialties: ['diverse voices', 'POC authors', 'queer lit', 'Indigenous authors'],
  },
  {
    id: 'store-pulp',
    name: 'Pulp Books & Café',
    email: 'store-pulp@biblocal.local',
    city: 'Montreal',
    neighborhood: 'Verdun',
    address: '4401 Wellington, Montreal',
    website: 'https://pulpbooks.ca',
    specialties: ['contemporary fiction', 'graphic novels', 'café'],
  },
  {
    id: 'store-swwelch',
    name: 'S.W. Welch',
    email: 'store-swwelch@biblocal.local',
    city: 'Montreal',
    neighborhood: 'Mile End',
    address: '225 St-Viateur O, Montreal',
    website: null,
    specialties: ['used books', 'rare books', 'eclectic'],
  },
];

export const POST: APIRoute = async () => {
  // QA/dev seeding tooling only. Fail closed: outside the QA env (and local dev)
  // this endpoint does not exist, so it can never write the prod users table.
  if (!qaBypassAllowed(env as Env)) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = getDb((env as Env).DB);
    const now = new Date();
    const results: string[] = [];

    for (const store of MONTREAL_STORES) {
      const existing = await db.select().from(users).where(eq(users.id, store.id)).limit(1);

      if (existing.length > 0) {
        results.push(`${store.name}: already exists`);
        continue;
      }

      await db.insert(users).values({
        id: store.id,
        email: store.email,
        name: store.name,
        city: store.city,
        type: 'bookstore',
        neighborhood: store.neighborhood,
        address: store.address,
        website: store.website,
        specialties: JSON.stringify(store.specialties),
        createdAt: now,
        updatedAt: now,
      });

      results.push(`${store.name}: created`);
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Seed error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
