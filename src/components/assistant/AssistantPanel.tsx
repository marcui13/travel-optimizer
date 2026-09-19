import React, { useState } from 'react';
import {
  Trip,
  ValidationIssue,
  OptimizationResult,
} from '../../domain/types';
import { useI18n } from '../../i18n/I18nContext';
import {
  Send,
  Check,
  AlertTriangle,
  TrendingDown,
  Cpu,
  SlidersHorizontal,
  Loader2,
  Route,
} from 'lucide-react';
import { executeWhatIfScenario, WhatIfResponse } from '../../services/ai/whatIfEngine';
import {
  getActiveProviderId,
  getModelForProvider,
  isCurrentProviderConfigured,
} from '../../services/ai/aiClient';

interface AssistantPanelProps {
  trip: Trip;
  validationIssues: ValidationIssue[];
  optimizationResult?: OptimizationResult | null;
  onApplyOptimization: (result: OptimizationResult) => void;
  onApplyWhatIfTrip: (modifiedTrip: Trip) => void;
  onRequestOptimization: (profile: 'efficient' | 'balanced' | 'relaxed') => void;
}

interface MessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  whatIfProposal?: WhatIfResponse;
  suggestionAction?: {
    label: string;
    profile?: 'efficient' | 'balanced' | 'relaxed';
    proposedTrip?: Trip;
  };
}

