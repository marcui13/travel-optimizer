import React from 'react';
import { ValidationIssue } from '../../domain/types';
import { useI18n } from '../../i18n/I18nContext';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useModalA11y } from '../../hooks/useModalA11y';

interface ValidationIssuesModalProps {
  isOpen: boolean;
  onClose: () => void;
  issues: ValidationIssue[];
}

export const ValidationIssuesModal: React.FC<ValidationIssuesModalProps> = ({
  isOpen,
  onClose,
  issues,
}) => {
  const { t } = useI18n();
  const containerRef = useModalA11y(isOpen, onClose);
  if (!isOpen) return null;

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const infos = issues.filter((i) => i.severity === 'info');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="validation-issues-modal-title"
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600/20 border border-amber-500/40 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 id="validation-issues-modal-title" className="text-base font-bold text-slate-100">
                {t.modals.validation.title}
              </h2>
              <p className="text-xs text-slate-400">
                {t.modals.validation.subtitle}
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

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          {issues.length === 0 ? (
            <div className="p-8 text-center space-y-2 bg-slate-950/60 rounded-xl border border-slate-800">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="font-semibold text-slate-200">{t.modals.validation.allClearTitle}</h3>
              <p className="text-slate-400 text-xs">
                {t.modals.validation.allClearDesc}
              </p>
            </div>
          ) : (
            <>
              {errors.map((err) => (
                <div
                  key={err.id}
                  className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/60 space-y-1.5"
                >
                  <div className="flex items-center gap-2 font-semibold text-rose-300">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{t.modals.validation.hardConflict}</span>
                  </div>
                  <p className="text-slate-200 text-xs leading-relaxed">{err.message}</p>
                  {err.suggestion && (
                    <p className="text-rose-200/90 text-[11px] bg-rose-950/50 p-2 rounded border border-rose-900/60">
                      <strong>{t.modals.validation.suggestion}</strong> {err.suggestion}
                    </p>
                  )}
                </div>
              ))}

              {warnings.map((w) => (
                <div
                  key={w.id}
                  className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/60 space-y-1.5"
                >
                  <div className="flex items-center gap-2 font-semibold text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{t.modals.validation.warning}</span>
                  </div>
                  <p className="text-slate-200 text-xs leading-relaxed">{w.message}</p>
                  {w.suggestion && (
                    <p className="text-amber-200/90 text-[11px] bg-amber-950/50 p-2 rounded border border-amber-900/60">
                      <strong>{t.modals.validation.suggestion}</strong> {w.suggestion}
                    </p>
                  )}
                </div>
              ))}

              {infos.map((inf) => (
                <div
                  key={inf.id}
                  className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-800/60 space-y-1.5"
                >
                  <div className="flex items-center gap-2 font-semibold text-blue-300">
                    <Info className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>{t.modals.validation.opportunity}</span>
                  </div>
                  <p className="text-slate-200 text-xs leading-relaxed">{inf.message}</p>
                  {inf.suggestion && (
                    <p className="text-blue-200/90 text-[11px] bg-blue-950/50 p-2 rounded border border-blue-900/60">
                      <strong>{t.modals.validation.suggestion}</strong> {inf.suggestion}
                    </p>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  );
};
