import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { X, RefreshCw, Calendar, RotateCcw, Check, Sparkles } from 'lucide-react-native';
import { useMobileTrip } from '../../context/MobileTripContext';
import { useMobileI18n } from '../../context/MobileI18nContext';

export default function ResetTripModal() {
  const router = useRouter();
  const { trip, resetTrip } = useMobileTrip();
  const { lang } = useMobileI18n();

  const [mode, setMode] = useState<'shift' | 'baseline' | 'markPlanned'>('shift');
  const [newStartDate, setNewStartDate] = useState(trip.startDate || '2026-09-01');

  const handleReset = () => {
    resetTrip(trip.id, {
      mode,
      newStartDate: mode === 'shift' ? newStartDate : undefined,
    });
    router.back();
  };

  return (
    <View className="flex-1 bg-slate-950 px-5 pt-12 pb-8">
      {/* Modal Header */}
      <View className="flex-row items-center justify-between pb-4 border-b border-slate-800 mb-6">
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
        <Text className="text-xs text-slate-400 mb-5">
          {lang === 'es'
            ? `Selecciona cómo deseas restablecer o desplazar el itinerario de "${trip.name}":`
            : `Choose how to reset or shift the itinerary for "${trip.name}":`}
        </Text>

        {/* Option 1: Shift Dates */}
        <TouchableOpacity
          onPress={() => setMode('shift')}
          activeOpacity={0.7}
          className={`p-4 rounded-xl border mb-3 ${
            mode === 'shift'
              ? 'bg-brand-500/10 border-brand-500/60'
              : 'bg-slate-900 border-slate-800'
          }`}
        >
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-sm font-bold text-white">
              {lang === 'es' ? 'Desplazar Fechas' : 'Shift Dates'}
            </Text>
            {mode === 'shift' && <Check color="#10b981" size={16} />}
          </View>
          <Text className="text-xs text-slate-400">
            {lang === 'es'
              ? 'Mueve todas las paradas y transportes a una nueva fecha inicial sin perder cambios.'
              : 'Moves all stops and routes to a new starting date without losing custom changes.'}
          </Text>

          {mode === 'shift' && (
            <View className="mt-3 pt-3 border-t border-slate-800/80">
              <Text className="text-[11px] font-bold text-slate-300 mb-1.5 uppercase">
                {lang === 'es' ? 'Nueva fecha de inicio' : 'New start date'}
              </Text>
              <TextInput
                value={newStartDate}
                onChangeText={setNewStartDate}
                placeholder="2026-09-01"
                placeholderTextColor="#64748b"
                className="bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-white text-xs"
              />
            </View>
          )}
        </TouchableOpacity>

        {/* Option 2: Baseline */}
        <TouchableOpacity
          onPress={() => setMode('baseline')}
          activeOpacity={0.7}
          className={`p-4 rounded-xl border mb-3 ${
            mode === 'baseline'
              ? 'bg-brand-500/10 border-brand-500/60'
              : 'bg-slate-900 border-slate-800'
          }`}
        >
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-sm font-bold text-white">
              {lang === 'es' ? 'Restablecer a Estado Base' : 'Reset to Baseline'}
            </Text>
            {mode === 'baseline' && <Check color="#10b981" size={16} />}
          </View>
          <Text className="text-xs text-slate-400">
            {lang === 'es'
              ? 'Regenera los días limpios del viaje descartando modificaciones temporales.'
              : 'Regenerates clean trip days discarding ad-hoc changes.'}
          </Text>
        </TouchableOpacity>

        {/* Option 3: Mark Planned */}
        <TouchableOpacity
          onPress={() => setMode('markPlanned')}
          activeOpacity={0.7}
          className={`p-4 rounded-xl border mb-6 ${
            mode === 'markPlanned'
              ? 'bg-brand-500/10 border-brand-500/60'
              : 'bg-slate-900 border-slate-800'
          }`}
        >
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-sm font-bold text-white">
              {lang === 'es' ? 'Marcar como Planificado' : 'Mark as Planned'}
            </Text>
            {mode === 'markPlanned' && <Check color="#10b981" size={16} />}
          </View>
          <Text className="text-xs text-slate-400">
            {lang === 'es'
              ? 'Actualiza el estado del viaje a "planned" conservando todo el itinerario.'
              : 'Sets trip status back to "planned" preserving all itinerary data.'}
          </Text>
        </TouchableOpacity>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleReset}
          activeOpacity={0.8}
          className="bg-brand-600 rounded-xl py-3.5 flex-row items-center justify-center space-x-2 shadow-lg mb-6"
        >
          <Check color="#ffffff" size={18} />
          <Text className="text-sm font-bold text-white">
            {lang === 'es' ? 'Aplicar Cambios' : 'Apply Changes'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