export const AssistantPanel: React.FC<AssistantPanelProps> = ({
  trip,
  validationIssues,
  optimizationResult,
  onApplyOptimization,
  onApplyWhatIfTrip,
  onRequestOptimization,
}) => {
  const { t } = useI18n();
  const [inputQuery, setInputQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'msg-init',
      sender: 'assistant',
      text: t.assistant.greeting,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isProcessing) return;

    const userMsg: MessageItem = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setIsProcessing(true);

    try {
      const response = await executeWhatIfScenario(trip, textToSend);

      const assistantMsg: MessageItem = {
        id: `msg-ast-${Date.now()}`,
        sender: 'assistant',
        text: response.explanation,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        whatIfProposal: response,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          sender: 'assistant',
          text: 'Error processing scenario. Please try rephrasing.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const criticalIssues = validationIssues.filter((i) => i.severity === 'error');
  const isConfigured = isCurrentProviderConfigured();
  const activeProvider = getActiveProviderId();
  const activeModel = getModelForProvider(activeProvider);

  return (
    <div className="flex flex-col h-full bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-3 sm:p-3.5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
            <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-100 text-xs tracking-wide truncate">
                {t.assistant.intelligenceTitle}
              </h3>
              <span className="text-[10px] text-slate-400 italic hidden sm:inline">
                “Trust the Detour”
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {t.assistant.tripStateSynced}
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono truncate max-w-[85px] sm:max-w-[130px] border border-slate-700" title={isConfigured ? activeModel : 'Local'}>
                {isConfigured ? activeModel : 'Local Engine'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Optimization Shortcuts */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            onClick={() => onRequestOptimization('efficient')}
            title="Optimize route"
            className="text-[10px] sm:text-[11px] font-mono px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            {t.assistant.efficient}
          </button>
          <button
            onClick={() => onRequestOptimization('relaxed')}
            title="Relaxed pacing"
            className="text-[10px] sm:text-[11px] font-mono px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            {t.assistant.relaxed}
          </button>
        </div>
      </div>

      {/* Validation Banner if any critical issues */}
      {criticalIssues.length > 0 && (
        <div className="p-2.5 bg-rose-950/70 border-b border-rose-900/60 text-xs text-rose-200 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-[11px] leading-tight">
            <span className="font-bold">
              {criticalIssues.length} {t.assistant.scheduleConflict}:
            </span>{' '}
            {criticalIssues[0].message}
          </div>
        </div>
      )}

      {/* Actionable Optimization Proposal Banner (if pending) */}
      {optimizationResult && (
        <div className="p-3 bg-emerald-950/30 border-b border-emerald-800/40 text-xs space-y-2">
          <div className="flex items-center justify-between text-emerald-300 font-semibold">
            <span className="flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" />
              {t.assistant.proposedReady} ({optimizationResult.profile})
            </span>
            <span className="text-[10px] text-emerald-400/80 font-mono">
              {optimizationResult.changes.length} {t.assistant.adjustments}
            </span>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            {optimizationResult.explanation}
          </p>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => onApplyOptimization(optimizationResult)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{t.assistant.applyOptimization}</span>
            </button>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 p-3.5 space-y-3 overflow-y-auto text-xs">
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <div
              key={m.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-lg p-3 space-y-1.5 ${
                  isUser
                    ? 'bg-slate-800 text-slate-100 border border-slate-700'
                    : 'bg-slate-950/70 border border-slate-800 text-slate-200'
                }`}
              >
                {!isUser && m.whatIfProposal?.modelName && (
                  <div className="flex items-center gap-1 text-[9px] text-slate-400 mb-1">
                    {m.whatIfProposal.engineUsed === 'local' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[9px]">
                        <Cpu className="w-2.5 h-2.5 text-slate-400" /> Motor Heurístico
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-300 font-mono text-[9px]">
                        <Route className="w-2.5 h-2.5 text-emerald-400" /> {m.whatIfProposal.modelName}
                      </span>
                    )}
                  </div>
                )}
                <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>

                {/* What-If Actionable Card */}
                {m.whatIfProposal?.actionable && m.whatIfProposal.proposedTrip && (
                  <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-2">
                    <div className="bg-slate-900/90 rounded-md p-2.5 border border-emerald-700/40 text-[11px]">
                      <span className="font-semibold text-emerald-400 block mb-1">
                        {t.assistant.impactSummary}
                      </span>
                      <p className="text-slate-300">{m.whatIfProposal.impactSummary}</p>

                      {m.whatIfProposal.tradeOffs && (
                        <ul className="mt-1.5 space-y-1 text-[10px] text-slate-400 list-disc pl-3">
                          {m.whatIfProposal.tradeOffs.map((tr, idx) => (
                            <li key={idx}>{tr}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onApplyWhatIfTrip(m.whatIfProposal!.proposedTrip!)}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-1.5 px-2.5 rounded-md text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{t.assistant.applyChanges}</span>
                    </button>
                  </div>
                )}

                <span
                  className={`text-[9px] block text-right font-mono ${
                    isUser ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {m.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {isProcessing && (
          <div className="flex items-center gap-2 text-slate-400 text-xs italic py-2">
            <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            <span>{t.assistant.evaluating}</span>
          </div>
        )}
      </div>

      {/* Quick Action Suggestion Chips */}
      <div className="p-2.5 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
          <button
            onClick={() => handleSendMessage(t.assistant.chipFitCroatia)}
            className="shrink-0 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors font-mono text-[11px]"
          >
            {t.assistant.chipFitCroatia}
          </button>
          <button
            onClick={() => handleSendMessage(t.assistant.chipRelaxed)}
            className="shrink-0 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors font-mono text-[11px]"
          >
            {t.assistant.chipRelaxed}
          </button>
          <button
            onClick={() => handleSendMessage(t.assistant.chipTrainsOnly)}
            className="shrink-0 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors font-mono text-[11px]"
          >
            {t.assistant.chipTrainsOnly}
          </button>
          <button
            onClick={() => handleSendMessage(t.assistant.chipMoreItaly)}
            className="shrink-0 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors font-mono text-[11px]"
          >
            {t.assistant.chipMoreItaly}
          </button>
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 mt-2"
        >
          <input
            type="text"
            placeholder={t.assistant.inputPlaceholder}
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 min-h-[38px] focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isProcessing}
            className="h-[38px] w-[38px] flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
