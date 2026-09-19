import { describe, it, expect } from 'vitest';
import { calculateTripStatistics, formatMinutesToHours } from '../statistics';
import { getEuropeGrandTourSampleTrip } from '../tripDefaults';

describe('Deterministic Statistics Engine', () => {
  it('accurately calculates destination count and nights count', () => {
    const trip = getEuropeGrandTourSampleTrip();
    const stats = calculateTripStatistics(trip);

    expect(stats.destinationCount).toBe(10);
    expect(stats.nightsCount).toBe(24);
  });

  it('computes realistic Haversine travel distance across European cities', () => {
    const trip = getEuropeGrandTourSampleTrip();
    const stats = calculateTripStatistics(trip);

    expect(stats.totalDistanceKm).toBeGreaterThan(2000);
    expect(stats.totalTravelMinutes).toBeGreaterThan(600);
    expect(stats.transferCount).toBeGreaterThanOrEqual(9);
  });

  it('formats travel minutes to hours correctly', () => {
    expect(formatMinutesToHours(90)).toBe('1h 30m');
    expect(formatMinutesToHours(120)).toBe('2h');
    expect(formatMinutesToHours(45)).toBe('45m');
  });
});
