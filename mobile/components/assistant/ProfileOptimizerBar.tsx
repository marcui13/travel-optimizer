import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Zap, SlidersHorizontal, Coffee } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMobileI18n } from '../../context/MobileI18nContext';

interface ProfileOptimizerBarProps {
  onSelectProfile: (profile: 'efficient' | 'balanced' | 'relaxed') => void;
  isOptimizing?: boolean;
}

export const ProfileOptimizerBar: React.FC<ProfileOptimizerBarProps> = ({
  onSelectProfile,
  isOptimizing = false,
}) => {
  const { t, lang } = useMobileI18n();

  const handlePress = (profile: 'efficient' | 'balanced' | 'relaxed') => {
    if (isOptimizing) return;
    Haptics.selectionAsync().catch(() => {});
    onSelectProfile(profile);
  };

  return (
    <View className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 mb-3 shadow-md">
      <View className="flex-row items-center justify-between mb-2 px-1">
        <Text className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
          {lang === 'es' ? 'Perfiles de Optimización' : 'Optimization Profiles'}
        </Text>
        <Text className="text-[10px] font-mono text-brand-400">
          {lang === 'es' ? '1-Tap Heurístico' : '1-Tap Heuristic'}
        </Text>
      </View>

      <View className="flex-row items-center space-x-2">
        {/* Efficient */}
        <TouchableOpacity
          disabled={isOptimizing}
          onPress={() => handlePress('efficient')}
          activeOpacity={0.7}
          className={`flex-1 flex-row items-center justify-center space-x-1.5 py-2 px-1 rounded-xl bg-slate-950/80 border border-slate-800 ${
            isOptimizing ? 'opacity-40' : 'active:border-sky-500/60'
          }`}
        >
          <Zap color="#38bdf8" size={12} />
          <Text className="text-xs font-bold text-slate-200" numberOfLines={1}>
            {t.assistant.efficient}
          </Text>
        </TouchableOpacity>

        {/* Balanced */}
        <TouchableOpacity
          disabled={isOptimizing}
          onPress={() => handlePress('balanced')}
          activeOpacity={0.7}
          className={`flex-1 flex-row items-center justify-center space-x-1.5 py-2 px-1 rounded-xl bg-slate-950/80 border border-slate-800 ${
            isOptimizing ? 'opacity-40' : 'active:border-emerald-500/60'
          }`}
        >
          <SlidersHorizontal color="#10b981" size={12} />
          <Text className="text-xs font-bold text-slate-200" numberOfLines={1}>
            {t.constraints.balanced}
          </Text>
        </TouchableOpacity>

        {/* Relaxed */}
        <TouchableOpacity
          disabled={isOptimizing}
          onPress={() => handlePress('relaxed')}
          activeOpacity={0.7}
          className={`flex-1 flex-row items-center justify-center space-x-1.5 py-2 px-1 rounded-xl bg-slate-950/80 border border-slate-800 ${
            isOptimizing ? 'opacity-40' : 'active:border-amber-500/60'
          }`}
        >
          <Coffee color="#fbbf24" size={12} />
          <Text className="text-xs font-bold text-slate-200" numberOfLines={1}>
            {t.assistant.relaxed}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
