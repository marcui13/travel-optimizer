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
  Map as MapIcon,
  Calendar as CalendarIcon,
  ListOrdered,
  FolderClock,
  Share2,
  Users,
} from 'lucide-react';

interface HeaderProps {
  trip: Trip;
  canUndo: boolean;
  canRedo: boolean;
  activeView: 'split' | 'map' | 'timeline' | 'calendar';
  tripsCount?: number;
  isCollabConnected?: boolean;
  collabRoomId?: string | null;
  collabPeersCount?: number;
  onUndo: () => void;
  onRedo: () => void;
  onChangeView: (view: 'split' | 'map' | 'timeline' | 'calendar') => void;
  onOpenCreateModal: () => void;
  onOpenUploadModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenHistoryModal: () => void;
  onOpenResetModal: () => void;
  onResetToDemoTrip: () => void;
  onOpenShareModal: (tab?: 'share' | 'collab') => void;
}

export const Header: React.FC<HeaderProps> = ({
  trip,
  canUndo,
  canRedo,
  activeView,
  tripsCount = 1,
  isCollabConnected = false,
  collabRoomId = null,
  collabPeersCount = 0,
  onUndo,
  onRedo,
  onChangeView,
  onOpenCreateModal,
  onOpenUploadModal,
  onOpenSettingsModal,
  onOpenHistoryModal,
  onOpenResetModal,
  onResetToDemoTrip,
  onOpenShareModal,
}) => {
  const { lang, setLang, t } = useI18n();

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-3 sm:px-4 py-2 sm:py-2.5 sticky top-0 z-30 flex flex-col sm:block">
      {/* Primary Row: Brand, Desktop Views in Center, Primary Actions on Right */}
      <div className="flex items-center justify-between gap-3 sm:gap-4 w-full">
        {/* Brand & Active Trip Title (Must NEVER shrink) */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
            <Compass className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white" />
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-slate-100 text-xs sm:text-sm tracking-tight whitespace-nowrap">
                {t.header.title}
              </span>
              <span className="px-1 py-0.2 text-[9px] sm:text-[10px] font-mono rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                {t.header.version}
              </span>
              <span className="hidden xl:inline-block text-[11px] text-slate-400 italic whitespace-nowrap">
                “{t.header.tagline}”
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-400">
              <span className="font-medium text-slate-200 truncate max-w-[110px] md:max-w-[150px] lg:max-w-[190px]">
                {trip.name}
              </span>
              {isTripCompleted(trip) ? (
                <span className="px-1 py-0.2 text-[9px] font-semibold rounded bg-purple-950 text-purple-300 border border-purple-800/80 shrink-0">
                  {t.header.statusCompleted}
                </span>
              ) : (
                <span className="px-1 py-0.2 text-[9px] font-semibold rounded bg-blue-950 text-blue-300 border border-blue-800/80 shrink-0">
                  {t.header.statusPlanned}
                </span>
              )}
              <span className="hidden md:inline text-slate-600">•</span>
              <span className="hidden md:inline font-mono text-[11px] text-slate-400 whitespace-nowrap">
                {trip.startDate} → {trip.endDate}
              </span>
            </div>
          </div>

          <button
            onClick={onResetToDemoTrip}
            title={t.header.europeDemo}
            className="hidden 2xl:inline-flex items-center gap-1.5 text-[11px] text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 px-2 py-1 rounded-md transition-colors shrink-0"
          >
            <Compass className="w-3 h-3 text-emerald-400" />
            <span>{t.header.europeDemo}</span>
          </button>
        </div>

        {/* View Switcher Tabs (Desktop Only: compact icons on lg, full labels on xl+) */}
        <div
          role="tablist"
          aria-label="View Modes"
          className="hidden lg:flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs font-medium shrink-0"
        >
          <button
            role="tab"
            id="view-tab-split"
            aria-selected={activeView === 'split'}
            onClick={() => onChangeView('split')}
            title={t.header.plannerSplit}
            className={`px-2.5 xl:px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              activeView === 'split'
                ? 'bg-slate-800 text-white shadow-xs font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xl:inline">{t.header.plannerSplit}</span>
          </button>

          <button
            role="tab"
            id="view-tab-map"
            aria-selected={activeView === 'map'}
            onClick={() => onChangeView('map')}
            title={t.header.mapFocus}
            className={`px-2.5 xl:px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              activeView === 'map'
                ? 'bg-slate-800 text-white shadow-xs font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xl:inline">{t.header.mapFocus}</span>
          </button>

          <button
            role="tab"
            id="view-tab-timeline"
            aria-selected={activeView === 'timeline'}
            onClick={() => onChangeView('timeline')}
            title={t.header.timeline}
            className={`px-2.5 xl:px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              activeView === 'timeline'
                ? 'bg-slate-800 text-white shadow-xs font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xl:inline">{t.header.timeline}</span>
          </button>

          <button
            role="tab"
            id="view-tab-calendar"
            aria-selected={activeView === 'calendar'}
            onClick={() => onChangeView('calendar')}
            title={t.header.calendar}
            className={`px-2.5 xl:px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              activeView === 'calendar'
                ? 'bg-slate-800 text-white shadow-xs font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xl:inline">{t.header.calendar}</span>
          </button>
        </div>

        {/* Action Controls (Clean, balanced layout with tooltips and responsive labels) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Language Switcher ES / EN (Desktop/Tablet) */}
          <div className="hidden sm:flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setLang('es')}
              className={`px-2 py-1 rounded transition-colors ${
                lang === 'es'
                  ? 'bg-emerald-600 text-white shadow-xs'
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
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              EN
            </button>
          </div>

          {/* Undo / Redo (Desktop/Tablet) */}
          <div className="hidden sm:flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
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

          {/* Upload / Ingest Screenshots (Desktop/Tablet) */}
          <button
            onClick={onOpenUploadModal}
            title={t.header.ingestDocuments}
            className="hidden sm:flex bg-slate-800 hover:bg-slate-750 text-slate-200 p-1.5 xl:px-2.5 xl:py-1.5 rounded-lg text-xs font-medium items-center gap-1.5 transition-colors border border-slate-700 shadow-xs"
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="hidden 2xl:inline">{t.header.ingestDocuments}</span>
          </button>

          {/* Trip History Library (Desktop/Tablet) */}
          <button
            onClick={onOpenHistoryModal}
            title={t.header.tripHistory}
            className="hidden sm:flex bg-slate-800 hover:bg-slate-750 text-slate-200 px-2 xl:px-2.5 py-1.5 rounded-lg text-xs font-medium items-center gap-1.5 transition-colors border border-slate-700 shadow-xs"
          >
            <FolderClock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="hidden 2xl:inline">{t.header.tripHistory}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-950 text-purple-300 border border-slate-700">
              {tripsCount}
            </span>
          </button>

          {/* Collaborative Room Live Pill (if connected) */}
          {isCollabConnected && (
            <button
              onClick={() => onOpenShareModal('collab')}
              title={lang === 'es' ? `Sala colaborativa activa: ${collabRoomId}` : `Active collaboration room: ${collabRoomId}`}
              className="bg-slate-800 hover:bg-slate-750 text-emerald-300 border border-emerald-600/60 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs animate-fade-in"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono font-bold tracking-wide text-[11px] sm:text-xs">{collabRoomId}</span>
              <span className="text-[9px] sm:text-[10px] font-mono px-1 py-0.2 rounded bg-slate-900 text-emerald-300 border border-slate-700 flex items-center gap-0.5">
                <Users className="w-2.5 h-2.5 text-emerald-300" />
                {collabPeersCount + 1}
              </span>
            </button>
          )}

          {/* Share & Collaborate Button (Always visible) */}
          <button
            onClick={() => onOpenShareModal('share')}
            title={lang === 'es' ? 'Compartir o colaborar en este viaje' : 'Share or collaborate on this trip'}
            className="bg-slate-800 hover:bg-slate-750 text-slate-200 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700 shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="hidden md:inline">{lang === 'es' ? 'Compartir' : 'Share'}</span>
          </button>

          {/* Reset Active Trip (Desktop only: icon button with tooltip on laptops, text on 2xl) */}
          <button
            onClick={onOpenResetModal}
            title={t.header.resetTrip}
            className={`hidden md:flex p-1.5 xl:px-2 xl:py-1.5 rounded-lg text-xs font-medium items-center gap-1.5 transition-colors border shadow-xs ${
              isTripCompleted(trip)
                ? 'bg-purple-950/80 hover:bg-purple-900/80 text-purple-200 border-purple-800/80'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="hidden 2xl:inline">{t.header.resetTrip}</span>
          </button>

          {/* New Trip Button (Always visible) */}
          <button
            onClick={onOpenCreateModal}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{t.header.newTrip}</span>
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettingsModal}
            title={t.header.settingsTooltip}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800 shrink-0"
          >
            <Settings className="w-4 h-4 shrink-0" />
          </button>
        </div>
      </div>

      {/* Mobile Sub-Toolbar (Only on screens < 640px): A clean, single horizontal strip */}
      <div className="flex sm:hidden items-center justify-between gap-1 pt-1.5 border-t border-slate-800/60 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 min-w-0">
          {/* Trip dates badge */}
          <span className="font-mono text-[10px] text-slate-400 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 shrink-0">
            {trip.startDate} → {trip.endDate}
          </span>

          {/* History */}
          <button
            onClick={onOpenHistoryModal}
            className="p-1 px-2 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] flex items-center gap-1 shrink-0 font-medium"
          >
            <FolderClock className="w-3 h-3 text-purple-400" />
            <span>{tripsCount}</span>
          </button>

          {/* Upload */}
          <button
            onClick={onOpenUploadModal}
            title={t.header.ingestDocuments}
            className="p-1 px-2 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] flex items-center gap-1 shrink-0 font-medium"
          >
            <UploadCloud className="w-3 h-3 text-blue-400" />
            <span>Doc</span>
          </button>

          {/* Reset Trip (Mobile) */}
          <button
            onClick={onOpenResetModal}
            title={t.header.resetTrip}
            className="p-1 px-2 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] flex items-center gap-1 shrink-0 font-medium"
          >
            <RotateCcw className="w-3 h-3 text-purple-400" />
            <span>Reset</span>
          </button>

          {/* Demo reset */}
          <button
            onClick={onResetToDemoTrip}
            title={t.header.europeDemo}
            className="p-1 px-2 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] flex items-center gap-1 shrink-0 font-medium"
          >
            <Compass className="w-3 h-3 text-emerald-400" />
            <span>Demo</span>
          </button>
        </div>

        {/* Undo/Redo & Lang on right of mobile subtoolbar */}
        <div className="flex items-center gap-1 shrink-0 pl-1">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded p-0.5">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1 text-slate-400 hover:text-slate-100 disabled:opacity-30"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1 text-slate-400 hover:text-slate-100 disabled:opacity-30"
            >
              <RotateCw className="w-3 h-3" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-950 text-slate-300 border border-slate-800"
          >
            {lang.toUpperCase()}
          </button>
        </div>
      </div>
    </header>
  );
};
