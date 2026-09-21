import { describe, it, expect } from 'vitest';
import {
  toBase64Url,
  fromBase64Url,
  encodeTripToShareUrl,
  decodeTripFromShareUrl,
  generateTripSummaryText,
  parseTripImportJson,
  validateAndSanitizeTripJson,
  DEPLOYED_VERCEL_URL,
  getShareBaseUrl,
} from '../shareService';
import { getEuropeGrandTourSampleTrip } from '../../../domain/tripDefaults';

describe('Trip Sharing Service (shareService)', () => {
  const sampleTrip = getEuropeGrandTourSampleTrip();

  describe('UTF-8 Safe Base64URL Encoding & Decoding', () => {
    it('encodes and decodes simple strings accurately', () => {
      const original = 'Hello World!';
      const encoded = toBase64Url(original);
      const decoded = fromBase64Url(encoded);
      expect(decoded).toBe(original);
    });

    it('handles unicode accents, ñ, and special characters (Spanish, French, German)', () => {
      const complexString = 'Viaje a España: Málaga, Córdoba, Cádiz & París con Düsseldorf (ñoño)';
      const encoded = toBase64Url(complexString);
      const decoded = fromBase64Url(encoded);
      expect(decoded).toBe(complexString);
    });

    it('handles emojis and symbols', () => {
      const emojiString = '✈️ Recorrido Europeo 🌍 🍕 🥐 🍺 🏰';
      const encoded = toBase64Url(emojiString);
      const decoded = fromBase64Url(encoded);
      expect(decoded).toBe(emojiString);
    });
  });

  describe('Trip URL Serialization Roundtrip', () => {
    it('uses the canonical Vercel domain and generates #share= URL', () => {
      expect(DEPLOYED_VERCEL_URL).toBe('https://travel-optimizer-tau.vercel.app');
      expect(getShareBaseUrl()).toContain('https://travel-optimizer-tau.vercel.app');

      const url = encodeTripToShareUrl(sampleTrip);
      expect(url).toContain('https://travel-optimizer-tau.vercel.app');
      expect(url).toContain('#share=');
      const hashPart = url.split('#share=')[1];
      expect(hashPart).toBeDefined();
      expect(hashPart.length).toBeGreaterThan(100);
    });

    it('decodes a valid share URL fragment back to the full Trip structure', () => {
      const url = encodeTripToShareUrl(sampleTrip);
      const encodedHash = url.split('#share=')[1];

      const decoded = decodeTripFromShareUrl(encodedHash);
      expect(decoded).not.toBeNull();
      expect(decoded?.name).toBe(sampleTrip.name);
      expect(decoded?.destinations.length).toBe(sampleTrip.destinations.length);
      expect(decoded?.transportation.length).toBe(sampleTrip.transportation.length);
      expect(decoded?.itinerary.days.length).toBe(sampleTrip.itinerary.days.length);
    });

    it('gracefully returns null on malformed or corrupted share strings', () => {
      const corrupted = 'not-a-valid-base64-url-payload';
      const result = decodeTripFromShareUrl(corrupted);
      expect(result).toBeNull();
    });

    it('gracefully returns null when JSON is valid but does not have trip structure', () => {
      const randomJson = toBase64Url(JSON.stringify({ hello: 'world', someNumber: 42 }));
      const result = decodeTripFromShareUrl(randomJson);
      expect(result).toBeNull();
    });
  });

  describe('Trip Summary Generator for WhatsApp & Social Sharing', () => {
    it('generates a formatted summary in Spanish with stops and date range', () => {
      const summary = generateTripSummaryText(sampleTrip, 'es');
      expect(summary).toContain(sampleTrip.name);
      expect(summary).toContain('Fechas:');
      expect(summary).toContain('Paradas (');
      expect(summary).toContain('Trust the Detour');
      expect(summary).toContain('Abre y explora el itinerario interactivo completo aquí:');
      expect(summary).toContain('#share=');
    });

    it('generates a formatted summary in English with stops and date range', () => {
      const summary = generateTripSummaryText(sampleTrip, 'en');
      expect(summary).toContain(sampleTrip.name);
      expect(summary).toContain('Dates:');
      expect(summary).toContain('Stops (');
      expect(summary).toContain('Trust the Detour');
      expect(summary).toContain('Open and explore the full interactive itinerary here:');
      expect(summary).toContain('#share=');
    });
  });

  describe('JSON File Export & Import Parsing and Sanitization', () => {
    it('successfully parses valid exported JSON back into a Trip object', () => {
      const serialized = JSON.stringify(sampleTrip, null, 2);
      const parsed = parseTripImportJson(serialized);
      expect(parsed).not.toBeNull();
      expect(parsed?.id).toBe(sampleTrip.id);
      expect(parsed?.name).toBe(sampleTrip.name);
    });

    it('rejects invalid JSON strings or arbitrary objects without trip fields', () => {
      expect(parseTripImportJson('invalid json')).toBeNull();
      expect(parseTripImportJson(JSON.stringify({ foo: 'bar' }))).toBeNull();
    });

    it('validates and sanitizes a complete trip successfully', () => {
      const serialized = JSON.stringify(sampleTrip);
      const result = validateAndSanitizeTripJson(serialized);
      expect(result.success).toBe(true);
      expect(result.trip).toBeDefined();
      expect(result.trip?.name).toBe(sampleTrip.name);
      expect(result.trip?.destinations.length).toBe(sampleTrip.destinations.length);
    });

    it('unwraps nested trip object if payload is wrapped in { trip: ... }', () => {
      const wrapped = JSON.stringify({ trip: sampleTrip });
      const result = validateAndSanitizeTripJson(wrapped);
      expect(result.success).toBe(true);
      expect(result.trip?.name).toBe(sampleTrip.name);
    });

    it('returns a clear error when string is empty or invalid JSON', () => {
      const emptyResult = validateAndSanitizeTripJson('');
      expect(emptyResult.success).toBe(false);
      expect(emptyResult.error).toContain('vacío');

      const malformedResult = validateAndSanitizeTripJson('{ invalid json: ');
      expect(malformedResult.success).toBe(false);
      expect(malformedResult.error).toContain('JSON válido');
    });

    it('rejects payloads missing essential trip properties (name or destinations)', () => {
      const missingName = JSON.stringify({ destinations: [{ name: 'Paris', location: { lat: 48, lng: 2 } }] });
      const res1 = validateAndSanitizeTripJson(missingName);
      expect(res1.success).toBe(false);
      expect(res1.error).toContain('nombre válido');

      const missingDests = JSON.stringify({ name: 'Solo Nombre', destinations: [] });
      const res2 = validateAndSanitizeTripJson(missingDests);
      expect(res2.success).toBe(false);
      expect(res2.error).toContain('al menos un destino');
    });

    it('sanitizes incomplete destination coordinates and missing sub-arrays with sensible fallbacks', () => {
      const rawTrip = {
        name: 'Viaje Ligero',
        destinations: [
          { name: 'Roma' }, // missing id, location, targetDurationDays
        ],
      };
      const result = validateAndSanitizeTripJson(JSON.stringify(rawTrip));
      expect(result.success).toBe(true);
      expect(result.trip?.destinations[0].id).toBe('dest-1');
      expect(result.trip?.destinations[0].location.latitude).toBeDefined();
      expect(result.trip?.destinations[0].location.longitude).toBeDefined();
      expect(result.trip?.events).toEqual([]);
      expect(result.trip?.reservations).toEqual([]);
      expect(result.trip?.transportation).toEqual([]);
      expect(result.trip?.itinerary.days.length).toBe(1);
    });

    it('blocks prototype pollution payload attempts', () => {
      const malicious = '{"__proto__": {"admin": true}, "name": "Hack", "destinations": [{"name": "A"}]}';
      const result = validateAndSanitizeTripJson(malicious);
      expect(result.success).toBe(false);
      expect(result.error).toContain('insegura');
    });
  });
});

