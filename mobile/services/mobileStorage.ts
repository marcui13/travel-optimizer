import { Trip } from '@domain/types';
import { getDefaultTripLibrary } from '@domain/tripDefaults';
import { tripStorage, StorageDriver } from '@services/storage/tripStorageService';
import { createMMKV } from 'react-native-mmkv';

export const STORAGE_KEY_MOBILE_LANG = 'travel_optimizer_lang';

const memoryStore = new Map<string, string>();

let mmkvInstance: any = null;
try {
  mmkvInstance = createMMKV({ id: 'travel-optimizer-storage' });
} catch (e) {
  // MMKV native module is not available in web preview or testing environments.
  // Fallbacks below ensure 100% reliability across all targets.
}

/**
 * High-performance mobile storage driver with tiered fallbacks:
 * 1. MMKV (Native iOS/Android - C++ synchronous engine)
 * 2. Window.localStorage (Web preview / Expo Web)
 * 3. In-memory Map (Test / Headless fallback)
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
