import { describe, it, expect } from 'vitest';
import { defaultOptimizer } from '../optimizer';
import { getEuropeGrandTourSampleTrip } from '../../../domain/tripDefaults';

describe('Constraint Optimization Engine', () => {
  it('optimizes with EFFICIENT profile and preserves hard constraints', async () => {
    const trip = getEuropeGrandTourSampleTrip();
    const result = await defaultOptimizer.optimize(trip, { profile: 'efficient' });

    expect(result.profile).toBe('efficient');
    expect(result.changes.length).toBeGreaterThan(0);
    expect(result.explanation).toBeTruthy();

    // Verify hard constraint preservation: Amsterdam remains last destination
    const lastDest = result.proposedDestinations?.[result.proposedDestinations.length - 1];
    expect(lastDest?.name.toLowerCase()).toBe('amsterdam');

    // Verify Lisbon remains origin
    const firstDest = result.proposedDestinations?.[0];
    expect(firstDest?.name.toLowerCase()).toBe('lisbon');

    // Metrics check
    expect(result.metrics).toBeDefined();
    if (result.metrics) {
      expect(result.metrics.distanceKmAfter).toBeLessThanOrEqual(result.metrics.distanceKmBefore || Infinity);
    }
  });

  it('optimizes with RELAXED profile consolidating nights in key hubs', async () => {
    const trip = getEuropeGrandTourSampleTrip();
    const result = await defaultOptimizer.optimize(trip, { profile: 'relaxed' });

    expect(result.profile).toBe('relaxed');
    expect(result.changes.length).toBeGreaterThan(0);

    // Should adjust stays to 3 nights in key capitals
    const rome = result.proposedDestinations?.find((d) => d.name.toLowerCase() === 'rome');
    expect(rome?.plannedNights).toBeGreaterThanOrEqual(3);
  });
});
