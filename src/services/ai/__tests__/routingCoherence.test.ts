import { describe, it, expect } from 'vitest';
import { resolveLocation, calculateDistanceKm } from '../../geocoding/geocodingService';
import { detectCityInText, executeWhatIfScenario } from '../whatIfEngine';
import { defaultOptimizer } from '../../optimization/optimizer';
import { validateTrip } from '../../../domain/validation';
import { Trip, Destination } from '../../../domain/types';

function createMockTrip(cityNames: string[]): Trip {
  const destinations: Destination[] = cityNames.map((cityName, idx) => {
    const loc = resolveLocation(cityName);
    const dayStart = 1 + idx * 3;
    const dayEnd = dayStart + 2;
    return {
      id: `dest-${cityName.toLowerCase().replace(/\s+/g, '-')}`,
      name: loc.name,
      location: loc,
      arrivalDate: `2026-10-0${dayStart}`,
      departureDate: `2026-10-0${dayEnd}`,
      plannedNights: 3,
      minimumNights: 2,
    };
  });

  return {
    id: 'test-trip-corridor',
    name: 'Test Corridor Trip',
    startDate: '2026-10-01',
    endDate: '2026-10-15',
    destinations,
    itinerary: { days: [] },
    transportation: [],
    constraints: [],
    events: [],
    reservations: [],
    preferences: {
      travelStyle: 'balanced',
      transportationPreference: ['train'],
      minimizeHotelChanges: false,
    },
    updatedAt: '2026-09-19T10:00:00Z',
  };
}

