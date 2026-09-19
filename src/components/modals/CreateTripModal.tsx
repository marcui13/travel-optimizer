import React, { useState, useEffect } from 'react';
import { Trip } from '../../domain/types';
import { useI18n } from '../../i18n/I18nContext';
import { Sparkles, FormInput, X, Wand2, ArrowRight } from 'lucide-react';
import { createTripFromPrompt } from '../../services/ai/localAiPlanner';
import { generateItineraryWithAi } from '../../services/ai/aiClient';
import { buildItineraryFromDestinations } from '../../domain/tripHelpers';
import { resolveLocation } from '../../services/geocoding/geocodingService';
import { useModalA11y } from '../../hooks/useModalA11y';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTripCreated: (trip: Trip) => void;
}

export const CreateTripModal: React.FC<CreateTripModalProps> = ({
  isOpen,
  onClose,
  onTripCreated,
}) => {
  const { t, lang } = useI18n();
  const containerRef = useModalA11y(isOpen, onClose);
  const [tab, setTab] = useState<'prompt' | 'structured'>('prompt');
  const [promptText, setPromptText] = useState(t.modals.createTrip.defaultPrompt);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Update promptText when language changes
  useEffect(() => {
    setPromptText(t.modals.createTrip.defaultPrompt);
  }, [lang, t.modals.createTrip.defaultPrompt]);

  // Structured form state
  const [tripName, setTripName] = useState(lang === 'es' ? 'Gran Aventura en Europa' : 'Autumn in Europe');
  const [startDate, setStartDate] = useState('2026-09-26');
  const [endDate, setEndDate] = useState('2026-10-20');
  const [destinationsInput, setDestinationsInput] = useState(
    'Lisbon, Madrid, Barcelona, Rome, Florence, Budapest, Vienna, Prague, Berlin, Amsterdam'
  );
  const [style, setStyle] = useState<'relaxed' | 'balanced' | 'intense'>('balanced');
  const [preferTrain, setPreferTrain] = useState(true);

  if (!isOpen) return null;

  const handleCreateFromPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim()) return;

    setIsLoading(true);
    setStatusMessage(lang === 'es' ? 'Analizando entrada en lenguaje natural...' : 'Analyzing natural language travel input...');

    try {
      const { tripPromptParsed } = await generateItineraryWithAi(
        promptText,
        (msg) => setStatusMessage(msg)
      );

      const created = createTripFromPrompt(promptText);
      created.name = tripPromptParsed.name || created.name;
      created.startDate = tripPromptParsed.startDate || created.startDate;
      created.endDate = tripPromptParsed.endDate || created.endDate;

      onTripCreated(created);
      onClose();
    } catch (err) {
      console.error(err);
      const created = createTripFromPrompt(promptText);
      onTripCreated(created);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStructured = (e: React.FormEvent) => {
    e.preventDefault();
    const cityList = destinationsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (cityList.length === 0) return;

    const destinations = cityList.map((city, idx) => ({
      id: `dest-${idx + 1}`,
      name: city,
      location: resolveLocation(city),
      plannedNights: Math.max(2, Math.floor(24 / Math.max(1, cityList.length))),
      minimumNights: 2,
      priority: idx === 0 || idx === cityList.length - 1 ? ('high' as const) : ('medium' as const),
    }));

    const { itineraryDays, transportationSegments } = buildItineraryFromDestinations(
      destinations,
      startDate,
      endDate,
      undefined,
      preferTrain
    );

    const trip: Trip = {
      id: `trip-${Date.now()}`,
      name: tripName,
      startDate,
      endDate,
      origin: destinations[0]?.location,
      destinations,
      events: [],
      reservations: [],
      transportation: transportationSegments,
      constraints: [
        {
          id: 'c-fixed-1',
          type: 'hard',
          description: `Finish trip in ${cityList[cityList.length - 1]} by ${endDate}`,
          targetDestinationId: destinations[destinations.length - 1].id,
          targetDate: endDate,
        },
      ],
      preferences: {
        travelStyle: style,
        transportationPreference: preferTrain ? ['train'] : ['flight'],
        minimizeHotelChanges: true,
        minimizeTravelTime: true,
      },
      itinerary: {
        days: itineraryDays,
      },
      updatedAt: new Date().toISOString(),
    };

    onTripCreated(trip);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-trip-modal-title"
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 id="create-trip-modal-title" className="text-base font-bold text-slate-100">
                {t.modals.createTrip.title}
              </h2>
              <p className="text-xs text-slate-400">{t.modals.createTrip.subtitle}</p>
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

        {/* Tabs */}
        <div className="flex items-center border-b border-slate-800 gap-4 text-xs font-semibold">
          <button
            onClick={() => setTab('prompt')}
            className={`pb-2.5 flex items-center gap-1.5 transition-colors border-b-2 ${
              tab === 'prompt'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.modals.createTrip.naturalLanguageTab}</span>
          </button>

          <button
            onClick={() => setTab('structured')}
            className={`pb-2.5 flex items-center gap-1.5 transition-colors border-b-2 ${
              tab === 'structured'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FormInput className="w-3.5 h-3.5" />
            <span>{t.modals.createTrip.structuredTab}</span>
          </button>
        </div>

        {/* Tab 1: Natural Language AI Input */}
        {tab === 'prompt' && (
          <form onSubmit={handleCreateFromPrompt} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                {t.modals.createTrip.promptLabel}
              </label>
              <textarea
                rows={5}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder={t.modals.createTrip.defaultPrompt}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 placeholder:text-slate-600 leading-relaxed font-sans"
              />
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-400 space-y-1">
              <span className="font-semibold text-slate-300 block">
                {t.modals.createTrip.extractorIdentifies}
              </span>
              <p>{t.modals.createTrip.extractDests}</p>
              <p>{t.modals.createTrip.extractDates}</p>
              <p>{t.modals.createTrip.extractConstraints}</p>
            </div>

            {isLoading && (
              <div className="flex items-center gap-2 p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-xs text-emerald-300">
                <Sparkles className="w-4 h-4 animate-spin text-emerald-400" />
                <span>{statusMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                disabled={isLoading || !promptText.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-900/30"
              >
                <span>{t.modals.createTrip.generateButton}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Structured Form */}
        {tab === 'structured' && (
          <form onSubmit={handleCreateStructured} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-slate-300 font-medium mb-1">
                  {t.modals.createTrip.tripName}
                </label>
                <input
                  type="text"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {t.modals.createTrip.startDate}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {t.modals.createTrip.endDate}
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                {t.modals.createTrip.destinationsList}
              </label>
              <textarea
                rows={2}
                value={destinationsInput}
                onChange={(e) => setDestinationsInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {t.modals.createTrip.pacingStyle}
                </label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="relaxed">{t.constraints.relaxed} (3+ n)</option>
                  <option value="balanced">{t.constraints.balanced} (2–3 n)</option>
                  <option value="intense">{t.constraints.intense} (1–2 n)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="preferTrainCheck"
                  checked={preferTrain}
                  onChange={(e) => setPreferTrain(e.target.checked)}
                  className="accent-emerald-500 rounded"
                />
                <label htmlFor="preferTrainCheck" className="text-slate-300 cursor-pointer">
                  {t.modals.createTrip.preferRailCheck}
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2 rounded-lg text-xs transition-colors shadow"
              >
                {t.modals.createTrip.createButton}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
