import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Compass, Calendar, MapPin, Globe, Copy, RotateCcw, RotateCw } from 'lucide-react-native';
import { useMobileTrip } from '../context/MobileTripContext';
import { useMobileI18n } from '../context/MobileI18nContext';

export default function HomeScreen() {
  const {
    trip,
    savedTrips,
    canUndo,
    canRedo,
    undo,
    redo,
    duplicateTrip,
    setActiveTrip,
  } = useMobileTrip();
  const { lang, setLang, t } = useMobileI18n();

  const destinationsCount = trip.destinations?.length || 0;
  const daysCount = trip.itinerary?.days?.length || 0;

  const toggleLanguage = () => {
    setLang(lang === 'es' ? 'en' : 'es');
  };

  const handleDuplicate = () => {
    duplicateTrip(trip.id, 'Mobile Copy');
  };

  return (
    <ScrollView className="flex-1 bg-slate-950 px-5 pt-14 pb-10">
      {/* Header bar */}
      <View className="flex-row items-center justify-between mb-6">
        <View className="flex-row items-center space-x-3">
          <View className="w-10 h-10 rounded-xl bg-brand-500/20 items-center justify-center border border-brand-500/40">
            <Compass color="#10b981" size={24} />
          </View>
          <View>
            <Text className="text-xl font-bold text-white tracking-tight">
              Travel Optimizer
            </Text>
            <Text className="text-xs text-brand-400 font-medium">
              Phase 1: Shared Domain & Storage Bridge
            </Text>
          </View>
        </View>

        {/* Language switch button */}
        <TouchableOpacity
          onPress={toggleLanguage}
          activeOpacity={0.7}
          className="flex-row items-center bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg space-x-1.5"
        >
          <Globe color="#94a3b8" size={14} />
          <Text className="text-xs font-semibold text-slate-200 uppercase">
            {lang}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Active Trip Card */}
      <View className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-5 shadow-lg">
        <View className="flex-row items-center justify-between mb-3">
          <View className="bg-brand-500/20 px-2.5 py-1 rounded-md border border-brand-500/30">
            <Text className="text-xs font-bold text-brand-400 uppercase tracking-wider">
              {trip.status || 'planned'}
            </Text>
          </View>
          <Text className="text-xs text-slate-400">
            {savedTrips.length} {savedTrips.length === 1 ? 'viaje' : 'viajes'} en biblioteca
          </Text>
        </View>

        <Text className="text-2xl font-extrabold text-white mb-2">
          {trip.name}
        </Text>

        <View className="flex-row items-center space-x-2 mb-4">
          <Calendar color="#64748b" size={16} />
          <Text className="text-sm text-slate-300">
            {trip.startDate} → {trip.endDate}
          </Text>
        </View>

        {/* Stats Row */}
        <View className="flex-row justify-between bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 mb-4">
          <View className="items-center flex-1">
            <Text className="text-lg font-bold text-white">{destinationsCount}</Text>
            <Text className="text-xs text-slate-400 mt-0.5">Destinos</Text>
          </View>
          <View className="w-px bg-slate-800" />
          <View className="items-center flex-1">
            <Text className="text-lg font-bold text-white">{daysCount}</Text>
            <Text className="text-xs text-slate-400 mt-0.5">Días</Text>
          </View>
          <View className="w-px bg-slate-800" />
          <View className="items-center flex-1">
            <Text className="text-lg font-bold text-white">
              {trip.transportation?.length || 0}
            </Text>
            <Text className="text-xs text-slate-400 mt-0.5">Rutas</Text>
          </View>
        </View>

        {/* Action Buttons: Undo/Redo & Duplicate */}
        <View className="flex-row items-center justify-between pt-1">
          <View className="flex-row space-x-2">
            <TouchableOpacity
              onPress={undo}
              disabled={!canUndo}
              className={`p-2 rounded-lg border ${
                canUndo
                  ? 'bg-slate-800 border-slate-700 text-white'
                  : 'bg-slate-900 border-slate-800 opacity-40'
              }`}
            >
              <RotateCcw color={canUndo ? '#f8fafc' : '#475569'} size={18} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={redo}
              disabled={!canRedo}
              className={`p-2 rounded-lg border ${
                canRedo
                  ? 'bg-slate-800 border-slate-700 text-white'
                  : 'bg-slate-900 border-slate-800 opacity-40'
              }`}
            >
              <RotateCw color={canRedo ? '#f8fafc' : '#475569'} size={18} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleDuplicate}
            activeOpacity={0.7}
            className="flex-row items-center bg-brand-600 hover:bg-brand-500 px-3 py-2 rounded-lg space-x-1.5"
          >
            <Copy color="#ffffff" size={16} />
            <Text className="text-xs font-semibold text-white">
              Duplicar viaje
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Destinations List Preview */}
      <View className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-5">
        <Text className="text-base font-bold text-white mb-3 flex-row items-center">
          Itinerario de Destinos
        </Text>
        <View className="space-y-2">
          {trip.destinations?.map((dest, idx) => (
            <View
              key={dest.id || idx}
              className="flex-row items-center justify-between bg-slate-950/70 border border-slate-800/80 px-3.5 py-2.5 rounded-xl mb-2"
            >
              <View className="flex-row items-center space-x-3">
                <View className="w-6 h-6 rounded-full bg-brand-500/20 items-center justify-center border border-brand-500/40">
                  <Text className="text-xs font-bold text-brand-400">
                    {idx + 1}
                  </Text>
                </View>
                <View>
                  <Text className="text-sm font-semibold text-white">
                    {dest.name}
                  </Text>
                  <Text className="text-xs text-slate-400">
                    {dest.location?.country || 'Europa'}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center space-x-1">
                <MapPin color="#10b981" size={14} />
                <Text className="text-xs text-slate-400">
                  {dest.plannedNights || 2} noches
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Saved Trips Selector */}
      <View className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-8">
        <Text className="text-base font-bold text-white mb-3">
          Cambiar de Viaje ({savedTrips.length})
        </Text>
        <View className="space-y-2">
          {savedTrips.map((tItem) => {
            const isActive = tItem.id === trip.id;
            return (
              <TouchableOpacity
                key={tItem.id}
                onPress={() => setActiveTrip(tItem.id)}
                activeOpacity={0.7}
                className={`p-3 rounded-xl border mb-2 flex-row items-center justify-between ${
                  isActive
                    ? 'bg-brand-500/10 border-brand-500/50'
                    : 'bg-slate-950/40 border-slate-800'
                }`}
              >
                <View className="flex-1 mr-2">
                  <Text
                    className={`text-sm font-bold ${
                      isActive ? 'text-brand-300' : 'text-slate-200'
                    }`}
                    numberOfLines={1}
                  >
                    {tItem.name}
                  </Text>
                  <Text className="text-xs text-slate-400 mt-0.5">
                    {tItem.startDate} ({tItem.destinations?.length || 0} ciudades)
                  </Text>
                </View>
                {isActive && (
                  <View className="bg-brand-500 px-2 py-0.5 rounded-full">
                    <Text className="text-[10px] font-bold text-slate-950">ACTIVO</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}
