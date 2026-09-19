import React, { useState } from 'react';
import { Trip, Constraint, TravelPreferences } from '../../domain/types';
import { useI18n } from '../../i18n/I18nContext';
import {
  ShieldAlert,
  Sliders,
  Plus,
  Trash2,
  Sparkles,
  Train,
  Building,
} from 'lucide-react';

interface ConstraintsPanelProps {
  trip: Trip;
  onUpdateConstraints: (constraints: Constraint[]) => void;
  onUpdatePreferences: (preferences: TravelPreferences) => void;
}

export const ConstraintsPanel: React.FC<ConstraintsPanelProps> = ({
  trip,
  onUpdateConstraints,
  onUpdatePreferences,
}) => {
  const { t } = useI18n();
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<'hard' | 'soft'>('soft');

  const handleAddConstraint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc.trim()) return;

    const newC: Constraint = {
      id: `c-user-${Date.now()}`,
      type: newType,
      description: newDesc.trim(),
      priority: newType === 'hard' ? 1 : 3,
    };

    onUpdateConstraints([...trip.constraints, newC]);
    setNewDesc('');
  };

  const handleRemoveConstraint = (id: string) => {
    onUpdateConstraints(trip.constraints.filter((c) => c.id !== id));
  };

  const handleToggleType = (id: string) => {
    onUpdateConstraints(
      trip.constraints.map((c) =>
        c.id === id ? { ...c, type: c.type === 'hard' ? 'soft' : 'hard' } : c
      )
    );
  };

  const handleStyleChange = (style: 'relaxed' | 'balanced' | 'intense') => {
    onUpdatePreferences({
      ...trip.preferences,
      travelStyle: style,
    });
  };

  const hardConstraints = trip.constraints.filter((c) => c.type === 'hard');
  const softConstraints = trip.constraints.filter((c) => c.type === 'soft');

  return (
    <div className="space-y-6">
      {/* Travel Style & Preferences Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h3 className="font-semibold text-slate-100 text-sm">
              {t.constraints.travelPreferences}
            </h3>
          </div>
          <span className="text-xs text-slate-400">{t.constraints.optimizationWeights}</span>
        </div>

        {/* Travel Style Selector */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-2">
            {t.constraints.pacingStyle}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'relaxed' as const, label: t.constraints.relaxed },
              { id: 'balanced' as const, label: t.constraints.balanced },
              { id: 'intense' as const, label: t.constraints.intense },
            ].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleStyleChange(id)}
                className={`p-2.5 rounded-lg border text-xs font-medium capitalize transition-all text-center ${
                  trip.preferences.travelStyle === id
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/40 shadow'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div
            onClick={() =>
              onUpdatePreferences({
                ...trip.preferences,
                minimizeHotelChanges: !trip.preferences.minimizeHotelChanges,
              })
            }
            className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between text-xs transition-colors ${
              trip.preferences.minimizeHotelChanges
                ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-200'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-400" />
              <span>{t.constraints.minimizeHotelChanges}</span>
            </div>
            <input
              type="checkbox"
              readOnly
              checked={!!trip.preferences.minimizeHotelChanges}
              className="accent-emerald-500 rounded"
            />
          </div>

          <div
            onClick={() => {
              const current = trip.preferences.transportationPreference || [];
              const hasTrain = current.includes('train');
              onUpdatePreferences({
                ...trip.preferences,
                transportationPreference: hasTrain ? ['flight'] : ['train', 'flight'],
              });
            }}
            className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between text-xs transition-colors ${
              trip.preferences.transportationPreference?.includes('train')
                ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-200'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Train className="w-4 h-4 text-emerald-400" />
              <span>{t.constraints.preferRail}</span>
            </div>
            <input
              type="checkbox"
              readOnly
              checked={trip.preferences.transportationPreference?.includes('train')}
              className="accent-emerald-500 rounded"
            />
          </div>
        </div>
      </div>

      {/* Constraints Manager */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-slate-100 text-sm">
              {t.constraints.rulesTitle}
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            {trip.constraints.length} {t.constraints.activeRules}
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          {t.constraints.explanation}
        </p>

        {/* Add Constraint Form */}
        <form onSubmit={handleAddConstraint} className="flex flex-col sm:flex-row gap-2">
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as 'hard' | 'soft')}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-emerald-500"
          >
            <option value="hard">{t.constraints.hardStrict}</option>
            <option value="soft">{t.constraints.softPreference}</option>
          </select>

          <input
            type="text"
            placeholder={t.constraints.addPlaceholder}
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
          />

          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.constraints.add}</span>
          </button>
        </form>

        {/* Hard Constraints List */}
        <div className="space-y-2 pt-2">
          <h4 className="text-xs font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            {t.constraints.hardTitle}
          </h4>
          {hardConstraints.length === 0 ? (
            <p className="text-xs text-slate-500 italic">{t.constraints.noHard}</p>
          ) : (
            hardConstraints.map((c) => (
              <div
                key={c.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 text-xs"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-amber-400 mt-1 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-amber-200 break-words">{c.description}</p>
                    {c.targetDate && (
                      <span className="text-[11px] text-amber-400/80 font-mono">
                        {t.constraints.targetDate}: {c.targetDate}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleToggleType(c.id)}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                  >
                    {t.constraints.changeToSoft}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveConstraint(c.id)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Soft Constraints List */}
        <div className="space-y-2 pt-3 border-t border-slate-800/60">
          <h4 className="text-xs font-semibold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            {t.constraints.softTitle}
          </h4>
          {softConstraints.length === 0 ? (
            <p className="text-xs text-slate-500 italic">{t.constraints.noSoft}</p>
          ) : (
            softConstraints.map((c) => (
              <div
                key={c.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-xs"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1 shrink-0" />
                  <p className="text-slate-200 break-words min-w-0">{c.description}</p>
                </div>

                <div className="flex items-center justify-end gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleToggleType(c.id)}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                  >
                    {t.constraints.changeToHard}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveConstraint(c.id)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
