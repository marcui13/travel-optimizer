import { describe, it, expect } from 'vitest';
import { getJapanGoldenRouteSampleTrip, getEuropeGrandTourSampleTrip } from '../tripDefaults';
import { shiftTripDates, isTripCompleted, resetTripToCleanState } from '../tripHelpers';

describe('Trip Reset & History Domain Logic', () => {
  it('detects a completed trip properly', () => {
    const japanTrip = getJapanGoldenRouteSampleTrip();
    expect(isTripCompleted(japanTrip)).toBe(true);

    const europeTrip = getEuropeGrandTourSampleTrip();
    expect(isTripCompleted(europeTrip)).toBe(false);
  });

  it('shifts all trip dates forward maintaining exact duration and sequence', () => {
    const japanTrip = getJapanGoldenRouteSampleTrip();
    expect(japanTrip.startDate).toBe('2025-05-10');
    expect(japanTrip.endDate).toBe('2025-05-21');
    expect(japanTrip.status).toBe('completed');

    // Shift to new start date in 2026
    const shifted = shiftTripDates(japanTrip, '2026-06-01');

    expect(shifted.startDate).toBe('2026-06-01');
    expect(shifted.endDate).toBe('2026-06-12'); // 11 days later
    expect(shifted.status).toBe('planned');

    // Verify first destination Tokyo dates
    const tokyo = shifted.destinations.find((d) => d.name === 'Tokyo');
    expect(tokyo?.arrivalDate).toBe('2026-06-01');
    expect(tokyo?.departureDate).toBe('2026-06-05'); // 4 nights

    // Verify day 1 date
    expect(shifted.itinerary.days[0].date).toBe('2026-06-01');

    // Verify reservations shifted
    const flight = shifted.reservations.find((r) => r.type === 'flight');
    expect(flight?.startDateTime).toContain('2026-06-01');
  });

  it('resets a trip to clean state', () => {
    const europeTrip = getEuropeGrandTourSampleTrip();
    // Add ad-hoc mock image event
    europeTrip.events.push({
      id: 'test-ad-hoc',
      title: 'Temporary Dinner',
      startDateTime: '2026-10-01T20:00',
      type: 'activity',
      fixed: false,
      source: 'image',
    });

    const cleaned = resetTripToCleanState(europeTrip);
    expect(cleaned.events.find((e) => e.id === 'test-ad-hoc')).toBeUndefined();
    expect(cleaned.status).toBe('planned');
    expect(cleaned.itinerary.days.length).toBe(europeTrip.itinerary.days.length);
  });
});
