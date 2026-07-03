import type { APIRoute } from 'astro';

export const prerender = false;
import { eq } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { getDb } from '../../db/client';
import { users } from '../../db/schema';
import { getUserId } from '../../lib/auth';
import { getOrCreateUser } from '../../db/users';
import {
  validateEnum,
  VALID_CONTACT_VISIBILITY,
  VALID_CONTACT_METHOD,
  VALID_LOCATION_PRECISION,
} from '../../lib/validation';

const MAX_RADIUS_KM = 500;
const MAX_NAME_LEN = 120;
const MAX_CITY_LEN = 120;
const MAX_CONTACT_VALUE_LEN = 200;
const MAX_BORROW_STYLE_LEN = 500;
const MAX_ARRAY_ITEMS = 50;

function badRequest(error: string) {
  return new Response(JSON.stringify({ error }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

type Env = { DB: D1Database };

// GET /api/profile - get own profile (requires auth)
export const GET: APIRoute = async ({ locals }) => {
  try {
    const userId = getUserId(locals);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb((env as Env).DB);
    const user = await getOrCreateUser(db, userId);

    return new Response(JSON.stringify({ profile: user }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Get profile error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// PATCH /api/profile - update own profile (requires auth)
export const PATCH: APIRoute = async ({ request, locals }) => {
  try {
    const userId = getUserId(locals);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb((env as Env).DB);
    await getOrCreateUser(db, userId);

    const updates = (await request.json()) as Record<string, unknown>;

    // Validate enum fields before processing
    if (updates.contactVisibility !== undefined) {
      const valid = validateEnum(updates.contactVisibility, VALID_CONTACT_VISIBILITY);
      if (valid === null) {
        return new Response(
          JSON.stringify({ error: `Invalid contactVisibility value. Must be one of: ${VALID_CONTACT_VISIBILITY.join(', ')}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    if (updates.contactMethod !== undefined) {
      const valid = validateEnum(updates.contactMethod, VALID_CONTACT_METHOD);
      if (valid === null) {
        return badRequest(`Invalid contactMethod value. Must be one of: ${VALID_CONTACT_METHOD.join(', ')}`);
      }
    }
    if (updates.locationPrecision !== undefined) {
      const valid = validateEnum(updates.locationPrecision, VALID_LOCATION_PRECISION);
      if (valid === null) {
        return badRequest(`Invalid locationPrecision value. Must be one of: ${VALID_LOCATION_PRECISION.join(', ')}`);
      }
    }

    // Validate geolocation ranges.
    if (updates.latitude !== undefined && updates.latitude !== null) {
      const lat = updates.latitude;
      if (typeof lat !== 'number' || !Number.isFinite(lat) || lat < -90 || lat > 90) {
        return badRequest('latitude must be a number between -90 and 90');
      }
    }
    if (updates.longitude !== undefined && updates.longitude !== null) {
      const lng = updates.longitude;
      if (typeof lng !== 'number' || !Number.isFinite(lng) || lng < -180 || lng > 180) {
        return badRequest('longitude must be a number between -180 and 180');
      }
    }
    if (updates.radiusKm !== undefined && updates.radiusKm !== null) {
      const r = updates.radiusKm;
      if (typeof r !== 'number' || !Number.isInteger(r) || r <= 0 || r > MAX_RADIUS_KM) {
        return badRequest(`radiusKm must be a positive integer no greater than ${MAX_RADIUS_KM}`);
      }
    }

    // Cap string lengths.
    const stringCaps: Record<string, number> = {
      name: MAX_NAME_LEN,
      city: MAX_CITY_LEN,
      contactValue: MAX_CONTACT_VALUE_LEN,
      borrowStyle: MAX_BORROW_STYLE_LEN,
    };
    for (const [field, max] of Object.entries(stringCaps)) {
      const value = updates[field];
      if (value !== undefined && value !== null) {
        if (typeof value !== 'string') {
          return badRequest(`${field} must be a string`);
        }
        if (value.length > max) {
          return badRequest(`${field} must be at most ${max} characters`);
        }
      }
    }

    // Cap array sizes (covers both the legacy `topics` key and the persisted
    // topicsCurated/topicsFreeform fields).
    for (const field of ['currentObsessions', 'topics', 'topicsCurated', 'topicsFreeform']) {
      const value = updates[field];
      if (value !== undefined && value !== null) {
        if (!Array.isArray(value)) {
          return badRequest(`${field} must be an array`);
        }
        if (value.length > MAX_ARRAY_ITEMS) {
          return badRequest(`${field} must have at most ${MAX_ARRAY_ITEMS} items`);
        }
      }
    }

    const allowedFields = [
      'name',
      'city',
      'radiusKm',
      'borrowStyle',
      'currentObsessions',
      'topicsCurated',
      'topicsFreeform',
      // Geolocation
      'latitude',
      'longitude',
      'locationPrecision',
      // Contact
      'contactMethod',
      'contactValue',
      'contactVisibility',
    ];

    const filtered: Record<string, unknown> = { updatedAt: new Date() };

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (Array.isArray(updates[field])) {
          filtered[field] = JSON.stringify(updates[field]);
        } else {
          filtered[field] = updates[field];
        }
      }
    }

    await db.update(users).set(filtered).where(eq(users.id, userId));

    const updated = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    return new Response(JSON.stringify({ profile: updated[0] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Update profile error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
