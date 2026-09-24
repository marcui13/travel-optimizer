import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Trip,
  OptimizationResult,
  Event,
  Reservation,
  Constraint,
  TravelPreferences,
} from './domain/types';
import { getEuropeGrandTourSampleTrip } from './domain/tripDefaults';
import { validateTrip } from './domain/validation';
import { I18nProvider, useI18n } from './i18n/I18nContext';
import { Header } from './components/layout/Header';
import { StatsBar } from './components/layout/StatsBar';
import { Footer } from './components/layout/Footer';
import { InteractiveMap } from './components/map/InteractiveMap';
import { TimelineView } from './components/itinerary/TimelineView';
import { CalendarView } from './components/calendar/CalendarView';
import { ConstraintsPanel } from './components/itinerary/ConstraintsPanel';
import { AssistantPanel } from './components/assistant/AssistantPanel';
import { CreateTripModal } from './components/modals/CreateTripModal';
import { ImageUploadModal } from './components/modals/ImageUploadModal';
import { ReviewExtractedModal } from './components/modals/ReviewExtractedModal';
import { OptimizationDiffModal } from './components/modals/OptimizationDiffModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { ValidationIssuesModal } from './components/modals/ValidationIssuesModal';
import { TripHistoryModal } from './components/modals/TripHistoryModal';
import { ResetTripModal } from './components/modals/ResetTripModal';
import { ShareModal } from './components/modals/ShareModal';
import { ExportToCalendarModal } from './components/modals/ExportToCalendarModal';
import { SharedTripPreviewModal } from './components/modals/SharedTripPreviewModal';
import { CollabNotificationToast, CollabToastData } from './components/common/CollabNotificationToast';
import { CompletedTripBanner } from './components/layout/CompletedTripBanner';
import { VisionExtractionResult } from './services/ai/visionExtractor';
import { defaultOptimizer } from './services/optimization/optimizer';
import { tripStorage } from './services/storage/tripStorageService';
import {
  decodeTripFromShareUrl,
  extractSharePayloadFromLocation,
  validateAndSanitizeTripJson,
} from './services/sharing/shareService';
import { collabEngine } from './services/collaboration/collabEngine';
import { CollaborationState } from './services/collaboration/types';
import {
  ListOrdered,
  Calendar as CalendarIcon,
  ShieldAlert,
  Map as MapIcon,
  SlidersHorizontal,
  UploadCloud,
} from 'lucide-react';

const initialSharedTrip: Trip | null = (() => {
  if (typeof window === 'undefined') return null;
  try {
    const payload = extractSharePayloadFromLocation();
    if (payload) {
      return decodeTripFromShareUrl(payload);
    }
  } catch (err) {
    console.warn('[App] Failed to parse initial shared trip from location:', err);
  }
  return null;
})();

