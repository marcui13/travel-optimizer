import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Compass, Globe, History, PlusCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useMobileTrip } from '../../context/MobileTripContext';
import { useMobileI18n } from '../../context/MobileI18nContext';

interface MobileHeaderProps {
  title?: string;
  subtitle?: string;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ title, subtitle }) => {
  const router = useRouter();
  const { trip, savedTrips } = useMobileTrip();
  const { lang, setLang } = useMobileI18n();

  const toggleLanguage = () => {
    setLang(lang === 'es' ? 'en' : 'es');
  };

  const handleOpenHistory = () => {
    router.push('/modal/history');
  };

  const handleOpenCreate = () => {
    router.push('/modal/create');
  };

  const displayTitle = title || trip?.name || 'Travel Optimizer';
  const displaySubtitle = subtitle || (trip ? `${trip.startDate} → ${trip.endDate}` : undefined);

  return (
    <View className="bg-slate-950/95 border-b border-slate-800/80 px-4 pt-12 pb-3.5">
      <View className="flex-row items-center justify-between">
        {/* App & Trip Info */}
        <View className="flex-1 mr-3 flex-row items-center space-x-3">
          <View className="w-9 h-9 rounded-xl bg-brand-500/20 items-center justify-center border border-brand-500/30">
            <Compass color="#10b981" size={20} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center space-x-2">
              <Text className="text-base font-bold text-white tracking-tight" numberOfLines={1}>
                {displayTitle}
              </Text>
              {trip?.status && (
                <View className="bg-brand-500/15 border border-brand-500/30 px-1.5 py-0.5 rounded">
                  <Text className="text-[10px] font-bold text-brand-400 uppercase">
                    {trip.status}
                  </Text>
                </View>
              )}
            </View>
            {displaySubtitle && (
              <Text className="text-xs text-slate-400 mt-0.5" numberOfLines={1}>
                {displaySubtitle}
              </Text>
            )}
          </View>
        </View>

        {/* Quick Action Buttons */}
        <View className="flex-row items-center space-x-2">
          {/* Language Switch */}
          <TouchableOpacity
            onPress={toggleLanguage}
            activeOpacity={0.7}
            className="flex-row items-center bg-slate-900 border border-slate-800 px-2 py-1.5 rounded-lg space-x-1"
          >
            <Globe color="#94a3b8" size={13} />
            <Text className="text-[11px] font-semibold text-slate-300 uppercase">
              {lang}
            </Text>
          </TouchableOpacity>

          {/* Trip History Modal */}
          <TouchableOpacity
            onPress={handleOpenHistory}
            activeOpacity={0.7}
            className="relative p-2 rounded-lg bg-slate-900 border border-slate-800"
          >
            <History color="#94a3b8" size={16} />
            {savedTrips.length > 1 && (
              <View className="absolute -top-1 -right-1 bg-brand-500 rounded-full w-4 h-4 items-center justify-center">
                <Text className="text-[9px] font-black text-slate-950">
                  {savedTrips.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Create Trip Modal */}
          <TouchableOpacity
            onPress={handleOpenCreate}
            activeOpacity={0.7}
            className="p-2 rounded-lg bg-brand-600/90 border border-brand-500/40"
          >
            <PlusCircle color="#ffffff" size={16} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
