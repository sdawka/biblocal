/**
 * Enum validation utilities for API endpoints.
 * Server-side validation to prevent invalid values from being stored.
 */

export const VALID_VISIBILITY = ['private', 'visible'] as const;
export const VALID_OWNERSHIP = ['have', 'seeking'] as const;
export const VALID_INTENTS = ['borrowable', 'discussable', 'giftable'] as const;
export const VALID_CONTACT_VISIBILITY = ['hidden', 'on-request', 'public'] as const;
export const VALID_STATUS = ['private', 'visible', 'borrowable', 'discussable', 'giftable'] as const;
export const VALID_CONTACT_METHOD = ['email', 'social', 'custom'] as const;
export const VALID_LOCATION_PRECISION = ['exact', 'approximate', 'city'] as const;
export const VALID_ADDED_VIA = ['scan', 'manual', 'goodreads'] as const;

// Store field length caps, shared by POST /api/stores and PATCH /api/stores/[id].
export const MAX_STORE_NAME_LEN = 120;
export const MAX_NEIGHBORHOOD_LEN = 120;
export const MAX_ADDRESS_LEN = 200;
export const MAX_CITY_LEN = 120;
export const MAX_PHONE_LEN = 30;

// Book field length caps, shared by PATCH /api/books/[id] and the import endpoint.
export const MAX_BOOK_TITLE_LEN = 500;
export const MAX_BOOK_AUTHOR_LEN = 300;
export const MAX_BOOK_ISBN_LEN = 32;
export const MAX_COVER_URL_LEN = 2048;
// Same cap as the notes endpoints (src/pages/api/books/[id]/notes/).
export const MAX_NOTE_TEXT_LEN = 5000;

export type Visibility = (typeof VALID_VISIBILITY)[number];
export type Ownership = (typeof VALID_OWNERSHIP)[number];
export type Intent = (typeof VALID_INTENTS)[number];
export type ContactVisibility = (typeof VALID_CONTACT_VISIBILITY)[number];
export type BookStatus = (typeof VALID_STATUS)[number];
export type ContactMethod = (typeof VALID_CONTACT_METHOD)[number];
export type LocationPrecision = (typeof VALID_LOCATION_PRECISION)[number];

/**
 * Validates that a value is one of the allowed enum values.
 * @returns The value cast to the enum type, or null if invalid.
 */
export function validateEnum<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  if (typeof value !== 'string') return null;
  return allowed.includes(value as T) ? (value as T) : null;
}

/**
 * Validates an array of intents.
 * @returns Array of valid intents, filtering out any invalid ones.
 */
export function validateIntents(intents: unknown): Intent[] {
  if (!Array.isArray(intents)) return [];
  return intents.filter((intent) => validateEnum(intent, VALID_INTENTS) !== null) as Intent[];
}

/**
 * Safely parse a JSON-array column value read back from the database.
 * Defense in depth: one malformed row should never 500 a whole endpoint.
 * @returns The parsed array, or [] when the value is null/empty, fails to
 *   parse, or parses to something that isn't an array.
 */
export function safeJsonArray(value: string | null | undefined): unknown[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
