import { IGeocodingProvider, GeocodingOptions, GeocodingSearchResult } from '../types';

export class MapboxProvider implements IGeocodingProvider {
  readonly id = 'mapbox';
  private defaultToken: string;

  constructor(defaultToken = '') {
    this.defaultToken = defaultToken;
  }

  async search(query: string, options?: GeocodingOptions & { apiKey?: string }): Promise<GeocodingSearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return [];

    const token = options?.apiKey || this.defaultToken;
    if (!token) {
      throw new Error('Mapbox API Token no configurado. Ingresa tu token en Ajustes o VITE_MAPBOX_TOKEN.');
    }

    const limit = options?.limit || 5;
    const lang = options?.language || 'es,en';
    const encoded = encodeURIComponent(trimmed);
    const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json`);
    url.searchParams.set('access_token', token);
    url.searchParams.set('types', 'place,locality,region,country');
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('language', lang);

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`Mapbox HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    if (!data.features || !Array.isArray(data.features)) return [];

    return data.features.map((feat: any) => {
      // Find country in context array
      const countryContext = feat.context?.find((c: any) => c.id?.startsWith('country'));
      const country = countryContext?.text || 'Unknown';
      const countryCode = countryContext?.short_code?.toUpperCase();
      const [lon, lat] = feat.center || [0, 0];

      return {
        id: `mapbox-${feat.id}`,
        name: feat.text || feat.place_name?.split(',')[0],
        displayName: feat.place_name,
        country,
        countryCode,
        latitude: lat,
        longitude: lon,
        provider: 'mapbox' as const,
        confidence: feat.relevance || 0.9,
      };
    });
  }

  async testConnection(apiKey?: string): Promise<{ success: boolean; message: string }> {
    const token = apiKey || this.defaultToken;
    if (!token) {
      return { success: false, message: 'Falta ingresar el Token de Mapbox.' };
    }
    try {
      const results = await this.search('Madrid', { apiKey: token, limit: 1 });
      if (results.length > 0) {
        return {
          success: true,
          message: `Conexión exitosa con Mapbox Geocoding (${results[0].name}, ${results[0].country})`,
        };
      }
      return { success: false, message: 'Mapbox no devolvió resultados para la prueba.' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Error al conectar con Mapbox: ${msg}` };
    }
  }
}
