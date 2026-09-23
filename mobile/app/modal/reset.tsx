import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  X,
  RefreshCw,
  Calendar,
  RotateCcw,
  Check,
  Plus,
  SlidersHorizontal,
  Train,
  MapPin,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMobileTrip } from '../../context/MobileTripContext';
import { useMobileI18n } from '../../context/MobileI18nContext';
import { resetTripWithCustomParams } from '@domain/tripHelpers';

export default function ResetTripModal() {
  const router = useRouter();
  const { trip, resetTrip, updateTrip } = useMobileTrip();
  const { lang, t } = useMobileI18n();

  const [mode, setMode] = useState<'editParams' | 'shift' | 'baseline' | 'markPlanned'>('editParams');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Shift mode state
  const [newStartDate, setNewStartDate] = useState(trip.startDate || '2026-09-01');

  // Edit parameters state
  const [editedName, setEditedName] = useState(trip.name);
  const [editedStartDate, setEditedStartDate] = useState(trip.startDate);
  const [editedEndDate, setEditedEndDate] = useState(trip.endDate);
  const [cityList, setCityList] = useState<string[]>(
    trip.destinations?.map((d) => d.name) || ['Madrid', 'Barcelona', 'París']
  );
  const [newCityText, setNewCityText] = useState('');
  const [travelStyle, setTravelStyle] = useState<'relaxed' | 'balanced' | 'intense'>(
    trip.preferences?.travelStyle || 'balanced'
  );
  const [preferTrain, setPreferTrain] = useState(
    trip.preferences?.transportationPreference?.includes('train') ?? true
  );

  const handleAddCity = () => {
    const trimmed = newCityText.trim();
    if (!trimmed) return;
    Haptics.selectionAsync().catch(() => {});
    setCityList((prev) => [...prev, trimmed]);
    setNewCityText('');
  };

  const handleRemoveCity = (indexToRemove: number) => {
    Haptics.selectionAsync().catch(() => {});
    setCityList((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleApply = async () => {
    setIsSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    try {
      if (mode === 'editParams') {
        const updated = await resetTripWithCustomParams(trip, {
          name: editedName,
          startDate: editedStartDate,
          endDate: editedEndDate,
          cityNames: cityList,
          travelStyle,
          preferTrain,
        });
        updateTrip(updated);
      } else {
        resetTrip(trip.id, {
          mode,
          newStartDate: mode === 'shift' ? newStartDate : undefined,
        });
      }
      router.back();
    } catch (err) {
      console.error('[ResetTripModal] Error resetting trip:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-950 px-5 pt-12 pb-8">
      {/* Modal Header */}
      <View className="flex-row items-center justify-between pb-4 border-b border-slate-800 mb-5">
        <View className="flex-row items-center space-x-2.5">
          <View className="w-8 h-8 rounded-lg bg-brand-500/20 items-center justify-center border border-brand-500/35">
            <RefreshCw color="#10b981" size={16} />
          </View>
          <Text className="text-lg font-bold text-white">
            {lang === 'es' ? 'Resetear / Replanificar' : 'Reset / Reschedule'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 rounded-full bg-slate-900 border border-slate-800"
        >
          <X color="#94a3b8" size={18} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Mode Selector Tabs */}
        <View className="flex-row bg-slate-900 border border-slate-800 rounded-xl p-1 mb-4">
          <TouchableOpacity
            onPress={() => setMode('editParams')}
            className={`flex-1 py-2 rounded-lg items-center ${
              mode === 'editParams' ? 'bg-brand-600' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                mode === 'editParams' ? 'text-white' : 'text-slate-400'
              }`}
            >
              {lang === 'es' ? 'Parámetros' : 'Params'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMode('shift')}
            className={`flex-1 py-2 rounded-lg items-center ${
              mode === 'shift' ? 'bg-brand-600' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                mode === 'shift' ? 'text-white' : 'text-slate-400'
              }`}
            >
              {lang === 'es' ? 'Fechas' : 'Dates'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMode('baseline')}
            className={`flex-1 py-2 rounded-lg items-center ${
              mode === 'baseline' ? 'bg-brand-600' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                mode === 'baseline' ? 'text-white' : 'text-slate-400'
              }`}
            >
              {lang === 'es' ? 'Base' : 'Baseline'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMode('markPlanned')}
            className={`flex-1 py-2 rounded-lg items-center ${
              mode === 'markPlanned' ? 'bg-brand-600' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                mode === 'markPlanned' ? 'text-white' : 'text-slate-400'
              }`}
            >
              {lang === 'es' ? 'Plan' : 'Planned'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* MODE 1: EDIT PARAMS */}
        {mode === 'editParams' && (
          <View className="space-y-4 mb-4">
            {/* Trip Name */}
            <View>
              <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                {lang === 'es' ? 'Nombre del Viaje' : 'Trip Name'}
              </Text>
              <TextInput
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Nombre del viaje"
                placeholderTextColor="#64748b"
                className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs"
              />
            </View>

            {/* Dates row */}
            <View className="flex-row space-x-2">
              <View className="flex-1">
                <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  {lang === 'es' ? 'Fecha Inicio' : 'Start Date'}
                </Text>
                <TextInput
                  value={editedStartDate}
                  onChangeText={setEditedStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#64748b"
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs font-mono"
                />
              </View>

              <View className="flex-1">
                <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  {lang === 'es' ? 'Fecha Fin' : 'End Date'}
                </Text>
                <TextInput
                  value={editedEndDate}
                  onChangeText={setEditedEndDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#64748b"
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs font-mono"
                />
              </View>
            </View>

            {/* City Chips Section */}
            <View>
              <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                {lang === 'es' ? 'Ciudades y Destinos' : 'Cities & Destinations'} ({cityList.length})
              </Text>

              {/* Chips container */}
              <View className="flex-row flex-wrap gap-2 mb-2.5">
                {cityList.map((city, idx) => (
                  <View
                    key={idx}
                    className="flex-row items-center bg-slate-900 border border-slate-700/80 px-2.5 py-1.5 rounded-full space-x-1.5"
                  >
                    <MapPin color="#10b981" size={11} />
                    <Text className="text-xs font-semibold text-slate-200">
                      {city}
                    </Text>
                    {cityList.length > 1 && (
                      <TouchableOpacity
                        onPress={() => handleRemoveCity(idx)}
                        className="w-4 h-4 rounded-full bg-slate-800 items-center justify-center ml-1"
                      >
                        <X color="#94a3b8" size={10} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>

              {/* Add city input row */}
              <View className="flex-row items-center space-x-2">
                <TextInput
                  value={newCityText}
                  onChangeText={setNewCityText}
                  onSubmitEditing={handleAddCity}
                  placeholder={lang === 'es' ? 'Añadir ciudad (ej. Milán)...' : 'Add city (e.g. Milan)...'}
                  placeholderTextColor="#64748b"
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs"
                />
                <TouchableOpacity
                  onPress={handleAddCity}
                  disabled={!newCityText.trim()}
                  className={`px-3 py-2 rounded-xl flex-row items-center space-x-1 ${
                    newCityText.trim() ? 'bg-brand-600' : 'bg-slate-800 opacity-50'
                  }`}
                >
                  <Plus color="#ffffff" size={14} />
                  <Text className="text-xs font-bold text-white">
                    {lang === 'es' ? 'Añadir' : 'Add'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Travel Pace Selector */}
            <View>
              <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                {lang === 'es' ? 'Ritmo de Viaje' : 'Travel Style'}
              </Text>
              <View className="flex-row space-x-2">
                {(['relaxed', 'balanced', 'intense'] as const).map((style) => (
                  <TouchableOpacity
                    key={style}
                    onPress={() => setTravelStyle(style)}
                    className={`flex-1 py-2 rounded-xl items-center border ${
                      travelStyle === style
                        ? 'bg-brand-950/60 border-brand-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <Text
                      className={`text-xs capitalize font-bold ${
                        travelStyle === style ? 'text-brand-400' : 'text-slate-400'
                      }`}
                    >
                      {style === 'relaxed'
                        ? t.constraints.relaxed
                        : style === 'balanced'
                        ? t.constraints.balanced
                        : t.constraints.intense}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Prefer Train Toggle */}
            <TouchableOpacity
              onPress={() => setPreferTrain(!preferTrain)}
              className="flex-row items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800"
            >
              <View className="flex-row items-center space-x-2.5">
                <Train color="#10b981" size={16} />
                <Text className="text-xs font-medium text-slate-200">
                  {lang === 'es' ? 'Priorizar Tren de Alta Velocidad' : 'Prefer High-Speed Rail'}
                </Text>
              </View>
              <View
                className={`w-5 h-5 rounded-md items-center justify-center border ${
                  preferTrain ? 'bg-brand-600 border-brand-400' : 'bg-slate-800 border-slate-700'
                }`}
              >
                {preferTrain && <Check color="#ffffff" size={12} />}
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* MODE 2: SHIFT DATES */}
        {mode === 'shift' && (
          <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 space-y-3">
            <Text className="text-xs text-slate-300 leading-relaxed">
              {lang === 'es'
                ? 'Mueve todas las paradas y transportes a una nueva fecha inicial sin perder tus actividades ni reservas.'
                : 'Moves all stops and routes to a new start date preserving all your custom activities and bookings.'}
            </Text>
            <View>
              <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                {lang === 'es' ? 'Nueva Fecha de Inicio' : 'New Start Date'}
              </Text>
              <TextInput
                value={newStartDate}
                onChangeText={setNewStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#64748b"
                className="bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs font-mono"
              />
            </View>
          </View>
        )}

        {/* MODE 3: BASELINE */}
        {mode === 'baseline' && (
          <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 space-y-2">
            <Text className="text-sm font-bold text-white">
              {lang === 'es' ? 'Restablecer a Estado Base' : 'Reset to Baseline'}
            </Text>
            <Text className="text-xs text-slate-300 leading-relaxed">
              {lang === 'es'
                ? 'Regenera el itinerario desde cero basándose en los destinos originales y redistribuye los días equitativamente.'
                : 'Regenerates the itinerary from scratch based on the original destinations, distributing days evenly.'}
            </Text>
          </View>
        )}

        {/* MODE 4: MARK PLANNED */}
        {mode === 'markPlanned' && (
          <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 space-y-2">
            <Text className="text-sm font-bold text-white">
              {lang === 'es' ? 'Marcar como Planificado' : 'Mark as Planned'}
            </Text>
            <Text className="text-xs text-slate-300 leading-relaxed">
              {lang === 'es'
                ? 'Cambia el estado del viaje a "planned" manteniendo todos los datos intactos.'
                : 'Sets the trip status back to "planned" keeping all data intact.'}
            </Text>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          disabled={isSubmitting}
          onPress={handleApply}
          activeOpacity={0.8}
          className="bg-brand-600 rounded-xl py-3.5 flex-row items-center justify-center space-x-2 shadow-lg mb-8"
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <Check color="#ffffff" size={18} />
              <Text className="text-sm font-bold text-white">
                {lang === 'es' ? 'Aplicar Cambios' : 'Apply Changes'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
