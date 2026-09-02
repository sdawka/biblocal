import { describe, it, expect } from 'vitest';
import {
  roundCoordinates,
  findNearestCityCenter,
  haversineDistance,
  formatDistance,
  getCityCoordinates,
  CITY_COORDINATES,
} from '../../src/lib/geo';

describe('roundCoordinates', () => {
  describe('exact precision', () => {
    it('returns coordinates unchanged', () => {
      const result = roundCoordinates(45.5234567, -73.5678901, 'exact');
      expect(result.lat).toBe(45.5234567);
      expect(result.lng).toBe(-73.5678901);
    });
  });

  describe('approximate precision', () => {
    it('rounds to 3 decimal places (~100m)', () => {
      const result = roundCoordinates(45.5234567, -73.5678901, 'approximate');
      expect(result.lat).toBe(45.523);
      expect(result.lng).toBe(-73.568);
    });

    it('handles negative coordinates', () => {
      const result = roundCoordinates(-33.8567, 151.2153, 'approximate');
      expect(result.lat).toBe(-33.857);
      expect(result.lng).toBe(151.215);
    });
  });

  describe('city precision', () => {
    it('snaps to nearest city center for Montreal', () => {
      // Point near Montreal (within 50km)
      const result = roundCoordinates(45.52, -73.58, 'city');
      expect(result.lat).toBe(CITY_COORDINATES['Montreal'].lat);
      expect(result.lng).toBe(CITY_COORDINATES['Montreal'].lng);
    });

    it('snaps to nearest city center for Toronto', () => {
      // Point near Toronto
      const result = roundCoordinates(43.65, -79.38, 'city');
      expect(result.lat).toBe(CITY_COORDINATES['Toronto'].lat);
      expect(result.lng).toBe(CITY_COORDINATES['Toronto'].lng);
    });

    it('snaps to nearest city center for Vancouver', () => {
      // Point near Vancouver
      const result = roundCoordinates(49.28, -123.12, 'city');
      expect(result.lat).toBe(CITY_COORDINATES['Vancouver'].lat);
      expect(result.lng).toBe(CITY_COORDINATES['Vancouver'].lng);
    });

    it('falls back to approximate when no city is within 50km', () => {
      // Middle of nowhere (Hudson Bay)
      const result = roundCoordinates(55.5, -85.0, 'city');
      // Should be rounded to 2 decimal places as fallback
      expect(result.lat).toBe(55.5);
      expect(result.lng).toBe(-85);
    });

    it('handles coordinates on city edge (within 50km)', () => {
      // Point about 20km from Montreal center
      const lat = 45.6;
      const lng = -73.7;
      const result = roundCoordinates(lat, lng, 'city');
      // Should snap to Montreal
      expect(result.lat).toBe(CITY_COORDINATES['Montreal'].lat);
      expect(result.lng).toBe(CITY_COORDINATES['Montreal'].lng);
    });
  });
});

describe('findNearestCityCenter', () => {
  it('returns city center and name for location in Montreal', () => {
    const result = findNearestCityCenter(45.52, -73.55);
    expect(result.city).toBe('Montreal');
    expect(result.lat).toBe(CITY_COORDINATES['Montreal'].lat);
    expect(result.lng).toBe(CITY_COORDINATES['Montreal'].lng);
  });

  it('returns city center and name for location in Ottawa', () => {
    const result = findNearestCityCenter(45.42, -75.7);
    expect(result.city).toBe('Ottawa');
    expect(result.lat).toBe(CITY_COORDINATES['Ottawa'].lat);
    expect(result.lng).toBe(CITY_COORDINATES['Ottawa'].lng);
  });

  it('returns approximate coords without city name when too far from any city', () => {
    // Middle of Atlantic Ocean
    const result = findNearestCityCenter(40.0, -50.0);
    expect(result.city).toBeUndefined();
    expect(result.lat).toBe(40);
    expect(result.lng).toBe(-50);
  });

  it('chooses nearest city when between two cities', () => {
    // Near Montreal, within 50km (Montreal is at 45.5017, -73.5673)
    const result = findNearestCityCenter(45.55, -73.6);
    expect(result.city).toBe('Montreal');
  });
});

describe('haversineDistance', () => {
  it('calculates distance between two points', () => {
    // Montreal to Toronto is approximately 504 km
    const distance = haversineDistance(
      CITY_COORDINATES['Montreal'].lat,
      CITY_COORDINATES['Montreal'].lng,
      CITY_COORDINATES['Toronto'].lat,
      CITY_COORDINATES['Toronto'].lng
    );
    expect(distance).toBeGreaterThan(500);
    expect(distance).toBeLessThan(510);
  });

  it('returns 0 for same point', () => {
    const distance = haversineDistance(45.5, -73.5, 45.5, -73.5);
    expect(distance).toBe(0);
  });
});

describe('formatDistance', () => {
  it('formats distances under 1km in meters', () => {
    expect(formatDistance(0.5)).toBe('500 m');
    expect(formatDistance(0.1)).toBe('100 m');
  });

  it('formats distances over 1km with one decimal', () => {
    expect(formatDistance(1.5)).toBe('1.5 km');
    expect(formatDistance(10.25)).toBe('10.3 km');
  });
});

describe('getCityCoordinates', () => {
  it('returns coordinates for known city', () => {
    const result = getCityCoordinates('Montreal');
    expect(result).toEqual(CITY_COORDINATES['Montreal']);
  });

  it('returns null for unknown city', () => {
    const result = getCityCoordinates('Atlantis');
    expect(result).toBeNull();
  });

  it.each(['New York', 'London', 'Paris', 'Lyon', 'Tokyo'])('returns the QA city center for %s', (city) => {
    expect(getCityCoordinates(city)).toEqual(CITY_COORDINATES[city]);
  });
});
