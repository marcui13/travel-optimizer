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
    <div className="bg-slate-900/60 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
      {/* Metrics List */}
      <div className="flex flex-wrap items-center gap-4 text-slate-300">
        <div className="flex items-center gap-1.5 font-medium">
          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            {stats.destinationCount} {t.stats.cities}
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-medium">
          <Moon className="w-3.5 h-3.5 text-blue-400" />
          <span>
            {stats.nightsCount} {t.stats.nights}
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-medium">
          <Navigation className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-mono">{stats.totalDistanceKm.toLocaleString()} km</span>
        </div>

        <div className="flex items-center gap-1.5 font-medium">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>
            {formatMinutesToHours(stats.totalTravelMinutes)} {t.stats.transit}
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-medium">
          <Building className="w-3.5 h-3.5 text-purple-400" />
          <span>
            {stats.hotelChangesCount} {t.stats.hotelMoves}
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-800 text-slate-400 text-[11px]">
          {stats.modeCounts.train > 0 && (
            <span className="flex items-center gap-1">
              <Train className="w-3 h-3 text-emerald-400" /> {stats.modeCounts.train} {t.stats.trains}
            </span>
          )}
          {stats.modeCounts.flight > 0 && (
            <span className="flex items-center gap-1">
              <Plane className="w-3 h-3 text-blue-400" /> {stats.modeCounts.flight} {t.stats.flights}
            </span>
          )}
        </div>
      </div>

      {/* Validation Status & Optimize Trigger */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenValidationDetails}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            errorCount > 0
              ? 'bg-rose-950/80 text-rose-300 border border-rose-800/80 hover:bg-rose-900'
              : warningCount > 0
              ? 'bg-amber-950/80 text-amber-300 border border-amber-800/80 hover:bg-amber-900'
              : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
          }`}
        >
          {errorCount > 0 ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>
                {errorCount} {t.stats.errors}
              </span>
            </>
          ) : warningCount > 0 ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {warningCount} {t.stats.warnings}
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.stats.constraintsValidated}</span>
            </>
          )}
        </button>

        <button
          onClick={onOpenOptimization}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-1 rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>{t.stats.optimizeRoute}</span>
        </button>
      </div>
    </div>
  );
};
