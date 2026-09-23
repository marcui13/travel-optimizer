import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import {
  MapPin,
  Moon,
  Navigation,
  Clock,
  Building,
  Train,
  Plane,
} from 'lucide-react-native';
import { Trip } from '@domain/types';
import { calculateTripStatistics, formatMinutesToHours } from '@domain/statistics';
import { useMobileI18n } from '../../context/MobileI18nContext';

interface MetricsManifestProps {
  trip: Trip;
}

export const MetricsManifest: React.FC<MetricsManifestProps> = ({ trip }) => {
  const { t } = useMobileI18n();
  const stats = calculateTripStatistics(trip);

  return (
    <View className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 mb-4 shadow-sm">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 4 }}
      >
        {/* 1. Destinations / Cities */}
        <View className="flex-row items-center space-x-1.5 mr-3">
          <MapPin color="#34d399" size={14} />
          <Text className="text-xs font-bold text-slate-100 font-mono">
            {stats.destinationCount}
          </Text>
          <Text className="text-[11px] text-slate-400">
            {t.stats.cities}
          </Text>
        </View>

        <Text className="text-slate-700 mr-3">•</Text>

        {/* 2. Nights */}
        <View className="flex-row items-center space-x-1.5 mr-3">
          <Moon color="#38bdf8" size={14} />
          <Text className="text-xs font-bold text-slate-100 font-mono">
            {stats.nightsCount}
          </Text>
          <Text className="text-[11px] text-slate-400">
            {t.stats.nights}
          </Text>
        </View>

        <Text className="text-slate-700 mr-3">•</Text>

        {/* 3. Distance */}
        <View className="flex-row items-center space-x-1.5 mr-3">
          <Navigation color="#a78bfa" size={14} />
          <Text className="text-xs font-bold text-slate-100 font-mono">
            {stats.totalDistanceKm.toLocaleString()}
          </Text>
          <Text className="text-[11px] text-slate-400">km</Text>
        </View>

        <Text className="text-slate-700 mr-3">•</Text>

        {/* 4. Transit Duration */}
        <View className="flex-row items-center space-x-1.5 mr-3">
          <Clock color="#fbbf24" size={14} />
          <Text className="text-xs font-bold text-slate-100 font-mono">
            {formatMinutesToHours(stats.totalTravelMinutes)}
          </Text>
          <Text className="text-[11px] text-slate-400">
            {t.stats.transit}
          </Text>
        </View>

        <Text className="text-slate-700 mr-3">•</Text>

        {/* 5. Hotel Moves */}
        <View className="flex-row items-center space-x-1.5 mr-3">
          <Building color="#c084fc" size={14} />
          <Text className="text-xs font-bold text-slate-100 font-mono">
            {stats.hotelChangesCount}
          </Text>
          <Text className="text-[11px] text-slate-400">
            {t.stats.hotelMoves}
          </Text>
        </View>

        {/* 6. Trains (if any) */}
        {stats.modeCounts.train > 0 && (
          <>
            <Text className="text-slate-700 mr-3">•</Text>
            <View className="flex-row items-center space-x-1.5 mr-3">
              <Train color="#34d399" size={14} />
              <Text className="text-xs font-bold text-slate-100 font-mono">
                {stats.modeCounts.train}
              </Text>
              <Text className="text-[11px] text-slate-400">
                {t.stats.trains}
              </Text>
            </View>
          </>
        )}

        {/* 7. Flights (if any) */}
        {stats.modeCounts.flight > 0 && (
          <>
            <Text className="text-slate-700 mr-3">•</Text>
            <View className="flex-row items-center space-x-1.5">
              <Plane color="#38bdf8" size={14} />
              <Text className="text-xs font-bold text-slate-100 font-mono">
                {stats.modeCounts.flight}
              </Text>
              <Text className="text-[11px] text-slate-400">
                {t.stats.flights}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};
