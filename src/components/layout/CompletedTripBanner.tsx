import React, { useState } from 'react';
import { Trip } from '../../domain/types';
import { useI18n } from '../../i18n/I18nContext';
import { isTripCompleted } from '../../domain/tripHelpers';
import { RotateCcw, FolderClock, X, CheckCircle2, Calendar } from 'lucide-react';

interface CompletedTripBannerProps {
  trip: Trip;
  onOpenResetModal: () => void;
  onOpenHistoryModal: () => void;
}

export const CompletedTripBanner: React.FC<CompletedTripBannerProps> = ({
  trip,
  onOpenResetModal,
  onOpenHistoryModal,
}) => {
  const { t } = useI18n();
  const [isDismissed, setIsDismissed] = useState(false);

  // Only render if trip is actually completed and not dismissed in this session
  if (!isTripCompleted(trip) || isDismissed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-purple-950/90 via-slate-900/90 to-purple-950/80 border-b border-purple-800/60 px-4 py-2 text-xs text-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-md animate-in slide-in-from-top duration-200">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-6 h-6 rounded-md bg-purple-800/80 flex items-center justify-center shrink-0 text-purple-200 shadow">
          <CheckCircle2 className="w-3.5 h-3.5 text-purple-300" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-purple-200">
            {t.modals.completedBanner.bannerTitle}:
          </span>
          <span className="text-slate-300 truncate max-w-md hidden sm:inline">
            {t.modals.completedBanner.bannerDesc}
          </span>
          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-purple-950/90 text-purple-300 border border-purple-800/80">
            <Calendar className="w-2.5 h-2.5 inline mr-1" />
            {trip.startDate} → {trip.endDate}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={onOpenResetModal}
          className="bg-purple-600 hover:bg-purple-500 text-white px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <RotateCcw className="w-3 h-3" />
          <span>{t.modals.completedBanner.resetAction}</span>
        </button>

        <button
          onClick={onOpenHistoryModal}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors border border-slate-700"
        >
          <FolderClock className="w-3 h-3 text-purple-400" />
          <span className="hidden md:inline">{t.modals.completedBanner.viewHistory}</span>
        </button>

        <button
          onClick={() => setIsDismissed(true)}
          title={t.modals.completedBanner.dismissAction}
          className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800/60 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
