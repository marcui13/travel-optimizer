import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Share } from 'react-native';
import { useRouter } from 'expo-router';
import {
  X,
  History,
  Copy,
  Trash2,
  Check,
  Plus,
  Calendar,
  MapPin,
  Share2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMobileTrip } from '../../context/MobileTripContext';
import { useMobileI18n } from '../../context/MobileI18nContext';
import { Trip } from '@domain/types';
import { encodeTripToShareUrl, generateTripSummaryText } from '@services/sharing/shareService';

export default function TripHistoryModal() {
  const router = useRouter();
  const {
    savedTrips,
    activeTripId,
    setActiveTrip,
    duplicateTrip,
    deleteTrip,
  } = useMobileTrip();
  const { lang } = useMobileI18n();

  const handleSelect = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    setActiveTrip(id);
    router.back();
  };

  const handleDuplicate = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    duplicateTrip(id, lang === 'es' ? 'Copia' : 'Copy');
  };

  const handleShare = async (tripItem: Trip) => {
    Haptics.selectionAsync().catch(() => {});
    try {
      const shareUrl = encodeTripToShareUrl(tripItem);
      const summaryText = generateTripSummaryText(tripItem, lang, shareUrl);
      await Share.share({
        title: tripItem.name,
        message: `${summaryText}\n\n${shareUrl}`,
        url: shareUrl,
      });
    } catch (err) {
      console.error('[TripHistoryModal] Error sharing trip:', err);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      lang === 'es' ? 'Eliminar Viaje' : 'Delete Trip',
      lang === 'es'
        ? `¿Estás seguro de que deseas eliminar "${name}"?`
        : `Are you sure you want to delete "${name}"?`,
      [
        { text: lang === 'es' ? 'Cancelar' : 'Cancel', style: 'cancel' },
        {
          text: lang === 'es' ? 'Eliminar' : 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
            deleteTrip(id);
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-slate-950 px-5 pt-12 pb-8">
      {/* Header */}
      <View className="flex-row items-center justify-between pb-4 border-b border-slate-800 mb-6">
        <View className="flex-row items-center space-x-2.5">
          <View className="w-8 h-8 rounded-lg bg-brand-500/20 items-center justify-center border border-brand-500/35">
            <History color="#10b981" size={16} />
          </View>
          <View>
            <Text className="text-lg font-bold text-white">
              {lang === 'es' ? 'Historial de Viajes' : 'Trip History'}
            </Text>
            <Text className="text-[11px] text-slate-400">
              {savedTrips.length} {savedTrips.length === 1 ? 'viaje guardado' : 'viajes guardados'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 rounded-full bg-slate-900 border border-slate-800"
        >
          <X color="#94a3b8" size={18} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="space-y-3 mb-6">
          {savedTrips.map((item) => {
            const isActive = item.id === activeTripId;
            return (
              <View
                key={item.id}
                className={`p-4 rounded-2xl border mb-3 ${
                  isActive
                    ? 'bg-brand-500/10 border-brand-500/50'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-base font-bold text-white flex-1 mr-2" numberOfLines={1}>
                    {item.name}
                  </Text>
                  {isActive ? (
                    <View className="bg-brand-500 px-2 py-0.5 rounded-full">
                      <Text className="text-[10px] font-black text-slate-950">
                        {lang === 'es' ? 'ACTIVO' : 'ACTIVE'}
                      </Text>
                    </View>
                  ) : (
                    <View className="bg-slate-800 px-2 py-0.5 rounded-full">
                      <Text className="text-[10px] font-semibold text-slate-400 uppercase">
                        {item.status || 'planned'}
                      </Text>
                    </View>
                  )}
                </View>

                <View className="flex-row items-center space-x-3 mb-3">
                  <View className="flex-row items-center space-x-1">
                    <Calendar color="#64748b" size={13} />
                    <Text className="text-xs text-slate-400">
                      {item.startDate} → {item.endDate}
                    </Text>
                  </View>
                  <View className="flex-row items-center space-x-1">
                    <MapPin color="#64748b" size={13} />
                    <Text className="text-xs text-slate-400">
                      {item.destinations?.length || 0} {lang === 'es' ? 'ciudades' : 'cities'}
                    </Text>
                  </View>
                </View>

                {/* Actions row: Share, Duplicate, Delete, Activate */}
                <View className="flex-row items-center justify-between pt-2.5 border-t border-slate-800/80">
                  <View className="flex-row space-x-2">
                    {/* Share native button */}
                    <TouchableOpacity
                      onPress={() => handleShare(item)}
                      className="p-2 rounded-lg bg-slate-950 border border-slate-800"
                    >
                      <Share2 color="#38bdf8" size={14} />
                    </TouchableOpacity>

                    {/* Duplicate button */}
                    <TouchableOpacity
                      onPress={() => handleDuplicate(item.id)}
                      className="p-2 rounded-lg bg-slate-950 border border-slate-800"
                    >
                      <Copy color="#94a3b8" size={14} />
                    </TouchableOpacity>

                    {/* Delete button (if more than 1 trip) */}
                    {savedTrips.length > 1 && (
                      <TouchableOpacity
                        onPress={() => handleDelete(item.id, item.name)}
                        className="p-2 rounded-lg bg-slate-950 border border-red-900/40"
                      >
                        <Trash2 color="#ef4444" size={14} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {!isActive ? (
                    <TouchableOpacity
                      onPress={() => handleSelect(item.id)}
                      className="bg-brand-600 px-3.5 py-2 rounded-lg flex-row items-center space-x-1.5"
                    >
                      <Check color="#ffffff" size={14} />
                      <Text className="text-xs font-bold text-white">
                        {lang === 'es' ? 'Activar' : 'Activate'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View className="px-3 py-1.5 rounded-lg bg-brand-950/60 border border-brand-500/40 flex-row items-center space-x-1">
                      <Check color="#10b981" size={12} />
                      <Text className="text-xs font-semibold text-brand-400">
                        {lang === 'es' ? 'En pantalla' : 'Current'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Quick Create Trip Button */}
        <TouchableOpacity
          onPress={() => {
            router.back();
            router.push('/modal/create');
          }}
          activeOpacity={0.8}
          className="bg-slate-900 border border-slate-800 rounded-xl py-3.5 flex-row items-center justify-center space-x-2 mb-8"
        >
          <Plus color="#10b981" size={16} />
          <Text className="text-xs font-bold text-slate-200">
            {lang === 'es' ? 'Crear Otro Viaje' : 'Create Another Trip'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
