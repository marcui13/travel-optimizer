import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import type MapView from 'react-native-maps';
import { Maximize2, MapPin } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMobileTrip } from '../../context/MobileTripContext';
import { useMobileI18n } from '../../context/MobileI18nContext';
import { MobileHeader } from '../../components/layout/MobileHeader';
import { MapCanvas } from '../../components/map/MapCanvas';
import { ItineraryBottomSheet } from '../../components/map/ItineraryBottomSheet';

export default function MapTabScreen() {
  const router = useRouter();
  const { trip } = useMobileTrip();
  const { lang } = useMobileI18n();

  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const mapRef = useRef<MapView | null>(null);

  const destinations = trip.destinations || [];
  const transportation = trip.transportation || [];

  // Focus map on selected destination
  const handleSelectDestination = useCallback(
    (destId: string) => {
      setSelectedDestinationId(destId);
      const target = destinations.find((d) => d.id === destId);
      if (
        target?.location?.latitude != null &&
        target?.location?.longitude != null &&
        mapRef.current
      ) {
        mapRef.current.animateToRegion(
          {
            latitude: target.location.latitude,
            longitude: target.location.longitude,
            latitudeDelta: 2.8,
            longitudeDelta: 2.8,
          },
          400
        );
      }
    },
    [destinations]
  );

  // Recenter map to fit entire route
  const handleFitRoute = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedDestinationId(null);

    const coords = destinations
      .filter((d) => d.location?.latitude != null && d.location?.longitude != null)
      .map((d) => ({
        latitude: d.location.latitude!,
        longitude: d.location.longitude!,
      }));

    if (coords.length > 0 && mapRef.current) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 70, right: 40, bottom: 220, left: 40 },
        animated: true,
      });
    }
  }, [destinations]);

  return (
    <View className="flex-1 bg-slate-950">
      <MobileHeader />

      {/* Main Map Viewport */}
      <View className="flex-1 relative">
        <MapCanvas
          destinations={destinations}
          transportation={transportation}
          selectedDestinationId={selectedDestinationId}
          onSelectDestination={handleSelectDestination}
          mapRef={mapRef}
        />

        {/* Floating Quick Action Overlay Buttons */}
        <View className="absolute top-3 left-4 right-4 flex-row items-center justify-between pointer-events-box-none">
          <View className="flex-row items-center space-x-1.5 bg-slate-950/80 border border-slate-800/90 px-3 py-1.5 rounded-full shadow-lg">
            <MapPin color="#10b981" size={13} />
            <Text className="text-xs font-bold text-white">
              {destinations.length} {lang === 'es' ? 'paradas' : 'stops'}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleFitRoute}
            className="flex-row items-center space-x-1.5 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-full shadow-lg"
          >
            <Maximize2 color="#10b981" size={13} />
            <Text className="text-xs font-semibold text-slate-200">
              {lang === 'es' ? 'Ajustar ruta' : 'Fit route'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Interactive Bottom Sheet Drawer */}
        <ItineraryBottomSheet
          destinations={destinations}
          transportation={transportation}
          selectedDestinationId={selectedDestinationId}
          onSelectDestination={handleSelectDestination}
          onNavigateToItinerary={() => router.push('/(tabs)')}
        />
      </View>
    </View>
  );
}
