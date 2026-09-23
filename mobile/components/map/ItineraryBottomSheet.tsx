import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import {
  MapPin,
  Clock,
  ArrowRight,
  Train,
  Plane,
  Bus,
  Car,
  Compass,
  Building,
  Calendar,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Destination, TransportationSegment } from '@domain/types';
import { useMobileI18n } from '../../context/MobileI18nContext';

interface ItineraryBottomSheetProps {
  destinations: Destination[];
  transportation: TransportationSegment[];
  selectedDestinationId: string | null;
  onSelectDestination: (destinationId: string) => void;
  onNavigateToItinerary: () => void;
}

export const ItineraryBottomSheet: React.FC<ItineraryBottomSheetProps> = ({
  destinations,
  transportation,
  selectedDestinationId,
  onSelectDestination,
  onNavigateToItinerary,
}) => {
  const { lang } = useMobileI18n();
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Snap points for the sheet
  const snapPoints = useMemo(() => ['16%', '50%', '85%'], []);

  // When a destination is selected from the map, snap to 50%
  useEffect(() => {
    if (selectedDestinationId) {
      bottomSheetRef.current?.snapToIndex(1);
    }
  }, [selectedDestinationId]);

  const selectedDestination = useMemo(() => {
    return destinations.find((d) => d.id === selectedDestinationId) || null;
  }, [destinations, selectedDestinationId]);

  const selectedIndex = useMemo(() => {
    if (!selectedDestination) return -1;
    return destinations.findIndex((d) => d.id === selectedDestination.id);
  }, [destinations, selectedDestination]);

  const getTransitBetween = (fromDest: Destination, toDest: Destination) => {
    return transportation.find(
      (t) =>
        (t.from?.name?.toLowerCase() === fromDest.name.toLowerCase() &&
          t.to?.name?.toLowerCase() === toDest.name.toLowerCase()) ||
        (t.from?.cityCode && t.from.cityCode === fromDest.location?.cityCode)
    );
  };

  const getTransitIcon = (mode?: string) => {
    switch (mode) {
      case 'flight':
        return <Plane color="#38bdf8" size={13} />;
      case 'train':
        return <Train color="#34d399" size={13} />;
      case 'bus':
        return <Bus color="#fbbf24" size={13} />;
      default:
        return <Car color="#c084fc" size={13} />;
    }
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      backgroundStyle={{ backgroundColor: '#0f172a', borderTopWidth: 1, borderColor: '#1e293b' }}
      handleIndicatorStyle={{ backgroundColor: '#475569', width: 36, height: 4 }}
    >
      <BottomSheetView className="px-4 pb-2">
        {/* Peek Header */}
        <View className="flex-row items-center justify-between py-1">
          <View className="flex-row items-center space-x-2">
            <View className="w-2.5 h-2.5 rounded-full bg-brand-400" />
            <Text className="text-sm font-bold text-white">
              {lang === 'es' ? 'Resumen de Ruta' : 'Route Summary'}
            </Text>
            <View className="bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
              <Text className="text-[10px] font-mono font-bold text-brand-400">
                {destinations.length} {lang === 'es' ? 'ciudades' : 'cities'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={onNavigateToItinerary}
            className="flex-row items-center space-x-1 bg-brand-950/60 border border-brand-800/50 px-2.5 py-1 rounded-lg"
          >
            <Compass color="#10b981" size={12} />
            <Text className="text-xs font-semibold text-brand-300">
              {lang === 'es' ? 'Ver Timeline' : 'Timeline'}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheetView>

      <BottomSheetScrollView
        className="flex-1 px-4 pt-1"
        showsVerticalScrollIndicator={false}
      >
        {/* Selected Destination Feature Card (if any) */}
        {selectedDestination && (
          <View className="bg-slate-950/80 border border-brand-500/40 rounded-2xl p-3.5 mb-4 shadow-md">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center space-x-2">
                <View className="px-2 py-0.5 rounded bg-brand-500/20 border border-brand-500/40">
                  <Text className="text-xs font-mono font-bold text-brand-400">
                    #{String(selectedIndex + 1).padStart(2, '0')}
                  </Text>
                </View>
                <Text className="text-base font-black text-white">
                  {selectedDestination.name}
                </Text>
              </View>

              <View className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                <Text className="text-xs font-mono text-slate-300">
                  {selectedDestination.plannedNights || 2} {lang === 'es' ? 'noches' : 'nights'}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center space-x-2 mb-3">
              <MapPin color="#64748b" size={13} />
              <Text className="text-xs text-slate-300">
                {selectedDestination.location?.country || 'Europa'}
              </Text>
              {Boolean(selectedDestination.arrivalDate) && (
                <>
                  <Text className="text-slate-600">•</Text>
                  <Calendar color="#64748b" size={13} />
                  <Text className="text-xs text-slate-300">
                    {selectedDestination.arrivalDate}
                  </Text>
                </>
              )}
            </View>

            <TouchableOpacity
              onPress={onNavigateToItinerary}
              activeOpacity={0.8}
              className="bg-brand-600/90 py-2 px-3 rounded-xl flex-row items-center justify-center space-x-1.5"
            >
              <Text className="text-xs font-bold text-white">
                {lang === 'es' ? 'Ver actividades de este destino' : 'View activities in itinerary'}
              </Text>
              <ArrowRight color="#ffffff" size={14} />
            </TouchableOpacity>
          </View>
        )}

        {/* Full Sequential Route Stops List */}
        <View className="mb-8">
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
            {lang === 'es' ? 'Secuencia de Paradas' : 'Stop Sequence'}
          </Text>

          {destinations.map((dest, idx) => {
            const isSelected = dest.id === selectedDestinationId;
            const nextDest = destinations[idx + 1];
            const transitToNext = nextDest ? getTransitBetween(dest, nextDest) : null;

            return (
              <View key={dest.id || idx}>
                {/* Stop Card */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    onSelectDestination(dest.id);
                  }}
                  className={`flex-row items-center justify-between p-3 rounded-xl border ${
                    isSelected
                      ? 'bg-brand-950/40 border-brand-500 text-white'
                      : 'bg-slate-950/50 border-slate-800'
                  }`}
                >
                  <View className="flex-row items-center space-x-3">
                    <View
                      className={`w-7 h-7 rounded-lg items-center justify-center border ${
                        isSelected
                          ? 'bg-brand-500 border-brand-400'
                          : 'bg-slate-800 border-slate-700'
                      }`}
                    >
                      <Text
                        className={`text-xs font-mono font-bold ${
                          isSelected ? 'text-slate-950' : 'text-brand-400'
                        }`}
                      >
                        {idx + 1}
                      </Text>
                    </View>

                    <View>
                      <Text className="text-sm font-bold text-white">
                        {dest.name}
                      </Text>
                      <Text className="text-[11px] text-slate-400">
                        {dest.location?.country || 'Europa'}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center space-x-1.5 bg-slate-900 border border-slate-800 px-2 py-1 rounded">
                    <Clock color="#94a3b8" size={11} />
                    <Text className="text-xs text-slate-300 font-mono">
                      {dest.plannedNights || 2} {lang === 'es' ? 'noches' : 'nights'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Transit Connection Segment between stops */}
                {nextDest && (
                  <View className="py-1 px-4 flex-row items-center space-x-2">
                    <View className="w-0.5 h-6 bg-slate-800 ml-3" />
                    <View className="flex-row items-center space-x-1.5 bg-slate-900/80 border border-slate-800 px-2.5 py-1 rounded-full">
                      {getTransitIcon(transitToNext?.mode)}
                      <Text className="text-[10px] font-mono text-slate-300">
                        {transitToNext
                          ? `${Math.floor((transitToNext.estimatedDurationMinutes || 120) / 60)}h ${(transitToNext.estimatedDurationMinutes || 120) % 60}m`
                          : 'Tránsito'}
                      </Text>
                      {Boolean(transitToNext?.distanceKm) && (
                        <Text className="text-[10px] font-mono text-slate-500">
                          • {transitToNext?.distanceKm} km
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
};
