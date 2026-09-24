import { Trip } from '../../domain/types';
import { resolveLocation } from '../geocoding/geocodingService';

/**
 * Encodes a string to a URL-safe Base64 string supporting UTF-8 characters
 */
export function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const len = bytes.length;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decodes a URL-safe Base64 string back into a UTF-8 string
 */
export function fromBase64Url(base64url: string): string {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export const DEPLOYED_VERCEL_URL = 'https://travel-optimizer-tau.vercel.app';

/**
 * Returns the canonical base URL for sharing trips.
 * Prioritizes the production Vercel deployment URL so links work consistently
 * across all devices, mobile browsers, and messaging apps.
 */
export function getShareBaseUrl(): string {
  if (typeof window === 'undefined') {
    return DEPLOYED_VERCEL_URL;
  }
  const origin = window.location.origin;
  // If running locally in development, use the official Vercel domain so links work anywhere
  if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('0.0.0.0')) {
    return DEPLOYED_VERCEL_URL;
  }
  // Otherwise, use current origin + pathname
  const path = window.location.pathname.replace(/\/+$/, '');
  return `${origin}${path}`;
}

/**
 * Generates a full shareable URL containing the compressed trip payload in the URL hash
 */
export function encodeTripToShareUrl(trip: Trip, baseUrl?: string): string {
  const serialized = JSON.stringify(trip);
  const encoded = toBase64Url(serialized);

  const rawBase = baseUrl || getShareBaseUrl();
  const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

  return `${base}#share=${encoded}`;
}

/**
 * Decodes a Trip object from a share URL, query string, or raw hash fragment
 */
export function decodeTripFromShareUrl(urlOrHash: string): Trip | null {
  try {
    let payload = '';

    if (urlOrHash.includes('#share=')) {
      payload = urlOrHash.split('#share=')[1]?.split('&')[0] || '';
    } else if (urlOrHash.includes('?share=')) {
      payload = urlOrHash.split('?share=')[1]?.split('#')[0]?.split('&')[0] || '';
    } else if (urlOrHash.includes('share=')) {
      payload = urlOrHash.split('share=')[1]?.split('&')[0]?.split('#')[0] || '';
    } else {
      payload = urlOrHash;
    }

    if (!payload) return null;

    // Handle percent-encoding if the URL was encoded by an external app
    const cleanPayload = decodeURIComponent(payload.trim());
    const json = fromBase64Url(cleanPayload);
    const parsed = JSON.parse(json);

    // Basic structure validation
    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed.name &&
      Array.isArray(parsed.destinations) &&
      Array.isArray(parsed.transportation)
    ) {
      return parsed as Trip;
    }

    return null;
  } catch (err) {
    console.warn('[ShareService] Failed to decode trip from share payload:', err);
    return null;
  }
}

/**
 * Extracts raw share payload from browser window location (hash or query)
 */
export function extractSharePayloadFromLocation(): string | null {
  if (typeof window === 'undefined') return null;

  const hash = window.location.hash;
  if (hash.includes('#share=')) {
    return hash.split('#share=')[1]?.split('&')[0] || null;
  }
  if (hash.startsWith('#/share=')) {
    return hash.slice('#/share='.length).split('&')[0] || null;
  }

  const search = window.location.search;
  if (search.includes('share=')) {
    const params = new URLSearchParams(search);
    return params.get('share');
  }

  return null;
}

/**
 * Generates a human-friendly formatted summary of the trip ready for WhatsApp, Telegram, or email
 */
