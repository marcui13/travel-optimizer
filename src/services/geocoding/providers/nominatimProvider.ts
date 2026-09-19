import { IGeocodingProvider, GeocodingOptions, GeocodingSearchResult } from '../types';

/**
 * Throttle queue to enforce Nominatim's Fair Use Policy (maximum 1 request per second)
 */
class NominatimThrottler {
  private lastRequestTime = 0;
  private minIntervalMs = 1050; // slightly above 1000ms for safety margin

  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const timeSinceLast = now - this.lastRequestTime;
    if (timeSinceLast < this.minIntervalMs) {
      const waitTime = this.minIntervalMs - timeSinceLast;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();
    return fn();
  }
}

const throttler = new NominatimThrottler();

export class NominatimProvider implements IGeocodingProvider {
  readonly id = 'nominatim';

  async search(query: string, options?: GeocodingOptions): Promise<GeocodingSearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      return [];
    }

    return throttler.schedule(async () => {
      const limit = options?.limit || 5;
      const lang = options?.language || 'es,en;q=0.9';
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('q', trimmed);
      url.searchParams.set('format', 'json');
      url.searchParams.set('addressdetails', '1');
      url.searchParams.set('limit', String(limit));
      if (options?.countryCode) {
        url.searchParams.set('countrycodes', options.countryCode.toLowerCase());
      }

      const res = await fetch(url.toString(), {
        headers: {
          'Accept-Language': lang,
        },
      });

      if (!res.ok) {
        throw new Error(`Nominatim HTTP ${res.status}: ${res.statusText}`);
      }

      const data: any[] = await res.json();
      if (!Array.isArray(data)) return [];

      return data.map((item) => {
        const addr = item.address || {};
        const cityName =
          addr.city ||
          addr.town ||
          addr.village ||
          addr.municipality ||
          item.name ||
          item.display_name.split(',')[0].trim();

        const country = addr.country || 'Unknown';
        const countryCode = addr.country_code ? addr.country_code.toUpperCase() : undefined;

        return {
          id: `osm-${item.osm_id || item.place_id || Math.random().toString(36).slice(2)}`,
          name: cityName,
          displayName: item.display_name,
          country,
          countryCode,
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          provider: 'nominatim' as const,
          confidence: item.importance ? Math.min(1, item.importance * 1.2) : 0.8,
        };
      });
    });
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const results = await this.search('Madrid', { limit: 1 });
      if (results.length > 0 && results[0].latitude) {
        return {
          success: true,
          message: `Conexión exitosa con OpenStreetMap Nominatim (${results[0].name}, ${results[0].country})`,
        };
      }
      return { success: false, message: 'Nominatim no devolvió resultados para la prueba.' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Error al conectar con Nominatim: ${msg}` };
    }
  }
}
