import { Trip } from '../../domain/types';
import { getDefaultTripLibrary } from '../../domain/tripDefaults';
import { shiftTripDates, resetTripToCleanState } from '../../domain/tripHelpers';

export const STORAGE_KEY_TRIPS_LIBRARY = 'travel_optimizer_trips_library_v2';
export const STORAGE_KEY_ACTIVE_TRIP_ID = 'travel_optimizer_active_trip_id_v2';

const memoryStore = new Map<string, string>();

function getStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage;
  }
  return {
    getItem: (key: string) => memoryStore.get(key) || null,
    setItem: (key: string, value: string) => memoryStore.set(key, value),
    removeItem: (key: string) => memoryStore.delete(key),
    clear: () => memoryStore.clear(),
  };
}

export class TripStorageService {
  private static instance: TripStorageService;

  private constructor() {}

  public static getInstance(): TripStorageService {
    if (!TripStorageService.instance) {
      TripStorageService.instance = new TripStorageService();
    }
    return TripStorageService.instance;
  }

  /**
   * Loads all saved trips from localStorage. If empty or corrupt, seeds with default library.
   */
  public loadTripHistory(): Trip[] {
    try {
      const storage = getStorage();
      const raw = storage.getItem(STORAGE_KEY_TRIPS_LIBRARY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading trips library from localStorage', e);
    }

    const defaultLibrary = getDefaultTripLibrary();
    this.saveTripHistory(defaultLibrary);
    return defaultLibrary;
  }

  /**
   * Saves the list of trips to localStorage.
   */
  public saveTripHistory(trips: Trip[]): void {
    try {
      const storage = getStorage();
      storage.setItem(STORAGE_KEY_TRIPS_LIBRARY, JSON.stringify(trips));
    } catch (e) {
      console.warn('Error saving trips library to localStorage', e);
    }
  }

  /**
   * Gets the active trip ID or defaults to the first trip in history.
   */
  public getActiveTripId(trips: Trip[]): string {
    try {
      const storage = getStorage();
      const id = storage.getItem(STORAGE_KEY_ACTIVE_TRIP_ID);
      if (id && trips.some((t) => t.id === id)) {
        return id;
      }
    } catch {
      // ignore
    }
    return trips[0]?.id || 'trip-europe-grand-tour';
  }

  /**
   * Sets the active trip ID.
   */
  public setActiveTripId(id: string): void {
    try {
      const storage = getStorage();
      storage.setItem(STORAGE_KEY_ACTIVE_TRIP_ID, id);
    } catch {
      // ignore
    }
  }

  /**
   * Adds or updates a trip in the library.
   */
  public upsertTripInHistory(trip: Trip): Trip[] {
    const history = this.loadTripHistory();
    const index = history.findIndex((t) => t.id === trip.id);
    let updated: Trip[];

    if (index >= 0) {
      updated = [...history];
      updated[index] = { ...trip, updatedAt: new Date().toISOString() };
    } else {
      updated = [{ ...trip, updatedAt: new Date().toISOString() }, ...history];
    }

    this.saveTripHistory(updated);
    return updated;
  }

  /**
   * Deletes a trip by ID from history. Never leaves history completely empty.
   */
  public deleteTripFromHistory(tripId: string): { trips: Trip[]; nextActiveTripId: string } {
    const history = this.loadTripHistory();
    let updated = history.filter((t) => t.id !== tripId);

    if (updated.length === 0) {
      updated = getDefaultTripLibrary();
    }

    this.saveTripHistory(updated);
    const nextActiveTripId = updated[0].id;
    this.setActiveTripId(nextActiveTripId);

    return { trips: updated, nextActiveTripId };
  }

  /**
   * Duplicates an existing trip with a new ID and title suffix.
   */
  public duplicateTrip(tripId: string, copyLabel = 'Copia'): { trips: Trip[]; newTrip: Trip | null } {
    const history = this.loadTripHistory();
    const original = history.find((t) => t.id === tripId);
    if (!original) return { trips: history, newTrip: null };

    const newTrip: Trip = {
      ...JSON.parse(JSON.stringify(original)),
      id: `trip-${Date.now()}`,
      name: `${original.name} (${copyLabel})`,
      updatedAt: new Date().toISOString(),
    };

    const updated = [newTrip, ...history];
    this.saveTripHistory(updated);
    return { trips: updated, newTrip };
  }

  /**
   * Resets a trip in history:
   * - 'editParams': replaces with custom trip rebuilt from edited initial fields
   * - 'shift': shifts all dates to a new start date while preserving route & stays
   * - 'baseline': rebuilds clean days and clears ad-hoc changes
   * - 'markPlanned': simply sets status back to 'planned'
   */
  public resetTripInHistory(
    tripId: string,
    options: {
      mode: 'shift' | 'baseline' | 'markPlanned' | 'editParams';
      newStartDate?: string;
      customTrip?: Trip;
    }
  ): { trips: Trip[]; updatedTrip: Trip | null } {
    const history = this.loadTripHistory();
    const trip = history.find((t) => t.id === tripId);
    if (!trip) return { trips: history, newTrip: null, updatedTrip: null } as any;

    let resetTrip: Trip;
    if (options.mode === 'editParams' && options.customTrip) {
      resetTrip = options.customTrip;
    } else if (options.mode === 'shift' && options.newStartDate) {
      resetTrip = shiftTripDates(trip, options.newStartDate);
    } else if (options.mode === 'baseline') {
      resetTrip = resetTripToCleanState(trip, options.newStartDate);
    } else {
      resetTrip = {
        ...trip,
        status: 'planned',
        updatedAt: new Date().toISOString(),
      };
    }

    const updated = history.map((t) => (t.id === tripId ? resetTrip : t));
    this.saveTripHistory(updated);
    return { trips: updated, updatedTrip: resetTrip };
  }
}

export const tripStorage = TripStorageService.getInstance();
