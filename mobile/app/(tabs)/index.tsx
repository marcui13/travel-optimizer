import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Calendar,
  Copy,
  RotateCcw,
  RotateCw,
  RefreshCw,
  Clock,
  Sparkles,
  ArrowRight,
  Map as MapIcon,
  Plus,
} from 'lucide-react-native';
import { useMobileTrip } from '../../context/MobileTripContext';
import { useMobileI18n } from '../../context/MobileI18nContext';
import { MobileHeader } from '../../components/layout/MobileHeader';
import { MetricsManifest } from '../../components/itinerary/MetricsManifest';
import { DayCard } from '../../components/itinerary/DayCard';

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
  const { lang, t } = useMobileI18n();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const days = trip.itinerary?.days || [];
  const hasDays = days.length > 0;

  const handleDuplicate = () => {
    duplicateTrip(trip.id, lang === 'es' ? 'Copia' : 'Copy');
  };

  const handleOpenReset = () => {
    router.push('/modal/reset');
  };

  const handleOpenCreate = () => {
    router.push('/modal/create');
  };

  return (
    <View className="flex-1 bg-slate-950">
      <MobileHeader />

      <ScrollView className="flex-1 px-4 pt-3 pb-16" showsVerticalScrollIndicator={false}>
        {/* Active Trip Overview Card */}
        <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-3.5 shadow-xl">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center space-x-1.5">
              <View className="w-2 h-2 rounded-full bg-brand-400" />
              <Text className="text-xs font-semibold text-brand-400 uppercase tracking-wider">
                {lang === 'es' ? 'Itinerario Activo' : 'Active Itinerary'}
              </Text>
            </View>
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

          {/* Action Row: Undo, Redo, Reset, Duplicate */}
          <View className="flex-row items-center justify-between pt-2 border-t border-slate-800/80">
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

            <View className="flex-row space-x-2">
              <TouchableOpacity
                onPress={handleDuplicate}
                activeOpacity={0.7}
                className="flex-row items-center bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg space-x-1.5"
              >
                <Copy color="#e2e8f0" size={13} />
                <Text className="text-xs font-semibold text-slate-200">
                  {lang === 'es' ? 'Duplicar' : 'Duplicate'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleOpenCreate}
                activeOpacity={0.7}
                className="flex-row items-center bg-brand-600 px-3 py-1.5 rounded-lg space-x-1"
              >
                <Plus color="#ffffff" size={14} />
                <Text className="text-xs font-bold text-white">
                  {lang === 'es' ? 'Nuevo' : 'New'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Horizontal Metrics Manifest */}
        <MetricsManifest trip={trip} />

        {/* Timeline Header Bar */}
        <View className="flex-row items-center justify-between mb-3 px-1">
          <View className="flex-row items-center space-x-2">
            <Text className="text-sm font-bold text-white uppercase tracking-wider">
              {lang === 'es' ? 'Ruta Día a Día' : 'Daily Timeline'}
            </Text>
            <View className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
              <Text className="text-[10px] font-mono font-bold text-brand-400">
                {days.length} {t.common.days.toLowerCase()}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/map')}
            className="flex-row items-center space-x-1 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg"
          >
            <MapIcon color="#10b981" size={13} />
            <Text className="text-xs text-brand-400 font-semibold">
              {lang === 'es' ? 'Mapa' : 'Map'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Vertical Route Spine & Days List */}
        {hasDays ? (
          <View className="mb-4">
            {days.map((day, idx) => (
              <DayCard
                key={day.date}
                day={day}
                isFirst={idx === 0}
                isLast={idx === days.length - 1}
                isSelected={selectedDate === day.date}
                onSelect={() => setSelectedDate(day.date)}
                dayEvents={trip.events?.filter((e) => e.startDateTime?.startsWith(day.date))}
                dayReservations={trip.reservations?.filter((r) => r.startDateTime?.startsWith(day.date))}
              />
            ))}
          </View>
        ) : (
          <View className="p-8 my-4 rounded-2xl bg-slate-900/60 border border-slate-800 items-center justify-center">
            <View className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 items-center justify-center mb-3">
              <Clock color="#94a3b8" size={24} />
            </View>
            <Text className="text-sm font-bold text-white text-center mb-1">
              {t.timeline.noDaysTitle}
            </Text>
            <Text className="text-xs text-slate-400 text-center mb-4 max-w-xs leading-4">
              {t.timeline.noDaysDesc}
            </Text>
            <TouchableOpacity
              onPress={handleOpenReset}
              className="bg-brand-600 px-4 py-2 rounded-xl flex-row items-center space-x-1.5"
            >
              <RefreshCw color="#ffffff" size={14} />
              <Text className="text-xs font-bold text-white">
                {lang === 'es' ? 'Cargar Itinerario de Ejemplo' : 'Load Demo Itinerary'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Assistant Callout Banner */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/assistant')}
          activeOpacity={0.7}
          className="bg-gradient-to-r from-brand-950/60 to-slate-900 border border-brand-500/30 rounded-2xl p-4 flex-row items-center justify-between mb-8 shadow-md"
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
