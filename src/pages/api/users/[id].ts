import type { APIRoute } from 'astro';

export const prerender = false;
import { eq, or, and } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { getDb } from '../../../db/client';
import { users, books, connectionRequests } from '../../../db/schema';
import { getUserId } from '../../../lib/auth';
import { filterContactInfo } from '../../../lib/privacy';

type Env = { DB: D1Database };

// GET /api/users/[id] - get public user profile
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const db = getDb((env as Env).DB);
    const profileId = params.id;

    if (!profileId) {
      return new Response(JSON.stringify({ error: 'User ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userResults = await db
      .select()
      .from(users)
      .where(eq(users.id, profileId))
      .limit(1);

    if (userResults.length === 0) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const profileUser = userResults[0];
    const viewerId = getUserId(locals);
    const isOwnProfile = viewerId === profileId;

    // Check connection status between viewer and profile owner
    let isConnected = false;
    if (viewerId && !isOwnProfile) {
      const connectionResult = await db
        .select()
        .from(connectionRequests)
        .where(
          and(
            eq(connectionRequests.status, 'accepted'),
            or(
              and(
                eq(connectionRequests.fromUserId, viewerId),
                eq(connectionRequests.toUserId, profileId)
              ),
              and(
                eq(connectionRequests.fromUserId, profileId),
                eq(connectionRequests.toUserId, viewerId)
              )
            )
          )
        )
        .limit(1);
      isConnected = connectionResult.length > 0;
    }

    // Get only visible books for public profile
    const userBooks = await db
      .select()
      .from(books)
      .where(
        and(
          eq(books.userId, profileId),
          eq(books.visibility, 'visible')
        )
      );

    // Filter contact info based on privacy settings
    const contactInfo = isOwnProfile
      ? { contactMethod: profileUser.contactMethod, contactValue: profileUser.contactValue, phone: profileUser.phone }
      : filterContactInfo(profileUser, isConnected);

    // Build public profile response
    const publicProfile = {
      id: profileUser.id,
      name: profileUser.name,
      city: profileUser.city,
      type: profileUser.type,
      // Include store-specific fields if it's a bookstore
      ...(profileUser.type === 'bookstore' && {
        neighborhood: profileUser.neighborhood,
        address: profileUser.address,
        website: profileUser.website,
        specialties: profileUser.specialties ? JSON.parse(profileUser.specialties) : [],
      }),
      // Include contact info if allowed
      ...(contactInfo && {
        contactMethod: contactInfo.contactMethod,
        contactValue: contactInfo.contactValue,
        phone: contactInfo.phone,
      }),
      // Include topics for matching
      topicsCurated: profileUser.topicsCurated ? JSON.parse(profileUser.topicsCurated) : [],
      topicsFreeform: profileUser.topicsFreeform ? JSON.parse(profileUser.topicsFreeform) : [],
    };

    return new Response(
      JSON.stringify({
        profile: publicProfile,
        books: userBooks.map((b) => ({
          id: b.id,
          title: b.title,
          author: b.author,
          isbn: b.isbn,
          coverUrl: b.coverUrl,
          visibility: b.visibility,
          ownership: b.ownership,
          intents: b.intents ? JSON.parse(b.intents) : [],
          subjects: b.subjects ? JSON.parse(b.subjects) : [],
        })),
        isOwnProfile,
        isConnected,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (e) {
    console.error('Get user profile error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
