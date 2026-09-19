import React, { useState, useMemo, useEffect } from 'react';
import { Trip } from '../../domain/types';
import { useI18n } from '../../i18n/I18nContext';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  X,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  SlidersHorizontal,
  Train,
  Plane,
  Loader2,
  MapPin,
  Clock,
} from 'lucide-react';
import { useModalA11y } from '../../hooks/useModalA11y';
import { resetTripWithCustomParams } from '../../domain/tripHelpers';

interface ResetTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  onConfirmReset: (
    tripId: string,
    options: {
      mode: 'shift' | 'baseline' | 'markPlanned' | 'editParams';
      newStartDate?: string;
      customTrip?: Trip;
    }
  ) => void;
}

export const ResetTripModal: React.FC<ResetTripModalProps> = ({
  isOpen,
  onClose,
  trip,
  onConfirmReset,
}) => {
  const { t } = useI18n();
  const containerRef = useModalA11y(isOpen, onClose);

  // Mode selection
  const [mode, setMode] = useState<'editParams' | 'shift' | 'baseline' | 'markPlanned'>('editParams');
  const [isRebuilding, setIsRebuilding] = useState(false);

  // Default suggested new start date: next month from today
  const defaultSuggestedStartDate = useMemo(() => {
    const today = new Date();
    return format(addDays(today, 30), 'yyyy-MM-dd');
  }, []);

  // Shift mode state
  const [newStartDate, setNewStartDate] = useState<string>(defaultSuggestedStartDate);

  // Edit parameters state
  const [editedName, setEditedName] = useState(trip.name);
  const [editedStartDate, setEditedStartDate] = useState(trip.startDate);
  const [editedEndDate, setEditedEndDate] = useState(trip.endDate);
  const [cities, setCities] = useState<string[]>(trip.destinations.map((d) => d.name));
  const [newCityInput, setNewCityInput] = useState('');
  const [travelStyle, setTravelStyle] = useState<'relaxed' | 'balanced' | 'intense'>(
    trip.preferences?.travelStyle || 'balanced'
  );
  const [preferTrain, setPreferTrain] = useState(
    trip.preferences?.transportationPreference?.includes('train') ?? true
  );

  // Sync state whenever trip or modal opens
  useEffect(() => {
    if (isOpen) {
      setEditedName(trip.name);
      setEditedStartDate(trip.startDate);
      setEditedEndDate(trip.endDate);
      setCities(trip.destinations.map((d) => d.name));
      setTravelStyle(trip.preferences?.travelStyle || 'balanced');
      setPreferTrain(trip.preferences?.transportationPreference?.includes('train') ?? true);
    }
  }, [trip, isOpen]);

  // Calculate new end date dynamically based on trip duration for shift mode
  const calculatedEndDate = useMemo(() => {
    try {
      const oldStart = parseISO(trip.startDate);
      const oldEnd = parseISO(trip.endDate);
      const totalDays = differenceInCalendarDays(oldEnd, oldStart);
      const newStart = parseISO(newStartDate);
      return format(addDays(newStart, Math.max(0, totalDays)), 'yyyy-MM-dd');
    } catch {
      return newStartDate;
    }
  }, [trip.startDate, trip.endDate, newStartDate]);

  const totalNightsShift = useMemo(() => {
    try {
      return differenceInCalendarDays(parseISO(trip.endDate), parseISO(trip.startDate));
    } catch {
      return 1;
    }
  }, [trip.startDate, trip.endDate]);

  const editedNights = useMemo(() => {
    try {
      return Math.max(1, differenceInCalendarDays(parseISO(editedEndDate), parseISO(editedStartDate)));
    } catch {
      return 1;
    }
  }, [editedStartDate, editedEndDate]);

  if (!isOpen) return null;

  const handleAddCity = (cityName?: string) => {
    const city = (cityName || newCityInput).trim();
    if (!city) return;
    if (!cities.some((c) => c.toLowerCase() === city.toLowerCase())) {
      setCities((prev) => [...prev, city]);
    }
    setNewCityInput('');
  };

  const handleRemoveCity = (indexToRemove: number) => {
    setCities((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleApply = async () => {
    if (mode === 'editParams') {
      if (cities.length === 0) return;
      setIsRebuilding(true);
      try {
        const customTrip = await resetTripWithCustomParams(trip, {
          name: editedName,
          startDate: editedStartDate,
          endDate: editedEndDate,
          cityNames: cities,
          travelStyle,
          preferTrain,
        });

        onConfirmReset(trip.id, {
          mode: 'editParams',
          customTrip,
        });
      } catch (err) {
        console.error('Failed to reset trip with custom params:', err);
      } finally {
        setIsRebuilding(false);
      }
    } else {
      onConfirmReset(trip.id, {
        mode,
        newStartDate: mode === 'shift' ? newStartDate : undefined,
      });
    }

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-trip-modal-title"
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950/90 border border-purple-800/80 flex items-center justify-center shadow-lg shadow-purple-950/50">
              <RotateCcw className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 id="reset-trip-modal-title" className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                {t.modals.resetModal.title}
              </h2>
              <p className="text-xs text-slate-400">
                <span className="font-semibold text-purple-300">{trip.name}</span> •{' '}
                {t.modals.resetModal.subtitle}
              </p>
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

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
          {/* Option 1: Edit Initial Parameters & Rebuild (Featured) */}
          <div
            onClick={() => setMode('editParams')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              mode === 'editParams'
                ? 'bg-purple-950/30 border-purple-500/80 ring-1 ring-purple-500/30 shadow-sm'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="reset-mode"
                checked={mode === 'editParams'}
                onChange={() => setMode('editParams')}
                className="mt-1 text-purple-600 focus:ring-purple-500 focus:ring-offset-slate-900"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <SlidersHorizontal className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="text-sm font-semibold text-slate-100">
                    {t.modals.resetModal.modeEditParamsTitle}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                  {t.modals.resetModal.modeEditParamsDesc}
                </p>

                {/* Form unfolds when editParams is selected */}
                {mode === 'editParams' && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="space-y-3.5 p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl mt-2 text-xs"
                  >
                    {/* Trip Name */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        {t.modals.resetModal.editTripNameLabel}
                      </label>
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-purple-400" />
                          {t.modals.resetModal.editStartDateLabel}
                        </label>
                        <input
                          type="date"
                          value={editedStartDate}
                          onChange={(e) => setEditedStartDate(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-purple-400" />
                          {t.modals.resetModal.editEndDateLabel}
                        </label>
                        <input
                          type="date"
                          value={editedEndDate}
                          onChange={(e) => setEditedEndDate(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    {/* Total nights pill */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono px-1">
                      <span>{t.common.nights}:</span>
                      <span className="text-purple-300 font-semibold">{editedNights} {t.common.nights}</span>
                    </div>

                    {/* Cities / Destinations */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        {t.modals.resetModal.editCitiesLabel} ({cities.length})
                      </label>

                      {/* City Tags */}
                      <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-950 border border-slate-800 rounded-lg mb-2 max-h-32 overflow-y-auto">
                        {cities.length === 0 ? (
                          <span className="text-slate-500 text-xs italic px-1">No cities added yet.</span>
                        ) : (
                          cities.map((city, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-xs font-medium"
                            >
                              <span className="font-mono text-[10px] text-emerald-400 font-bold">{idx + 1}.</span>
                              <span className="truncate max-w-[120px]">{city}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveCity(idx)}
                                className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition-colors"
                                title={`Eliminar ${city}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))
                        )}
                      </div>

                      {/* Add city input */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder={t.modals.resetModal.addCityPlaceholder}
                          value={newCityInput}
                          onChange={(e) => setNewCityInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCity();
                            }
                          }}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500 placeholder:text-slate-600"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddCity()}
                          disabled={!newCityInput.trim()}
                          className="px-3 py-1.5 bg-purple-900/70 hover:bg-purple-800 disabled:opacity-40 text-purple-200 border border-purple-700/60 rounded-lg text-xs font-medium transition-colors shrink-0"
                        >
                          {t.modals.resetModal.addCityButton}
                        </button>
                      </div>
                    </div>

                    {/* Travel Style & Transport */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-800/80">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-1 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          {t.modals.resetModal.editPaceLabel}
                        </label>
                        <div className="grid grid-cols-3 gap-1">
                          {[
                            { id: 'relaxed' as const, label: t.constraints.relaxed },
                            { id: 'balanced' as const, label: t.constraints.balanced },
                            { id: 'intense' as const, label: t.constraints.intense },
                          ].map(({ id, label }) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => setTravelStyle(id)}
                              className={`py-1 px-1.5 rounded-md text-[11px] font-medium border text-center transition-colors truncate ${
                                travelStyle === id
                                  ? 'bg-purple-950/80 border-purple-500 text-purple-200'
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-1 flex items-center gap-1">
                          <Train className="w-3 h-3 text-emerald-400" />
                          {t.modals.resetModal.editTransportLabel}
                        </label>
                        <div className="grid grid-cols-2 gap-1">
                          <button
                            type="button"
                            onClick={() => setPreferTrain(true)}
                            className={`py-1 px-2 rounded-md text-[11px] font-medium border flex items-center justify-center gap-1 transition-colors ${
                              preferTrain
                                ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <Train className="w-3 h-3" />
                            <span>{t.modals.resetModal.preferRail}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreferTrain(false)}
                            className={`py-1 px-2 rounded-md text-[11px] font-medium border flex items-center justify-center gap-1 transition-colors ${
                              !preferTrain
                                ? 'bg-blue-950/70 border-blue-500 text-blue-200'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <Plane className="w-3 h-3" />
                            <span>{t.modals.resetModal.preferFlight}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Option 2: Shift dates to future */}
          <div
            onClick={() => setMode('shift')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              mode === 'shift'
                ? 'bg-purple-950/30 border-purple-500/80 ring-1 ring-purple-500/30 shadow-sm'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="reset-mode"
                checked={mode === 'shift'}
                onChange={() => setMode('shift')}
                className="mt-1 text-purple-600 focus:ring-purple-500 focus:ring-offset-slate-900"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-semibold text-slate-100">
                    {t.modals.resetModal.modeShiftTitle}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                  {t.modals.resetModal.modeShiftDesc}
                </p>

                {/* Date Picker Input (active only when shift mode is selected) */}
                {mode === 'shift' && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2 p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-purple-400" />
                        {t.modals.resetModal.newStartDateLabel}:
                      </label>
                      <input
                        type="date"
                        value={newStartDate}
                        onChange={(e) => setNewStartDate(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    {/* Calculated Outcome */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300 font-mono">
                      <span className="text-slate-400">{t.modals.resetModal.newEndDateLabel}:</span>
                      <div className="flex items-center gap-1.5 text-purple-300 font-semibold">
                        <span>{newStartDate}</span>
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        <span>{calculatedEndDate}</span>
                        <span className="text-[10px] text-slate-400 font-sans font-normal ml-1">
                          ({totalNightsShift} {t.common.nights})
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Option 3: Clean baseline */}
          <div
            onClick={() => setMode('baseline')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              mode === 'baseline'
                ? 'bg-purple-950/30 border-purple-500/80 ring-1 ring-purple-500/30 shadow-sm'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="reset-mode"
                checked={mode === 'baseline'}
                onChange={() => setMode('baseline')}
                className="mt-1 text-purple-600 focus:ring-purple-500 focus:ring-offset-slate-900"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-slate-100">
                    {t.modals.resetModal.modeBaselineTitle}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {t.modals.resetModal.modeBaselineDesc}
                </p>
              </div>
            </div>
          </div>

          {/* Option 4: Mark as planned */}
          <div
            onClick={() => setMode('markPlanned')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              mode === 'markPlanned'
                ? 'bg-purple-950/30 border-purple-500/80 ring-1 ring-purple-500/30 shadow-sm'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="reset-mode"
                checked={mode === 'markPlanned'}
                onChange={() => setMode('markPlanned')}
                className="mt-1 text-purple-600 focus:ring-purple-500 focus:ring-offset-slate-900"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-semibold text-slate-100">
                    {t.modals.resetModal.modeMarkPlannedTitle}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {t.modals.resetModal.modeMarkPlannedDesc}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between gap-2 shrink-0">
          <div>
            {isRebuilding && (
              <span className="text-xs text-purple-300 flex items-center gap-1.5 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {t.modals.resetModal.rebuildingTrip}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isRebuilding}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              {t.common.cancel}
            </button>

            <button
              onClick={handleApply}
              disabled={isRebuilding || (mode === 'editParams' && cities.length === 0)}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white flex items-center gap-1.5 transition-colors shadow-md shadow-purple-900/40"
            >
              {isRebuilding ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5" />
              )}
              <span>{t.modals.resetModal.confirmResetButton}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
