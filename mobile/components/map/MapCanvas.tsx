import React, { useMemo } from 'react';
import { View, Text, Platform, TouchableOpacity, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { Destination, TransportationSegment } from '@domain/types';
import { darkMapStyle } from './darkMapStyle';
import { MapMarkerPin } from './MapMarkerPin';

interface MapCanvasProps {
  destinations: Destination[];
  transportation: TransportationSegment[];
  selectedDestinationId: string | null;
  onSelectDestination: (destinationId: string) => void;
  mapRef?: React.RefObject<MapView | null>;
}

// Generate quadratic Bezier points for curved flight paths
function generateArcPoints(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
  numPoints: number = 15
): { latitude: number; longitude: number }[] {
  const points: { latitude: number; longitude: number }[] = [];
  const midLat = (from.latitude + to.latitude) / 2;
  const midLng = (from.longitude + to.longitude) / 2;
  const dLat = to.latitude - from.latitude;
  const dLng = to.longitude - from.longitude;
  const dist = Math.sqrt(dLat * dLat + dLng * dLng) || 1;

  // Arc altitude perpendicular offset
  const offset = dist * 0.18;
  const curveLat = midLat + (dLng / dist) * offset;
  const curveLng = midLng - (dLat / dist) * offset;

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const lat =
      (1 - t) * (1 - t) * from.latitude +
      2 * (1 - t) * t * curveLat +
      t * t * to.latitude;
    const lng =
      (1 - t) * (1 - t) * from.longitude +
      2 * (1 - t) * t * curveLng +
      t * t * to.longitude;
    points.push({ latitude: lat, longitude: lng });
  }
  return points;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
  destinations,
  transportation,
  selectedDestinationId,
  onSelectDestination,
  mapRef,
}) => {
  const validDestinations = useMemo(() => {
    return destinations.filter(
      (d) => d.location?.latitude != null && d.location?.longitude != null
    );
  }, [destinations]);

  // Compute bounding region from coordinates
  const initialRegion = useMemo<Region>(() => {
    if (validDestinations.length === 0) {
      return {
        latitude: 48.8566,
        longitude: 2.3522,
        latitudeDelta: 12,
        longitudeDelta: 12,
      };
    }

    let minLat = 90;
    let maxLat = -90;
    let minLng = 180;
    let maxLng = -180;

    validDestinations.forEach((d) => {
      const lat = d.location.latitude!;
      const lng = d.location.longitude!;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    });

    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;
    const deltaLat = Math.max(2.5, (maxLat - minLat) * 1.5);
    const deltaLng = Math.max(2.5, (maxLng - minLng) * 1.5);

    return {
      latitude: midLat,
      longitude: midLng,
      latitudeDelta: deltaLat,
      longitudeDelta: deltaLng,
    };
  }, [validDestinations]);

  // Web Fallback Renderer
  if (Platform.OS === 'web') {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center p-6 relative overflow-hidden">
        {/* Subtle grid background */}
        <View className="absolute inset-0 opacity-10">
          <View className="flex-row justify-around h-full items-center">
            <View className="w-px h-full bg-slate-600" />
            <View className="w-px h-full bg-slate-600" />
            <View className="w-px h-full bg-slate-600" />
          </View>
        </View>

        <View className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xs font-mono uppercase tracking-wider text-brand-400 font-bold">
              Proyección Cartográfica Web
            </Text>
            <Text className="text-xs font-mono text-slate-400">
              {validDestinations.length} Nodos
            </Text>
          </View>

          {/* Sequential route nodes */}
          <View className="space-y-2">
            {validDestinations.map((dest, idx) => {
              const isSelected = dest.id === selectedDestinationId;
              const seq = String(idx + 1).padStart(2, '0');
              const nextDest = validDestinations[idx + 1];

              return (
                <View key={dest.id || idx}>
                  <TouchableOpacity
                    onPress={() => onSelectDestination(dest.id)}
                    className={`flex-row items-center justify-between p-3 rounded-xl border ${
                      isSelected
                        ? 'bg-brand-950/60 border-brand-400 shadow-md'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <View className="flex-row items-center space-x-3">
                      <View
                        className={`w-7 h-7 rounded-lg items-center justify-center ${
                          isSelected ? 'bg-brand-500' : 'bg-slate-800'
                        }`}
                      >
                        <Text
                          className={`text-xs font-mono font-bold ${
                            isSelected ? 'text-slate-950' : 'text-brand-400'
                          }`}
                        >
                          {seq}
                        </Text>
                      </View>
                      <View>
                        <Text className="text-sm font-bold text-white">
                          {dest.name}
                        </Text>
                        <Text className="text-[10px] font-mono text-slate-400">
                          {dest.location.latitude?.toFixed(2)}°N,{' '}
                          {dest.location.longitude?.toFixed(2)}°E
                        </Text>
                      </View>
                    </View>

                    <View className="bg-slate-900 border border-slate-800 px-2 py-1 rounded">
                      <Text className="text-xs font-mono text-slate-300">
                        {dest.plannedNights || 2}n
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {nextDest && (
                    <View className="items-center my-0.5">
                      <View className="w-0.5 h-3 bg-brand-500/40" />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </View>
    );
  }

  // Native iOS / Android MapView Renderer
  return (
    <MapView
      ref={mapRef}
      provider={PROVIDER_DEFAULT}
      customMapStyle={darkMapStyle}
      initialRegion={initialRegion}
      showsUserLocation={false}
      showsCompass={true}
      showsScale={true}
      style={StyleSheet.absoluteFill}
    >
      {/* 1. Transportation Polylines */}
      {transportation.map((seg) => {
        if (
          seg.from?.latitude == null ||
          seg.from?.longitude == null ||
          seg.to?.latitude == null ||
          seg.to?.longitude == null
        ) {
          return null;
        }

        const isFlight = seg.mode === 'flight';
        const isTrain = seg.mode === 'train';
        const isBus = seg.mode === 'bus';

        const strokeColor = isFlight
          ? '#38bdf8'
          : isTrain
          ? '#10b981'
          : isBus
          ? '#fbbf24'
          : '#c084fc';

        const coordinates = isFlight
          ? generateArcPoints(
              { latitude: seg.from.latitude, longitude: seg.from.longitude },
              { latitude: seg.to.latitude, longitude: seg.to.longitude }
            )
          : [
              { latitude: seg.from.latitude, longitude: seg.from.longitude },
              { latitude: seg.to.latitude, longitude: seg.to.longitude },
            ];

        return (
          <Polyline
            key={seg.id}
            coordinates={coordinates}
            strokeColor={strokeColor}
            strokeWidth={isFlight ? 3 : 4}
            lineDashPattern={isFlight ? [6, 6] : undefined}
          />
        );
      })}

      {/* 2. Custom Destination Markers */}
      {validDestinations.map((dest, index) => {
        const isSelected = dest.id === selectedDestinationId;
        const lat = dest.location.latitude!;
        const lng = dest.location.longitude!;

        return (
          <Marker
            key={dest.id}
            coordinate={{ latitude: lat, longitude: lng }}
            onPress={() => onSelectDestination(dest.id)}
            zIndex={isSelected ? 99 : 10}
            anchor={{ x: 0.5, y: 1.0 }}
          >
            <MapMarkerPin
              sequenceNumber={index + 1}
              cityName={dest.name}
              nightsCount={dest.plannedNights}
              isSelected={isSelected}
              onPress={() => onSelectDestination(dest.id)}
            />
          </Marker>
        );
      })}
    </MapView>
  );
};
