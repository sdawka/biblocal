import { eq } from 'drizzle-orm';
import type { Database } from './client';
import { users } from './schema';

export async function getOrCreateUser(db: Database, userId: string) {
  const existing = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (existing.length > 0) return existing[0];

  const now = new Date();
  await db.insert(users).values({
    id: userId,
    email: `${userId}@clerk.user`,
    createdAt: now,
    updatedAt: now,
  });
  const created = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return created[0];
}
