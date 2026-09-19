import { describe, it, expect } from 'vitest';
import { validateTrip } from '../validation';
import { getEuropeGrandTourSampleTrip } from '../tripDefaults';
import { Trip } from '../types';

describe('Deterministic Validation Engine', () => {
  it('validates the default Europe Grand Tour without fatal errors', () => {
    const trip = getEuropeGrandTourSampleTrip();
    const issues = validateTrip(trip);
    const errors = issues.filter((i) => i.severity === 'error');
    expect(errors.length).toBe(0);
  });

  it('detects impossible schedule when activity time is before transit arrival time', () => {
    const trip = getEuropeGrandTourSampleTrip();
    // Simulate transit arriving at 14:30 and an activity scheduled at 11:00 on arrival day
    const travelDay = trip.itinerary.days.find((d) => d.isTravelDay && d.transportation?.length);
    expect(travelDay).toBeDefined();

    if (travelDay && travelDay.transportation?.[0]) {
      travelDay.transportation[0].arrivalTime = '15:00';
      travelDay.activities.push({
        id: 'act-impossible-1',
        title: 'Morning Museum Entry',
        time: '11:00',
        category: 'sightseeing',
      });

      const issues = validateTrip(trip);
      const impossible = issues.find((i) => i.category === 'impossible_schedule');
      expect(impossible).toBeDefined();
      expect(impossible?.severity).toBe('error');
    }
  });

  it('detects hard constraint violations when fixed arrival date is not met', () => {
    const trip = getEuropeGrandTourSampleTrip();
    // Move Amsterdam arrival date away from October 20
    const ams = trip.destinations.find((d) => d.name.toLowerCase() === 'amsterdam');
    expect(ams).toBeDefined();

    if (ams) {
      ams.arrivalDate = '2026-10-22'; // 2 days late
      const issues = validateTrip(trip);
      const violation = issues.find((i) => i.category === 'hard_constraint_violation');
      expect(violation).toBeDefined();
      expect(violation?.severity).toBe('error');
    }
  });

  it('detects overlapping events on the same day', () => {
    const trip = getEuropeGrandTourSampleTrip();
    trip.events.push(
      {
        id: 'evt-test-1',
        title: 'Dinner Gala',
        startDateTime: '2026-10-10T19:00',
        endDateTime: '2026-10-10T22:00',
        type: 'event',
        fixed: true,
        source: 'user',
      },
      {
        id: 'evt-test-2',
        title: 'Opera Performance',
        startDateTime: '2026-10-10T20:00',
        endDateTime: '2026-10-10T23:00',
        type: 'event',
        fixed: false,
        source: 'user',
      }
    );

    const issues = validateTrip(trip);
    const overlap = issues.find((i) => i.category === 'overlap');
    expect(overlap).toBeDefined();
    expect(overlap?.severity).toBe('error');
  });

  it('detects reversed start and end dates', () => {
    const trip: Trip = {
      ...getEuropeGrandTourSampleTrip(),
      startDate: '2026-10-25',
      endDate: '2026-10-10',
    };

    const issues = validateTrip(trip);
    const reversed = issues.find((i) => i.category === 'invalid_date_range');
    expect(reversed).toBeDefined();
    expect(reversed?.severity).toBe('error');
  });
});
