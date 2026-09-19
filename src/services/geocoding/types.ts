export type GeocodingProviderId = 'nominatim' | 'mapbox' | 'opencage';

export interface GeocodingSearchResult {
  id: string;
  name: string;
  displayName: string;
  country: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  provider: GeocodingProviderId | 'local';
  cityCode?: string;
  confidence?: number;
}

export interface GeocodingOptions {
  limit?: number;
  language?: string;
  countryCode?: string;
}

export interface GeocodingProviderConfig {
  id: GeocodingProviderId;
  name: string;
  description: string;
  requiresKey: boolean;
  docsUrl: string;
}

export interface GeocodingCacheStats {
  count: number;
  entries: Array<{
    name: string;
    country: string;
    latitude: number;
    longitude: number;
    timestamp: number;
  }>;
}

export interface IGeocodingProvider {
  id: GeocodingProviderId;
  search(query: string, options?: GeocodingOptions): Promise<GeocodingSearchResult[]>;
  testConnection(apiKey?: string): Promise<{ success: boolean; message: string }>;
}
