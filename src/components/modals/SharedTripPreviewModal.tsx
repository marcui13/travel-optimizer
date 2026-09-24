import React from 'react';
import { Trip } from '../../domain/types';
import { useI18n } from '../../i18n/I18nContext';
import { useModalA11y } from '../../hooks/useModalA11y';
import {
  Compass,
  MapPin,
  Calendar,
  CheckCircle,
  X,
  ArrowRight,
  Sparkles,
  FileJson,
} from 'lucide-react';

interface SharedTripPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sharedTrip: Trip;
  onAcceptAndSave: (trip: Trip) => void;
  onViewOnly: (trip: Trip) => void;
  sourceType?: 'link' | 'file';
}

export const SharedTripPreviewModal: React.FC<SharedTripPreviewModalProps> = ({
  isOpen,
  onClose,
  sharedTrip,
  onAcceptAndSave,
  onViewOnly,
  sourceType = 'link',
}) => {
  const { lang, t } = useI18n();
  const modalRef = useModalA11y(isOpen, onClose);

  if (!isOpen || !sharedTrip) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shared-trip-title"
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 focus-visible:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
              sourceType === 'file'
                ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
              {sourceType === 'file' ? (
                <FileJson className="w-5 h-5 animate-pulse" />
              ) : (
                <Compass className="w-5 h-5 animate-pulse" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                {sourceType === 'file' ? (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800/60 flex items-center gap-1">
                    <FileJson className="w-3 h-3" />
                    {t.modals.importTrip.badgeFile}
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                    {lang === 'es' ? 'Itinerario Compartido' : 'Shared Itinerary'}
                  </span>
                )}
              </div>
              <h2 id="shared-trip-title" className="text-base font-bold text-slate-100">
                {sharedTrip.name}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Details */}
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>
                {sharedTrip.startDate} → {sharedTrip.endDate} ({sharedTrip.itinerary?.days?.length || 0}{' '}
                {lang === 'es' ? 'días de viaje' : 'days'})
              </span>
            </div>

            <div className="text-[11px] text-slate-400">
              {lang === 'es'
                ? `Incluye ${sharedTrip.destinations.length} paradas y ${sharedTrip.transportation.length} trayectos calculados.`
                : `Includes ${sharedTrip.destinations.length} destinations and ${sharedTrip.transportation.length} transit segments.`}
            </div>

            {/* Stops list */}
            <div className="pt-1">
              <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium mb-1.5">
                <MapPin className="w-3 h-3 text-emerald-400" />
                {lang === 'es' ? 'Paradas del recorrido:' : 'Trip stops:'}
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-900/90 border border-slate-800 rounded-lg">
                {sharedTrip.destinations.map((d, idx) => (
                  <span
                    key={`${d.name}-${idx}`}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] bg-slate-800 text-slate-200 border border-slate-700/60"
                  >
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-medium">{d.name}</span>
                    <span className="text-[10px] text-slate-400 font-normal">({d.location?.country || ''})</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-200/90 text-[11px] flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              {lang === 'es'
                ? 'Puedes guardar este viaje en tu biblioteca local para editarlo, optimizarlo y personalizarlo a tu gusto.'
                : 'You can save this trip to your local library to customize, optimize, and edit it freely.'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 gap-2">
          <button
            type="button"
            onClick={() => onViewOnly(sharedTrip)}
            className="px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors text-xs font-medium"
          >
            {lang === 'es' ? 'Ver temporalmente' : 'Preview only'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg text-slate-400 hover:text-slate-200 text-xs font-medium"
            >
              {t.common.cancel}
            </button>
            <button
              type="button"
              onClick={() => onAcceptAndSave(sharedTrip)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-900/30 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{lang === 'es' ? 'Guardar y Abrir Viaje' : 'Save & Open Trip'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
