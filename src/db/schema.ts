import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  city: text('city'),
  radiusKm: integer('radius_km').default(5),
  borrowStyle: text('borrow_style'),
  currentObsessions: text('current_obsessions'), // JSON array
  topicsCurated: text('topics_curated'), // JSON array
  topicsFreeform: text('topics_freeform'), // JSON array
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  // Entity type: 'person' (default) or 'bookstore'
  type: text('type').default('person'),
  // Store-specific fields (nullable, only used when type='bookstore')
  address: text('address'),
  neighborhood: text('neighborhood'),
  website: text('website'),
  phone: text('phone'),
  specialties: text('specialties'), // JSON array
  addedBy: text('added_by'),
  // Geolocation
  latitude: real('latitude'),
  longitude: real('longitude'),
  locationPrecision: text('location_precision').default('city'),
  // Contact/connection
  contactMethod: text('contact_method'),
  contactValue: text('contact_value'),
  contactVisibility: text('contact_visibility').default('hidden'),
});

export const authCodes = sqliteTable('auth_codes', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  code: text('code').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  usedAt: integer('used_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const books = sqliteTable('books', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  author: text('author').notNull(),
  isbn: text('isbn'),
  coverUrl: text('cover_url'),
  // Original externally-fetched cover (OpenLibrary); lets a custom uploaded
  // cover be reset without re-querying the lookup service.
  fetchedCoverUrl: text('fetched_cover_url'),
  // Legacy status column - kept for migration period
  status: text('status').notNull().default('visible'),
  // New three-dimension model
  visibility: text('visibility').notNull().default('visible'),
  ownership: text('ownership').notNull().default('have'),
  intents: text('intents').notNull().default('[]'), // JSON array
  addedVia: text('added_via').default('manual'),
  subjects: text('subjects'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const bookNotes = sqliteTable('book_notes', {
  id: text('id').primaryKey(),
  bookId: text('book_id').notNull().references(() => books.id),
  userId: text('user_id').notNull().references(() => users.id),
  text: text('text').notNull(),
  // Per-note privacy, mirroring book visibility ('private' | 'visible')
  visibility: text('visibility').notNull().default('private'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const connectionRequests = sqliteTable('connection_requests', {
  id: text('id').primaryKey(),
  fromUserId: text('from_user_id').notNull().references(() => users.id),
  toUserId: text('to_user_id').notNull().references(() => users.id),
  status: text('status').notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  respondedAt: integer('responded_at', { mode: 'timestamp' }),
}, (t) => ({
  // One request per ordered (from, to) pair — prevents duplicate rows from
  // concurrent check-then-insert races. Matches migration 0007.
  pairUnique: uniqueIndex('connection_requests_pair_unique').on(t.fromUserId, t.toUserId),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type AuthCode = typeof authCodes.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;
export type BookNote = typeof bookNotes.$inferSelect;
export type NewBookNote = typeof bookNotes.$inferInsert;
export type ConnectionRequest = typeof connectionRequests.$inferSelect;
export type NewConnectionRequest = typeof connectionRequests.$inferInsert;
