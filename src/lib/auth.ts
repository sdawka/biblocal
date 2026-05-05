import { eq, and, gt } from 'drizzle-orm';
import { getDb, type Database } from '../db/client';
import { users, authCodes, sessions } from '../db/schema';
import type { User, Session } from '../db/schema';

const CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function generateId(): string {
  return crypto.randomUUID();
}

export async function createAuthCode(db: Database, email: string): Promise<string> {
  const code = generateCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CODE_EXPIRY_MS);

  await db.insert(authCodes).values({
    id: generateId(),
    email: email.toLowerCase(),
    code,
    expiresAt,
    createdAt: now,
  });

  return code;
}

export async function verifyAuthCode(
  db: Database,
  email: string,
  code: string
): Promise<boolean> {
  const now = new Date();
  const result = await db
    .select()
    .from(authCodes)
    .where(
      and(
        eq(authCodes.email, email.toLowerCase()),
        eq(authCodes.code, code.toUpperCase()),
        gt(authCodes.expiresAt, now)
      )
    )
    .limit(1);

  if (result.length === 0) return false;

  await db
    .update(authCodes)
    .set({ usedAt: now })
    .where(eq(authCodes.id, result[0].id));

  return true;
}

export async function getOrCreateUser(db: Database, email: string): Promise<User> {
  const normalizedEmail = email.toLowerCase();
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const now = new Date();
  const newUser = {
    id: generateId(),
    email: normalizedEmail,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(users).values(newUser);
  return { ...newUser, name: null, city: null, radiusKm: 5, borrowStyle: null, currentObsessions: null, topicsCurated: null, topicsFreeform: null };
}

export async function createSession(db: Database, userId: string): Promise<Session> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_EXPIRY_MS);
  const session = {
    id: generateId(),
    userId,
    expiresAt,
    createdAt: now,
  };

  await db.insert(sessions).values(session);
  return session;
}

export async function getSession(db: Database, sessionId: string): Promise<Session | null> {
  const now = new Date();
  const result = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, now)))
    .limit(1);

  return result[0] ?? null;
}

export async function getUserFromSession(
  db: Database,
  sessionId: string
): Promise<User | null> {
  const session = await getSession(db, sessionId);
  if (!session) return null;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  return result[0] ?? null;
}

export async function deleteSession(db: Database, sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export const SESSION_COOKIE = 'biblocal_session';

export function setSessionCookie(sessionId: string): string {
  const expires = new Date(Date.now() + SESSION_EXPIRY_MS);
  return `${SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires.toUTCString()}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function getSessionIdFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  return match?.[1] ?? null;
}
