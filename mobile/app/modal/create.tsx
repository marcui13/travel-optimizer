import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  X,
  Plus,
  Sparkles,
  MapPin,
  Calendar,
  Check,
  Wand2,
  SlidersHorizontal,
  Train,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMobileTrip } from '../../context/MobileTripContext';
import { useMobileI18n } from '../../context/MobileI18nContext';
import { Trip, Destination } from '@domain/types';
import { createTripFromPrompt } from '@services/ai/localAiPlanner';
import { resolveLocationAsync } from '@services/geocoding/geocodingService';
import { buildItineraryFromDestinations } from '@domain/tripHelpers';

export default function CreateTripModal() {
  const router = useRouter();
  const { createTrip } = useMobileTrip();
  const { lang, t } = useMobileI18n();

  const [tab, setTab] = useState<'prompt' | 'structured'>('prompt');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Prompt tab state
  const defaultPrompt =
    lang === 'es'
      ? '3 semanas en otoño recorriendo Madrid, Barcelona, Niza, Florencia y Roma, ritmo equilibrado en tren.'
      : '3 weeks in autumn through Madrid, Barcelona, Nice, Florence, and Rome, balanced pacing by train.';
  const [promptText, setPromptText] = useState(defaultPrompt);

  // Structured form state
  const [tripName, setTripName] = useState(
    lang === 'es' ? 'Gran Aventura en Europa' : 'Autumn in Europe'
  );
  const [startDate, setStartDate] = useState('2026-09-26');
  const [endDate, setEndDate] = useState('2026-10-18');
  const [cityList, setCityList] = useState<string[]>([
    'Madrid',
    'Barcelona',
    'Niza',
    'Florencia',
    'Roma',
  ]);
  const [newCityText, setNewCityText] = useState('');
  const [travelStyle, setTravelStyle] = useState<'relaxed' | 'balanced' | 'intense'>('balanced');
  const [preferTrain, setPreferTrain] = useState(true);

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

  // 1. Create from Natural Language Prompt
  const handleCreateFromPrompt = async () => {
    if (!promptText.trim()) return;

    setIsLoading(true);
    setStatusMessage(
      lang === 'es'
        ? 'Analizando entrada en lenguaje natural...'
        : 'Analyzing natural language input...'
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    try {
      const generatedTrip = createTripFromPrompt(promptText);

      // Resolve locations with real coordinates
      setStatusMessage(
        lang === 'es'
          ? 'Geocodificando y verificando coordenadas...'
          : 'Geocoding and verifying coordinates...'
      );

      await Promise.all(
        generatedTrip.destinations.map(async (dest) => {
          dest.location = await resolveLocationAsync(dest.name);
        })
      );

      if (generatedTrip.destinations.length > 0) {
        generatedTrip.origin = generatedTrip.destinations[0].location;
      }

      // Build complete day-by-day itinerary
      const { itineraryDays, transportationSegments } = buildItineraryFromDestinations(
        generatedTrip.destinations,
        generatedTrip.startDate,
        generatedTrip.endDate,
        undefined,
        true
      );
      generatedTrip.itinerary = { days: itineraryDays };
      generatedTrip.transportation = transportationSegments;

      createTrip(generatedTrip);
      router.back();
    } catch (err) {
      console.error('[CreateTripModal] Error creating trip from prompt:', err);
      Alert.alert(
        lang === 'es' ? 'Error al crear viaje' : 'Error creating trip',
        lang === 'es'
          ? 'Ocurrió un error al procesar el viaje. Intenta con el formulario estructurado.'
          : 'An error occurred. Please try with structured form.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Create from Structured Form
  const handleCreateFromStructured = async () => {
    if (!tripName.trim()) {
      Alert.alert(
        lang === 'es' ? 'Nombre requerido' : 'Name required',
        lang === 'es' ? 'Por favor ingresa un nombre para el viaje' : 'Please enter a name for the trip'
      );
      return;
    }
    if (cityList.length === 0) {
      Alert.alert(
        lang === 'es' ? 'Ciudades requeridas' : 'Cities required',
        lang === 'es' ? 'Añade al menos un destino' : 'Add at least one destination'
      );
      return;
    }

    setIsLoading(true);
    setStatusMessage(
      lang === 'es' ? 'Geocodificando destinos...' : 'Geocoding destinations...'
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    try {
      const destinations: Destination[] = await Promise.all(
        cityList.map(async (cityName, idx) => {
          const loc = await resolveLocationAsync(cityName);
          return {
            id: `dest-${Date.now()}-${idx + 1}`,
            name: cityName,
            location: loc,
            plannedNights: 3,
          };
        })
      );

      const { itineraryDays, transportationSegments } = buildItineraryFromDestinations(
        destinations,
        startDate,
        endDate,
        undefined,
        preferTrain
      );

      const newTrip: Trip = {
        id: `trip-custom-${Date.now()}`,
        name: tripName.trim(),
        startDate,
        endDate,
        status: 'planned',
        origin: destinations[0]?.location,
        destinations,
        events: [],
        reservations: [],
        transportation: transportationSegments,
        constraints: [],
        preferences: {
          travelStyle,
          transportationPreference: preferTrain ? ['train'] : ['flight'],
          minimizeHotelChanges: travelStyle === 'relaxed',
          minimizeTravelTime: travelStyle === 'intense',
        },
        itinerary: {
          days: itineraryDays,
        },
        updatedAt: new Date().toISOString(),
      };

      createTrip(newTrip);
      router.back();
    } catch (err) {
      console.error('[CreateTripModal] Error creating structured trip:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-950 px-5 pt-12 pb-8">
      {/* Modal Top Bar */}
      <View className="flex-row items-center justify-between pb-4 border-b border-slate-800 mb-5">
        <View className="flex-row items-center space-x-2.5">
          <View className="w-8 h-8 rounded-lg bg-brand-500/20 items-center justify-center border border-brand-500/35">
            <Plus color="#10b981" size={18} />
          </View>
          <Text className="text-lg font-bold text-white">
            {lang === 'es' ? 'Crear Nuevo Viaje' : 'Create New Trip'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 rounded-full bg-slate-900 border border-slate-800"
        >
          <X color="#94a3b8" size={18} />
        </TouchableOpacity>
      </View>

      {/* Tab Switcher: Prompt AI vs Structured */}
      <View className="flex-row bg-slate-900 border border-slate-800 rounded-xl p-1 mb-5">
        <TouchableOpacity
          onPress={() => setTab('prompt')}
          className={`flex-1 py-2 rounded-lg flex-row items-center justify-center space-x-1.5 ${
            tab === 'prompt' ? 'bg-brand-600' : 'bg-transparent'
          }`}
        >
          <Wand2 color={tab === 'prompt' ? '#ffffff' : '#94a3b8'} size={14} />
          <Text
            className={`text-xs font-bold ${
              tab === 'prompt' ? 'text-white' : 'text-slate-400'
            }`}
          >
            {lang === 'es' ? 'Prompt Natural IA' : 'Natural AI Prompt'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setTab('structured')}
          className={`flex-1 py-2 rounded-lg flex-row items-center justify-center space-x-1.5 ${
            tab === 'structured' ? 'bg-brand-600' : 'bg-transparent'
          }`}
        >
          <SlidersHorizontal color={tab === 'structured' ? '#ffffff' : '#94a3b8'} size={14} />
          <Text
            className={`text-xs font-bold ${
              tab === 'structured' ? 'text-white' : 'text-slate-400'
            }`}
          >
            {lang === 'es' ? 'Estructurado' : 'Structured'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* TAB 1: NATURAL LANGUAGE PROMPT */}
        {tab === 'prompt' && (
          <View className="space-y-4 mb-6">
            <View className="bg-slate-900/90 border border-brand-500/30 rounded-2xl p-4">
              <View className="flex-row items-center space-x-2 mb-2">
                <Sparkles color="#10b981" size={16} />
                <Text className="text-xs font-bold text-white">
                  {lang === 'es'
                    ? 'Describe tu viaje en lenguaje libre'
                    : 'Describe your journey in natural language'}
                </Text>
              </View>

              <Text className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                {lang === 'es'
                  ? 'Menciona duración, ciudades y ritmo. El motor extraerá destinos, calculará coordenadas y generará tu ruta óptima.'
                  : 'Mention duration, cities and pace. The engine extracts stops, resolves coordinates and builds your route.'}
              </Text>

              <TextInput
                value={promptText}
                onChangeText={setPromptText}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholder={defaultPrompt}
                placeholderTextColor="#64748b"
                className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs leading-5 min-h-[110px]"
              />
            </View>

            {/* Submit Prompt */}
            <TouchableOpacity
              disabled={isLoading || !promptText.trim()}
              onPress={handleCreateFromPrompt}
              activeOpacity={0.8}
              className={`rounded-xl py-3.5 flex-row items-center justify-center space-x-2 shadow-lg ${
                isLoading || !promptText.trim() ? 'bg-slate-800 opacity-60' : 'bg-brand-600'
              }`}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Wand2 color="#ffffff" size={16} />
                  <Text className="text-sm font-bold text-white">
                    {lang === 'es' ? 'Generar Itinerario con IA' : 'Generate Itinerary with AI'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {isLoading && (
              <Text className="text-xs text-brand-400 text-center italic mt-1">
                {statusMessage}
              </Text>
            )}
          </View>
        )}

        {/* TAB 2: STRUCTURED FORM */}
        {tab === 'structured' && (
          <View className="space-y-4 mb-6">
            {/* Trip Name */}
            <View>
              <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                {lang === 'es' ? 'Nombre del Viaje' : 'Trip Name'}
              </Text>
              <TextInput
                value={tripName}
                onChangeText={setTripName}
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
                  value={startDate}
                  onChangeText={setStartDate}
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
                  value={endDate}
                  onChangeText={setEndDate}
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
                  placeholder={lang === 'es' ? 'Añadir ciudad (ej. Praga)...' : 'Add city (e.g. Prague)...'}
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

            {/* Submit Button */}
            <TouchableOpacity
              disabled={isLoading}
              onPress={handleCreateFromStructured}
              activeOpacity={0.8}
              className="bg-brand-600 rounded-xl py-3.5 flex-row items-center justify-center space-x-2 shadow-lg mb-6"
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Check color="#ffffff" size={18} />
                  <Text className="text-sm font-bold text-white">
                    {lang === 'es' ? 'Guardar e Iniciar Viaje' : 'Save and Start Trip'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
