import React from 'react';
import { View, Text, TouchableOpacity, Share } from 'react-native';
import { Compass, Globe, History, Share2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useMobileTrip } from '../../context/MobileTripContext';
import { useMobileI18n } from '../../context/MobileI18nContext';
import { encodeTripToShareUrl, generateTripSummaryText } from '@services/sharing/shareService';

interface MobileHeaderProps {
  title?: string;
  subtitle?: string;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ title, subtitle }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { trip, savedTrips } = useMobileTrip();
  const { lang, setLang } = useMobileI18n();

  const toggleLanguage = () => {
    setLang(lang === 'es' ? 'en' : 'es');
  };

  const handleOpenHistory = () => {
    router.push('/modal/history');
  };

  const handleShare = async () => {
    if (!trip) return;
    Haptics.selectionAsync().catch(() => {});
    try {
      const shareUrl = encodeTripToShareUrl(trip);
      const summaryText = generateTripSummaryText(trip, lang, shareUrl);
      await Share.share({
        title: trip.name,
        message: `${summaryText}\n\n${shareUrl}`,
        url: shareUrl,
      });
    } catch (err) {
      console.error('[MobileHeader] Error sharing trip:', err);
    }
  };

  const displayTitle = title || 'Travel Optimizer';
  const displaySubtitle = subtitle || (trip ? `${trip.name}` : undefined);
  const topPadding = Math.max(insets.top, 16) + 4;

  return (
    <View
      className="bg-slate-950 border-b border-slate-850 px-4 pb-3"
      style={{ paddingTop: topPadding }}
    >
      <View className="flex-row items-center justify-between">
        {/* App & Trip Info */}
        <View className="flex-1 mr-3 flex-row items-center space-x-2.5">
          <View className="w-8 h-8 rounded-xl bg-brand-500/15 items-center justify-center border border-brand-500/30">
            <Compass color="#10b981" size={18} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center space-x-1.5">
              <Text className="text-sm font-bold text-white tracking-tight" numberOfLines={1}>
                {displayTitle}
              </Text>
              {trip?.status && !title && (
                <View className="bg-brand-500/15 border border-brand-500/30 px-1.5 py-0.5 rounded">
                  <Text className="text-[9px] font-bold text-brand-400 uppercase">
                    {trip.status}
                  </Text>
                </View>
              )}
            </View>
            {displaySubtitle && (
              <Text className="text-[11px] text-slate-400 mt-0.5 truncate" numberOfLines={1}>
                {displaySubtitle}
              </Text>
            )}
          </View>
        </View>

        {/* Quick Action Buttons */}
        <View className="flex-row items-center space-x-1.5">
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

          {/* Share Trip Button */}
          <TouchableOpacity
            onPress={handleShare}
            activeOpacity={0.7}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800"
          >
            <Share2 color="#94a3b8" size={15} />
          </TouchableOpacity>

          {/* Trip History Modal */}
          <TouchableOpacity
            onPress={handleOpenHistory}
            activeOpacity={0.7}
            className="relative p-2 rounded-lg bg-slate-900 border border-slate-800"
          >
            <History color="#94a3b8" size={15} />
            {savedTrips.length > 1 && (
              <View className="absolute -top-1 -right-1 bg-brand-500 rounded-full w-4 h-4 items-center justify-center">
                <Text className="text-[9px] font-black text-slate-950">
                  {savedTrips.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
