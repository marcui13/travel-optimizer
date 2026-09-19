import React from 'react';
import { Trip, ValidationIssue } from '../../domain/types';
import { calculateTripStatistics, formatMinutesToHours } from '../../domain/statistics';
import { useI18n } from '../../i18n/I18nContext';
import {
  MapPin,
  Moon,
  Navigation,
  Clock,
  Building,
  Train,
  Plane,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';

interface StatsBarProps {
  trip: Trip;
  validationIssues: ValidationIssue[];
  onOpenOptimization: () => void;
  onOpenValidationDetails?: () => void;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  trip,
  validationIssues,
  onOpenOptimization,
  onOpenValidationDetails,
}) => {
  const { t } = useI18n();
  const stats = calculateTripStatistics(trip);
  const errorCount = validationIssues.filter((i) => i.severity === 'error').length;
  const warningCount = validationIssues.filter((i) => i.severity === 'warning').length;

  return (
    <div className="bg-slate-900/90 border-b border-slate-800 px-3 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-2 text-xs">
      {/* Metrics List - Travel Manifest Style with horizontal scroll on mobile */}
      <div className="flex items-center gap-2.5 sm:gap-4 text-slate-300 overflow-x-auto scrollbar-none py-0.5 min-w-0 flex-1">
        <div className="flex items-center gap-1 shrink-0">
          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="font-semibold text-slate-100 font-mono text-[11px] sm:text-xs">{stats.destinationCount}</span>
          <span className="text-slate-400 text-[10px] sm:text-xs">{t.stats.cities}</span>
        </div>

        <span className="text-slate-700 shrink-0">•</span>

        <div className="flex items-center gap-1 shrink-0">
          <Moon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="font-semibold text-slate-100 font-mono text-[11px] sm:text-xs">{stats.nightsCount}</span>
          <span className="text-slate-400 text-[10px] sm:text-xs">{t.stats.nights}</span>
        </div>

        <span className="text-slate-700 shrink-0">•</span>

        <div className="flex items-center gap-1 shrink-0">
          <Navigation className="w-3.5 h-3.5 text-violet-400 shrink-0" />
          <span className="font-semibold text-slate-100 font-mono text-[11px] sm:text-xs">{stats.totalDistanceKm.toLocaleString()}</span>
          <span className="text-slate-400 text-[10px] sm:text-xs">km</span>
        </div>

        <span className="text-slate-700 shrink-0">•</span>

        <div className="flex items-center gap-1 shrink-0">
          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="font-semibold text-slate-100 font-mono text-[11px] sm:text-xs">{formatMinutesToHours(stats.totalTravelMinutes)}</span>
          <span className="text-slate-400 text-[10px] sm:text-xs">{t.stats.transit}</span>
        </div>

        <span className="text-slate-700 shrink-0 hidden sm:inline">•</span>

        <div className="hidden sm:flex items-center gap-1 shrink-0">
          <Building className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span className="font-semibold text-slate-100 font-mono text-[11px] sm:text-xs">{stats.hotelChangesCount}</span>
          <span className="text-slate-400 text-[10px] sm:text-xs">{t.stats.hotelMoves}</span>
        </div>

        <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-800 text-slate-400 text-[11px] shrink-0">
          {stats.modeCounts.train > 0 && (
            <span className="flex items-center gap-1">
              <Train className="w-3 h-3 text-emerald-400" />
              <span className="font-mono text-slate-300">{stats.modeCounts.train}</span> {t.stats.trains}
            </span>
          )}
          {stats.modeCounts.flight > 0 && (
            <span className="flex items-center gap-1">
              <Plane className="w-3 h-3 text-sky-400" />
              <span className="font-mono text-slate-300">{stats.modeCounts.flight}</span> {t.stats.flights}
            </span>
          )}
        </div>
      </div>

      {/* Validation Status & Optimize Trigger */}
      <div className="flex items-center gap-1.5 shrink-0 pl-1">
        <button
          type="button"
          onClick={onOpenValidationDetails}
          className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-medium transition-colors border ${
            errorCount > 0
              ? 'bg-rose-950/60 text-rose-300 border-rose-800/80 hover:bg-rose-900/80'
              : warningCount > 0
              ? 'bg-amber-950/60 text-amber-300 border-amber-800/80 hover:bg-amber-900/80'
              : 'bg-slate-800/80 text-emerald-300 border-slate-700'
          }`}
        >
          {errorCount > 0 ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>
                {errorCount} <span className="hidden xs:inline">{t.stats.errors}</span>
              </span>
            </>
          ) : warningCount > 0 ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                {warningCount} <span className="hidden xs:inline">{t.stats.warnings}</span>
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">{t.stats.constraintsValidated}</span>
              <span className="sm:hidden text-[10px]">OK</span>
            </>
          )}
        </button>

        <button
          onClick={onOpenOptimization}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-2.5 sm:px-3 py-1 rounded-md text-[11px] sm:text-xs flex items-center gap-1.5 transition-colors shadow-xs shrink-0"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">{t.stats.optimizeRoute}</span>
          <span className="xs:hidden">Auto</span>
        </button>
      </div>
    </div>
  );
};
