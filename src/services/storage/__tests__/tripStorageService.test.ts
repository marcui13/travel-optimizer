import { describe, it, expect, beforeEach } from 'vitest';
import { TripStorageService } from '../tripStorageService';

describe('TripStorageService', () => {
  let service: TripStorageService;

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    service = TripStorageService.getInstance();
  });

  it('initializes with default trips library when empty', () => {
    const trips = service.loadTripHistory();
    expect(trips.length).toBeGreaterThanOrEqual(3);
    expect(trips.some((t) => t.id === 'trip-japan-golden-route')).toBe(true);
  });

  it('upserts a modified trip in history', () => {
    const trips = service.loadTripHistory();
    const japan = trips.find((t) => t.id === 'trip-japan-golden-route')!;
    const updated = { ...japan, name: 'Mi Viaje a Japón 2025' };

    const newHistory = service.upsertTripInHistory(updated);
    const found = newHistory.find((t) => t.id === 'trip-japan-golden-route');
    expect(found?.name).toBe('Mi Viaje a Japón 2025');
  });

  it('duplicates a trip in history', () => {
    service.loadTripHistory();
    const { newTrip, trips } = service.duplicateTrip('trip-japan-golden-route', 'Variante');
    expect(newTrip).not.toBeNull();
    expect(newTrip?.name).toContain('(Variante)');
    expect(trips.length).toBe(4);
  });

  it('resets a completed trip with a new start date', () => {
    service.loadTripHistory();
    const { updatedTrip } = service.resetTripInHistory('trip-japan-golden-route', {
      mode: 'shift',
      newStartDate: '2026-09-01',
    });

    expect(updatedTrip).not.toBeNull();
    expect(updatedTrip?.startDate).toBe('2026-09-01');
    expect(updatedTrip?.status).toBe('planned');
  });
});
