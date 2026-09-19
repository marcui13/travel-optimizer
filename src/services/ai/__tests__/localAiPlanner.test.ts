import { describe, it, expect } from 'vitest';
import { parseNaturalLanguageTripPrompt, createTripFromPrompt } from '../localAiPlanner';

describe('Local AI Planner & Natural Language Parser', () => {
  const prompt =
    "I'm traveling around Europe for 25 days. I want Lisbon, Madrid, Barcelona, Rome, Florence, Budapest, Vienna, Prague, Berlin and Amsterdam. I want to finish in Amsterdam around October 20. I prefer trains and want to avoid changing hotels too often.";

  it('correctly parses messy user prompt into structured components', () => {
    const parsed = parseNaturalLanguageTripPrompt(prompt);

    expect(parsed.destinations).toContain('Lisbon');
    expect(parsed.destinations).toContain('Madrid');
    expect(parsed.destinations).toContain('Rome');
    expect(parsed.destinations).toContain('Amsterdam');
    expect(parsed.destinations.length).toBe(10);

    expect(parsed.endDate).toBe('2026-10-20');
    expect(parsed.preferences.transportationPreference).toContain('train');
    expect(parsed.preferences.minimizeHotelChanges).toBe(true);

    expect(parsed.hardConstraints.some((c) => c.toLowerCase().includes('amsterdam'))).toBe(true);
  });

  it('generates a canonical Trip object matching application schema', () => {
    const trip = createTripFromPrompt(prompt);

    expect(trip.id).toBeTruthy();
    expect(trip.destinations.length).toBe(10);
    expect(trip.itinerary.days.length).toBeGreaterThanOrEqual(24);
    expect(trip.transportation.length).toBe(9);
    expect(trip.constraints.length).toBeGreaterThan(0);
  });

  it('correctly parses messy user prompt in Spanish with accents and localized names', () => {
    const spanishPrompt =
      'Tengo 25 días en Europa. Quiero Lisboa, Madrid, Barcelona, Roma, Florencia, Budapest, Viena, Praga, Berlín y Ámsterdam. Necesito estar en Ámsterdam el 20 de octubre. Prefiero trenes y no quiero cambiar de hotel tan seguido.';

    const parsed = parseNaturalLanguageTripPrompt(spanishPrompt);

    expect(parsed.destinations).toContain('Lisbon');
    expect(parsed.destinations).toContain('Madrid');
    expect(parsed.destinations).toContain('Rome');
    expect(parsed.destinations).toContain('Florence');
    expect(parsed.destinations).toContain('Vienna');
    expect(parsed.destinations).toContain('Berlin');
    expect(parsed.destinations).toContain('Amsterdam');
    expect(parsed.destinations.length).toBe(10);

    expect(parsed.endDate).toBe('2026-10-20');
    expect(parsed.preferences.transportationPreference).toContain('train');
    expect(parsed.preferences.minimizeHotelChanges).toBe(true);
    expect(parsed.hardConstraints.some((c) => c.toLowerCase().includes('amsterdam'))).toBe(true);
  });
});
