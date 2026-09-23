import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import {
  Sparkles,
  Send,
  Zap,
  SlidersHorizontal,
  TrendingDown,
  BedDouble,
  Clock,
  Compass,
} from 'lucide-react-native';
import { useMobileTrip } from '../../context/MobileTripContext';
import { useMobileI18n } from '../../context/MobileI18nContext';
import { MobileHeader } from '../../components/layout/MobileHeader';

export default function AssistantTabScreen() {
  const { trip } = useMobileTrip();
  const { lang } = useMobileI18n();
  const [inputText, setInputText] = useState('');

  const samplePrompts = [
    lang === 'es' ? '¿Cómo encajar Croacia en esta ruta?' : 'How can I fit Croatia into this route?',
    lang === 'es' ? 'Hacer la expedición más relajada' : 'Make the trip more relaxed',
    lang === 'es' ? 'Minimizar mudanzas de hotel' : 'Minimize hotel changes',
    lang === 'es' ? 'Añadir 2 días culturales en Florencia' : 'Add 2 cultural days in Florence',
  ];

  return (
    <View className="flex-1 bg-slate-950">
      <MobileHeader
        title={lang === 'es' ? 'Asistente IA' : 'AI Assistant'}
        subtitle={lang === 'es' ? 'Optimización & Escenarios What-If' : 'Optimization & What-If Scenarios'}
      />

      <ScrollView className="flex-1 px-4 pt-4 pb-24" showsVerticalScrollIndicator={false}>
        {/* Assistant Header Card */}
        <View className="bg-gradient-to-br from-brand-950/40 via-slate-900 to-slate-900 border border-brand-500/30 rounded-3xl p-5 mb-4 shadow-xl">
          <View className="flex-row items-center space-x-3 mb-3">
            <View className="w-11 h-11 rounded-2xl bg-brand-500/20 border border-brand-500/40 items-center justify-center">
              <Sparkles color="#10b981" size={22} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-extrabold text-white">
                {lang === 'es' ? 'Copiloto de Logística' : 'Logistics Copilot'}
              </Text>
              <Text className="text-xs text-brand-400 font-medium">
                {lang === 'es' ? 'Optimizador impulsado por IA' : 'AI-driven route optimizer'}
              </Text>
            </View>
          </View>

          <Text className="text-xs text-slate-300 leading-relaxed mb-4">
            {lang === 'es'
              ? 'Consulta escenarios What-If, equilibra noches por ciudad y evalúa compensaciones en tiempo real.'
              : 'Evaluate What-If scenarios, balance nights per city and review real-time trade-offs.'}
          </Text>

          {/* Preferences Badges */}
          <View className="flex-row flex-wrap gap-2 pt-1 border-t border-slate-800">
            <View className="flex-row items-center space-x-1.5 bg-slate-950/70 border border-slate-800 px-2.5 py-1 rounded-lg">
              <SlidersHorizontal color="#10b981" size={12} />
              <Text className="text-[11px] text-slate-300 capitalize">
                {trip.preferences?.travelStyle || 'balanced'}
              </Text>
            </View>

            <View className="flex-row items-center space-x-1.5 bg-slate-950/70 border border-slate-800 px-2.5 py-1 rounded-lg">
              <BedDouble color="#38bdf8" size={12} />
              <Text className="text-[11px] text-slate-300">
                {trip.preferences?.minimizeHotelChanges
                  ? lang === 'es' ? 'Pocos hoteles' : 'Min hotels'
                  : lang === 'es' ? 'Flexible' : 'Flexible'}
              </Text>
            </View>

            <View className="flex-row items-center space-x-1.5 bg-slate-950/70 border border-slate-800 px-2.5 py-1 rounded-lg">
              <Clock color="#f59e0b" size={12} />
              <Text className="text-[11px] text-slate-300">
                {trip.preferences?.minimizeTravelTime
                  ? lang === 'es' ? 'Rutas rápidas' : 'Fast routes'
                  : lang === 'es' ? 'Panorámico' : 'Scenic'}
              </Text>
            </View>
          </View>
        </View>

        {/* Suggestion Chips */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
            {lang === 'es' ? 'Consultas Sugeridas' : 'Suggested Queries'}
          </Text>
          <View className="space-y-2">
            {samplePrompts.map((prompt, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setInputText(prompt)}
                activeOpacity={0.7}
                className="bg-slate-900 border border-slate-800/90 rounded-xl p-3 mb-2 flex-row items-center justify-between"
              >
                <Text className="text-xs font-medium text-slate-200 flex-1 mr-2">
                  "{prompt}"
                </Text>
                <Zap color="#10b981" size={14} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Input & Chat Box Simulation */}
        <View className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex-row items-center space-x-2 mb-6">
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder={
              lang === 'es'
                ? 'Escribe un cambio o escenario...'
                : 'Ask a change or scenario...'
            }
            placeholderTextColor="#64748b"
            className="flex-1 text-sm text-white py-1 px-2"
          />
          <TouchableOpacity
            disabled={!inputText.trim()}
            onPress={() => setInputText('')}
            className={`p-2.5 rounded-xl ${
              inputText.trim()
                ? 'bg-brand-500'
                : 'bg-slate-800 opacity-50'
            }`}
          >
            <Send color={inputText.trim() ? '#020617' : '#94a3b8'} size={15} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
