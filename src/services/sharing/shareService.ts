import { Trip } from '../../domain/types';

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

/**
 * Generates a full shareable URL containing the compressed trip payload in the URL hash
 */
export function encodeTripToShareUrl(trip: Trip, baseUrl?: string): string {
  const serialized = JSON.stringify(trip);
  const encoded = toBase64Url(serialized);

  const base =
    baseUrl ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://travel-optimizer.app/');

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
    } else if (urlOrHash.startsWith('share=')) {
      payload = urlOrHash.slice('share='.length);
    } else {
      payload = urlOrHash;
    }

    if (!payload) return null;

    const json = fromBase64Url(payload.trim());
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

/**
 * Parses and validates an uploaded JSON text into a Trip object
 */
export function parseTripImportJson(jsonText: string): Trip | null {
  try {
    const parsed = JSON.parse(jsonText);
    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed.name &&
      Array.isArray(parsed.destinations)
    ) {
      return parsed as Trip;
    }
    return null;
  } catch {
    return null;
  }
}
