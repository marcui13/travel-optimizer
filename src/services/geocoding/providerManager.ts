import {
  GeocodingProviderId,
  GeocodingProviderConfig,
  IGeocodingProvider,
} from './types';
import { NominatimProvider } from './providers/nominatimProvider';
import { MapboxProvider } from './providers/mapboxProvider';
import { OpenCageProvider } from './providers/opencageProvider';

export const GEOCODING_PROVIDERS: Record<GeocodingProviderId, GeocodingProviderConfig> = {
  nominatim: {
    id: 'nominatim',
    name: 'OpenStreetMap Nominatim',
    description: 'Gratuito, de código abierto y sin clave obligatoria. Cobertura global basada en la comunidad de OSM.',
    requiresKey: false,
    docsUrl: 'https://nominatim.openstreetmap.org/',
  },
  mapbox: {
    id: 'mapbox',
    name: 'Mapbox Geocoding',
    description: 'Motor ultrarrápido con tolerancia a errores tipográficos y hasta 100.000 consultas/mes gratuitas.',
    requiresKey: true,
    docsUrl: 'https://www.mapbox.com/',
  },
  opencage: {
    id: 'opencage',
    name: 'OpenCage Geocoder',
    description: 'Agregador de datos abiertos (OSM, GeoNames), 2.500 consultas/día gratuitas y sin cobros sorpresa.',
    requiresKey: true,
    docsUrl: 'https://opencagedata.com/',
  },
};

const PROVIDER_STORAGE_KEY = 'travel_optimizer_geocoding_provider';
const MAPBOX_STORAGE_KEY = 'travel_optimizer_mapbox_token';
const OPENCAGE_STORAGE_KEY = 'travel_optimizer_opencage_key';

let inMemoryProvider: GeocodingProviderId = 'nominatim';
const inMemoryKeys: Record<string, string> = {};

export function getActiveGeocodingProviderId(): GeocodingProviderId {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem(PROVIDER_STORAGE_KEY) as GeocodingProviderId;
    if (saved && GEOCODING_PROVIDERS[saved]) {
      return saved;
    }
  }
  return inMemoryProvider;
}

export function setActiveGeocodingProviderId(id: GeocodingProviderId): void {
  inMemoryProvider = id;
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(PROVIDER_STORAGE_KEY, id);
  }
}

export function getGeocodingApiKey(providerId: GeocodingProviderId): string {
  const metaEnv = (import.meta as any).env || {};
  if (typeof window !== 'undefined' && window.localStorage) {
    if (providerId === 'mapbox') {
      return (
        window.localStorage.getItem(MAPBOX_STORAGE_KEY) ||
        (metaEnv.VITE_MAPBOX_TOKEN as string) ||
        inMemoryKeys.mapbox ||
        ''
      );
    }
    if (providerId === 'opencage') {
      return (
        window.localStorage.getItem(OPENCAGE_STORAGE_KEY) ||
        (metaEnv.VITE_OPENCAGE_KEY as string) ||
        inMemoryKeys.opencage ||
        ''
      );
    }
  }
  return (
    inMemoryKeys[providerId] ||
    (metaEnv[providerId === 'mapbox' ? 'VITE_MAPBOX_TOKEN' : 'VITE_OPENCAGE_KEY'] as string) ||
    ''
  );
}

export function setGeocodingApiKey(providerId: GeocodingProviderId, key: string): void {
  inMemoryKeys[providerId] = key.trim();
  if (typeof window !== 'undefined' && window.localStorage) {
    if (providerId === 'mapbox') {
      window.localStorage.setItem(MAPBOX_STORAGE_KEY, key.trim());
    } else if (providerId === 'opencage') {
      window.localStorage.setItem(OPENCAGE_STORAGE_KEY, key.trim());
    }
  }
}

export function getActiveGeocodingProvider(): IGeocodingProvider {
  const providerId = getActiveGeocodingProviderId();
  if (providerId === 'mapbox') {
    return new MapboxProvider(getGeocodingApiKey('mapbox'));
  }
  if (providerId === 'opencage') {
    return new OpenCageProvider(getGeocodingApiKey('opencage'));
  }
  return new NominatimProvider();
}

export async function testGeocodingProvider(
  providerId: GeocodingProviderId,
  apiKey?: string
): Promise<{ success: boolean; message: string }> {
  let provider: IGeocodingProvider;
  if (providerId === 'mapbox') {
    provider = new MapboxProvider(apiKey || getGeocodingApiKey('mapbox'));
  } else if (providerId === 'opencage') {
    provider = new OpenCageProvider(apiKey || getGeocodingApiKey('opencage'));
  } else {
    provider = new NominatimProvider();
  }

  return provider.testConnection(apiKey);
}