export function generateTripSummaryText(
  trip: Trip,
  lang: 'es' | 'en' = 'es',
  shareUrl?: string
): string {
  const destinationsCount = trip.destinations?.length || 0;
  const stopsList = trip.destinations?.map((d) => d.name).join(' → ') || '';
  const daysCount = trip.itinerary?.days?.length || 0;
  const url = shareUrl || encodeTripToShareUrl(trip);

  if (lang === 'es') {
    return [
      `✈️ *${trip.name}*`,
      `📅 *Fechas:* ${trip.startDate} al ${trip.endDate} (${daysCount} días)`,
      `📍 *Paradas (${destinationsCount}):* ${stopsList}`,
      `✨ "Trust the Detour"`,
      ``,
      `👉 Abre y explora el itinerario interactivo completo aquí:`,
      `${url}`,
    ].join('\n');
  }

  return [
    `✈️ *${trip.name}*`,
    `📅 *Dates:* ${trip.startDate} to ${trip.endDate} (${daysCount} days)`,
    `📍 *Stops (${destinationsCount}):* ${stopsList}`,
    `✨ "Trust the Detour"`,
    ``,
    `👉 Open and explore the full interactive itinerary here:`,
    `${url}`,
  ].join('\n');
}

/**
 * Exports the trip to a downloadable JSON file
 */
export function exportTripToFile(trip: Trip): void {
  if (typeof window === 'undefined') return;

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(trip, null, 2));
  const downloadAnchor = document.createElement('a');
  const filename = `${trip.name.toLowerCase().replace(/[^a-z0-9]/gi, '_')}_itinerary.json`;

  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export interface TripImportResult {
  success: boolean;
  trip?: Trip;
  error?: string;
}

/**
 * Validates and sanitizes a raw JSON string into a structured, secure Trip object.
 * Protects against corrupted data, prototype pollution, and fills in missing optional fields.
 */
