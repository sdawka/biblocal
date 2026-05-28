export type LocationPrecision = 'exact' | 'approximate' | 'city';

export const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Montreal': { lat: 45.5017, lng: -73.5673 },
  'Toronto': { lat: 43.6532, lng: -79.3832 },
  'Vancouver': { lat: 49.2827, lng: -123.1207 },
  'Ottawa': { lat: 45.4215, lng: -75.6972 },
  'Calgary': { lat: 51.0447, lng: -114.0719 },
  'Edmonton': { lat: 53.5461, lng: -113.4938 },
  'Quebec City': { lat: 46.8139, lng: -71.2080 },
  'Winnipeg': { lat: 49.8951, lng: -97.1384 },
  'Halifax': { lat: 44.6488, lng: -63.5752 },
  'Victoria': { lat: 48.4284, lng: -123.3656 },
};

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find the nearest city center to the given coordinates.
 * Returns the city center coordinates if within reasonable distance, otherwise returns approximate coords.
 */
export function findNearestCityCenter(
  lat: number,
  lng: number
): { lat: number; lng: number; city?: string } {
  let nearestCity: string | undefined;
  let nearestDistance = Infinity;
  let nearestCoords: { lat: number; lng: number } | undefined;

  for (const [city, coords] of Object.entries(CITY_COORDINATES)) {
    const distance = haversineDistance(lat, lng, coords.lat, coords.lng);
    // Only consider cities within 50km as "the same city"
    if (distance < nearestDistance && distance < 50) {
      nearestDistance = distance;
      nearestCity = city;
      nearestCoords = coords;
    }
  }

  if (nearestCoords && nearestCity) {
    return { ...nearestCoords, city: nearestCity };
  }

  // No city found within range, return approximate coords
  return {
    lat: Math.round(lat * 100) / 100,
    lng: Math.round(lng * 100) / 100,
  };
}

export function roundCoordinates(
  lat: number,
  lng: number,
  precision: LocationPrecision
): { lat: number; lng: number } {
  if (precision === 'exact') {
    return { lat, lng };
  }
  if (precision === 'city') {
    const cityResult = findNearestCityCenter(lat, lng);
    return { lat: cityResult.lat, lng: cityResult.lng };
  }
  // approximate: 3 decimal places ≈ 100m precision
  return {
    lat: Math.round(lat * 1000) / 1000,
    lng: Math.round(lng * 1000) / 1000,
  };
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

export function getCityCoordinates(city: string): { lat: number; lng: number } | null {
  return CITY_COORDINATES[city] ?? null;
}
