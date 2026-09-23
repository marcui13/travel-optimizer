import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  MapPin,
  Calendar,
  Building,
  Train,
  Ticket,
  CheckCircle2,
  Coffee,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { format, parseISO } from 'date-fns';
import { ItineraryDay, Event, Reservation } from '@domain/types';
import { useMobileI18n } from '../../context/MobileI18nContext';
import { TransitSegmentStrip } from './TransitSegmentStrip';
import { ActivityItem } from './ActivityItem';

interface DayCardProps {
  day: ItineraryDay;
  isFirst?: boolean;
  isLast?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  dayEvents?: Event[];
  dayReservations?: Reservation[];
}

export const DayCard: React.FC<DayCardProps> = ({
  day,
  isFirst = false,
  isLast = false,
  isSelected = false,
  onSelect,
  dayEvents = [],
  dayReservations = [],
}) => {
  const { t, dateLocale, lang } = useMobileI18n();
  const [isExpanded, setIsExpanded] = useState(true);

  // Format localized date
  let formattedDate = day.date;
  let dayOfWeek = '';
  try {
    const parsed = parseISO(day.date);
    formattedDate = format(parsed, 'd MMM yyyy', { locale: dateLocale });
    dayOfWeek = format(parsed, 'EEEE', { locale: dateLocale });
  } catch {
    // fallback to raw date
  }

  const hasFixedEvents = dayEvents.some((e) => e.fixed);
  const activitiesCount = day.activities?.length || 0;
  const transitCount = day.transportation?.length || 0;

  const handleToggle = () => {
    Haptics.selectionAsync().catch(() => {});
    setIsExpanded((prev) => !prev);
    onSelect?.();
  };

  return (
    <View className="flex-row">
      {/* Vertical Route Spine Node Column */}
      <View className="w-8 items-center">
        {/* Top spine line */}
        <View
          className={`w-0.5 h-5 ${
            isFirst ? 'bg-transparent' : 'bg-slate-800'
          }`}
        />

        {/* Spine Node Dot */}
        <View
          className={`w-4 h-4 rounded-full items-center justify-center border-2 ${
            isSelected
              ? 'bg-brand-500 border-white ring-2 ring-brand-500/40'
              : day.isTravelDay
              ? 'bg-sky-400 border-slate-900 ring-2 ring-sky-500/30'
              : 'bg-slate-900 border-brand-500'
          }`}
        >
          <View
            className={`w-1.5 h-1.5 rounded-full ${
              isSelected
                ? 'bg-white'
                : day.isTravelDay
                ? 'bg-slate-950'
                : 'bg-brand-400'
            }`}
          />
        </View>

        {/* Bottom spine line */}
        <View
          className={`w-0.5 flex-1 ${
            isLast ? 'bg-transparent' : 'bg-slate-800'
          }`}
        />
      </View>

      {/* Main Day Content Card */}
      <View className="flex-1 pb-4 pr-1">
        <View
          className={`bg-slate-900 border rounded-2xl overflow-hidden shadow-lg ${
            isSelected
              ? 'border-brand-500/80 shadow-brand-950/20'
              : 'border-slate-800/90'
          }`}
        >
          {/* Day Header Trigger */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleToggle}
            className="p-3.5 bg-slate-900 border-b border-slate-800/80 flex-row items-center justify-between"
          >
            <View className="flex-row items-center space-x-3 flex-1 mr-2">
              {/* Day Number Pill */}
              <View
                className={`w-10 h-10 rounded-xl items-center justify-center border ${
                  day.isTravelDay
                    ? 'bg-sky-950/60 border-sky-800/70'
                    : 'bg-slate-800/90 border-slate-700/60'
                }`}
              >
                <Text className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">
                  {t.timeline.day}
                </Text>
                <Text
                  className={`text-sm font-black ${
                    day.isTravelDay ? 'text-sky-300' : 'text-white'
                  }`}
                >
                  {day.dayNumber}
                </Text>
              </View>

              {/* Date & Destination info */}
              <View className="flex-1">
                <View className="flex-row items-center space-x-1.5">
                  <Text className="text-xs font-bold text-white capitalize">
                    {formattedDate}
                  </Text>
                  <Text className="text-[11px] text-slate-400 capitalize">
                    • {dayOfWeek}
                  </Text>
                </View>

                <View className="flex-row items-center space-x-1 mt-0.5">
                  <MapPin color="#10b981" size={12} />
                  <Text className="text-xs text-slate-300 font-semibold truncate" numberOfLines={1}>
                    {day.location?.name || t.timeline.inTransit}
                  </Text>
                  {Boolean(day.location?.country) && (
                    <Text className="text-[11px] text-slate-500">
                      , {day.location?.country}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Badges & Expand Indicator */}
            <View className="flex-row items-center space-x-1.5">
              {day.isTravelDay && (
                <View className="flex-row items-center space-x-1 px-2 py-0.5 rounded bg-sky-950/50 border border-sky-800/50">
                  <Train color="#38bdf8" size={11} />
                  <Text className="text-[10px] font-mono font-bold text-sky-300">
                    {lang === 'es' ? 'Viaje' : 'Transit'}
                  </Text>
                </View>
              )}

              {hasFixedEvents && (
                <View className="flex-row items-center space-x-1 px-2 py-0.5 rounded bg-amber-950/50 border border-amber-800/50">
                  <Ticket color="#fbbf24" size={11} />
                  <Text className="text-[10px] font-mono font-bold text-amber-300">
                    {lang === 'es' ? 'Fijo' : 'Fixed'}
                  </Text>
                </View>
              )}

              <View className="p-1">
                {isExpanded ? (
                  <ChevronUp color="#94a3b8" size={16} />
                ) : (
                  <ChevronDown color="#94a3b8" size={16} />
                )}
              </View>
            </View>
          </TouchableOpacity>

          {/* Expanded Content Body */}
          {isExpanded && (
            <View className="p-3.5 space-y-3">
              {/* 1. Transportation Segments */}
              {transitCount > 0 && (
                <View className="space-y-1">
                  {day.transportation?.map((segment) => (
                    <TransitSegmentStrip key={segment.id} segment={segment} />
                  ))}
                </View>
              )}

              {/* 2. Base Camp / Accommodation Notice */}
              {day.accommodation && (day.isTravelDay || day.dayNumber === 1) && (
                <View className="flex-row items-center justify-between p-2.5 rounded-xl bg-brand-950/20 border border-brand-800/40">
                  <View className="flex-row items-center space-x-2 flex-1 mr-2">
                    <Building color="#10b981" size={16} />
                    <View className="flex-1">
                      <Text className="text-xs font-semibold text-slate-200">
                        {t.timeline.checkIn}: {day.accommodation.name}
                      </Text>
                      {Boolean(day.accommodation.address) && (
                        <Text className="text-[10px] text-slate-400 mt-0.5" numberOfLines={1}>
                          {day.accommodation.address}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-[9px] font-mono text-brand-400 bg-brand-900/40 px-1.5 py-0.5 rounded border border-brand-700/50 uppercase tracking-wider">
                      {t.timeline.baseCamp}
                    </Text>
                    <Text className="text-[10px] font-mono text-slate-400 mt-0.5">
                      {day.accommodation.nightsCount} {t.common.nights.toLowerCase()}
                    </Text>
                  </View>
                </View>
              )}

              {/* 3. Fixed Events & Confirmed Reservations */}
              {(dayEvents.length > 0 || dayReservations.length > 0) && (
                <View className="space-y-2">
                  {dayEvents.map((evt) => (
                    <View
                      key={evt.id}
                      className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-800/40 flex-row items-start justify-between"
                    >
                      <View className="flex-row items-start space-x-2 flex-1 mr-2">
                        <Ticket color="#fbbf24" size={14} className="mt-0.5" />
                        <View className="flex-1">
                          <Text className="text-xs font-bold text-amber-200">
                            {evt.title}
                          </Text>
                          {Boolean(evt.notes) && (
                            <Text className="text-[11px] text-slate-400 mt-0.5">
                              {evt.notes}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View className="items-end space-y-1">
                        {evt.startDateTime?.includes('T') && (
                          <Text className="text-[10px] font-mono text-slate-400">
                            {evt.startDateTime.split('T')[1].slice(0, 5)}
                          </Text>
                        )}
                        <View className="px-1.5 py-0.5 rounded bg-amber-900/40 border border-amber-700/40">
                          <Text className="text-[9px] font-mono text-amber-300">
                            {evt.fixed ? (lang === 'es' ? 'Fijo' : 'Fixed') : (lang === 'es' ? 'Evento' : 'Event')}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}

                  {dayReservations.map((res) => (
                    <View
                      key={res.id}
                      className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-800/40 flex-row items-center justify-between"
                    >
                      <View className="flex-row items-center space-x-2 flex-1 mr-2">
                        <CheckCircle2 color="#34d399" size={14} />
                        <Text className="text-xs font-semibold text-emerald-200">
                          {res.name}
                        </Text>
                      </View>
                      {Boolean(res.bookingReference) && (
                        <Text className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                          Ref: {res.bookingReference}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* 4. Scheduled Activities or Free Day */}
              {activitiesCount > 0 ? (
                <View className="pt-1">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      {t.timeline.suggestedFlow}
                    </Text>
                    <Text className="text-[10px] font-mono text-slate-400">
                      {activitiesCount} {t.timeline.plannedActivities}
                    </Text>
                  </View>

                  {day.activities.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </View>
              ) : transitCount === 0 ? (
                <View className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 flex-row items-center space-x-2.5">
                  <Coffee color="#34d399" size={16} />
                  <Text className="text-xs text-slate-400 flex-1 leading-4">
                    {t.timeline.unstructuredDay}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};