export function validateAndSanitizeTripJson(jsonText: string): TripImportResult {
  if (!jsonText || typeof jsonText !== 'string' || !jsonText.trim()) {
    return { success: false, error: 'El archivo está vacío o no contiene texto legible.' };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { success: false, error: 'El archivo no contiene un formato JSON válido.' };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { success: false, error: 'El archivo JSON debe contener un objeto de viaje válido.' };
  }

  // Prototype pollution defense
  if (
    Object.prototype.hasOwnProperty.call(parsed, '__proto__') ||
    Object.prototype.hasOwnProperty.call(parsed, 'constructor') ||
    Object.prototype.hasOwnProperty.call(parsed, 'prototype')
  ) {
    return { success: false, error: 'Estructura JSON inválida o potencialmente insegura.' };
  }

  // Support unwrapping if the payload is enclosed in { trip: ... } or { data: { trip: ... } }
  const raw: any = parsed.trip && typeof parsed.trip === 'object'
    ? parsed.trip
    : (parsed.data && typeof parsed.data === 'object' && parsed.data.trip && typeof parsed.data.trip === 'object'
      ? parsed.data.trip
      : parsed);

  // Validate essential properties: name and destinations
  if (!raw.name || typeof raw.name !== 'string' || !raw.name.trim()) {
    return { success: false, error: 'El itinerario no tiene un nombre válido.' };
  }

  if (!Array.isArray(raw.destinations) || raw.destinations.length === 0) {
    return { success: false, error: 'El itinerario debe contener al menos un destino o parada.' };
  }

  // Dates validation and fallback
  const dateRegex = /^\d{4}-\d{2}-\d{2}/;
  const todayStr = new Date().toISOString().slice(0, 10);
  const startDate = typeof raw.startDate === 'string' && dateRegex.test(raw.startDate)
    ? raw.startDate.slice(0, 10)
    : todayStr;
  const endDate = typeof raw.endDate === 'string' && dateRegex.test(raw.endDate)
    ? raw.endDate.slice(0, 10)
    : startDate;

  // Sanitized destinations
  const destinations = raw.destinations.map((d: any, idx: number) => {
    const name = typeof d.name === 'string' && d.name.trim() ? d.name.trim() : `Destino ${idx + 1}`;
    const resolved = resolveLocation(name);
    const latitude = typeof d.location?.latitude === 'number' && !isNaN(d.location.latitude)
      ? d.location.latitude
      : (typeof d.location?.lat === 'number' && !isNaN(d.location.lat)
        ? d.location.lat
        : (typeof resolved.latitude === 'number' ? resolved.latitude : 48.8566));
    const longitude = typeof d.location?.longitude === 'number' && !isNaN(d.location.longitude)
      ? d.location.longitude
      : (typeof d.location?.lng === 'number' && !isNaN(d.location.lng)
        ? d.location.lng
        : (typeof resolved.longitude === 'number' ? resolved.longitude : 2.3522));

    return {
      id: typeof d.id === 'string' && d.id ? d.id : `dest-${idx + 1}`,
      name,
      location: {
        name: typeof d.location?.name === 'string' ? d.location.name : name,
        country: typeof d.location?.country === 'string'
          ? d.location.country
          : (typeof d.country === 'string' ? d.country : resolved.country),
        latitude,
        longitude,
        cityCode: d.location?.cityCode || resolved.cityCode,
      },
      arrivalDate: typeof d.arrivalDate === 'string' ? d.arrivalDate : undefined,
      departureDate: typeof d.departureDate === 'string' ? d.departureDate : undefined,
      plannedNights: typeof d.plannedNights === 'number' ? d.plannedNights : undefined,
      minimumNights: typeof d.minimumNights === 'number' ? d.minimumNights : undefined,
      maximumNights: typeof d.maximumNights === 'number' ? d.maximumNights : undefined,
      priority: d.priority || 'medium',
      reasons: Array.isArray(d.reasons) ? d.reasons : undefined,
    };
  });

  // Ensure itinerary with days
  let itinerary = raw.itinerary;
  if (!itinerary || !Array.isArray(itinerary.days) || itinerary.days.length === 0) {
    // Generate basic days if missing
    itinerary = {
      days: destinations.map((dest: any, idx: number) => ({
        dayNumber: idx + 1,
        date: startDate,
        destinationId: dest.id,
        activities: [],
        stays: [],
      })),
    };
  }

  // Clean, sanitized Trip object
  const sanitizedTrip: Trip = {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `trip-imported-${Date.now()}`,
    name: raw.name.trim(),
    startDate,
    endDate,
    status: raw.status || 'planned',
    origin: raw.origin || undefined,
    destinations,
    events: Array.isArray(raw.events) ? raw.events : [],
    reservations: Array.isArray(raw.reservations) ? raw.reservations : [],
    transportation: Array.isArray(raw.transportation) ? raw.transportation : [],
    constraints: Array.isArray(raw.constraints) ? raw.constraints : [],
    preferences: raw.preferences && typeof raw.preferences === 'object'
      ? {
          travelStyle: raw.preferences.travelStyle || 'balanced',
          transportationPreference: Array.isArray(raw.preferences.transportationPreference)
            ? raw.preferences.transportationPreference
            : ['train', 'flight'],
          minimizeHotelChanges: raw.preferences.minimizeHotelChanges ?? true,
          minimizeTravelTime: raw.preferences.minimizeTravelTime ?? true,
          interests: Array.isArray(raw.preferences.interests) ? raw.preferences.interests : [],
          budget: raw.preferences.budget || { amount: 3000, currency: 'EUR' },
        }
      : {
          travelStyle: 'balanced',
          transportationPreference: ['train', 'flight'],
          minimizeHotelChanges: true,
          minimizeTravelTime: true,
          interests: [],
          budget: { amount: 3000, currency: 'EUR' },
        },
    itinerary,
    updatedAt: new Date().toISOString(),
  };

  return {
    success: true,
    trip: sanitizedTrip,
  };
}

/**
 * Parses and validates an uploaded JSON text into a Trip object
 */
export function parseTripImportJson(jsonText: string): Trip | null {
  const result = validateAndSanitizeTripJson(jsonText);
  return result.success && result.trip ? result.trip : null;
}