const AppInner: React.FC = () => {
  const { t, lang } = useI18n();

  // 1. Persistent Trips Library
  const [savedTrips, setSavedTrips] = useState<Trip[]>(() => {
    const loaded = tripStorage.loadTripHistory();
    if (initialSharedTrip) {
      return tripStorage.upsertTripInHistory(initialSharedTrip);
    }
    return loaded;
  });
  const [activeTripId, setActiveTripId] = useState<string>(() => {
    if (initialSharedTrip) {
      tripStorage.setActiveTripId(initialSharedTrip.id);
      return initialSharedTrip.id;
    }
    return tripStorage.getActiveTripId(savedTrips);
  });

  // 2. Core Canonical Active Trip State & Undo/Redo History
  const [history, setHistory] = useState<Trip[]>(() => {
    if (initialSharedTrip) {
      return [initialSharedTrip];
    }
    const active = savedTrips.find((t) => t.id === activeTripId) || savedTrips[0] || getEuropeGrandTourSampleTrip();
    return [active];
  });

  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const historyIndexRef = useRef(historyIndex);
  historyIndexRef.current = historyIndex;

  const currentTrip: Trip = history[historyIndex] || savedTrips[0] || getEuropeGrandTourSampleTrip();

  // Sync active trip changes to trip storage library
  useEffect(() => {
    if (currentTrip && currentTrip.id) {
      setSavedTrips((prev) => {
        const idx = prev.findIndex((t) => t.id === currentTrip.id);
        if (idx >= 0 && prev[idx] === currentTrip) return prev;
        return tripStorage.upsertTripInHistory(currentTrip);
      });
    }
  }, [currentTrip]);

  const updateTrip = useCallback((newTrip: Trip, broadcastDescription?: string) => {
    setHistory((prev) => {
      const updated = prev.slice(0, historyIndex + 1);
      return [...updated, newTrip];
    });
    setHistoryIndex((prev) => prev + 1);

    if (collabEngine.getState().isConnected) {
      collabEngine.broadcastTripUpdate(newTrip, broadcastDescription || 'itinerario actualizado');
    }
  }, [historyIndex]);

  const handleUndo = () => {
    if (historyIndex > 0) setHistoryIndex(historyIndex - 1);
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) setHistoryIndex(historyIndex + 1);
  };

  // 2. Deterministic Validation
  const validationIssues = validateTrip(currentTrip);

  // 3. Selection & Synchronization State
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);

  // 4. Optimization Proposal & Map Diff
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [showOptimizationDiff, setShowOptimizationDiff] = useState(false);

  // 5. Views & Modals
  const [activeView, setActiveView] = useState<'split' | 'map' | 'timeline' | 'calendar'>('split');
  const [itineraryTab, setItineraryTab] = useState<'timeline' | 'calendar' | 'constraints'>('timeline');
  const [mobileSplitTab, setMobileSplitTab] = useState<'itinerary' | 'map' | 'assistant'>('itinerary');
  const [companionTab, setCompanionTab] = useState<'map' | 'assistant'>('map');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isOptimizationDiffOpen, setIsOptimizationDiffOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isValidationOpen, setIsValidationOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [tripToReset, setTripToReset] = useState<Trip | null>(null);
  const [isExportCalendarOpen, setIsExportCalendarOpen] = useState(false);

  // Sharing & Collaboration State
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareInitialTab, setShareInitialTab] = useState<'share' | 'collab'>('share');
  const [sharedTripToPreview, setSharedTripToPreview] = useState<Trip | null>(null);
  const [sharedTripSourceType, setSharedTripSourceType] = useState<'link' | 'file'>('link');
  const [isDraggingJsonFile, setIsDraggingJsonFile] = useState(false);
  const [collabState, setCollabState] = useState<CollaborationState>(() => collabEngine.getState());
  const [collabToast, setCollabToast] = useState<CollabToastData | null>(null);

  // Keep collab engine currentTripRef up to date
  useEffect(() => {
    collabEngine.setCurrentTripRef(currentTrip);
  }, [currentTrip]);

  // Subscribe to collab engine events
  useEffect(() => {
    const unsubscribe = collabEngine.subscribe({
      onStateChange: (state) => {
        setCollabState(state);
      },
      onTripRemoteUpdate: (trip, sender, description) => {
        setHistory((prev) => {
          const updated = prev.slice(0, historyIndexRef.current + 1);
          return [...updated, trip];
        });
        setHistoryIndex((prev) => prev + 1);

        setCollabToast({
          id: String(Date.now()),
          senderName: sender.name,
          senderColor: sender.color,
          message: `${sender.name} actualizó el itinerario: ${description || 'cambios aplicados'}`,
          type: 'update',
        });
      },
      onCollaboratorJoined: (collaborator) => {
        setCollabToast({
          id: String(Date.now()),
          senderName: collaborator.name,
          senderColor: collaborator.color,
          message: `${collaborator.name} se unió al itinerario`,
          type: 'join',
        });
      },
      onCollaboratorLeft: (collaborator) => {
        setCollabToast({
          id: String(Date.now()),
          senderName: collaborator.name,
          senderColor: collaborator.color,
          message: `${collaborator.name} salió del itinerario`,
          type: 'leave',
        });
      },
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Direct opening of shared trip on mount
  useEffect(() => {
    if (initialSharedTrip) {
      try {
        confetti({
          particleCount: 65,
          spread: 75,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }

      setCollabToast({
        id: 'shared-trip-initial',
        senderName: 'Travel Optimizer',
        senderColor: '#10b981',
        message: `Itinerario "${initialSharedTrip.name}" abierto directamente y guardado en tus viajes`,
        type: 'update',
      });

      // Clean the URL hash or search so it looks clean: https://travel-optimizer-tau.vercel.app/
      if (typeof window !== 'undefined' && (window.location.hash.includes('#share=') || window.location.search.includes('share='))) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    } else if (typeof window !== 'undefined' && window.location.hash.startsWith('#collab=')) {
      const roomCode = window.location.hash.slice(8).trim().toUpperCase();
      if (roomCode) {
        collabEngine.joinRoom(roomCode);
        setIsShareOpen(true);
        setShareInitialTab('collab');
      }
    }
  }, []);

  // Listen for hashchange so opening or pasting a share link while in the app opens it directly
  useEffect(() => {
    const handleHashChange = () => {
      const payload = extractSharePayloadFromLocation();
      if (payload) {
        const decoded = decodeTripFromShareUrl(payload);
        if (decoded) {
          const updated = tripStorage.upsertTripInHistory(decoded);
          tripStorage.setActiveTripId(decoded.id);
          setSavedTrips(updated);
          setActiveTripId(decoded.id);
          setHistory([decoded]);
          setHistoryIndex(0);
          handleClearSelection();

          try {
            confetti({
              particleCount: 65,
              spread: 75,
              origin: { y: 0.6 },
            });
          } catch {
            // ignore
          }

          setCollabToast({
            id: String(Date.now()),
            senderName: 'Travel Optimizer',
            senderColor: '#10b981',
            message: `Itinerario "${decoded.name}" abierto directamente`,
            type: 'update',
          });

          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', window.location.pathname);
          }
        }
      } else if (typeof window !== 'undefined' && window.location.hash.startsWith('#collab=')) {
        const roomCode = window.location.hash.slice(8).trim().toUpperCase();
        if (roomCode) {
          collabEngine.joinRoom(roomCode);
          setIsShareOpen(true);
          setShareInitialTab('collab');
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Upload review temporary state
  const [extractedReviewData, setExtractedReviewData] = useState<VisionExtractionResult | null>(null);

  // Handlers
  const handleSelectDay = (date: string, destinationId?: string) => {
    setSelectedDayDate(date);
    if (destinationId) setSelectedDestinationId(destinationId);
    setSelectedSegmentId(null);
  };

  const handleSelectDestination = (destId: string) => {
    setSelectedDestinationId(destId);
    const day = currentTrip.itinerary.days.find((d) => d.destinationId === destId);
    if (day) setSelectedDayDate(day.date);
    setSelectedSegmentId(null);
  };

  const handleSelectSegment = (segmentId: string) => {
    setSelectedSegmentId(segmentId);
    const seg = currentTrip.transportation.find((s) => s.id === segmentId);
    if (seg?.date) setSelectedDayDate(seg.date);
  };

  const handleClearSelection = () => {
    setSelectedDestinationId(null);
    setSelectedSegmentId(null);
    setSelectedDayDate(null);
  };

  const handleApplyOptimization = (result: OptimizationResult) => {
    const updatedTrip: Trip = {
      ...currentTrip,
      destinations: result.proposedDestinations || currentTrip.destinations,
      transportation: result.proposedTransportation || currentTrip.transportation,
      itinerary: result.proposedItinerary || currentTrip.itinerary,
      updatedAt: new Date().toISOString(),
    };
    updateTrip(updatedTrip);
    setOptimizationResult(null);
    setShowOptimizationDiff(false);

    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
  };

  const handleRequestOptimization = async (profile: 'efficient' | 'balanced' | 'relaxed') => {
    const res = await defaultOptimizer.optimize(currentTrip, { profile });
    setOptimizationResult(res);
    setIsOptimizationDiffOpen(true);
  };

  const handleExtractedReady = (result: VisionExtractionResult) => {
    setExtractedReviewData(result);
    setIsReviewOpen(true);
  };

  const handleConfirmExtracted = (events: Event[], reservations: Reservation[]) => {
    const updatedTrip: Trip = {
      ...currentTrip,
      events: [...currentTrip.events, ...events],
      reservations: [...currentTrip.reservations, ...reservations],
      updatedAt: new Date().toISOString(),
    };
    updateTrip(updatedTrip);
  };

  const handleResetToDemo = () => {
    const demo = getEuropeGrandTourSampleTrip();
    updateTrip(demo);
    setSelectedDestinationId(null);
    setSelectedSegmentId(null);
    setSelectedDayDate(null);
    setOptimizationResult(null);
    setShowOptimizationDiff(false);
  };

  const handleSelectTripFromHistory = (selected: Trip) => {
    tripStorage.setActiveTripId(selected.id);
    setActiveTripId(selected.id);
    setHistory([selected]);
    setHistoryIndex(0);
    handleClearSelection();
    setOptimizationResult(null);
    setShowOptimizationDiff(false);
  };

  const handleDuplicateTrip = (tripId: string) => {
    const { trips } = tripStorage.duplicateTrip(tripId, 'Copia');
    setSavedTrips(trips);
  };

  const handleDeleteTrip = (tripId: string) => {
    const { trips, nextActiveTripId } = tripStorage.deleteTripFromHistory(tripId);
    setSavedTrips(trips);
    if (tripId === activeTripId) {
      const next = trips.find((t) => t.id === nextActiveTripId) || trips[0];
      setActiveTripId(next.id);
      setHistory([next]);
      setHistoryIndex(0);
      handleClearSelection();
    }
  };

  const handleSaveCurrentAsCopy = () => {
    const { trips } = tripStorage.duplicateTrip(currentTrip.id, 'Copia');
    setSavedTrips(trips);
  };

  const handleOpenResetForTrip = (trip: Trip) => {
    setTripToReset(trip);
    setIsResetOpen(true);
  };

  const handleConfirmReset = (
    tripId: string,
    options: {
      mode: 'shift' | 'baseline' | 'markPlanned' | 'editParams';
      newStartDate?: string;
      customTrip?: Trip;
    }
  ) => {
    const { trips, updatedTrip } = tripStorage.resetTripInHistory(tripId, options);
    setSavedTrips(trips);
    if (updatedTrip && tripId === currentTrip.id) {
      setHistory([updatedTrip]);
      setHistoryIndex(0);
      handleClearSelection();
      setOptimizationResult(null);
      setShowOptimizationDiff(false);
    }
  };

  const handleUpdateConstraints = (constraints: Constraint[]) => {
    updateTrip({ ...currentTrip, constraints });
  };

  const handleUpdatePreferences = (preferences: TravelPreferences) => {
    updateTrip({ ...currentTrip, preferences });
  };

  const handleAcceptSharedTrip = (trip: Trip) => {
    let tripToSave = trip;
    if (sharedTripSourceType === 'file' && savedTrips.some((t) => t.id === trip.id)) {
      tripToSave = {
        ...trip,
        id: `trip-${Date.now()}`,
      };
    }
    const updated = tripStorage.upsertTripInHistory(tripToSave);
    tripStorage.setActiveTripId(tripToSave.id);
    setSavedTrips(updated);
    setActiveTripId(tripToSave.id);
    setHistory([tripToSave]);
    setHistoryIndex(0);
    handleClearSelection();
    setSharedTripToPreview(null);
    if (window.location.hash.startsWith('#share=')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    setCollabToast({
      id: `toast-${Date.now()}`,
      senderName: lang === 'es' ? 'Itinerario Guardado' : 'Itinerary Saved',
      senderColor: '#10b981',
      message: lang === 'es' ? `¡"${tripToSave.name}" se guardó en tus viajes!` : `"${tripToSave.name}" was saved to your trips!`,
      type: 'update',
    });
  };

  const handleViewOnlySharedTrip = (trip: Trip) => {
    setHistory([trip]);
    setHistoryIndex(0);
    handleClearSelection();
    setSharedTripToPreview(null);
    if (window.location.hash.startsWith('#share=')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  const handleImportTripFromFile = (file: File) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json') && file.type && !file.type.includes('json')) {
      setCollabToast({
        id: `err-${Date.now()}`,
        senderName: lang === 'es' ? 'Archivo no válido' : 'Invalid File',
        senderColor: '#ef4444',
        message: lang === 'es' ? 'Por favor selecciona un archivo con formato .json' : 'Please select a valid .json file',
        type: 'update',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = validateAndSanitizeTripJson(content);
      if (result.success && result.trip) {
        setSharedTripSourceType('file');
        setSharedTripToPreview(result.trip);
        setIsHistoryOpen(false);
        setIsShareOpen(false);
      } else {
        setCollabToast({
          id: `err-${Date.now()}`,
          senderName: lang === 'es' ? 'Error al importar' : 'Import Error',
          senderColor: '#ef4444',
          message: result.error || (lang === 'es' ? 'El archivo JSON no contiene un itinerario válido.' : 'The JSON file does not contain a valid itinerary.'),
          type: 'update',
        });
      }
    };
    reader.onerror = () => {
      setCollabToast({
        id: `err-${Date.now()}`,
        senderName: lang === 'es' ? 'Error de lectura' : 'Read Error',
        senderColor: '#ef4444',
        message: lang === 'es' ? 'No se pudo leer el archivo seleccionado.' : 'Could not read the selected file.',
        type: 'update',
      });
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.types?.includes('Files')) {
      setIsDraggingJsonFile(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingJsonFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingJsonFile(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleImportTripFromFile(files[0]);
    }
  };

  const handleOpenShare = (tab: 'share' | 'collab' = 'share') => {
    setShareInitialTab(tab);
    setIsShareOpen(true);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200 relative"
    >
      {/* Global Drag & Drop .json Overlay */}
      {isDraggingJsonFile && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-fade-in"
        >
          <div className="border-2 border-dashed border-emerald-500/80 rounded-3xl p-10 max-w-md w-full flex flex-col items-center justify-center text-center bg-slate-900/60 shadow-2xl space-y-4 pointer-events-none">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-bounce shadow-lg shadow-emerald-500/10">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                {t.modals.importTrip.dropOverlayTitle}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {t.modals.importTrip.dropOverlaySubtitle}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 1. App Header */}
      <Header
        trip={currentTrip}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        activeView={activeView}
        tripsCount={savedTrips.length}
        isCollabConnected={collabState.isConnected}
        collabRoomId={collabState.roomId}
        collabPeersCount={collabState.peers.length}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onChangeView={setActiveView}
        onOpenCreateModal={() => setIsCreateOpen(true)}
        onOpenUploadModal={() => setIsUploadOpen(true)}
        onOpenSettingsModal={() => setIsSettingsOpen(true)}
        onOpenHistoryModal={() => setIsHistoryOpen(true)}
        onOpenResetModal={() => handleOpenResetForTrip(currentTrip)}
        onResetToDemoTrip={handleResetToDemo}
        onOpenShareModal={handleOpenShare}
        onImportTripFile={handleImportTripFromFile}
      />

      {/* Completed Trip Notification Banner */}
      <CompletedTripBanner
        trip={currentTrip}
        onOpenResetModal={() => handleOpenResetForTrip(currentTrip)}
        onOpenHistoryModal={() => setIsHistoryOpen(true)}
      />

      {/* 2. Calculated Statistics Bar */}
      <StatsBar
        trip={currentTrip}
        validationIssues={validationIssues}
        onOpenOptimization={() => {
          setActiveView('split');
          setCompanionTab('assistant');
          setMobileSplitTab('assistant');
          handleRequestOptimization('efficient');
        }}
        onOpenValidationDetails={() => setIsValidationOpen(true)}
      />

      {/* 3. Main Workspace Area */}
      <main className="flex-1 p-2 sm:p-4 max-w-[1680px] w-full mx-auto flex flex-col gap-2.5 sm:gap-4">
        {/* Full Map View */}
        {activeView === 'map' && (
          <div className="w-full h-[calc(100vh-170px)] min-h-[520px] rounded-xl overflow-hidden shadow-xl flex flex-col">
            <InteractiveMap
              destinations={currentTrip.destinations}
              transportation={currentTrip.transportation}
              selectedDestinationId={selectedDestinationId}
              selectedSegmentId={selectedSegmentId}
              selectedDayDate={selectedDayDate}
              optimizationResult={optimizationResult}
              showOptimizationDiff={showOptimizationDiff}
              onSelectDestination={handleSelectDestination}
              onSelectSegment={handleSelectSegment}
              onClearSelection={handleClearSelection}
            />
          </div>
        )}

        {/* Full Timeline View */}
        {activeView === 'timeline' && (
          <div className="max-w-4xl mx-auto w-full py-1 sm:py-2">
            <TimelineView
              trip={currentTrip}
              selectedDestinationId={selectedDestinationId}
              selectedSegmentId={selectedSegmentId}
              selectedDayDate={selectedDayDate}
              onSelectDay={handleSelectDay}
              onSelectDestination={handleSelectDestination}
              onSelectSegment={handleSelectSegment}
            />
          </div>
        )}

        {/* Full Calendar View */}
        {activeView === 'calendar' && (
          <div className="max-w-5xl mx-auto w-full py-1 sm:py-2">
            <CalendarView
              trip={currentTrip}
              selectedDayDate={selectedDayDate}
              onSelectDay={handleSelectDay}
              onOpenExportCalendar={() => setIsExportCalendarOpen(true)}
            />
          </div>
        )}

        {/* Split Planner View (Desktop Core Side-by-Side Layout & Mobile Segmented Controls) */}
        {activeView === 'split' && (
          <div className="flex flex-col gap-2.5 sm:gap-4">
            {/* Mobile View Segmented Controls (Only visible on screens < 1024px) */}
            <div
              role="tablist"
              aria-label="Mobile workspace view"
              className="grid grid-cols-3 lg:hidden bg-slate-900/95 border border-slate-800 rounded-lg p-1 gap-1 text-xs font-medium sticky top-[48px] sm:top-[53px] z-20 shadow-md backdrop-blur-md"
            >
              <button
                role="tab"
                id="mobile-tab-itinerary"
                aria-selected={mobileSplitTab === 'itinerary'}
                aria-controls="mobile-panel-itinerary"
                onClick={() => setMobileSplitTab('itinerary')}
                className={`py-2 px-1 rounded flex items-center justify-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  mobileSplitTab === 'itinerary'
                    ? 'bg-slate-800 text-emerald-400 font-semibold border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t.header.timeline}</span>
              </button>

              <button
                role="tab"
                id="mobile-tab-map"
                aria-selected={mobileSplitTab === 'map'}
                aria-controls="mobile-panel-companion"
                onClick={() => {
                  setMobileSplitTab('map');
                  setCompanionTab('map');
                }}
                className={`py-2 px-1 rounded flex items-center justify-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  mobileSplitTab === 'map'
                    ? 'bg-slate-800 text-emerald-400 font-semibold border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t.header.mapFocus}</span>
              </button>

              <button
                role="tab"
                id="mobile-tab-assistant"
                aria-selected={mobileSplitTab === 'assistant'}
                aria-controls="mobile-panel-companion"
                onClick={() => {
                  setMobileSplitTab('assistant');
                  setCompanionTab('assistant');
                }}
                className={`py-2 px-1 rounded flex items-center justify-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  mobileSplitTab === 'assistant'
                    ? 'bg-slate-800 text-emerald-400 font-semibold border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                <span className="truncate">{t.header.assistant}</span>
              </button>
            </div>

            {/* Desktop Side-by-Side Grid (Itinerary Planner on Left, Companion Map/Assistant on Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 lg:items-start">
              {/* Left Column: Itinerary Workspace (58% desktop width) */}
              <div
                id="mobile-panel-itinerary"
                className={`lg:col-span-7 xl:col-span-7 bg-transparent sm:bg-slate-900/40 border-0 sm:border sm:border-slate-800 rounded-none sm:rounded-xl p-0 sm:p-5 ${
                  mobileSplitTab === 'itinerary' ? 'block' : 'hidden lg:block'
                }`}
              >
                {/* Workspace Sub-Navigation Tabs */}
                <div
                  role="tablist"
                  aria-label="Itinerary sections"
                  className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-slate-800 mb-3 sm:mb-4 px-1 sm:px-0"
                >
                  <div className="flex items-center gap-1.5">
                    <button
                      role="tab"
                      id="tab-timeline"
                      aria-selected={itineraryTab === 'timeline'}
                      aria-controls="tabpanel-timeline"
                      onClick={() => setItineraryTab('timeline')}
                      className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                        itineraryTab === 'timeline'
                          ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-xs'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                    >
                      <ListOrdered className="w-3.5 h-3.5" />
                      <span>{t.header.timeline}</span>
                    </button>

                    <button
                      role="tab"
                      id="tab-calendar"
                      aria-selected={itineraryTab === 'calendar'}
                      aria-controls="tabpanel-calendar"
                      onClick={() => setItineraryTab('calendar')}
                      className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                        itineraryTab === 'calendar'
                          ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-xs'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                    >
                      <CalendarIcon className="w-3.5 h-3.5" />
                      <span>{t.header.calendar}</span>
                    </button>

                    <button
                      role="tab"
                      id="tab-constraints"
                      aria-selected={itineraryTab === 'constraints'}
                      aria-controls="tabpanel-constraints"
                      onClick={() => setItineraryTab('constraints')}
                      className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                        itineraryTab === 'constraints'
                          ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-xs'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>{t.constraints.travelPreferences}</span>
                    </button>
                  </div>
                </div>

                {/* Active Tab Content */}
                {itineraryTab === 'timeline' && (
                  <div
                    role="tabpanel"
                    id="tabpanel-timeline"
                    aria-labelledby="tab-timeline"
                    tabIndex={0}
                    className="focus-visible:outline-none"
                  >
                    <TimelineView
                      trip={currentTrip}
                      selectedDestinationId={selectedDestinationId}
                      selectedSegmentId={selectedSegmentId}
                      selectedDayDate={selectedDayDate}
                      onSelectDay={handleSelectDay}
                      onSelectDestination={handleSelectDestination}
                      onSelectSegment={handleSelectSegment}
                    />
                  </div>
                )}

                {itineraryTab === 'calendar' && (
                  <div
                    role="tabpanel"
                    id="tabpanel-calendar"
                    aria-labelledby="tab-calendar"
                    tabIndex={0}
                    className="focus-visible:outline-none"
                  >
                    <CalendarView
                      trip={currentTrip}
                      selectedDayDate={selectedDayDate}
                      onSelectDay={handleSelectDay}
                      onOpenExportCalendar={() => setIsExportCalendarOpen(true)}
                    />
                  </div>
                )}

                {itineraryTab === 'constraints' && (
                  <div
                    role="tabpanel"
                    id="tabpanel-constraints"
                    aria-labelledby="tab-constraints"
                    tabIndex={0}
                    className="focus-visible:outline-none"
                  >
                    <ConstraintsPanel
                      trip={currentTrip}
                      onUpdateConstraints={handleUpdateConstraints}
                      onUpdatePreferences={handleUpdatePreferences}
                    />
                  </div>
                )}
              </div>

              {/* Right Column: Sticky Companion Container (Map or Assistant) */}
              <div
                id="mobile-panel-companion"
                className={`lg:col-span-5 xl:col-span-5 lg:sticky lg:top-24 flex flex-col gap-2.5 h-[calc(100dvh-175px)] min-h-[380px] lg:h-[calc(100vh-140px)] lg:min-h-[540px] lg:max-h-[850px] ${
                  mobileSplitTab === 'itinerary' ? 'hidden lg:flex' : 'flex'
                }`}
              >
                {/* Companion Tab Switcher (Desktop visible) */}
                <div
                  role="tablist"
                  aria-label="Companion view toggle"
                  className="hidden lg:flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs"
                >
                  <div className="flex items-center gap-1 w-full">
                    <button
                      role="tab"
                      id="desktop-companion-map"
                      aria-selected={companionTab === 'map'}
                      onClick={() => setCompanionTab('map')}
                      className={`flex-1 py-1.5 px-3 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                        companionTab === 'map'
                          ? 'bg-slate-800 text-slate-100 font-semibold border border-slate-700 shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <MapIcon className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{t.header.mapFocus}</span>
                    </button>

                    <button
                      role="tab"
                      id="desktop-companion-assistant"
                      aria-selected={companionTab === 'assistant'}
                      onClick={() => setCompanionTab('assistant')}
                      className={`flex-1 py-1.5 px-3 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                        companionTab === 'assistant'
                          ? 'bg-slate-800 text-slate-100 font-semibold border border-slate-700 shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{t.header.assistant}</span>
                    </button>
                  </div>
                </div>

                {/* Active Companion Content */}
                <div className="flex-1 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col">
                  {companionTab === 'map' ? (
                    <InteractiveMap
                      destinations={currentTrip.destinations}
                      transportation={currentTrip.transportation}
                      selectedDestinationId={selectedDestinationId}
                      selectedSegmentId={selectedSegmentId}
                      selectedDayDate={selectedDayDate}
                      optimizationResult={optimizationResult}
                      showOptimizationDiff={showOptimizationDiff}
                      onSelectDestination={handleSelectDestination}
                      onSelectSegment={handleSelectSegment}
                      onClearSelection={handleClearSelection}
                    />
                  ) : (
                    <AssistantPanel
                      trip={currentTrip}
                      validationIssues={validationIssues}
                      optimizationResult={optimizationResult}
                      onApplyOptimization={handleApplyOptimization}
                      onApplyWhatIfTrip={updateTrip}
                      onRequestOptimization={handleRequestOptimization}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 4. Footer */}
      <Footer />

      {/* 5. Modals */}
      <CreateTripModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onTripCreated={(newTrip) => {
          const updated = tripStorage.upsertTripInHistory(newTrip);
          tripStorage.setActiveTripId(newTrip.id);
          setSavedTrips(updated);
          setActiveTripId(newTrip.id);
          setHistory([newTrip]);
          setHistoryIndex(0);
          handleClearSelection();
        }}
      />

      <TripHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        trips={savedTrips}
        activeTripId={currentTrip.id}
        onSelectTrip={handleSelectTripFromHistory}
        onDuplicateTrip={handleDuplicateTrip}
        onDeleteTrip={handleDeleteTrip}
        onOpenResetModal={handleOpenResetForTrip}
        onOpenCreateModal={() => setIsCreateOpen(true)}
        onSaveCurrentAsCopy={handleSaveCurrentAsCopy}
        onImportTripFile={handleImportTripFromFile}
      />

      {tripToReset && (
        <ResetTripModal
          isOpen={isResetOpen}
          onClose={() => {
            setIsResetOpen(false);
            setTripToReset(null);
          }}
          trip={tripToReset}
          onConfirmReset={handleConfirmReset}
        />
      )}

      <ImageUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onExtractedReady={handleExtractedReady}
      />

      {extractedReviewData && (
        <ReviewExtractedModal
          isOpen={isReviewOpen}
          onClose={() => {
            setIsReviewOpen(false);
            setExtractedReviewData(null);
          }}
          summary={extractedReviewData.summary}
          initialItems={extractedReviewData.items}
          trip={currentTrip}
          onConfirmAddItems={handleConfirmExtracted}
        />
      )}

      <OptimizationDiffModal
        isOpen={isOptimizationDiffOpen}
        trip={currentTrip}
        initialResult={optimizationResult}
        onClose={() => setIsOptimizationDiffOpen(false)}
        onApplyOptimization={handleApplyOptimization}
        onToggleMapPreview={(active) => setShowOptimizationDiff(active)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsSaved={() => {}}
      />

      <ValidationIssuesModal
        isOpen={isValidationOpen}
        onClose={() => setIsValidationOpen(false)}
        issues={validationIssues}
      />

      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        trip={currentTrip}
        initialTab={shareInitialTab}
        onImportTripFile={handleImportTripFromFile}
        onOpenExportCalendar={() => setIsExportCalendarOpen(true)}
      />

      <ExportToCalendarModal
        isOpen={isExportCalendarOpen}
        onClose={() => setIsExportCalendarOpen(false)}
        trip={currentTrip}
      />

      {sharedTripToPreview && (
        <SharedTripPreviewModal
          isOpen={!!sharedTripToPreview}
          onClose={() => {
            setSharedTripToPreview(null);
            if (window.location.hash.startsWith('#share=')) {
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
          }}
          sharedTrip={sharedTripToPreview}
          onAcceptAndSave={handleAcceptSharedTrip}
          onViewOnly={handleViewOnlySharedTrip}
          sourceType={sharedTripSourceType}
        />
      )}

      <CollabNotificationToast
        toast={collabToast}
        onDismiss={() => setCollabToast(null)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <I18nProvider>
      <AppInner />
    </I18nProvider>
  );
};
