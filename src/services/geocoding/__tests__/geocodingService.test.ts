import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  resolveLocation,
  resolveLocationAsync,
  searchLocations,
  saveCachedLocation,
  getCachedLocation,
  clearGeocodingCache,
  getGeocodingCacheStats,
  setActiveGeocodingProviderId,
  getActiveGeocodingProviderId,
  GEOCODING_PROVIDERS,
  setGeocodingApiKey,
  getGeocodingApiKey,
} from '../index';
import { NominatimProvider } from '../providers/nominatimProvider';

describe('Geocoding Service & Multi-Tier Architecture', () => {
  beforeEach(() => {
    clearGeocodingCache();
    setActiveGeocodingProviderId('nominatim');
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearGeocodingCache();
  });

  describe('Tier 1: Instant Local Hub Resolution (0ms)', () => {
    it('resolves official hubs with exact coordinates', () => {
      const madrid = resolveLocation('Madrid');
      expect(madrid.latitude).toBe(40.4168);
      expect(madrid.longitude).toBe(-3.7038);
      expect(madrid.country).toBe('Spain');

      const cph = resolveLocation('Copenhague');
      expect(cph.latitude).toBe(55.6761);
      expect(cph.longitude).toBe(12.5683);
      expect(cph.country).toBe('Denmark');
    });

    it('resolves Spanish aliases and normalized spellings', () => {
      const brujas = resolveLocation('Brujas');
      expect(brujas.name).toBe('Bruges');
      expect(brujas.country).toBe('Belgium');

      const tokio = resolveLocation('Tokio');
      expect(tokio.name).toBe('Tokyo');
    });
  });

  describe('Tier 2: Persistent & In-Memory Cache', () => {
    it('caches new locations and makes them instantly available synchronously', () => {
      expect(getCachedLocation('Sintra')).toBeNull();

      // Save to cache
      saveCachedLocation('Sintra', {
        name: 'Sintra',
        country: 'Portugal',
        latitude: 38.7992,
        longitude: -9.3881,
      });

      // Now synchronous resolveLocation finds it!
      const resolved = resolveLocation('Sintra');
      expect(resolved.name).toBe('Sintra');
      expect(resolved.latitude).toBe(38.7992);
      expect(resolved.longitude).toBe(-9.3881);
      expect(resolved.country).toBe('Portugal');

      // Stats check
      const stats = getGeocodingCacheStats();
      expect(stats.count).toBeGreaterThanOrEqual(1);
      expect(stats.entries.some((e) => e.name === 'Sintra')).toBe(true);
    });

    it('clears geocoding cache properly', () => {
      saveCachedLocation('Interlaken', {
        name: 'Interlaken',
        country: 'Switzerland',
        latitude: 46.6863,
        longitude: 7.8632,
      });
      expect(getCachedLocation('Interlaken')).not.toBeNull();

      clearGeocodingCache();
      expect(getCachedLocation('Interlaken')).toBeNull();
    });
  });

  describe('Tier 3: Remote Provider & Nominatim Integration', () => {
    it('parses Nominatim API response correctly', async () => {
      const mockOsmResponse = [
        {
          place_id: 12345,
          osm_id: 67890,
          lat: '38.7992',
          lon: '-9.3881',
          display_name: 'Sintra, Lisboa, Portugal',
          importance: 0.75,
          address: {
            town: 'Sintra',
            country: 'Portugal',
            country_code: 'pt',
          },
        },
      ];

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockOsmResponse,
      } as Response);

      const provider = new NominatimProvider();
      const results = await provider.search('Sintra');

      expect(fetchSpy).toHaveBeenCalled();
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Sintra');
      expect(results[0].country).toBe('Portugal');
      expect(results[0].countryCode).toBe('PT');
      expect(results[0].latitude).toBe(38.7992);
      expect(results[0].longitude).toBe(-9.3881);
      expect(results[0].provider).toBe('nominatim');
    });

    it('resolveLocationAsync uses remote provider when city is unknown and caches it', async () => {
      const mockGirona = [
        {
          place_id: 999,
          lat: '41.9794',
          lon: '2.8214',
          display_name: 'Girona, Catalunya, España',
          address: {
            city: 'Girona',
            country: 'Spain',
            country_code: 'es',
          },
        },
      ];

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockGirona,
      } as Response);

      const loc = await resolveLocationAsync('Girona');
      expect(loc.name).toBe('Girona');
      expect(loc.latitude).toBe(41.9794);
      expect(loc.longitude).toBe(2.8214);
      expect(loc.country).toBe('Spain');

      // Subsequent sync call should now find it in cache!
      const syncLoc = resolveLocation('Girona');
      expect(syncLoc.latitude).toBe(41.9794);
    });

    it('gracefully falls back to deterministic coordinates if remote fetch fails', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network offline'));

      const loc = await resolveLocationAsync('CompletelyUnknownVillage123', 'Spain');
      expect(loc.name).toBe('CompletelyUnknownVillage123');
      expect(typeof loc.latitude).toBe('number');
      expect(typeof loc.longitude).toBe('number');
    });
  });

  describe('Search & Deduplication', () => {
    it('returns instant local hubs in search results', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => [],
      } as Response);

      const results = await searchLocations('Barce');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.name === 'Barcelona')).toBe(true);
      expect(results[0].provider).toBe('local');
    });

    it('manages provider settings and optional API keys', () => {
      expect(GEOCODING_PROVIDERS.nominatim.requiresKey).toBe(false);
      expect(GEOCODING_PROVIDERS.mapbox.requiresKey).toBe(true);
      expect(GEOCODING_PROVIDERS.opencage.requiresKey).toBe(true);

      setActiveGeocodingProviderId('mapbox');
      expect(getActiveGeocodingProviderId()).toBe('mapbox');

      setGeocodingApiKey('mapbox', 'pk.test_mapbox_token_123');
      expect(getGeocodingApiKey('mapbox')).toBe('pk.test_mapbox_token_123');
    });
  });
});
