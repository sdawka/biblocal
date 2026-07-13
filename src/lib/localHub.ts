import type { Match, LocalBook, UserProfile } from './types';

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export function isWithinBounds(lat: number, lng: number, b: MapBounds): boolean {
  return lat <= b.north && lat >= b.south && lng <= b.east && lng >= b.west;
}

export function hasLocation(m: { user: UserProfile }): boolean {
  return m.user.latitude != null && m.user.longitude != null;
}

export function splitDiscovery(matches: Match[]): { people: Match[]; stores: Match[] } {
  const people: Match[] = [];
  const stores: Match[] = [];
  for (const m of matches) {
    if (m.user.type === 'bookstore') stores.push(m);
    else people.push(m);
  }
  return { people, stores };
}

export function bookOwnerLocated(row: LocalBook, b: MapBounds | null): boolean {
  const { latitude, longitude } = row.owner;
  if (latitude == null || longitude == null) return b === null; // unlocated: only when not filtering
  if (b === null) return true;
  return isWithinBounds(latitude, longitude, b);
}

export function sortByDistance<T extends { distanceKm?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
}
