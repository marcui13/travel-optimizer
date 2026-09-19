import { Location } from '../../domain/types';
import { GeocodingCacheStats } from './types';

const STORAGE_KEY = 'travel_optimizer_geocache_v1';

interface CacheEntry {
  location: Location;
  timestamp: number;
}

// In-memory cache synced with localStorage for 0ms synchronous access
const memoryCache: Map<string, CacheEntry> = new Map();

/**
 * Normalizes a city name for consistent cache keying
 */
export function normalizeCityKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Loads cache entries from localStorage on module initialization
 */
function initCache(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed: Record<string, CacheEntry> = JSON.parse(raw);
    for (const [key, entry] of Object.entries(parsed)) {
      if (entry && entry.location && typeof entry.location.latitude === 'number') {
        memoryCache.set(key, entry);
      }
    }
  } catch (err) {
    console.warn('[Geocoding Cache] Failed to load cache from localStorage:', err);
  }
}

// Initialize on module load
initCache();

/**
 * Persists current memory cache to localStorage
 */
function persistCache(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const obj: Record<string, CacheEntry> = {};
    for (const [k, v] of memoryCache.entries()) {
      obj[k] = v;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch (err) {
    console.warn('[Geocoding Cache] Failed to save cache to localStorage:', err);
  }
}

/**
 * Retrieves a cached location if present
 */
export function getCachedLocation(query: string): Location | null {
  const key = normalizeCityKey(query);
  if (!key) return null;
  const entry = memoryCache.get(key);
  return entry ? entry.location : null;
}

/**
 * Saves a location to memory and persistent storage
 */
export function saveCachedLocation(query: string, location: Location): void {
  const key = normalizeCityKey(query);
  if (!key || !location || typeof location.latitude !== 'number') return;

  const entry: CacheEntry = {
    location: {
      ...location,
      name: location.name || query.trim(),
    },
    timestamp: Date.now(),
  };

  memoryCache.set(key, entry);

  // Also store by normalized target location name if different
  if (location.name) {
    const targetKey = normalizeCityKey(location.name);
    if (targetKey && targetKey !== key) {
      memoryCache.set(targetKey, entry);
    }
  }

  persistCache();
}

/**
 * Returns all cached locations as a record
 */
export function getAllCachedLocations(): Record<string, Location> {
  const result: Record<string, Location> = {};
  for (const [k, v] of memoryCache.entries()) {
    result[k] = v.location;
  }
  return result;
}

/**
 * Clears both memory and persistent geocoding cache
 */
export function clearGeocodingCache(): void {
  memoryCache.clear();
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}

/**
 * Returns statistics about the geocoding cache
 */
export function getGeocodingCacheStats(): GeocodingCacheStats {
  const entries: GeocodingCacheStats['entries'] = [];
  for (const [, v] of memoryCache.entries()) {
    entries.push({
      name: v.location.name,
      country: v.location.country || 'Unknown',
      latitude: v.location.latitude ?? 0,
      longitude: v.location.longitude ?? 0,
      timestamp: v.timestamp,
    });
  }

  return {
    count: memoryCache.size,
    entries,
  };
}
