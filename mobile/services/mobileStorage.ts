import { Trip } from '@domain/types';
import { getDefaultTripLibrary } from '@domain/tripDefaults';
import { tripStorage, StorageDriver } from '@services/storage/tripStorageService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';

export const STORAGE_KEY_MOBILE_LANG = 'travel_optimizer_lang';

const memoryStore = new Map<string, string>();

let mmkvInstance: any = null;

// Expo Go does not support custom C++ TurboModules (NitroModules/MMKV v4).
// Avoid loading MMKV in Expo Go to prevent NativeNitroModules runtime crash.
const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

if (!isExpoGo && typeof window === 'undefined') {
  try {
    // Dynamic require so Expo Go never evaluates the native NitroModules C++ binding
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mmkvModule = require('react-native-mmkv');
    if (mmkvModule && typeof mmkvModule.createMMKV === 'function') {
      mmkvInstance = mmkvModule.createMMKV({ id: 'travel-optimizer-storage' });
    }
  } catch {
    // Graceful fallback to AsyncStorage in Expo Go
  }
}

/**
 * Asynchronously hydrates the in-memory store from AsyncStorage on startup.
 * In Expo Go, this ensures trips saved in previous sessions are hydrated.
 */
let hydrationPromise: Promise<void> | null = null;

export function hydrateStorageAsync(): Promise<void> {
  if (hydrationPromise) return hydrationPromise;

  hydrationPromise = (async () => {
    if (mmkvInstance || (typeof window !== 'undefined' && window.localStorage)) {
      return;
    }
    try {
      const keys = await AsyncStorage.getAllKeys();
      if (keys && keys.length > 0) {
        const pairs = await AsyncStorage.multiGet(keys);
        pairs.forEach(([key, val]) => {
          if (val !== null) {
            memoryStore.set(key, val);
          }
        });
      }
    } catch (err) {
      console.warn('[mobileStorage] Hydration warning:', err);
    }
  })();

  return hydrationPromise;
}

// Trigger initial background hydration
hydrateStorageAsync().catch(() => {});

/**
 * High-performance mobile storage driver with tiered fallbacks:
 * 1. MMKV (Native standalone/dev builds - C++ synchronous engine)
 * 2. Window.localStorage (Web preview / Expo Web)
 * 3. Write-through In-Memory Store backed by AsyncStorage (Expo Go / Test fallback)
 */
export const mobileStorageDriver: StorageDriver = {
  getItem: (key: string): string | null => {
    try {
      if (mmkvInstance) {
        return mmkvInstance.getString(key) ?? null;
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // ignore
    }
    return memoryStore.get(key) || null;
  },

  setItem: (key: string, value: string): void => {
    try {
      if (mmkvInstance) {
        mmkvInstance.set(key, value);
        return;
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch {
      // ignore
    }
    memoryStore.set(key, value);
    // Write-through to AsyncStorage for Expo Go
    Promise.resolve(AsyncStorage.setItem(key, value)).catch(() => {});
  },

  removeItem: (key: string): void => {
    try {
      if (mmkvInstance) {
        mmkvInstance.delete(key);
        return;
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch {
      // ignore
    }
    memoryStore.delete(key);
    Promise.resolve(AsyncStorage.removeItem(key)).catch(() => {});
  },

  clear: (): void => {
    try {
      if (mmkvInstance) {
        mmkvInstance.clearAll();
        return;
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
        return;
      }
    } catch {
      // ignore
    }
    memoryStore.clear();
    Promise.resolve(AsyncStorage.clear()).catch(() => {});
  },
};

// Register mobileStorageDriver as the active driver for the shared tripStorage singleton
tripStorage.setStorageDriver(mobileStorageDriver);

/**
 * Loads the trip library from mobile storage (seeds with defaults if empty).
 */
export function loadTripHistory(): Trip[] {
  return tripStorage.loadTripHistory();
}

/**
 * Saves the current trip library to mobile storage.
 */
export function saveTripHistory(trips: Trip[]): void {
  tripStorage.saveTripHistory(trips);
}

/**
 * Retrieves the currently active trip ID or falls back to first trip.
 */
export function getActiveTripId(trips: Trip[]): string {
  return tripStorage.getActiveTripId(trips);
}

/**
 * Updates the active trip ID in mobile storage.
 */
export function setActiveTripId(id: string): void {
  tripStorage.setActiveTripId(id);
}

/**
 * Resolves the full active Trip object.
 */
export function getActiveTrip(trips?: Trip[]): Trip {
  const history = trips || loadTripHistory();
  const activeId = getActiveTripId(history);
  return history.find((t) => t.id === activeId) || history[0] || getDefaultTripLibrary()[0];
}

/**
 * Inserts or updates a trip in storage.
 */
export function upsertTrip(trip: Trip): Trip[] {
  return tripStorage.upsertTripInHistory(trip);
}

/**
 * Deletes a trip from history.
 */
export function deleteTrip(tripId: string): { trips: Trip[]; nextActiveTripId: string } {
  return tripStorage.deleteTripFromHistory(tripId);
}

/**
 * Duplicates an existing trip with an incremented title.
 */
export function duplicateTrip(tripId: string, copyLabel?: string): { trips: Trip[]; newTrip: Trip | null } {
  return tripStorage.duplicateTrip(tripId, copyLabel);
}

/**
 * Resets a trip according to the chosen reset mode (shift dates, baseline, etc.).
 */
export function resetTrip(
  tripId: string,
  options: {
    mode: 'shift' | 'baseline' | 'markPlanned' | 'editParams';
    newStartDate?: string;
    customTrip?: Trip;
  }
): { trips: Trip[]; updatedTrip: Trip | null } {
  return tripStorage.resetTripInHistory(tripId, options);
}

/**
 * Gets the persisted language on mobile (default 'es').
 */
export function getMobileLanguage(): 'es' | 'en' {
  try {
    const val = mobileStorageDriver.getItem(STORAGE_KEY_MOBILE_LANG);
    if (val === 'es' || val === 'en') return val;
  } catch {
    // ignore
  }
  return 'es';
}

/**
 * Persists the chosen language to mobile storage.
 */
export function setMobileLanguage(lang: 'es' | 'en'): void {
  try {
    mobileStorageDriver.setItem(STORAGE_KEY_MOBILE_LANG, lang);
  } catch {
    // ignore
  }
}
