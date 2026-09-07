import type { Match, LocalBook, UserProfile } from './types';
import { getCityCoordinates } from './geo';
import type { LocationFilter } from './matching';

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export type DiscoveryLocation =
  | ({ kind: 'radius'; city?: string; approximate: boolean } & Required<Pick<LocationFilter, 'lat' | 'lng' | 'radiusKm'>>)
  | { kind: 'city'; city: string; approximate: true };

function validCoordinates(profile: UserProfile): profile is UserProfile & Required<Pick<UserProfile, 'latitude' | 'longitude'>> {
  return (
    Number.isFinite(profile.latitude) &&
    Number.isFinite(profile.longitude) &&
    profile.latitude! >= -90 &&
    profile.latitude! <= 90 &&
    profile.longitude! >= -180 &&
    profile.longitude! <= 180
  );
}

/**
 * Resolve Local's deliberate scope from stored profile data. Exact coordinates
 * win; a known city falls back to its centre; an unknown city remains a
 * same-city scope. Returning null is intentional: callers must offer the
 * explicit worldwide mode instead of silently broadening discovery.
 */
export function resolveDiscoveryLocation(profile: UserProfile): DiscoveryLocation | null {
  const city = profile.city.trim();
  const radiusKm = Number.isFinite(profile.radiusKm) && profile.radiusKm > 0 ? profile.radiusKm : 5;

  if (validCoordinates(profile)) {
    return {
      kind: 'radius',
      lat: profile.latitude,
      lng: profile.longitude,
      radiusKm,
      city: city || undefined,
      approximate: profile.locationPrecision !== 'exact',
    };
  }

  const cityCoordinates = city ? getCityCoordinates(city) : null;
  if (cityCoordinates) {
    return {
      kind: 'radius',
      ...cityCoordinates,
      radiusKm,
      city,
      approximate: true,
    };
  }

  return city ? { kind: 'city', city, approximate: true } : null;
}

export function isWithinBounds(lat: number, lng: number, b: MapBounds): boolean {
  const inLat = lat <= b.north && lat >= b.south;
  // Handle the antimeridian: when the viewport wraps the date line, Leaflet's
  // getBounds() returns west > east, so the in-range test inverts to an OR.
  const inLng =
    b.west <= b.east ? lng >= b.west && lng <= b.east : lng >= b.west || lng <= b.east;
  return inLat && inLng;
}

export function hasLocation(m: { user: UserProfile }): boolean {
  return m.user.latitude != null && m.user.longitude != null;
}

export function splitDiscovery(matches: readonly Match[]): { people: Match[]; stores: Match[] } {
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

export function sortByDistance<T extends { distanceKm?: number }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
}
