import { IGeocodingProvider, GeocodingOptions, GeocodingSearchResult } from '../types';

export class OpenCageProvider implements IGeocodingProvider {
  readonly id = 'opencage';
  private defaultKey: string;

  constructor(defaultKey = '') {
    this.defaultKey = defaultKey;
  }

  async search(query: string, options?: GeocodingOptions & { apiKey?: string }): Promise<GeocodingSearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return [];

    const key = options?.apiKey || this.defaultKey;
    if (!key) {
      throw new Error('OpenCage API Key no configurada. Ingresa tu clave en Ajustes o VITE_OPENCAGE_KEY.');
    }

    const limit = options?.limit || 5;
    const lang = options?.language || 'es';
    const url = new URL('https://api.opencagedata.com/geocode/v1/json');
    url.searchParams.set('q', trimmed);
    url.searchParams.set('key', key);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('language', lang);
    url.searchParams.set('no_annotations', '1');

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`OpenCage HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    if (!data.results || !Array.isArray(data.results)) return [];

    return data.results.map((item: any, idx: number) => {
      const comp = item.components || {};
      const cityName =
        comp.city ||
        comp.town ||
        comp.village ||
        comp.municipality ||
        comp.state ||
        item.formatted.split(',')[0];

      const country = comp.country || 'Unknown';
      const countryCode = comp.country_code ? comp.country_code.toUpperCase() : undefined;

      return {
        id: `opencage-${idx}-${item.geometry?.lat}-${item.geometry?.lng}`,
        name: cityName,
        displayName: item.formatted,
        country,
        countryCode,
        latitude: item.geometry?.lat,
        longitude: item.geometry?.lng,
        provider: 'opencage' as const,
        confidence: item.confidence ? item.confidence / 10 : 0.85,
      };
    });
  }

  async testConnection(apiKey?: string): Promise<{ success: boolean; message: string }> {
    const key = apiKey || this.defaultKey;
    if (!key) {
      return { success: false, message: 'Falta ingresar la API Key de OpenCage.' };
    }
    try {
      const results = await this.search('Madrid', { apiKey: key, limit: 1 });
      if (results.length > 0) {
        return {
          success: true,
          message: `Conexión exitosa con OpenCage (${results[0].name}, ${results[0].country})`,
        };
      }
      return { success: false, message: 'OpenCage no devolvió resultados para la prueba.' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Error al conectar con OpenCage: ${msg}` };
    }
  }
}
