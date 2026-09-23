import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { X, Plus, Sparkles, MapPin, Calendar, Check } from 'lucide-react-native';
import { useMobileTrip } from '../../context/MobileTripContext';
import { useMobileI18n } from '../../context/MobileI18nContext';
import { Trip } from '@domain/types';

export default function CreateTripModal() {
  const router = useRouter();
  const { createTrip } = useMobileTrip();
  const { lang } = useMobileI18n();

  const [tripName, setTripName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [destinationsInput, setDestinationsInput] = useState('Madrid, Barcelona, París');

  const handleCreate = () => {
    if (!tripName.trim()) {
      Alert.alert(
        lang === 'es' ? 'Nombre requerido' : 'Name required',
        lang === 'es' ? 'Por favor ingresa un nombre para el viaje' : 'Please enter a name for the trip'
      );
      return;
    }

    const cityNames = destinationsInput
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const destinations = cityNames.map((city, idx) => ({
      id: `dest-${Date.now()}-${idx}`,
      name: city,
      location: {
        name: city,
        country: 'Europa',
        latitude: 40.4168 + idx * 2,
        longitude: -3.7038 + idx * 3,
      },
      plannedNights: 3,
    }));

    const newTrip: Trip = {
      id: `trip-custom-${Date.now()}`,
      name: tripName.trim(),
      startDate,
      endDate: startDate,
      status: 'planned',
      destinations,
      events: [],
      reservations: [],
      transportation: [],
      constraints: [],
      preferences: {
        travelStyle: 'balanced',
        transportationPreference: ['train', 'flight'],
        minimizeHotelChanges: true,
        minimizeTravelTime: true,
      },
      itinerary: {
        days: destinations.map((d, idx) => ({
          dayNumber: idx + 1,
          date: startDate,
          destinationId: d.id,
          activities: [],
          stays: [],
        })),
      },
      updatedAt: new Date().toISOString(),
    };

    createTrip(newTrip);
    router.back();
  };

  return (
    <View className="flex-1 bg-slate-950 px-5 pt-12 pb-8">
      {/* Modal Top Bar */}
      <View className="flex-row items-center justify-between pb-4 border-b border-slate-800 mb-6">
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

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Trip Name Input */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            {lang === 'es' ? 'Nombre del Viaje' : 'Trip Name'}
          </Text>
          <TextInput
            value={tripName}
            onChangeText={setTripName}
            placeholder={lang === 'es' ? 'Ej: Aventura por los Alpes 2026' : 'e.g.: Alpine Adventure 2026'}
            placeholderTextColor="#64748b"
            className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm"
          />
        </View>

        {/* Start Date Input */}
        <View className="mb-4">
          <Text className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            {lang === 'es' ? 'Fecha de Inicio (YYYY-MM-DD)' : 'Start Date (YYYY-MM-DD)'}
          </Text>
          <View className="flex-row items-center bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 space-x-2">
            <Calendar color="#64748b" size={16} />
            <TextInput
              value={startDate}
              onChangeText={setStartDate}
              placeholder="2026-06-01"
              placeholderTextColor="#64748b"
              className="flex-1 text-white text-sm"
            />
          </View>
        </View>

        {/* Destinations Input */}
        <View className="mb-6">
          <Text className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            {lang === 'es' ? 'Destinos iniciales (separados por coma)' : 'Initial destinations (comma-separated)'}
          </Text>
          <View className="flex-row items-center bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 space-x-2">
            <MapPin color="#64748b" size={16} />
            <TextInput
              value={destinationsInput}
              onChangeText={setDestinationsInput}
              placeholder="Madrid, París, Roma"
              placeholderTextColor="#64748b"
              className="flex-1 text-white text-sm"
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleCreate}
          activeOpacity={0.8}
          className="bg-brand-600 rounded-xl py-3.5 flex-row items-center justify-center space-x-2 shadow-lg mb-6"
        >
          <Check color="#ffffff" size={18} />
          <Text className="text-sm font-bold text-white">
            {lang === 'es' ? 'Guardar e Iniciar Viaje' : 'Save and Start Trip'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
