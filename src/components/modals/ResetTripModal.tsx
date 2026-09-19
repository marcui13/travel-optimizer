import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { useModalA11y } from '../../hooks/useModalA11y';

interface ResetTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  onConfirmReset: (
    tripId: string,
    options: { mode: 'shift' | 'baseline' | 'markPlanned'; newStartDate?: string }
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

  // Default suggested new start date: next month from today
  const defaultSuggestedStartDate = useMemo(() => {
    const today = new Date();
    return format(addDays(today, 30), 'yyyy-MM-dd');
  }, []);

  const [mode, setMode] = useState<'shift' | 'baseline' | 'markPlanned'>('shift');
  const [newStartDate, setNewStartDate] = useState<string>(defaultSuggestedStartDate);

  // Calculate new end date dynamically based on trip duration
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

  const totalNights = useMemo(() => {
    try {
      return differenceInCalendarDays(parseISO(trip.endDate), parseISO(trip.startDate));
    } catch {
      return 1;
    }
  }, [trip.startDate, trip.endDate]);

  if (!isOpen) return null;

  const handleApply = () => {
    onConfirmReset(trip.id, {
      mode,
      newStartDate: mode === 'shift' ? newStartDate : undefined,
    });

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
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
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

        {/* Modal Content */}
        <div className="p-5 space-y-4">
          {/* Option 1: Shift dates to future */}
          <div
            onClick={() => setMode('shift')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              mode === 'shift'
                ? 'bg-purple-950/30 border-purple-500/80 ring-1 ring-purple-500/30'
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
                  <div className="mt-2 p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2.5">
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
                          ({totalNights} {t.common.nights})
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Option 2: Clean baseline */}
          <div
            onClick={() => setMode('baseline')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              mode === 'baseline'
                ? 'bg-purple-950/30 border-purple-500/80 ring-1 ring-purple-500/30'
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

          {/* Option 3: Mark as planned */}
          <div
            onClick={() => setMode('markPlanned')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              mode === 'markPlanned'
                ? 'bg-purple-950/30 border-purple-500/80 ring-1 ring-purple-500/30'
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
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            {t.common.cancel}
          </button>

          <button
            onClick={handleApply}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 transition-colors shadow-md shadow-purple-900/40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.modals.resetModal.confirmResetButton}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