describe('Routing Coherence & Geocoding Fixes', () => {
  describe('1. Geocoding Hubs & Country Gateway Mapping', () => {
    it('resolves Brujas to Belgium with exact Bruges coordinates', () => {
      const loc = resolveLocation('Brujas');
      expect(loc.name).toBe('Bruges');
      expect(loc.country).toBe('Belgium');
      expect(loc.latitude).toBeCloseTo(51.2093, 2);
      expect(loc.longitude).toBeCloseTo(3.2247, 2);
    });

    it('resolves Bruges (English) to Belgium', () => {
      const loc = resolveLocation('Bruges');
      expect(loc.name).toBe('Bruges');
      expect(loc.country).toBe('Belgium');
      expect(loc.latitude).toBeCloseTo(51.2093, 2);
    });

    it('resolves country "Bélgica" / "Belgium" to gateway Brussels, Belgium', () => {
      const locEs = resolveLocation('Bélgica');
      expect(locEs.name).toBe('Brussels');
      expect(locEs.country).toBe('Belgium');

      const locEn = resolveLocation('Belgium');
      expect(locEn.name).toBe('Brussels');
      expect(locEn.country).toBe('Belgium');
    });

    it('resolves Copenhague (Spanish) and Copenhagen (English) to Denmark with exact coordinates', () => {
      const locEs = resolveLocation('Copenhague');
      expect(locEs.name).toBe('Copenhagen');
      expect(locEs.country).toBe('Denmark');
      expect(locEs.latitude).toBeCloseTo(55.6761, 2);
      expect(locEs.longitude).toBeCloseTo(12.5683, 2);

      const locEn = resolveLocation('Copenhagen');
      expect(locEn.name).toBe('Copenhagen');
      expect(locEn.country).toBe('Denmark');
      expect(locEn.latitude).toBeCloseTo(55.6761, 2);
    });

    it('resolves Malmo and Malmö (Swedish) to Sweden with exact coordinates', () => {
      const loc1 = resolveLocation('Malmo');
      expect(loc1.name).toBe('Malmö');
      expect(loc1.country).toBe('Sweden');
      expect(loc1.latitude).toBeCloseTo(55.6050, 2);
      expect(loc1.longitude).toBeCloseTo(13.0038, 2);

      const loc2 = resolveLocation('Malmö');
      expect(loc2.name).toBe('Malmö');
      expect(loc2.country).toBe('Sweden');
      expect(loc2.latitude).toBeCloseTo(55.6050, 2);
    });

    it('verifies that Copenhagen and Malmo are situated in Scandinavia north of Berlin, NOT in southern Germany/Switzerland', () => {
      const cph = resolveLocation('Copenhague');
      const malmo = resolveLocation('Malmo');
      const berlin = resolveLocation('Berlin');

      // Berlin latitude is ~52.52; Copenhagen and Malmo are > 55.6 (well to the north)
      expect(cph.latitude).toBeGreaterThan(berlin.latitude!);
      expect(malmo.latitude).toBeGreaterThan(berlin.latitude!);
      // Distance between Copenhagen and Malmo across the Øresund bridge is ~30 km
      const distance = calculateDistanceKm(cph.latitude!, cph.longitude!, malmo.latitude!, malmo.longitude!);
      expect(distance).toBeLessThan(45);
      expect(distance).toBeGreaterThan(20);
    });

    it('resolves coordinates deterministically without Math.random()', () => {
      const loc1 = resolveLocation('NonExistentCityFakeland');
      const loc2 = resolveLocation('NonExistentCityFakeland');
      expect(loc1.latitude).toBe(loc2.latitude);
      expect(loc1.longitude).toBe(loc2.longitude);
    });
  });

  describe('2. City Detection in Natural Language (Action Word Filtering)', () => {
    it('does not confuse action verbs like "Agregar" or "Sumar" with cities', () => {
      expect(detectCityInText('Agregar Brujas al viaje')).toBe('Bruges');
      expect(detectCityInText('Sumar Barcelona a la ruta')).toBe('Barcelona');
      expect(detectCityInText('Quiero añadir Bruselas')).toBe('Brussels');
      expect(detectCityInText('Podemos meter Ámsterdam en el medio?')).toBe('Amsterdam');
    });
  });

  describe('3. Minimum Detour Insertion in What-If Engine', () => {
    it('inserts Barcelona logically between Madrid and Paris, NOT between Paris and Amsterdam', async () => {
      // Starting route: Madrid -> Paris -> Amsterdam
      const trip = createMockTrip(['Madrid', 'Paris', 'Amsterdam']);
      const res = await executeWhatIfScenario(trip, 'Sumar Barcelona');

      expect(res.actionable).toBe(true);
      expect(res.proposedTrip).toBeDefined();

      const names = res.proposedTrip!.destinations.map((d) => d.name);
      // Correct geometric order along the corridor: Madrid -> Barcelona -> Paris -> Amsterdam
      expect(names).toEqual(['Madrid', 'Barcelona', 'Paris', 'Amsterdam']);
    });

    it('inserts Brujas logically between Paris and Amsterdam on the corridor', async () => {
      // Starting route: Madrid -> Paris -> Amsterdam
      const trip = createMockTrip(['Madrid', 'Paris', 'Amsterdam']);
      const res = await executeWhatIfScenario(trip, 'Agregar Brujas');

      expect(res.actionable).toBe(true);
      expect(res.proposedTrip).toBeDefined();

      const names = res.proposedTrip!.destinations.map((d) => d.name);
      // Correct corridor order: Madrid -> Paris -> Bruges -> Amsterdam
      expect(names).toEqual(['Madrid', 'Paris', 'Bruges', 'Amsterdam']);
      // Check country
      const bruges = res.proposedTrip!.destinations.find((d) => d.name === 'Bruges');
      expect(bruges?.location?.country).toBe('Belgium');
    });
  });

  describe('4. Backtracking Detection in Trip Validation', () => {
    it('detects severe backtracking for Madrid → Paris → Barcelona', () => {
      const flawedTrip = createMockTrip(['Madrid', 'Paris', 'Barcelona', 'Amsterdam']);
      const issues = validateTrip(flawedTrip);

      const backtrackIssue = issues.find((i) => i.category === 'backtracking');
      expect(backtrackIssue).toBeDefined();
      expect(backtrackIssue?.message).toContain('Madrid → Paris → Barcelona');
      expect(backtrackIssue?.severity).toBe('warning');
    });

    it('does not flag backtracking for the logically ordered corridor Madrid → Barcelona → Paris → Amsterdam', () => {
      const coherentTrip = createMockTrip(['Madrid', 'Barcelona', 'Paris', 'Amsterdam']);
      const issues = validateTrip(coherentTrip);

      const backtrackIssue = issues.find((i) => i.category === 'backtracking');
      expect(backtrackIssue).toBeUndefined();
    });
  });

  describe('5. Route Optimizer 2-Opt on Unanchored Trips', () => {
    it('optimizes flawed route Madrid → Paris → Barcelona into Madrid → Barcelona → Paris', async () => {
      const flawedTrip = createMockTrip(['Madrid', 'Paris', 'Barcelona']);
      const result = await defaultOptimizer.optimize(flawedTrip, { profile: 'efficient' });

      const optimizedNames = result.proposedDestinations!.map((d) => d.name);
      // Origin Madrid is preserved; Paris and Barcelona are reordered to minimize distance:
      // Madrid -> Barcelona -> Paris (1335 km vs 1880 km)
      expect(optimizedNames).toEqual(['Madrid', 'Barcelona', 'Paris']);
    });
  });
});
