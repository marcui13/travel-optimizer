import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  Train,
  Plane,
  Car,
  Bus,
  Clock,
  Navigation,
  ArrowRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { TransportationSegment, TransportMode } from '@domain/types';
import { useMobileI18n } from '../../context/MobileI18nContext';

interface TransitSegmentStripProps {
  segment: TransportationSegment;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const TransitSegmentStrip: React.FC<TransitSegmentStripProps> = ({
  segment,
  isSelected,
  onSelect,
}) => {
  const { lang } = useMobileI18n();

  const handlePress = () => {
    Haptics.selectionAsync().catch(() => {});
    onSelect?.();
  };

  const getModeConfig = (mode: TransportMode) => {
    switch (mode) {
      case 'flight':
        return {
          icon: Plane,
          color: '#38bdf8',
          bg: 'bg-sky-950/50',
          border: 'border-sky-800/50',
          selectedBorder: 'border-sky-400',
          badgeText: lang === 'es' ? 'VUELO' : 'FLIGHT',
          badgeBg: 'bg-sky-900/40 text-sky-300',
        };
      case 'train':
        return {
          icon: Train,
          color: '#34d399',
          bg: 'bg-emerald-950/50',
          border: 'border-emerald-800/50',
          selectedBorder: 'border-emerald-400',
          badgeText: lang === 'es' ? 'TREN' : 'TRAIN',
          badgeBg: 'bg-emerald-900/40 text-emerald-300',
        };
      case 'bus':
        return {
          icon: Bus,
          color: '#fbbf24',
          bg: 'bg-amber-950/50',
          border: 'border-amber-800/50',
          selectedBorder: 'border-amber-400',
          badgeText: lang === 'es' ? 'AUTOBÚS' : 'BUS',
          badgeBg: 'bg-amber-900/40 text-amber-300',
        };
      case 'car':
        return {
          icon: Car,
          color: '#c084fc',
          bg: 'bg-purple-950/50',
          border: 'border-purple-800/50',
          selectedBorder: 'border-purple-400',
          badgeText: lang === 'es' ? 'COCHE' : 'CAR',
          badgeBg: 'bg-purple-900/40 text-purple-300',
        };
      default:
        return {
          icon: Navigation,
          color: '#94a3b8',
          bg: 'bg-slate-900/60',
          border: 'border-slate-800',
          selectedBorder: 'border-slate-500',
          badgeText: lang === 'es' ? 'TRANSBORDO' : 'TRANSIT',
          badgeBg: 'bg-slate-800 text-slate-300',
        };
    }
  };

  const config = getModeConfig(segment.mode);
  const IconComponent = config.icon;

  const hours = Math.floor((segment.estimatedDurationMinutes || 0) / 60);
  const minutes = (segment.estimatedDurationMinutes || 0) % 60;
  const durationText = hours > 0 ? `${hours}h ${minutes > 0 ? `${minutes}m` : ''}` : `${minutes}m`;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      className={`rounded-xl p-3 border mb-2.5 ${config.bg} ${
        isSelected ? config.selectedBorder : config.border
      }`}
    >
      {/* Top Header: Route & Mode */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center space-x-2 flex-1 mr-2">
          <View className="w-7 h-7 rounded-lg bg-slate-900 items-center justify-center border border-slate-800">
            <IconComponent color={config.color} size={15} />
          </View>
          <View className="flex-row items-center flex-1">
            <Text className="text-xs font-bold text-white truncate" numberOfLines={1}>
              {segment.from?.name || 'Origen'}
            </Text>
            <View className="mx-1.5">
              <ArrowRight color="#64748b" size={12} />
            </View>
            <Text className="text-xs font-bold text-white truncate" numberOfLines={1}>
              {segment.to?.name || 'Destino'}
            </Text>
          </View>
        </View>

        {/* Mode Tag */}
        <View className="px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700/60">
          <Text className="text-[10px] font-mono font-bold" style={{ color: config.color }}>
            {config.badgeText}
          </Text>
        </View>
      </View>

      {/* Middle Specs: Duration, Distance */}
      <View className="flex-row items-center justify-between pt-1 border-t border-slate-800/60">
        <View className="flex-row items-center space-x-1.5">
          <Clock color="#64748b" size={12} />
          <Text className="text-[11px] font-mono text-slate-300">
            {durationText}
          </Text>
          {Boolean(segment.distanceKm && segment.distanceKm > 0) && (
            <>
              <Text className="text-slate-600">•</Text>
              <Text className="text-[11px] font-mono text-slate-400">
                {segment.distanceKm} km
              </Text>
            </>
          )}
        </View>

        {/* Departure / Arrival Times */}
        {Boolean(segment.departureTime || segment.arrivalTime) && (
          <View className="flex-row items-center space-x-1">
            <Text className="text-[11px] font-mono text-slate-400">
              {segment.departureTime || '--:--'}
            </Text>
            <Text className="text-[10px] text-slate-600">→</Text>
            <Text className="text-[11px] font-mono text-slate-400">
              {segment.arrivalTime || '--:--'}
            </Text>
          </View>
        )}
      </View>

      {/* Optional Operator & Booking Reference */}
      {Boolean(segment.operatorOrRoute || segment.bookingRef) && (
        <View className="flex-row items-center justify-between mt-2 pt-1.5 border-t border-slate-800/40">
          <Text className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            {segment.operatorOrRoute || ''}
          </Text>
          {Boolean(segment.bookingRef) && (
            <Text className="text-[10px] font-mono text-brand-400 bg-brand-950/40 px-1.5 py-0.5 rounded border border-brand-800/40">
              Ref: {segment.bookingRef}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};
