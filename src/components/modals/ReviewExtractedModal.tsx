import React, { useState } from 'react';
import {
  ExtractedTravelItem,
  convertExtractedToDomain,
} from '../../services/ai/visionExtractor';
import { Trip, Event, Reservation } from '../../domain/types';
import { useI18n } from '../../i18n/I18nContext';
import {
  CheckCircle2,
  X,
  AlertCircle,
  Calendar,
  Clock,
  MapPin,
  Ticket,
  Plus,
} from 'lucide-react';
import { useModalA11y } from '../../hooks/useModalA11y';

interface ReviewExtractedModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: string;
  initialItems: ExtractedTravelItem[];
  trip: Trip;
  onConfirmAddItems: (events: Event[], reservations: Reservation[]) => void;
}

export const ReviewExtractedModal: React.FC<ReviewExtractedModalProps> = ({
  isOpen,
  onClose,
  summary,
  initialItems,
  trip: _trip,
  onConfirmAddItems,
}) => {
  const { t } = useI18n();
  const containerRef = useModalA11y(isOpen, onClose);
  const [items, setItems] = useState<ExtractedTravelItem[]>(initialItems);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, selected: !it.selected } : it))
    );
  };

  const updateItemField = (id: string, field: keyof ExtractedTravelItem, value: any) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  const selectedCount = items.filter((it) => it.selected).length;

  const handleConfirm = () => {
    const eventsToAdd: Event[] = [];
    const reservationsToAdd: Reservation[] = [];

    items
      .filter((it) => it.selected)
      .forEach((it) => {
        const { event, reservation } = convertExtractedToDomain(it);
        if (event) eventsToAdd.push(event);
        if (reservation) reservationsToAdd.push(reservation);
      });

    onConfirmAddItems(eventsToAdd, reservationsToAdd);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-extracted-modal-title"
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 id="review-extracted-modal-title" className="text-base font-bold text-slate-100">
                {t.modals.review.title}
              </h2>
              <p className="text-xs text-slate-400">
                {t.modals.review.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t.common.close}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Extraction Summary Banner */}
        <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs text-blue-200 flex items-start gap-2 shrink-0">
          <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">
              {t.modals.review.foundSummary} ({items.length})
            </span>
            <p className="text-[11px] text-blue-300 leading-relaxed">{summary}</p>
          </div>
        </div>

        {/* Items List (Scrollable) */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          {items.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                item.selected
                  ? 'bg-slate-950 border-emerald-500/60 ring-1 ring-emerald-500/20'
                  : 'bg-slate-950/50 border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => toggleSelect(item.id)}
                    className="accent-emerald-500 rounded w-4 h-4 cursor-pointer"
                  />
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-800 text-slate-300">
                    {item.type}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] ${
                      item.confidence === 'high'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}
                  >
                    {item.confidence}
                  </span>
                </div>

                <label className="flex items-center gap-1.5 text-slate-400 text-[11px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.fixed}
                    onChange={(e) => updateItemField(item.id, 'fixed', e.target.checked)}
                    className="accent-amber-500 rounded"
                  />
                  <span>{t.modals.review.hardCommitment}</span>
                </label>
              </div>

              {/* Title input */}
              <div>
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => updateItemField(item.id, 'title', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Date & Location inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-300">
                <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <input
                    type="text"
                    value={item.locationName}
                    onChange={(e) => updateItemField(item.id, 'locationName', e.target.value)}
                    className="bg-transparent w-full text-xs text-slate-200 focus:outline-none"
                    placeholder="City / Location"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                  <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <input
                    type="date"
                    value={item.startDate}
                    onChange={(e) => updateItemField(item.id, 'startDate', e.target.value)}
                    className="bg-transparent w-full text-xs text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <input
                    type="time"
                    value={item.startTime || ''}
                    onChange={(e) => updateItemField(item.id, 'startTime', e.target.value)}
                    className="bg-transparent w-full text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              {/* Booking Reference or Notes */}
              {item.bookingRef && (
                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                  <Ticket className="w-3 h-3 text-slate-500" />
                  <span>Ref: {item.bookingRef}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0 text-xs">
          <span className="text-slate-400 font-medium">
            {selectedCount} of {items.length} {t.modals.review.itemsSelected}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={handleConfirm}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-900/30"
            >
              <Plus className="w-4 h-4" />
              <span>{t.modals.review.addToItinerary} ({selectedCount})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
