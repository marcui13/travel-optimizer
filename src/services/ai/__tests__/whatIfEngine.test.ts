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

  it('handles exact phrase "quiero eliminar Barcelona de recorridad" with typo and automatically re-optimizes route', async () => {
    const trip = getEuropeGrandTourSampleTrip();
    const res = await executeWhatIfScenario(trip, 'quiero eliminar Barcelona de recorridad');

    expect(res.actionable).toBe(true);
    expect(res.proposedTrip).toBeDefined();
    if (res.proposedTrip) {
      // Barcelona must be removed
      expect(res.proposedTrip.destinations.some((d) => d.name === 'Barcelona')).toBe(false);
      expect(res.proposedTrip.destinations.length).toBe(trip.destinations.length - 1);
      // Route must be reordered and optimized
      expect(res.proposedTrip.transportation.length).toBeGreaterThan(0);
      expect(res.explanation).toContain('recorrido restante fue reordenado y optimizado automáticamente');
    }
  });

  it('handles exact phrase "quiero cambiar Barcelona por Valencia" and automatically re-optimizes the route', async () => {
    const trip = getEuropeGrandTourSampleTrip();
    const res = await executeWhatIfScenario(trip, 'quiero cambiar Barcelona por Valencia');

    expect(res.actionable).toBe(true);
    expect(res.proposedTrip).toBeDefined();
    if (res.proposedTrip) {
      // Barcelona removed, Valencia added
      expect(res.proposedTrip.destinations.some((d) => d.name === 'Barcelona')).toBe(false);
      expect(res.proposedTrip.destinations.some((d) => d.name === 'Valencia')).toBe(true);
      expect(res.proposedTrip.destinations.length).toBe(trip.destinations.length);
      // Explanation mentions automatic reordering
      expect(res.explanation).toContain('reordenado y optimizado automáticamente');
      // Transportation regenerated
      expect(res.proposedTrip.transportation.some((s) => s.to.name === 'Valencia' || s.from.name === 'Valencia')).toBe(true);
    }
  });

  it('handles "quiero cambiar París por Brujas" on a trip containing Paris', async () => {
    // Modify trip to include Paris
    const trip = getEuropeGrandTourSampleTrip();
    trip.destinations[1] = {
      ...trip.destinations[1],
      name: 'Paris',
      location: { name: 'Paris', country: 'France', latitude: 48.8566, longitude: 2.3522 },
    };

    const res = await executeWhatIfScenario(trip, 'quiero cambiar París por Brujas');

    expect(res.actionable).toBe(true);
    expect(res.proposedTrip).toBeDefined();
    if (res.proposedTrip) {
      expect(res.proposedTrip.destinations.some((d) => d.name === 'Paris')).toBe(false);
      expect(res.proposedTrip.destinations.some((d) => d.name === 'Bruges')).toBe(true);
      expect(res.explanation).toContain('reordenado y optimizado automáticamente');
    }
  });

  it('handles "sacar Roma y poner Milán" using informal swap phrasing', async () => {
    const trip = getEuropeGrandTourSampleTrip();
    const res = await executeWhatIfScenario(trip, 'sacar Roma y poner Milán');

    expect(res.actionable).toBe(true);
    expect(res.proposedTrip).toBeDefined();
    if (res.proposedTrip) {
      expect(res.proposedTrip.destinations.some((d) => d.name === 'Rome')).toBe(false);
      expect(res.proposedTrip.destinations.some((d) => d.name === 'Milan')).toBe(true);
    }
  });

  it('handles "quiero eliminar Tokio de recorridad" when city does not exist in itinerary', async () => {
    const trip = getEuropeGrandTourSampleTrip();
    const res = await executeWhatIfScenario(trip, 'quiero eliminar Tokio de recorridad');

    expect(res.actionable).toBe(false);
    expect(res.explanation).toContain('no se encuentra en tu lista actual de destinos');
  });
});
