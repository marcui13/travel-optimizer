import React from 'react';
import { View, Text } from 'react-native';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Compass,
  Utensils,
  Landmark,
  Coffee,
  Sparkles,
} from 'lucide-react-native';
import { Activity, ConfidenceLevel } from '@domain/types';
import { useMobileI18n } from '../../context/MobileI18nContext';

interface ActivityItemProps {
  activity: Activity;
}

export const ActivityItem: React.FC<ActivityItemProps> = ({ activity }) => {
  const { t, lang } = useMobileI18n();

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'food':
        return <Utensils color="#fb923c" size={12} />;
      case 'culture':
        return <Landmark color="#a78bfa" size={12} />;
      case 'relaxation':
        return <Coffee color="#34d399" size={12} />;
      case 'sightseeing':
        return <Compass color="#38bdf8" size={12} />;
      default:
        return <Sparkles color="#94a3b8" size={12} />;
    }
  };

  const renderConfidenceBadge = (confidence?: ConfidenceLevel) => {
    if (confidence === 'high') {
      return (
        <View className="flex-row items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/50">
          <CheckCircle2 color="#34d399" size={10} />
          <Text className="text-[9px] font-mono text-emerald-400 font-semibold">
            {t.common.verified}
          </Text>
        </View>
      );
    }
    if (confidence === 'low') {
      return (
        <View className="flex-row items-center space-x-1 px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-800/50">
          <AlertCircle color="#fbbf24" size={10} />
          <Text className="text-[9px] font-mono text-amber-300 font-semibold">
            {t.common.verify}
          </Text>
        </View>
      );
    }
    return (
      <View className="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
        <Text className="text-[9px] font-mono text-slate-400">
          {t.common.aiSuggestion}
        </Text>
      </View>
    );
  };

  return (
    <View className="bg-slate-950/50 border border-slate-800/70 rounded-xl p-3 mb-2">
      <View className="flex-row items-start justify-between">
        {/* Left: Category Icon + Title + Description */}
        <View className="flex-row items-start space-x-2.5 flex-1 mr-2">
          <View className="w-6 h-6 rounded-md bg-slate-900 items-center justify-center border border-slate-800 mt-0.5">
            {getCategoryIcon(activity.category)}
          </View>
          <View className="flex-1">
            <View className="flex-row items-center flex-wrap gap-1">
              <Text className="text-xs font-semibold text-slate-100">
                {activity.title}
              </Text>
              {activity.isOptional && (
                <Text className="text-[10px] font-mono text-slate-400">
                  ({lang === 'es' ? 'Opcional' : 'Optional'})
                </Text>
              )}
            </View>
            {Boolean(activity.description) && (
              <Text className="text-[11px] text-slate-400 mt-1 leading-4">
                {activity.description}
              </Text>
            )}
          </View>
        </View>

        {/* Right: Time & Confidence Badge */}
        <View className="items-end space-y-1">
          {Boolean(activity.time) && (
            <View className="flex-row items-center space-x-1">
              <Clock color="#64748b" size={10} />
              <Text className="text-[10px] font-mono text-slate-300">
                {activity.time}
              </Text>
            </View>
          )}
          {renderConfidenceBadge(activity.confidence)}
        </View>
      </View>
    </View>
  );
};
