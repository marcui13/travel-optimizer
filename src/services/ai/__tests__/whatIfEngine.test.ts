import { describe, it, expect } from 'vitest';
import { executeWhatIfScenario } from '../whatIfEngine';
import { getEuropeGrandTourSampleTrip } from '../../../domain/tripDefaults';

describe('What-If Scenario Reasoning Engine', () => {
  it('handles "Can I fit Croatia?" by proposing optimal insertion', async () => {
    const trip = getEuropeGrandTourSampleTrip();
    const res = await executeWhatIfScenario(trip, 'Can I fit Croatia?');

    expect(res.actionable).toBe(true);
    expect(res.proposedTrip).toBeDefined();
    if (res.proposedTrip) {
      expect(
        res.proposedTrip.destinations.some(
          (d) => d.name === 'Dubrovnik' || d.name === 'Split'
        )
      ).toBe(true);
    }
  });

  it('handles "Remove Berlin" by cleanly removing city and re-linking adjacent segments', async () => {
    const trip = getEuropeGrandTourSampleTrip();
    const res = await executeWhatIfScenario(trip, 'Remove Berlin');

    expect(res.actionable).toBe(true);
    expect(res.proposedTrip).toBeDefined();
    if (res.proposedTrip) {
      expect(res.proposedTrip.destinations.some((d) => d.name === 'Berlin')).toBe(false);
      expect(res.proposedTrip.destinations.length).toBe(trip.destinations.length - 1);
    }
  });

  it('handles "Make it more relaxed"', async () => {
    const trip = getEuropeGrandTourSampleTrip();
    const res = await executeWhatIfScenario(trip, 'Make it more relaxed');

    expect(res.actionable).toBe(true);
    expect(res.proposedTrip).toBeDefined();
    if (res.proposedTrip) {
      expect(res.proposedTrip.preferences.travelStyle).toBe('relaxed');
    }
  });

  it('handles Spanish query "¿Puedo sumar Croacia?"', async () => {
    const trip = getEuropeGrandTourSampleTrip();
    const res = await executeWhatIfScenario(trip, '¿Puedo sumar Croacia?');

    expect(res.actionable).toBe(true);
    expect(res.proposedTrip).toBeDefined();
    if (res.proposedTrip) {
      expect(
        res.proposedTrip.destinations.some(
          (d) => d.name === 'Dubrovnik' || d.name === 'Split'
        )
      ).toBe(true);
    }
    expect(res.explanation).toContain('inserción de ruta');
  });

  it('handles Spanish query "Quitar Berlín"', async () => {
    const trip = getEuropeGrandTourSampleTrip();
    const res = await executeWhatIfScenario(trip, 'Quitar Berlín');

    expect(res.actionable).toBe(true);
    expect(res.proposedTrip).toBeDefined();
    if (res.proposedTrip) {
      expect(res.proposedTrip.destinations.some((d) => d.name === 'Berlin')).toBe(false);
      expect(res.proposedTrip.destinations.length).toBe(trip.destinations.length - 1);
    }
  });

  it('handles Spanish query "Hacerlo más relajado"', async () => {
    const trip = getEuropeGrandTourSampleTrip();
    const res = await executeWhatIfScenario(trip, 'Hacerlo más relajado');

    expect(res.actionable).toBe(true);
    expect(res.proposedTrip).toBeDefined();
    if (res.proposedTrip) {
      expect(res.proposedTrip.preferences.travelStyle).toBe('relaxed');
    }
  });
});
