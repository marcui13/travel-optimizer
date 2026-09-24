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

  it('allows injecting a custom StorageDriver (e.g. MMKV or isolated store)', () => {
    const customMap = new Map<string, string>();
    const mockDriver = {
      getItem: (key: string) => customMap.get(key) || null,
      setItem: (key: string, value: string) => customMap.set(key, value),
      removeItem: (key: string) => customMap.delete(key),
      clear: () => customMap.clear(),
    };

    service.setStorageDriver(mockDriver);
    expect(service.getStorageDriver()).toBe(mockDriver);

    // Save and load trips via custom driver
    const trips = service.loadTripHistory();
    expect(trips.length).toBeGreaterThanOrEqual(3);
    expect(customMap.size).toBe(1); // saved initial library
    service.setActiveTripId('custom-active-id');
    expect(customMap.get('travel_optimizer_active_trip_id_v2')).toBe('custom-active-id');

    // Reset back to null
    service.setStorageDriver(null);
  });
});
