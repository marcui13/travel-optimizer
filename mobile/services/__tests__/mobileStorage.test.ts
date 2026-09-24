import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('react-native-mmkv', () => ({
  createMMKV: () => null,
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    getAllKeys: vi.fn(async () => []),
    multiGet: vi.fn(async () => []),
  },
}));

vi.mock('expo-constants', () => ({
  default: {
    appOwnership: 'expo',
    executionEnvironment: 'storeClient',
  },
  ExecutionEnvironment: {
    StoreClient: 'storeClient',
    Bare: 'bare',
    Standalone: 'standalone',
  },
}));

import * as storage from '../mobileStorage';

describe('mobileStorage Service', () => {
  beforeEach(() => {
    storage.mobileStorageDriver.clear?.();
  });

  it('loads default trip library when storage is initially empty', () => {
    const history = storage.loadTripHistory();
    expect(history.length).toBeGreaterThanOrEqual(3);
    const active = storage.getActiveTrip(history);
    expect(active).toBeDefined();
    expect(active.id).toBeDefined();
  });

  it('correctly sets and retrieves the active trip ID', () => {
    const history = storage.loadTripHistory();
    const secondTrip = history[1];
    expect(secondTrip).toBeDefined();

    storage.setActiveTripId(secondTrip.id);
    expect(storage.getActiveTripId(history)).toBe(secondTrip.id);
    expect(storage.getActiveTrip(history).id).toBe(secondTrip.id);
  });

  it('upserts and persists trip mutations', () => {
    const history = storage.loadTripHistory();
    const first = history[0];
    const updated = { ...first, name: 'Renamed Trip Mobile' };

    const newHistory = storage.upsertTrip(updated);
    expect(newHistory.find((t) => t.id === first.id)?.name).toBe('Renamed Trip Mobile');

    // Confirm reload from storage reflects update
    const reloaded = storage.loadTripHistory();
    expect(reloaded.find((t) => t.id === first.id)?.name).toBe('Renamed Trip Mobile');
  });

  it('duplicates an existing trip with a custom copy label', () => {
    const history = storage.loadTripHistory();
    const original = history[0];

    const { trips, newTrip } = storage.duplicateTrip(original.id, 'Copia Móvil');
    expect(newTrip).not.toBeNull();
    expect(newTrip?.name).toContain('(Copia Móvil)');
    expect(trips.length).toBe(history.length + 1);
  });

  it('persists and retrieves mobile language preference', () => {
    expect(storage.getMobileLanguage()).toBe('es');
    storage.setMobileLanguage('en');
    expect(storage.getMobileLanguage()).toBe('en');
    storage.setMobileLanguage('es');
    expect(storage.getMobileLanguage()).toBe('es');
  });
});
