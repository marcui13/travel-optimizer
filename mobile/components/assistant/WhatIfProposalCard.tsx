import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  Check,
  Cpu,
  Route,
  Sparkles,
  TrendingDown,
  CheckCircle2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Trip } from '@domain/types';
import { WhatIfResponse } from '@services/ai/whatIfEngine';
import { useMobileI18n } from '../../context/MobileI18nContext';

interface WhatIfProposalCardProps {
  proposal: WhatIfResponse;
  onApply: (proposedTrip: Trip) => void;
  isApplied?: boolean;
}

export const WhatIfProposalCard: React.FC<WhatIfProposalCardProps> = ({
  proposal,
  onApply,
  isApplied: initialIsApplied = false,
}) => {
  const { t, lang } = useMobileI18n();
  const [applied, setApplied] = useState(initialIsApplied);

  const handleApply = () => {
    if (!proposal.proposedTrip || applied) return;

    // Haptic confirmation
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setApplied(true);
    onApply(proposal.proposedTrip);
  };

  const isLocal = proposal.engineUsed === 'local';

  return (
    <View className="mt-2.5 pt-2.5 border-t border-slate-800/80">
      <View className="bg-slate-900 border border-brand-500/40 rounded-2xl p-3.5 shadow-md">
        {/* Engine & Model Tag */}
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center space-x-1.5">
            <TrendingDown color="#10b981" size={14} />
            <Text className="text-xs font-bold text-white">
              {lang === 'es' ? 'Propuesta de Optimización' : 'Optimization Proposal'}
            </Text>
          </View>

          <View className="flex-row items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
            {isLocal ? (
              <Cpu color="#94a3b8" size={11} />
            ) : (
              <Sparkles color="#10b981" size={11} />
            )}
            <Text className="text-[10px] font-mono text-slate-300">
              {isLocal
                ? lang === 'es' ? 'Motor Local' : 'Local Engine'
                : proposal.modelName || 'AI'}
            </Text>
          </View>
        </View>

        {/* Impact Summary */}
        <View className="bg-slate-950/70 rounded-xl p-2.5 border border-slate-800 mb-2.5">
          <Text className="text-[11px] font-bold text-brand-400 mb-1">
            {t.assistant.impactSummary}
          </Text>
          <Text className="text-xs text-slate-200 leading-relaxed">
            {proposal.impactSummary}
          </Text>
        </View>

        {/* Trade-offs List */}
        {Boolean(proposal.tradeOffs && proposal.tradeOffs.length > 0) && (
          <View className="mb-3">
            <Text className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 font-bold">
              {lang === 'es' ? 'Compensaciones (Trade-offs):' : 'Trade-offs:'}
            </Text>
            {proposal.tradeOffs!.map((tradeOff, idx) => (
              <View key={idx} className="flex-row items-start space-x-2 mb-1">
                <Text className="text-slate-500 text-xs leading-4">•</Text>
                <Text className="text-[11px] text-slate-300 flex-1 leading-4">
                  {tradeOff}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Action Button: Apply or Applied Status */}
        {proposal.actionable && proposal.proposedTrip && (
          <View className="pt-1">
            {applied ? (
              <View className="flex-row items-center justify-center space-x-2 bg-brand-950/40 border border-brand-500/60 py-2 px-3 rounded-xl">
                <CheckCircle2 color="#10b981" size={15} />
                <Text className="text-xs font-bold text-brand-400">
                  {lang === 'es' ? 'Cambios aplicados al viaje' : 'Changes applied to trip'}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleApply}
                className="bg-brand-600 py-2.5 px-3 rounded-xl flex-row items-center justify-center space-x-2 shadow-lg"
              >
                <Check color="#ffffff" size={16} />
                <Text className="text-xs font-black text-white">
                  {t.assistant.applyChanges}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
};
