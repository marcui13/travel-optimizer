import React, { useState, useMemo } from 'react';
import { Trip } from '../../domain/types';
import { useI18n } from '../../i18n/I18nContext';
import { isTripCompleted } from '../../domain/tripHelpers';
import {
  FolderClock,
  X,
  Search,
  CheckCircle2,
  RotateCcw,
  Copy,
  Trash2,
  Plus,
  Calendar,
  MapPin,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useModalA11y } from '../../hooks/useModalA11y';

interface TripHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  trips: Trip[];
  activeTripId: string;
  onSelectTrip: (trip: Trip) => void;
  onDuplicateTrip: (tripId: string) => void;
  onDeleteTrip: (tripId: string) => void;
  onOpenResetModal: (trip: Trip) => void;
  onOpenCreateModal: () => void;
  onSaveCurrentAsCopy?: () => void;
}

export const TripHistoryModal: React.FC<TripHistoryModalProps> = ({
  isOpen,
  onClose,
  trips,
  activeTripId,
  onSelectTrip,
  onDuplicateTrip,
  onDeleteTrip,
  onOpenResetModal,
  onOpenCreateModal,
  onSaveCurrentAsCopy,
}) => {
  const { t } = useI18n();
  const containerRef = useModalA11y(isOpen, onClose);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      const isCompleted = isTripCompleted(trip);
      if (activeTab === 'completed' && !isCompleted) return false;
      if (activeTab === 'active' && isCompleted) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchName = trip.name.toLowerCase().includes(q);
      const matchDests = trip.destinations.some((d) => d.name.toLowerCase().includes(q));
      return matchName || matchDests;
    });
  }, [trips, activeTab, searchQuery]);

  const counts = useMemo(() => {
    let active = 0;
    let completed = 0;
    trips.forEach((trip) => {
      if (isTripCompleted(trip)) completed++;
      else active++;
    });
    return { all: trips.length, active, completed };
  }, [trips]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trip-history-modal-title"
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-800/60 flex items-center justify-center shadow-lg shadow-purple-950/40">
              <FolderClock className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 id="trip-history-modal-title" className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                {t.modals.history.title}
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {trips.length} {t.modals.history.totalTrips}
                </span>
              </h2>
              <p className="text-xs text-slate-400">{t.modals.history.subtitle}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label={t.common.close}
            className="text-slate-400 hover:text-slate-100 p-2 rounded-lg hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Tabs Toolbar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs font-medium">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{t.modals.history.tabAll}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900 text-slate-300 font-mono">
                {counts.all}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'active'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{t.modals.history.tabActivePlanned}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900 text-slate-300 font-mono">
                {counts.active}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('completed')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'completed'
                  ? 'bg-purple-950 text-purple-300 border border-purple-800/60 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{t.modals.history.tabCompleted}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900 text-slate-300 font-mono">
                {counts.completed}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.modals.history.searchPlaceholder}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/70"
            />
          </div>
        </div>

        {/* Trips Cards List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {filteredTrips.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-950/40 rounded-xl border border-slate-800/60">
              <FolderClock className="w-10 h-10 text-slate-600 mx-auto mb-3 opacity-60" />
              <p className="text-sm text-slate-400">{t.modals.history.noTripsFound}</p>
            </div>
          ) : (
            filteredTrips.map((trip) => {
              const isActive = trip.id === activeTripId;
              const isCompleted = isTripCompleted(trip);
              const daysCount = trip.itinerary?.days?.length || 1;
              const citiesCount = trip.destinations?.length || 0;

              return (
                <div
                  key={trip.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-slate-800/60 border-emerald-500/70 ring-1 ring-emerald-500/20'
                      : 'bg-slate-950/70 hover:bg-slate-800/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-slate-100 text-sm truncate">
                          {trip.name}
                        </span>

                        {/* Status badge */}
                        {isCompleted ? (
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-purple-950/90 text-purple-300 border border-purple-800/70">
                            {t.modals.history.completedTitle}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-blue-950/90 text-blue-300 border border-blue-800/70">
                            {t.modals.history.plannedTitle}
                          </span>
                        )}

                        {isActive && (
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-emerald-950 text-emerald-300 border border-emerald-700/80 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            {t.modals.history.currentBadge}
                          </span>
                        )}
                      </div>

                      {/* Meta dates & stats */}
                      <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {trip.startDate} → {trip.endDate}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {daysCount} {t.modals.history.daysDuration}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {citiesCount} {t.modals.history.citiesCount}
                        </span>
                      </div>

                      {/* Destinations route chain preview */}
                      <div className="flex items-center gap-1 mt-2 text-slate-400 overflow-x-auto py-0.5 text-[11px] font-medium no-scrollbar">
                        {trip.destinations.slice(0, 5).map((d, i) => (
                          <React.Fragment key={d.id || i}>
                            <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300 whitespace-nowrap">
                              {d.name}
                            </span>
                            {i < Math.min(trip.destinations.length - 1, 4) && (
                              <ArrowRight className="w-2.5 h-2.5 text-slate-600 shrink-0" />
                            )}
                          </React.Fragment>
                        ))}
                        {trip.destinations.length > 5 && (
                          <span className="text-slate-500 text-[10px] px-1 whitespace-nowrap">
                            +{trip.destinations.length - 5} más
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      {/* Reset button */}
                      <button
                        onClick={() => onOpenResetModal(trip)}
                        title={t.modals.history.resetTrip}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                          isCompleted
                            ? 'bg-purple-950/80 hover:bg-purple-900/80 text-purple-300 border border-purple-800/80 shadow-sm'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                        }`}
                      >
                        <RotateCcw className="w-3 h-3 text-purple-400" />
                        <span>{t.modals.history.resetTrip}</span>
                      </button>

                      {/* Duplicate button */}
                      <button
                        onClick={() => onDuplicateTrip(trip.id)}
                        title={t.modals.history.duplicateTrip}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete button (with confirmation) */}
                      {confirmDeleteId === trip.id ? (
                        <div className="flex items-center gap-1 bg-rose-950/90 border border-rose-800 rounded-lg p-1">
                          <button
                            onClick={() => {
                              onDeleteTrip(trip.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-0.5 text-[10px] bg-rose-600 hover:bg-rose-500 text-white rounded font-bold"
                          >
                            {t.common.delete}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(trip.id)}
                          title={t.modals.history.deleteTrip}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 border border-slate-800 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Open / Switch trip button */}
                      {!isActive && (
                        <button
                          onClick={() => {
                            onSelectTrip(trip);
                            onClose();
                          }}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm ml-1"
                        >
                          <span>{t.modals.history.loadTrip}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onSaveCurrentAsCopy && (
              <button
                onClick={onSaveCurrentAsCopy}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                <Copy className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.modals.history.saveCurrentAsNew}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenCreateModal();
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-900/30"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.modals.history.createNewTrip}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
