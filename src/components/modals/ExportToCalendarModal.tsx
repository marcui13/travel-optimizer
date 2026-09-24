import React, { useState } from 'react';
import { Trip, Destination, TransportationSegment } from '../../domain/types';
import { useI18n } from '../../i18n/I18nContext';
import { useModalA11y } from '../../hooks/useModalA11y';
import {
  CalendarPlus,
  Download,
  ExternalLink,
  X,
  Check,
  Train,
  Plane,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import {
  downloadTripIcsFile,
  getGoogleCalendarImportUrl,
  generateMasterTripGoogleCalendarUrl,
  generateDestinationStayGoogleCalendarUrl,
  generateTransitGoogleCalendarUrl,
} from '../../services/calendar/calendarExportService';

interface ExportToCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
}

export const ExportToCalendarModal: React.FC<ExportToCalendarModalProps> = ({
  isOpen,
  onClose,
  trip,
}) => {
  const { lang, t } = useI18n();
  const modalRef = useModalA11y(isOpen, onClose);

  const [activeTab, setActiveTab] = useState<'sync' | 'direct'>('sync');
  const [downloaded, setDownloaded] = useState(false);

  if (!isOpen) return null;

  const handleDownloadIcs = () => {
    downloadTripIcsFile(trip);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 4000);
  };

  const handleOpenGCalImport = () => {
    window.open(getGoogleCalendarImportUrl(), '_blank', 'noopener,noreferrer');
  };

  const handleOpenMasterLink = () => {
    const url = generateMasterTripGoogleCalendarUrl(trip);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleOpenDestinationLink = (dest: Destination, index: number) => {
    const url = generateDestinationStayGoogleCalendarUrl(trip, dest, index);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleOpenTransitLink = (segment: TransportationSegment) => {
    const url = generateTransitGoogleCalendarUrl(segment);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const cText = t.modals.exportCalendar;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-export-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="calendar-export-title"
                className="text-base sm:text-lg font-bold text-white leading-tight"
              >
                {cText.title}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {cText.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-4 sm:px-5 bg-slate-950/40 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('sync')}
            className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'sync'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>{cText.tabSyncIcs}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-medium ml-1">
              {lang === 'es' ? 'Recomendado' : 'Recommended'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('direct')}
            className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'direct'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ExternalLink className="w-4 h-4" />
            <span>{cText.tabDirectLinks}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {activeTab === 'sync' && (
            <div className="space-y-5">
              {/* Highlight Card */}
              <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-blue-950/40 via-indigo-950/30 to-slate-950/60 border border-blue-800/40 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {cText.recommendedTitle}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {cText.recommendedDesc}
                    </p>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadIcs}
                    className={`px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all ${
                      downloaded
                        ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                    }`}
                  >
                    {downloaded ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>{lang === 'es' ? '¡Archivo .ics Descargado!' : '¡.ics File Downloaded!'}</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>{cText.downloadIcsButton}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenGCalImport}
                    className="px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-2 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-blue-400" />
                    <span>{cText.openGCalImportButton}</span>
                  </button>
                </div>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {lang === 'es' ? '¿Cómo importarlo a Google Calendar?' : 'How to import into Google Calendar?'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center">
                      1
                    </div>
                    <div className="font-semibold text-slate-200 text-xs">
                      {lang === 'es' ? 'Descarga el .ics' : 'Download .ics'}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {cText.step1}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center">
                      2
                    </div>
                    <div className="font-semibold text-slate-200 text-xs">
                      {lang === 'es' ? 'Abre Configuración' : 'Open Settings'}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {cText.step2}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">
                      3
                    </div>
                    <div className="font-semibold text-slate-200 text-xs">
                      {lang === 'es' ? 'Importa y ¡Listo!' : 'Import and Done!'}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {cText.step3}
                    </p>
                  </div>
                </div>
              </div>

              {/* Compatibility Badge */}
              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center gap-2.5 text-slate-400 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{cText.compatibilityNote}</span>
              </div>
            </div>
          )}

          {activeTab === 'direct' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                {cText.directLinksDesc}
              </div>

              {/* Master Trip Overview Event */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/40 to-slate-950/60 border border-blue-800/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">
                      {cText.masterTripTitle}: {trip.name}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {trip.startDate} → {trip.endDate} • {trip.destinations.length} {lang === 'es' ? 'ciudades' : 'cities'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenMasterLink}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{lang === 'es' ? 'Crear Evento' : 'Create Event'}</span>
                </button>
              </div>

              {/* City Stays */}
              {trip.destinations.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {cText.destinationsTitle}
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      {trip.destinations.length} {lang === 'es' ? 'destinos' : 'destinations'}
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {trip.destinations.map((dest, i) => {
                      const matchingDays = trip.itinerary?.days?.filter((d) => d.destinationId === dest.id) || [];
                      const startDate = matchingDays[0]?.date || dest.arrivalDate || trip.startDate;
                      const endDate = matchingDays[matchingDays.length - 1]?.date || dest.departureDate || startDate;

                      return (
                        <div
                          key={dest.id}
                          className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-semibold flex items-center justify-center shrink-0">
                              {i + 1}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-slate-200 truncate">
                                {dest.name}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {startDate} → {endDate} ({dest.plannedNights || matchingDays.length || 1} {lang === 'es' ? 'noches' : 'nights'})
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenDestinationLink(dest, i)}
                            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium flex items-center gap-1 shrink-0 transition-colors border border-slate-700/60"
                          >
                            <ExternalLink className="w-3 h-3 text-blue-400" />
                            <span>{lang === 'es' ? 'Agregar' : 'Add'}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Transit Segments */}
              {trip.transportation.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {cText.transitTitle}
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      {trip.transportation.length} {lang === 'es' ? 'traslados' : 'segments'}
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {trip.transportation.map((seg) => {
                      const isFlight = seg.mode === 'flight';
                      const Icon = isFlight ? Plane : Train;

                      return (
                        <div
                          key={seg.id}
                          className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-6 h-6 rounded-md bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-slate-200 truncate flex items-center gap-1.5">
                                <span>{seg.from.name}</span>
                                <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                                <span>{seg.to.name}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                <span>{seg.date || trip.startDate}</span>
                                {seg.departureTime && (
                                  <span>• {seg.departureTime}</span>
                                )}
                                {seg.operatorOrRoute && (
                                  <span className="text-slate-500 truncate max-w-[120px]">({seg.operatorOrRoute})</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenTransitLink(seg)}
                            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium flex items-center gap-1 shrink-0 transition-colors border border-slate-700/60"
                          >
                            <ExternalLink className="w-3 h-3 text-blue-400" />
                            <span>{lang === 'es' ? 'Agregar' : 'Add'}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0 text-xs">
          <span className="text-slate-500">
            {lang === 'es' ? 'Formato universal RFC 5545 iCalendar' : 'Universal RFC 5545 iCalendar standard'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  );
};
