import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Destination, TransportationSegment } from '@domain/types';

export interface MapCanvasProps {
  destinations: Destination[];
  transportation: TransportationSegment[];
  selectedDestinationId: string | null;
  onSelectDestination: (destinationId: string) => void;
  mapRef?: any;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
  destinations,
  transportation,
  selectedDestinationId,
  onSelectDestination,
}) => {
  const validDestinations = useMemo(() => {
    return destinations.filter(
      (d) => d.location?.latitude != null && d.location?.longitude != null
    );
  }, [destinations]);

  return (
    <View className="flex-1 bg-slate-950 items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle grid pattern background */}
      <View className="absolute inset-0 opacity-10">
        <View className="flex-row justify-around h-full items-center">
          <View className="w-px h-full bg-slate-600" />
          <View className="w-px h-full bg-slate-600" />
          <View className="w-px h-full bg-slate-600" />
        </View>
      </View>

      <View className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center space-x-1.5">
            <View className="w-2 h-2 rounded-full bg-brand-400" />
            <Text className="text-xs font-mono uppercase tracking-wider text-brand-400 font-bold">
              Visor Cartográfico Web
            </Text>
          </View>
          <Text className="text-xs font-mono text-slate-400">
            {validDestinations.length} Nodos
          </Text>
        </View>

        {/* Sequential route nodes */}
        <ScrollView className="max-h-[320px]" showsVerticalScrollIndicator={false}>
          {validDestinations.map((dest, idx) => {
            const isSelected = dest.id === selectedDestinationId;
            const seq = String(idx + 1).padStart(2, '0');
            const nextDest = validDestinations[idx + 1];

            return (
              <View key={dest.id || idx}>
                <TouchableOpacity
                  onPress={() => onSelectDestination(dest.id)}
                  activeOpacity={0.8}
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
                        {dest.location?.latitude?.toFixed(2)}°N,{' '}
                        {dest.location?.longitude?.toFixed(2)}°E
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
                  <View className="items-center my-1">
                    <View className="w-0.5 h-3.5 bg-brand-500/40" />
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};
