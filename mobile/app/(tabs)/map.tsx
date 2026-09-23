import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Map, MapPin, Navigation, Compass, Layers, Info } from 'lucide-react-native';
import { useMobileTrip } from '../../context/MobileTripContext';
import { useMobileI18n } from '../../context/MobileI18nContext';
import { MobileHeader } from '../../components/layout/MobileHeader';

export default function MapTabScreen() {
  const router = useRouter();
  const { trip } = useMobileTrip();
  const { lang } = useMobileI18n();

  const destinations = trip.destinations || [];

  return (
    <View className="flex-1 bg-slate-950">
      <MobileHeader
        title={lang === 'es' ? 'Mapa de Ruta' : 'Route Map'}
        subtitle={`${trip.name} (${destinations.length} ${lang === 'es' ? 'ciudades' : 'cities'})`}
      />

      <ScrollView className="flex-1 px-4 pt-4 pb-12" showsVerticalScrollIndicator={false}>
        {/* Map Preview Shell Container */}
        <View className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-4 items-center justify-center relative overflow-hidden shadow-2xl min-h-[220px]">
          {/* Subtle grid pattern background */}
          <View className="absolute inset-0 opacity-15">
            <View className="flex-row justify-around h-full items-center">
              <View className="w-px h-full bg-slate-700" />
              <View className="w-px h-full bg-slate-700" />
              <View className="w-px h-full bg-slate-700" />
            </View>
          </View>

          <View className="w-14 h-14 rounded-2xl bg-brand-500/20 border border-brand-500/40 items-center justify-center mb-3">
            <Map color="#10b981" size={28} />
          </View>

          <Text className="text-lg font-black text-white text-center mb-1">
            {lang === 'es' ? 'Visualizador Cartográfico' : 'Cartographic Viewer'}
          </Text>
          <Text className="text-xs text-slate-400 text-center max-w-[260px] mb-4">
            {lang === 'es'
              ? 'Pines nativos, polilíneas de transporte y bottom sheet interactivo (Fase 4)'
              : 'Native pins, transport polylines and interactive bottom sheet (Phase 4)'}
          </Text>

          <View className="flex-row items-center space-x-2 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-full">
            <Layers color="#10b981" size={13} />
            <Text className="text-xs font-semibold text-slate-300">
              {destinations.length} {lang === 'es' ? 'ciudades geolocalizadas' : 'geolocated cities'}
            </Text>
          </View>
        </View>

        {/* Geographic Stops List */}
        <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
          <Text className="text-sm font-bold text-white uppercase tracking-wider mb-3">
            {lang === 'es' ? 'Puntos de Ruta y Coordenadas' : 'Route Waypoints & Coordinates'}
          </Text>

          <View className="space-y-2">
            {destinations.map((dest, idx) => {
              const lat = dest.location?.latitude?.toFixed(4) ?? '48.8566';
              const lng = dest.location?.longitude?.toFixed(4) ?? '2.3522';
              return (
                <View
                  key={dest.id || idx}
                  className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 mb-2 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center space-x-3">
                    <View className="w-7 h-7 rounded-lg bg-brand-500/15 border border-brand-500/30 items-center justify-center">
                      <MapPin color="#10b981" size={15} />
                    </View>
                    <View>
                      <Text className="text-sm font-bold text-white">
                        {dest.name}
                      </Text>
                      <Text className="text-[11px] text-slate-400 font-mono">
                        {lat}° N, {lng}° E
                      </Text>
                    </View>
                  </View>

                  <View className="bg-slate-900 border border-slate-800 px-2 py-1 rounded">
                    <Text className="text-[10px] font-semibold text-slate-300">
                      {dest.location?.country || 'Europa'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Link back to itinerary */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)')}
          activeOpacity={0.7}
          className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex-row items-center justify-center space-x-2 mb-8"
        >
          <Compass color="#10b981" size={16} />
          <Text className="text-xs font-bold text-brand-400">
            {lang === 'es' ? 'Consultar Línea de Tiempo Detallada' : 'View Detailed Timeline'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
