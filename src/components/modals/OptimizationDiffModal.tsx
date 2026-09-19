import React, { useState } from 'react';
import { Trip, OptimizationResult } from '../../domain/types';
import { useI18n } from '../../i18n/I18nContext';
import {
  SlidersHorizontal,
  X,
  TrendingDown,
  Clock,
  Building,
  Navigation,
  Check,
  Eye,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { formatMinutesToHours } from '../../domain/statistics';
import { defaultOptimizer } from '../../services/optimization/optimizer';
import { useModalA11y } from '../../hooks/useModalA11y';

interface OptimizationDiffModalProps {
  isOpen: boolean;
  trip: Trip;
  initialResult?: OptimizationResult | null;
  onClose: () => void;
  onApplyOptimization: (result: OptimizationResult) => void;
  onToggleMapPreview: (active: boolean) => void;
}

export const OptimizationDiffModal: React.FC<OptimizationDiffModalProps> = ({
  isOpen,
  trip,
  initialResult,
  onClose,
  onApplyOptimization,
  onToggleMapPreview,
}) => {
  const { t } = useI18n();
  const handleClose = () => {
    onToggleMapPreview(false);
    onClose();
  };
  const containerRef = useModalA11y(isOpen, handleClose);
  const [profile, setProfile] = useState<'efficient' | 'balanced' | 'relaxed'>(
    initialResult?.profile || 'efficient'
  );
  const [result, setResult] = useState<OptimizationResult | null>(initialResult || null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isPreviewActive, setIsPreviewActive] = useState(false);

  if (!isOpen) return null;

  const handleProfileChange = async (newProfile: 'efficient' | 'balanced' | 'relaxed') => {
    setProfile(newProfile);
    setIsCalculating(true);
    try {
      const res = await defaultOptimizer.optimize(trip, { profile: newProfile });
      setResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleTogglePreview = () => {
    const next = !isPreviewActive;
    setIsPreviewActive(next);
    onToggleMapPreview(next);
  };

  const handleApply = () => {
    if (result) {
      onApplyOptimization(result);
      onToggleMapPreview(false);
      onClose();
    }
  };

  const metrics = result?.metrics;
  const timeSaved =
    metrics?.travelTimeBefore && metrics?.travelTimeAfter
      ? Math.max(0, metrics.travelTimeBefore - metrics.travelTimeAfter)
      : 0;

  const distSaved =
    metrics?.distanceKmBefore && metrics?.distanceKmAfter
      ? Math.max(0, metrics.distanceKmBefore - metrics.distanceKmAfter)
      : 0;

  const hotelChangesReduced =
    metrics?.hotelChangesBefore && metrics?.hotelChangesAfter
      ? Math.max(0, metrics.hotelChangesBefore - metrics.hotelChangesAfter)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="optimization-diff-modal-title"
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 id="optimization-diff-modal-title" className="text-base font-bold text-slate-100">
                {t.modals.optimization.title}
              </h2>
              <p className="text-xs text-slate-400">
                {t.modals.optimization.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label={t.common.close}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Selector Pills */}
        <div className="grid grid-cols-3 gap-2 shrink-0 text-xs font-semibold">
          {[
            { id: 'efficient', label: t.assistant.efficient, desc: t.modals.optimization.efficientDesc },
            { id: 'balanced', label: t.constraints.balanced, desc: t.modals.optimization.balancedDesc },
            { id: 'relaxed', label: t.assistant.relaxed, desc: t.modals.optimization.relaxedDesc },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleProfileChange(p.id as any)}
              className={`p-3 rounded-xl border text-left transition-all ${
                profile === p.id
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/30'
                  : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <span className="block font-bold tracking-wide uppercase">{p.label}</span>
              <span className="text-[10px] font-normal text-slate-400 block mt-0.5">
                {p.desc}
              </span>
            </button>
          ))}
        </div>

        {/* Metrics Comparison Row */}
        {metrics && (
          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.modals.optimization.transitTime}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-bold text-slate-200">
                  {formatMinutesToHours(metrics.travelTimeAfter || 0)}
                </span>
                <span className="text-[11px] text-slate-500 line-through">
                  {formatMinutesToHours(metrics.travelTimeBefore || 0)}
                </span>
              </div>
              {timeSaved > 0 && (
                <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-0.5">
                  <TrendingDown className="w-3 h-3" /> {t.modals.optimization.save} {formatMinutesToHours(timeSaved)}
                </span>
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Navigation className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t.modals.optimization.totalDistance}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-bold text-slate-200">
                  {metrics.distanceKmAfter?.toLocaleString()} km
                </span>
                <span className="text-[11px] text-slate-500 line-through">
                  {metrics.distanceKmBefore?.toLocaleString()} km
                </span>
              </div>
              {distSaved > 0 && (
                <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-0.5">
                  <TrendingDown className="w-3 h-3" /> {t.modals.optimization.save} {distSaved} km
                </span>
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Building className="w-3.5 h-3.5 text-purple-400" />
                <span>{t.modals.optimization.hotelMoves}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-bold text-slate-200">
                  {metrics.hotelChangesAfter}
                </span>
                <span className="text-[11px] text-slate-500 line-through">
                  {metrics.hotelChangesBefore}
                </span>
              </div>
              {hotelChangesReduced > 0 ? (
                <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-0.5">
                  <TrendingDown className="w-3 h-3" /> -{hotelChangesReduced} {t.stats.hotelMoves.toLowerCase()}
                </span>
              ) : (
                <span className="text-[10px] text-slate-500">{t.modals.optimization.unchanged}</span>
              )}
            </div>
          </div>
        )}

        {/* Changes List & Rationale */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          {/* Explanation Banner */}
          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-200 space-y-1">
            <span className="font-semibold block flex items-center gap-1.5 text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              {t.modals.optimization.rationaleTitle}
            </span>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {result?.explanation}
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-300 block">
              {t.modals.optimization.specificChanges} ({result?.changes.length || 0}):
            </span>

            {result?.changes.map((change) => (
              <div
                key={change.id}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1 text-xs"
              >
                <div className="flex items-center justify-between font-semibold text-slate-200">
                  <span>{change.description}</span>
                  {change.before && change.after && (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                      <span>{change.before}</span>
                      <ArrowRight className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-300">{change.after}</span>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {change.reason}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0 text-xs">
          <button
            type="button"
            onClick={handleTogglePreview}
            className={`px-3 py-2 rounded-lg border flex items-center gap-1.5 font-medium transition-colors ${
              isPreviewActive
                ? 'bg-rose-950 border-rose-600 text-rose-200'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>
              {isPreviewActive
                ? t.modals.optimization.hidePreview
                : t.modals.optimization.previewMap}
            </span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onToggleMapPreview(false);
                onClose();
              }}
              className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
            >
              {t.common.dismiss}
            </button>
            <button
              type="button"
              disabled={isCalculating || !result}
              onClick={handleApply}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-900/30"
            >
              <Check className="w-4 h-4" />
              <span>{t.modals.optimization.applyButton}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
