import React from 'react';
import { Trip } from '../../domain/types';
import { useI18n } from '../../i18n/I18nContext';
import { isTripCompleted } from '../../domain/tripHelpers';
import {
  Compass,
  Plus,
  UploadCloud,
  RotateCcw,
  RotateCw,
  Settings,
  Sparkles,
  Map as MapIcon,
  Calendar as CalendarIcon,
  ListOrdered,
  FolderClock,
} from 'lucide-react';

interface HeaderProps {
  trip: Trip;
  canUndo: boolean;
  canRedo: boolean;
  activeView: 'split' | 'map' | 'timeline' | 'calendar';
  tripsCount?: number;
  onUndo: () => void;
  onRedo: () => void;
  onChangeView: (view: 'split' | 'map' | 'timeline' | 'calendar') => void;
  onOpenCreateModal: () => void;
  onOpenUploadModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenHistoryModal: () => void;
  onOpenResetModal: () => void;
  onResetToDemoTrip: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  trip,
  canUndo,
  canRedo,
  activeView,
  tripsCount = 1,
  onUndo,
  onRedo,
  onChangeView,
  onOpenCreateModal,
  onOpenUploadModal,
  onOpenSettingsModal,
  onOpenHistoryModal,
  onOpenResetModal,
  onResetToDemoTrip,
}) => {
  const { lang, setLang, t } = useI18n();

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 shadow-md">
      {/* Brand & Active Trip Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/40">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 text-sm tracking-tight">
                {t.header.title}
              </span>
              <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                {t.header.version}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium tracking-wide rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 shadow-sm shadow-emerald-950/40">
                <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                “{t.header.tagline}”
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="font-medium text-slate-300 max-w-[180px] sm:max-w-xs truncate">
                {trip.name}
              </span>
              {isTripCompleted(trip) ? (
                <span className="px-1.5 py-0.2 text-[9px] font-semibold rounded bg-purple-950 text-purple-300 border border-purple-800/80">
                  {t.header.statusCompleted}
                </span>
              ) : (
                <span className="px-1.5 py-0.2 text-[9px] font-semibold rounded bg-blue-950 text-blue-300 border border-blue-800/80">
                  {t.header.statusPlanned}
                </span>
              )}
              <span>•</span>
              <span className="font-mono text-[11px] text-slate-400">
                {trip.startDate} → {trip.endDate}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onResetToDemoTrip}
          title={t.header.europeDemo}
          className="hidden md:inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-950/80 border border-emerald-800/60 px-2 py-1 rounded transition-colors"
        >
          <Sparkles className="w-3 h-3" />
          <span>{t.header.europeDemo}</span>
        </button>
      </div>

      {/* View Switcher Tabs */}
      <div
        role="tablist"
        aria-label="View Modes"
        className="hidden lg:flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs font-medium"
      >
        <button
          role="tab"
          id="view-tab-split"
          aria-selected={activeView === 'split'}
          onClick={() => onChangeView('split')}
          className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
            activeView === 'split'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>{t.header.plannerSplit}</span>
        </button>

        <button
          role="tab"
          id="view-tab-map"
          aria-selected={activeView === 'map'}
          onClick={() => onChangeView('map')}
          className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
            activeView === 'map'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MapIcon className="w-3.5 h-3.5" />
          <span>{t.header.mapFocus}</span>
        </button>

        <button
          role="tab"
          id="view-tab-timeline"
          aria-selected={activeView === 'timeline'}
          onClick={() => onChangeView('timeline')}
          className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
            activeView === 'timeline'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ListOrdered className="w-3.5 h-3.5" />
          <span>{t.header.timeline}</span>
        </button>

        <button
          role="tab"
          id="view-tab-calendar"
          aria-selected={activeView === 'calendar'}
          onClick={() => onChangeView('calendar')}
          className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
            activeView === 'calendar'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>{t.header.calendar}</span>
        </button>
      </div>

      {/* Action Controls (Language, New Trip, Upload, Undo/Redo, Settings) */}
      <div className="flex items-center gap-2">
        {/* Language Switcher ES / EN */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setLang('es')}
            className={`px-2 py-1 rounded transition-colors ${
              lang === 'es'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ES
          </button>
          <button
            type="button"
            onClick={() => setLang('en')}
            className={`px-2 py-1 rounded transition-colors ${
              lang === 'en'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            EN
          </button>
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title={t.header.undoTooltip}
            className="p-1.5 text-slate-400 hover:text-slate-100 disabled:opacity-30 disabled:hover:text-slate-400 rounded transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title={t.header.redoTooltip}
            className="p-1.5 text-slate-400 hover:text-slate-100 disabled:opacity-30 disabled:hover:text-slate-400 rounded transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Upload / Ingest Screenshots */}
        <button
          onClick={onOpenUploadModal}
          title={t.header.ingestDocuments}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700 shadow-sm"
        >
          <UploadCloud className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">{t.header.ingestDocuments}</span>
        </button>

        {/* Trip History Library */}
        <button
          onClick={onOpenHistoryModal}
          title={t.header.tripHistory}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700 shadow-sm"
        >
          <FolderClock className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">{t.header.tripHistory}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-950 text-purple-300 border border-slate-700">
            {tripsCount}
          </span>
        </button>

        {/* Reset Active Trip */}
        <button
          onClick={onOpenResetModal}
          title={t.header.resetTrip}
          className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border shadow-sm ${
            isTripCompleted(trip)
              ? 'bg-purple-950/80 hover:bg-purple-900/80 text-purple-200 border-purple-800/80'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden md:inline">{t.header.resetTrip}</span>
        </button>

        {/* New Trip Button */}
        <button
          onClick={onOpenCreateModal}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-900/30"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.header.newTrip}</span>
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettingsModal}
          title={t.header.settingsTooltip}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
