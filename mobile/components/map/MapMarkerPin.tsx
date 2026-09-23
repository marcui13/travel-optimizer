import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';

interface MapMarkerPinProps {
  sequenceNumber: number;
  cityName: string;
  nightsCount?: number;
  isSelected?: boolean;
  onPress?: () => void;
}

export const MapMarkerPin: React.FC<MapMarkerPinProps> = ({
  sequenceNumber,
  cityName,
  nightsCount = 2,
  isSelected = false,
  onPress,
}) => {
  const seq = String(sequenceNumber).padStart(2, '0');

  const handlePress = () => {
    Haptics.selectionAsync().catch(() => {});
    onPress?.();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handlePress}
      className="items-center"
      style={{ paddingBottom: 4 }}
    >
      {/* Rectangular Badge */}
      <View
        className={`flex-row items-center space-x-1.5 px-2 py-1 rounded-lg border shadow-lg ${
          isSelected
            ? 'bg-brand-600 border-brand-300 ring-2 ring-brand-500/40'
            : 'bg-slate-900 border-slate-700'
        }`}
      >
        {/* Sequence Number Pill */}
        <View
          className={`px-1.5 py-0.5 rounded ${
            isSelected
              ? 'bg-white'
              : 'bg-slate-800 border border-slate-700'
          }`}
        >
          <Text
            className={`text-[10px] font-mono font-bold ${
              isSelected ? 'text-brand-900' : 'text-brand-400'
            }`}
          >
            {seq}
          </Text>
        </View>

        {/* City Name */}
        <Text
          className={`text-xs font-bold ${
            isSelected ? 'text-white' : 'text-slate-100'
          }`}
          numberOfLines={1}
        >
          {cityName}
        </Text>

        {/* Nights Pill */}
        <View
          className={`px-1 py-0.5 rounded ${
            isSelected
              ? 'bg-brand-700'
              : 'bg-slate-800/80 border border-slate-700/60'
          }`}
        >
          <Text
            className={`text-[9px] font-mono ${
              isSelected ? 'text-brand-100 font-semibold' : 'text-slate-400'
            }`}
          >
            {nightsCount}n
          </Text>
        </View>
      </View>

      {/* Downward Caret Triangle Pointer */}
      <View
        className={`w-2.5 h-2.5 -mt-1 rotate-45 border-r border-b ${
          isSelected
            ? 'bg-brand-600 border-brand-300'
            : 'bg-slate-900 border-slate-700'
        }`}
      />
    </TouchableOpacity>
  );
};
