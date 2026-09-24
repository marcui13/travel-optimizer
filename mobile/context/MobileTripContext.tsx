import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Trip } from '@domain/types';
import { getEuropeGrandTourSampleTrip } from '@domain/tripDefaults';
import * as storage from '../services/mobileStorage';

interface MobileTripContextType {
  trip: Trip;
  savedTrips: Trip[];
  activeTripId: string;
  canUndo: boolean;
  canRedo: boolean;
  updateTrip: (newTrip: Trip) => void;
  setActiveTrip: (id: string) => void;
  createTrip: (trip: Trip) => void;
  deleteTrip: (id: string) => void;
  duplicateTrip: (id: string, copyLabel?: string) => Trip | null;
  resetTrip: (
    id: string,
    options: {
      mode: 'shift' | 'baseline' | 'markPlanned' | 'editParams';
      newStartDate?: string;
      customTrip?: Trip;
    }
  ) => Trip | null;
  undo: () => void;
  redo: () => void;
  reloadFromStorage: () => void;
}

const MobileTripContext = createContext<MobileTripContextType | null>(null);

export const MobileTripProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [savedTrips, setSavedTrips] = useState<Trip[]>(() => storage.loadTripHistory());
  const [activeTripId, setActiveTripIdState] = useState<string>(() => storage.getActiveTripId(savedTrips));

  // In-memory undo/redo history for the active trip
  const [history, setHistory] = useState<Trip[]>(() => {
    const active = savedTrips.find((t) => t.id === activeTripId) || savedTrips[0] || getEuropeGrandTourSampleTrip();
    return [active];
  });
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const historyIndexRef = useRef(historyIndex);
  historyIndexRef.current = historyIndex;

  const currentTrip: Trip = history[historyIndex] || savedTrips[0] || getEuropeGrandTourSampleTrip();

  // Switch active trip
  const setActiveTrip = useCallback((id: string) => {
    storage.setActiveTripId(id);
    setActiveTripIdState(id);
    const target = savedTrips.find((t) => t.id === id) || savedTrips[0];
    if (target) {
      setHistory([target]);
      setHistoryIndex(0);
    }
  }, [savedTrips]);

  // Update trip with undo/redo snapshot and persistent storage
  const updateTrip = useCallback((newTrip: Trip) => {
    const tripWithTimestamp = {
      ...newTrip,
      updatedAt: new Date().toISOString(),
    };

    // Push new snapshot into history (clearing redos)
    setHistory((prev) => {
      const upToCurrent = prev.slice(0, historyIndexRef.current + 1);
      return [...upToCurrent, tripWithTimestamp];
    });
    setHistoryIndex((prev) => prev + 1);

    // Persist in library
    const updatedLibrary = storage.upsertTrip(tripWithTimestamp);
    setSavedTrips(updatedLibrary);
  }, []);

  const createTrip = useCallback((newTrip: Trip) => {
    const updatedLibrary = storage.upsertTrip(newTrip);
    storage.setActiveTripId(newTrip.id);
    setSavedTrips(updatedLibrary);
    setActiveTripIdState(newTrip.id);
    setHistory([newTrip]);
    setHistoryIndex(0);
  }, []);

  const deleteTrip = useCallback((id: string) => {
    const { trips, nextActiveTripId } = storage.deleteTrip(id);
    setSavedTrips(trips);
    setActiveTrip(nextActiveTripId);
  }, [setActiveTrip]);

  const duplicateTrip = useCallback((id: string, copyLabel?: string): Trip | null => {
    const { trips, newTrip } = storage.duplicateTrip(id, copyLabel);
    setSavedTrips(trips);
    if (newTrip) {
      setActiveTrip(newTrip.id);
    }
    return newTrip;
  }, [setActiveTrip]);

  const resetTrip = useCallback((
    id: string,
    options: {
      mode: 'shift' | 'baseline' | 'markPlanned' | 'editParams';
      newStartDate?: string;
      customTrip?: Trip;
    }
  ): Trip | null => {
    const { trips, updatedTrip } = storage.resetTrip(id, options);
    setSavedTrips(trips);
    if (updatedTrip) {
      if (updatedTrip.id === activeTripId) {
        setHistory([updatedTrip]);
        setHistoryIndex(0);
      }
    }
    return updatedTrip;
  }, [activeTripId]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      const reverted = history[nextIndex];
      const updatedLibrary = storage.upsertTrip(reverted);
      setSavedTrips(updatedLibrary);
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      const advanced = history[nextIndex];
      const updatedLibrary = storage.upsertTrip(advanced);
      setSavedTrips(updatedLibrary);
    }
  }, [historyIndex, history]);

  const reloadFromStorage = useCallback(() => {
    const loaded = storage.loadTripHistory();
    const activeId = storage.getActiveTripId(loaded);
    setSavedTrips(loaded);
    setActiveTripIdState(activeId);
    const active = loaded.find((t) => t.id === activeId) || loaded[0] || getEuropeGrandTourSampleTrip();
    setHistory([active]);
    setHistoryIndex(0);
  }, []);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  useEffect(() => {
    storage.hydrateStorageAsync().then(() => {
      reloadFromStorage();
    });
  }, [reloadFromStorage]);

  return (
    <MobileTripContext.Provider
      value={{
        trip: currentTrip,
        savedTrips,
        activeTripId,
        canUndo,
        canRedo,
        updateTrip,
        setActiveTrip,
        createTrip,
        deleteTrip,
        duplicateTrip,
        resetTrip,
        undo,
        redo,
        reloadFromStorage,
      }}
    >
      {children}
    </MobileTripContext.Provider>
  );
};

export function useMobileTrip(): MobileTripContextType {
  const context = useContext(MobileTripContext);
  if (!context) {
    throw new Error('useMobileTrip must be used within a MobileTripProvider');
  }
  return context;
}
