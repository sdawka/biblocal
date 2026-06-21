/**
 * Enum validation utilities for API endpoints.
 * Server-side validation to prevent invalid values from being stored.
 */

export const VALID_VISIBILITY = ['private', 'visible'] as const;
export const VALID_OWNERSHIP = ['have', 'seeking'] as const;
export const VALID_INTENTS = ['borrowable', 'discussable', 'giftable'] as const;
export const VALID_CONTACT_VISIBILITY = ['hidden', 'on-request', 'public'] as const;

export type Visibility = (typeof VALID_VISIBILITY)[number];
export type Ownership = (typeof VALID_OWNERSHIP)[number];
export type Intent = (typeof VALID_INTENTS)[number];
export type ContactVisibility = (typeof VALID_CONTACT_VISIBILITY)[number];

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
