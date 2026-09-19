import React, { useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import {
  Settings,
  X,
  Key,
  Cpu,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Zap,
  ExternalLink,
  Loader2,
  Server,
  Globe,
  Database,
  Trash2,
} from 'lucide-react';
import { useModalA11y } from '../../hooks/useModalA11y';
import {
  getActiveProviderId,
  setActiveProviderId,
  getApiKeyForProvider,
  setApiKeyForProvider,
  getModelForProvider,
  setModelForProvider,
  getOllamaUrl,
  setOllamaUrl,
  testProviderConnection,
} from '../../services/ai/aiClient';
import { PROVIDER_CATALOG } from '../../services/ai/providers/catalog';
import { AiProviderId } from '../../services/ai/providers/types';
import {
  getActiveGeocodingProviderId,
  setActiveGeocodingProviderId,
  getGeocodingApiKey,
  setGeocodingApiKey,
  testGeocodingProvider,
  GEOCODING_PROVIDERS,
} from '../../services/geocoding/providerManager';
import {
  clearGeocodingCache,
  getGeocodingCacheStats,
} from '../../services/geocoding/cache';
import { GeocodingProviderId } from '../../services/geocoding/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsSaved,
}) => {
  const { t, lang } = useI18n();
  const modalRef = useModalA11y(isOpen, onClose);

  const [activeProvider, setActiveProviderState] = useState<AiProviderId>(getActiveProviderId());
  const [apiKeys, setApiKeys] = useState<Record<AiProviderId, string>>({
    gemini: getApiKeyForProvider('gemini'),
    openai: getApiKeyForProvider('openai'),
    anthropic: getApiKeyForProvider('anthropic'),
    ollama: '',
  });
  const [selectedModels, setSelectedModels] = useState<Record<AiProviderId, string>>({
    gemini: getModelForProvider('gemini'),
    openai: getModelForProvider('openai'),
    anthropic: getModelForProvider('anthropic'),
    ollama: getModelForProvider('ollama'),
  });
  const [ollamaUrlState, setOllamaUrlState] = useState(getOllamaUrl());
  const [showKey, setShowKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Geocoding settings state
  const [settingsTab, setSettingsTab] = useState<'ai' | 'geocoding'>('ai');
  const [activeGeoProvider, setActiveGeoProvider] = useState<GeocodingProviderId>(getActiveGeocodingProviderId());
  const [geoKeys, setGeoKeys] = useState<{ mapbox: string; opencage: string }>({
    mapbox: getGeocodingApiKey('mapbox'),
    opencage: getGeocodingApiKey('opencage'),
  });
  const [cacheStats, setCacheStats] = useState(getGeocodingCacheStats());
  const [isGeoTesting, setIsGeoTesting] = useState(false);
  const [geoTestResult, setGeoTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [cacheClearedSuccess, setCacheClearedSuccess] = useState(false);

  if (!isOpen) return null;

  const currentProviderConfig = PROVIDER_CATALOG[activeProvider] || PROVIDER_CATALOG.gemini;
  const currentModelId = selectedModels[activeProvider] || currentProviderConfig.defaultModel;
  const currentModelInfo =
    currentProviderConfig.models.find((m) => m.id === currentModelId) || currentProviderConfig.models[0];

  const handleApiKeyChange = (val: string) => {
    setApiKeys((prev) => ({ ...prev, [activeProvider]: val }));
    setTestResult(null);
  };

  const handleModelChange = (val: string) => {
    setSelectedModels((prev) => ({ ...prev, [activeProvider]: val }));
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testProviderConnection(
        activeProvider,
        apiKeys[activeProvider],
        ollamaUrlState
      );
      setTestResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult({ success: false, message: msg });
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestGeoConnection = async () => {
    setIsGeoTesting(true);
    setGeoTestResult(null);
    try {
      const key =
        activeGeoProvider === 'mapbox'
          ? geoKeys.mapbox
          : activeGeoProvider === 'opencage'
          ? geoKeys.opencage
          : undefined;
      const res = await testGeocodingProvider(activeGeoProvider, key);
      setGeoTestResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGeoTestResult({ success: false, message: msg });
    } finally {
      setIsGeoTesting(false);
    }
  };

  const handleClearCache = () => {
    clearGeocodingCache();
    setCacheStats(getGeocodingCacheStats());
    setCacheClearedSuccess(true);
    setTimeout(() => setCacheClearedSuccess(false), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveProviderId(activeProvider);
    setApiKeyForProvider(activeProvider, apiKeys[activeProvider]);
    setModelForProvider(activeProvider, selectedModels[activeProvider]);
    if (activeProvider === 'ollama') {
      setOllamaUrl(ollamaUrlState);
    }

    // Save geocoding settings
    setActiveGeocodingProviderId(activeGeoProvider);
    setGeocodingApiKey('mapbox', geoKeys.mapbox);
    setGeocodingApiKey('opencage', geoKeys.opencage);

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onSettingsSaved();
      onClose();
    }, 600);
  };

  const handleClearKey = () => {
    setApiKeys((prev) => ({ ...prev, [activeProvider]: '' }));
    setApiKeyForProvider(activeProvider, '');
    setTestResult(null);
    onSettingsSaved();
  };

  const isConfigured =
    activeProvider === 'ollama' ? true : !!apiKeys[activeProvider]?.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto focus-visible:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
              <Settings className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 id="settings-dialog-title" className="text-base font-bold text-slate-100">
                {t.modals.settings.title}
              </h2>
              <p className="text-xs text-slate-400">{t.modals.settings.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 -mt-2">
          <button
            type="button"
            onClick={() => setSettingsTab('ai')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              settingsTab === 'ai'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>{t.modals.settings.tabAi}</span>
          </button>
          <button
            type="button"
            onClick={() => setSettingsTab('geocoding')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              settingsTab === 'geocoding'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{t.modals.settings.tabGeocoding}</span>
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {settingsTab === 'ai' && (
            <div className="space-y-4">
              {/* Dual Mode Status Card */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">{t.modals.settings.activeMode}</span>
              {isConfigured ? (
                <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                  <Sparkles className="w-3 h-3" /> {currentProviderConfig.name} ({currentModelInfo?.name || currentModelId})
                </span>
              ) : (
                <span className="flex items-center gap-1 text-blue-400 font-semibold text-[11px]">
                  <Cpu className="w-3 h-3" /> {t.modals.settings.localEngine}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {isConfigured
                ? `${t.modals.settings.modeDescGemini} (${currentProviderConfig.name})`
                : t.modals.settings.modeDescLocal}
            </p>
          </div>

          {/* Provider Selection Tabs */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.modals.settings.providerLabel}</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(PROVIDER_CATALOG) as AiProviderId[]).map((pid) => {
                const item = PROVIDER_CATALOG[pid];
                const isSelected = activeProvider === pid;
                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => {
                      setActiveProviderState(pid);
                      setTestResult(null);
                    }}
                    className={`p-2 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500/70 text-slate-100 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <div className="font-semibold text-[11px] leading-tight flex items-center gap-1">
                      {pid === 'gemini' && <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />}
                      {pid === 'openai' && <Zap className="w-3 h-3 text-emerald-400 shrink-0" />}
                      {pid === 'anthropic' && <Cpu className="w-3 h-3 text-indigo-400 shrink-0" />}
                      {pid === 'ollama' && <Server className="w-3 h-3 text-purple-400 shrink-0" />}
                      <span>{item.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              {lang === 'es' ? currentProviderConfig.description : currentProviderConfig.descriptionEn}
            </p>
          </div>

          {/* Credentials / Endpoint Configuration */}
          {activeProvider !== 'ollama' ? (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{currentProviderConfig.name} API Key</span>
                </label>
                <a
                  href={currentProviderConfig.docUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 underline"
                >
                  <span>{t.modals.settings.getKeyAt}</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKeys[activeProvider]}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder={currentProviderConfig.apiKeyPlaceholder}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 pr-10 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <span className="text-[10px] text-slate-500 block mt-1">
                {t.modals.settings.keyPrivacyNotice}
              </span>
            </div>
          ) : (
            <div>
              <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-purple-400" />
                <span>{t.modals.settings.ollamaEndpoint}</span>
              </label>
              <input
                type="text"
                value={ollamaUrlState}
                onChange={(e) => setOllamaUrlState(e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500 block mt-1">
                {lang === 'es'
                  ? 'Se conecta al daemon local de Ollama en tu máquina. Privacidad total sin conexión a Internet.'
                  : 'Connects to your local Ollama daemon on localhost. Zero data leaves your computer.'}
              </span>
            </div>
          )}

          {/* Test Connection Button & Result */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                  <span>{t.modals.settings.testing}</span>
                </>
              ) : (
                <>
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>{t.modals.settings.testConnection}</span>
                </>
              )}
            </button>

            {testResult && (
              <div
                className={`text-[11px] flex items-center gap-1 px-2.5 py-1 rounded-lg ${
                  testResult.success
                    ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/80 border border-rose-800 text-rose-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                )}
                <span className="truncate max-w-[280px]" title={testResult.message}>
                  {testResult.message}
                </span>
              </div>
            )}
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>{t.modals.settings.modelLabel}</span>
            </label>
            <select
              value={currentModelId}
              onChange={(e) => handleModelChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
            >
              {currentProviderConfig.models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — [{lang === 'es' ? m.badge : m.badgeEn}]
                </option>
              ))}
            </select>

            {/* Model Info Card */}
            {currentModelInfo && (
              <div className="mt-2.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-200 flex items-center gap-1.5">
                    {currentModelInfo.category === 'thinking' ? (
                      <Sparkles className="w-3 h-3 text-amber-400" />
                    ) : currentModelInfo.category === 'reasoning' ? (
                      <Cpu className="w-3 h-3 text-indigo-400" />
                    ) : (
                      <Zap className="w-3 h-3 text-emerald-400" />
                    )}
                    {currentModelInfo.name}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      currentModelInfo.category === 'thinking'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : currentModelInfo.category === 'reasoning'
                        ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                        : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {lang === 'es' ? currentModelInfo.badge : currentModelInfo.badgeEn}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {currentModelInfo.description}
                </p>
                <div className="pt-1.5 border-t border-slate-800/60 text-[10px] text-slate-500 flex items-center gap-1">
                  <span className="text-slate-400 font-medium">{t.modals.settings.recommendedFor}</span>
                  <span className="text-slate-300">
                    {lang === 'es' ? currentModelInfo.recommendedFor : currentModelInfo.recommendedForEn}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

          {settingsTab === 'geocoding' && (
            <div className="space-y-4">
              {/* Active Geocoding Status Card */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">{t.modals.settings.geoProviderLabel}</span>
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                    <Globe className="w-3 h-3" /> {GEOCODING_PROVIDERS[activeGeoProvider].name}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {t.modals.settings.geoProviderDesc}
                </p>
              </div>

              {/* Provider Selection Cards */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t.modals.settings.providerLabel}</span>
                </label>
                <div className="space-y-2">
                  {(Object.keys(GEOCODING_PROVIDERS) as GeocodingProviderId[]).map((pid) => {
                    const item = GEOCODING_PROVIDERS[pid];
                    const isSelected = activeGeoProvider === pid;
                    return (
                      <div
                        key={pid}
                        onClick={() => {
                          setActiveGeoProvider(pid);
                          setGeoTestResult(null);
                        }}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-950/20 border-emerald-500/50 shadow-sm'
                            : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-200 flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isSelected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                              }`}
                            />
                            {item.name}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              pid === 'nominatim'
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : pid === 'mapbox'
                                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                                : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {pid === 'nominatim'
                              ? (lang === 'es' ? 'Gratis / Sin Clave' : 'Free / No Key')
                              : pid === 'mapbox'
                              ? (lang === 'es' ? '100k gratis/mes' : '100k free/mo')
                              : (lang === 'es' ? '2.500/día gratis' : '2.500/day free')}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{item.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* API Key input if Mapbox or OpenCage is selected */}
              {GEOCODING_PROVIDERS[activeGeoProvider].requiresKey && (
                <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-medium flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        {activeGeoProvider === 'mapbox'
                          ? 'Mapbox Access Token'
                          : 'OpenCage API Key'}
                      </span>
                    </label>
                    <a
                      href={GEOCODING_PROVIDERS[activeGeoProvider].docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <span>{t.modals.settings.getKeyAt} {activeGeoProvider === 'mapbox' ? 'Mapbox' : 'OpenCage'}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>

                  <input
                    type="text"
                    value={activeGeoProvider === 'mapbox' ? geoKeys.mapbox : geoKeys.opencage}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (activeGeoProvider === 'mapbox') {
                        setGeoKeys((prev) => ({ ...prev, mapbox: val }));
                      } else {
                        setGeoKeys((prev) => ({ ...prev, opencage: val }));
                      }
                      setGeoTestResult(null);
                    }}
                    placeholder={
                      activeGeoProvider === 'mapbox'
                        ? 'pk.eyJ1IjoibXl1c2VyIiwiYSI6ImNs...'
                        : 'oc_tok_4a8b...'
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                  />
                  <p className="text-[10px] text-slate-500">
                    {t.modals.settings.keyPrivacyNotice}
                  </p>
                </div>
              )}

              {/* Test Geocoding Connection Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestGeoConnection}
                  disabled={isGeoTesting}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 flex items-center gap-1.5 text-xs transition-colors disabled:opacity-50"
                >
                  {isGeoTesting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  ) : (
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>
                    {isGeoTesting
                      ? t.modals.settings.geoTesting
                      : t.modals.settings.geoTestButton}
                  </span>
                </button>
              </div>

              {/* Test Connection Result */}
              {geoTestResult && (
                <div
                  className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    geoTestResult.success
                      ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                      : 'bg-rose-950/60 border border-rose-800 text-rose-300'
                  }`}
                >
                  {geoTestResult.success ? (
                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  )}
                  <span>{geoTestResult.message}</span>
                </div>
              )}

              {/* Local Cache Management */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-semibold text-slate-200 text-xs">
                        {t.modals.settings.geoCacheTitle}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {cacheStats.count}{' '}
                        {lang === 'es' ? 'ciudades en memoria (0ms)' : 'cities cached in memory (0ms)'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearCache}
                    className="px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-900/50 hover:bg-rose-950/20 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{t.modals.settings.geoClearCache}</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  {t.modals.settings.geoCacheDesc}
                </p>
                {cacheClearedSuccess && (
                  <div className="text-[11px] text-emerald-400 font-medium">
                    {t.modals.settings.geoCacheCleared}
                  </div>
                )}
              </div>
            </div>
          )}

          {savedSuccess && (
            <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 flex items-center gap-2 text-xs">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{t.modals.settings.savedSuccess}</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            {settingsTab === 'ai' && apiKeys[activeProvider] && activeProvider !== 'ollama' && (
              <button
                type="button"
                onClick={handleClearKey}
                className="text-slate-500 hover:text-rose-400 text-xs"
              >
                {t.modals.settings.removeKey}
              </button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
              >
                {t.common.close}
              </button>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors shadow"
              >
                {t.common.saveSettings}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
