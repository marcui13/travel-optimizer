import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Calendar,
  MapPin,
  Copy,
  RotateCcw,
  RotateCw,
  RefreshCw,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react-native';
import { useMobileTrip } from '../../context/MobileTripContext';
import { useMobileI18n } from '../../context/MobileI18nContext';
import { MobileHeader } from '../../components/layout/MobileHeader';

export default function ItineraryTabScreen() {
  const router = useRouter();
  const {
    trip,
    savedTrips,
    canUndo,
    canRedo,
    undo,
    redo,
    duplicateTrip,
  } = useMobileTrip();
  const { lang } = useMobileI18n();

  const destinationsCount = trip.destinations?.length || 0;
  const daysCount = trip.itinerary?.days?.length || 0;
  const transitCount = trip.transportation?.length || 0;

  const handleDuplicate = () => {
    duplicateTrip(trip.id, lang === 'es' ? 'Copia' : 'Copy');
  };

  const handleOpenReset = () => {
    router.push('/modal/reset');
  };

  return (
    <View className="flex-1 bg-slate-950">
      <MobileHeader />

      <ScrollView className="flex-1 px-4 pt-4 pb-12" showsVerticalScrollIndicator={false}>
        {/* Active Trip Overview Card */}
        <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 shadow-xl">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-semibold text-brand-400 uppercase tracking-wider">
              {lang === 'es' ? 'Itinerario Activo' : 'Active Itinerary'}
            </Text>
            <View className="bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/60">
              <Text className="text-[10px] text-slate-300">
                {savedTrips.length} {lang === 'es' ? 'en biblioteca' : 'in library'}
              </Text>
            </View>
          </View>

          <Text className="text-xl font-black text-white mb-1.5">
            {trip.name}
          </Text>

          <View className="flex-row items-center space-x-2 mb-3">
            <Calendar color="#64748b" size={14} />
            <Text className="text-xs text-slate-300">
              {trip.startDate} → {trip.endDate}
            </Text>
          </View>

          {/* Quick Metrics Bar */}
          <View className="flex-row justify-between bg-slate-950/70 rounded-xl p-3 border border-slate-800/90 mb-3.5">
            <View className="items-center flex-1">
              <Text className="text-base font-bold text-white">{destinationsCount}</Text>
              <Text className="text-[11px] text-slate-400 mt-0.5">
                {lang === 'es' ? 'Destinos' : 'Destinations'}
              </Text>
            </View>
            <View className="w-px bg-slate-800" />
            <View className="items-center flex-1">
              <Text className="text-base font-bold text-white">{daysCount}</Text>
              <Text className="text-[11px] text-slate-400 mt-0.5">
                {lang === 'es' ? 'Días' : 'Days'}
              </Text>
            </View>
            <View className="w-px bg-slate-800" />
            <View className="items-center flex-1">
              <Text className="text-base font-bold text-white">{transitCount}</Text>
              <Text className="text-[11px] text-slate-400 mt-0.5">
                {lang === 'es' ? 'Rutas' : 'Routes'}
              </Text>
            </View>
          </View>

          {/* Action Row: Undo, Redo, Reset, Duplicate */}
          <View className="flex-row items-center justify-between pt-1">
            <View className="flex-row space-x-1.5">
              <TouchableOpacity
                onPress={undo}
                disabled={!canUndo}
                className={`p-2 rounded-lg border ${
                  canUndo
                    ? 'bg-slate-800 border-slate-700'
                    : 'bg-slate-900 border-slate-800 opacity-30'
                }`}
              >
                <RotateCcw color={canUndo ? '#f8fafc' : '#475569'} size={15} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={redo}
                disabled={!canRedo}
                className={`p-2 rounded-lg border ${
                  canRedo
                    ? 'bg-slate-800 border-slate-700'
                    : 'bg-slate-900 border-slate-800 opacity-30'
                }`}
              >
                <RotateCw color={canRedo ? '#f8fafc' : '#475569'} size={15} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleOpenReset}
                activeOpacity={0.7}
                className="p-2 rounded-lg bg-slate-800 border border-slate-700"
              >
                <RefreshCw color="#94a3b8" size={15} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleDuplicate}
              activeOpacity={0.7}
              className="flex-row items-center bg-brand-600 px-3 py-1.5 rounded-lg space-x-1"
            >
              <Copy color="#ffffff" size={14} />
              <Text className="text-xs font-semibold text-white">
                {lang === 'es' ? 'Duplicar' : 'Duplicate'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Timeline Destinations List */}
        <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-bold text-white uppercase tracking-wider">
              {lang === 'es' ? 'Paradas del Itinerario' : 'Itinerary Stops'}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/map')}
              className="flex-row items-center space-x-1"
            >
              <Text className="text-xs text-brand-400 font-semibold">
                {lang === 'es' ? 'Ver mapa' : 'View map'}
              </Text>
              <ArrowRight color="#10b981" size={12} />
            </TouchableOpacity>
          </View>

          <View className="space-y-2">
            {trip.destinations?.map((dest, idx) => {
              const isLast = idx === (trip.destinations?.length || 0) - 1;
              return (
                <View key={dest.id || idx} className="mb-2">
                  <View className="flex-row items-center justify-between bg-slate-950/80 border border-slate-800/80 px-3.5 py-3 rounded-xl">
                    <View className="flex-row items-center space-x-3">
                      <View className="w-6 h-6 rounded-full bg-brand-500/20 items-center justify-center border border-brand-500/35">
                        <Text className="text-xs font-bold text-brand-400">
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

                    <View className="flex-row items-center space-x-1.5 bg-slate-900 border border-slate-800 px-2 py-1 rounded-md">
                      <Clock color="#94a3b8" size={12} />
                      <Text className="text-xs text-slate-300 font-medium">
                        {dest.plannedNights || 2} {lang === 'es' ? 'noches' : 'nights'}
                      </Text>
                    </View>
                  </View>

                  {!isLast && (
                    <View className="items-center my-0.5">
                      <View className="w-0.5 h-3 bg-brand-500/40" />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Quick Assistant Callout Banner */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/assistant')}
          activeOpacity={0.7}
          className="bg-gradient-to-r from-brand-900/40 to-slate-900 border border-brand-500/30 rounded-2xl p-4 flex-row items-center justify-between mb-8"
        >
          <View className="flex-row items-center space-x-3 flex-1 mr-2">
            <View className="w-9 h-9 rounded-xl bg-brand-500/20 items-center justify-center border border-brand-500/40">
              <Sparkles color="#10b981" size={20} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-white">
                {lang === 'es' ? '¿Quieres optimizar esta ruta?' : 'Want to optimize this route?'}
              </Text>
              <Text className="text-xs text-slate-400 mt-0.5">
                {lang === 'es' ? 'Prueba escenarios What-If con IA' : 'Test What-If scenarios with AI'}
              </Text>
            </View>
          </View>
          <ArrowRight color="#10b981" size={16} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
