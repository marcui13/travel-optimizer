import { describe, it, expect } from 'vitest';
import { getJapanGoldenRouteSampleTrip, getEuropeGrandTourSampleTrip } from '../tripDefaults';
import { shiftTripDates, isTripCompleted, resetTripToCleanState, resetTripWithCustomParams } from '../tripHelpers';

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

  it('resets a trip with edited custom parameters (name, dates, pace, transport)', async () => {
    const europeTrip = getEuropeGrandTourSampleTrip();

    const reset = await resetTripWithCustomParams(europeTrip, {
      name: 'Ruta Mediterránea y Alpina',
      startDate: '2027-09-01',
      endDate: '2027-09-20',
      travelStyle: 'relaxed',
      preferTrain: true,
    });

    expect(reset.name).toBe('Ruta Mediterránea y Alpina');
    expect(reset.startDate).toBe('2027-09-01');
    expect(reset.endDate).toBe('2027-09-20');
    expect(reset.status).toBe('planned');
    expect(reset.preferences.travelStyle).toBe('relaxed');
    expect(reset.preferences.transportationPreference).toContain('train');
    expect(reset.itinerary.days[0].date).toBe('2027-09-01');
    expect(reset.itinerary.days[reset.itinerary.days.length - 1].date).toBe('2027-09-20');
  });

  it('resets a trip with edited cities list, adding new cities and rebuilding transportation', async () => {
    const europeTrip = getEuropeGrandTourSampleTrip();

    const newCities = ['Madrid', 'Barcelona', 'Rome', 'Florence'];
    const reset = await resetTripWithCustomParams(europeTrip, {
      cityNames: newCities,
      startDate: '2027-05-01',
      endDate: '2027-05-15',
    });

    expect(reset.destinations.map((d) => d.name)).toEqual(newCities);
    expect(reset.destinations.length).toBe(4);
    // Verified 3 transit segments between 4 cities
    expect(reset.transportation.length).toBe(3);
    expect(reset.transportation[0].from.name.toLowerCase()).toContain('madrid');
    expect(reset.transportation[0].to.name.toLowerCase()).toContain('barcelona');
    expect(reset.itinerary.days.length).toBe(15); // May 1 to May 15 inclusive
  });
});

