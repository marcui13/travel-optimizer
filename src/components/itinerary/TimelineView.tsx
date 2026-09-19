import React, { useRef, useEffect } from 'react';
import {
  Trip,
  TransportationSegment,
  Activity,
  ConfidenceLevel,
} from '../../domain/types';
import { useI18n } from '../../i18n/I18nContext';
import {
  Train,
  Plane,
  Car,
  Bus,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Building,
  MapPin,
  Coffee,
  Ticket,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface TimelineViewProps {
  trip: Trip;
  selectedDestinationId?: string | null;
  selectedSegmentId?: string | null;
  selectedDayDate?: string | null;
  onSelectDay?: (date: string, destinationId?: string) => void;
  onSelectDestination?: (destId: string) => void;
  onSelectSegment?: (segmentId: string) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  trip,
  selectedDestinationId,
  selectedSegmentId,
  selectedDayDate,
  onSelectDay,
  onSelectDestination,
  onSelectSegment,
}) => {
  const { t, dateLocale } = useI18n();
  const dayRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Scroll to selected day if triggered from map or elsewhere
  useEffect(() => {
    if (selectedDayDate && dayRefs.current.has(selectedDayDate)) {
      const el = dayRefs.current.get(selectedDayDate);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedDayDate]);

  if (trip.itinerary.days.length === 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl flex flex-col items-center justify-center space-y-3"
      >
        <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
          <Clock className="w-6 h-6 text-slate-400" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h3 className="text-sm font-semibold text-slate-200">
            {t.timeline.noDaysTitle}
          </h3>
          <p className="text-xs text-slate-400">
            {t.timeline.noDaysDesc}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12">
      {trip.itinerary.days.map((day) => {
        const isSelectedDay = day.date === selectedDayDate;
        const isSelectedDest = day.destinationId === selectedDestinationId;
        const dayEvents = trip.events.filter((e) => e.startDateTime.startsWith(day.date));
        const dayReservations = trip.reservations.filter((r) => r.startDateTime?.startsWith(day.date));

        // Format nice localized date e.g. "Sáb, 26 sep 2026" or "Sat, Sep 26, 2026"
        let formattedDate = day.date;
        let dayOfWeek = '';
        try {
          const parsed = parseISO(day.date);
          formattedDate = format(parsed, 'MMM d, yyyy', { locale: dateLocale });
          dayOfWeek = format(parsed, 'EEEE', { locale: dateLocale });
        } catch {
          // ignore
        }

        return (
          <div
            key={day.date}
            ref={(el) => {
              if (el) dayRefs.current.set(day.date, el);
              else dayRefs.current.delete(day.date);
            }}
            tabIndex={0}
            role="button"
            aria-label={`${t.timeline.day} ${day.dayNumber}: ${day.location?.name || t.timeline.inTransit} - ${formattedDate}`}
            onClick={() => onSelectDay?.(day.date, day.destinationId)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectDay?.(day.date, day.destinationId);
              }
            }}
            className={`group relative rounded-xl transition-all duration-200 border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              isSelectedDay
                ? 'bg-slate-900 border-emerald-500/80 ring-2 ring-emerald-500/20 shadow-xl'
                : isSelectedDest
                ? 'bg-slate-900/90 border-emerald-500/40 shadow-md'
                : 'bg-slate-900/60 hover:bg-slate-900/90 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            {/* Day Header Bar */}
            <div className="p-4 pb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center font-mono font-bold text-xs shadow-inner ${
                    day.isTravelDay
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-slate-800 text-slate-200 border border-slate-700'
                  }`}
                >
                  <span className="text-[10px] text-slate-400 -mb-1">{t.timeline.day}</span>
                  <span>{day.dayNumber}</span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-100 text-sm capitalize">
                      {formattedDate}
                    </h3>
                    <span className="text-xs text-slate-400 capitalize">• {dayOfWeek}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (day.destinationId) onSelectDestination?.(day.destinationId);
                      }}
                      className="font-medium hover:text-emerald-300 hover:underline"
                    >
                      {day.location?.name || t.timeline.inTransit}
                    </button>
                    {day.location?.country && (
                      <span className="text-slate-500">, {day.location.country}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Day Badges */}
              <div className="flex items-center gap-1.5">
                {day.isTravelDay && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-950/80 text-blue-300 border border-blue-800/60">
                    <Train className="w-3 h-3" />
                    {t.timeline.travelDay}
                  </span>
                )}
                {dayEvents.some((e) => e.fixed) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-950/80 text-amber-300 border border-amber-800/60">
                    <Ticket className="w-3 h-3" />
                    {t.timeline.fixedCommitment}
                  </span>
                )}
              </div>
            </div>

            {/* Day Body Content */}
            <div className="p-4 space-y-3">
              {/* 1. Transportation Segment */}
              {day.transportation && day.transportation.length > 0 && (
                <div className="space-y-2">
                  {day.transportation.map((seg) => (
                    <TransitSegmentCard
                      key={seg.id}
                      segment={seg}
                      isSelected={seg.id === selectedSegmentId}
                      onSelect={() => onSelectSegment?.(seg.id)}
                    />
                  ))}
                </div>
              )}

              {/* 2. Accommodation Notice on arrival day */}
              {day.accommodation && day.isTravelDay && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-medium text-slate-200">
                        {t.timeline.checkIn}: {day.accommodation.name}
                      </span>
                      <span className="text-slate-500 ml-2">
                        ({day.accommodation.nightsCount} {t.common.nights.toLowerCase()})
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                    {t.timeline.baseCamp}
                  </span>
                </div>
              )}

              {/* 3. Fixed Events & Confirmed Reservations */}
              {(dayEvents.length > 0 || dayReservations.length > 0) && (
                <div className="space-y-1.5">
                  {dayEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="flex items-start justify-between p-2 rounded-lg bg-amber-950/20 border border-amber-800/40 text-xs"
                    >
                      <div className="flex items-start gap-2">
                        <Ticket className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-semibold text-amber-200">{evt.title}</p>
                          {evt.notes && <p className="text-slate-400 text-[11px]">{evt.notes}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {evt.startDateTime.includes('T') && (
                          <span className="font-mono text-slate-300">
                            {evt.startDateTime.split('T')[1].slice(0, 5)}
                          </span>
                        )}
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-900/60 text-amber-300 border border-amber-700/60">
                          {evt.fixed ? 'Hard' : 'Event'}
                        </span>
                      </div>
                    </div>
                  ))}

                  {dayReservations.map((res) => (
                    <div
                      key={res.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="font-medium text-emerald-200">{res.name}</span>
                      </div>
                      {res.bookingReference && (
                        <span className="font-mono text-[10px] text-slate-400">
                          Ref: {res.bookingReference}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 4. Scheduled Activities */}
              {day.activities.length > 0 ? (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1">
                    <span>{t.timeline.suggestedFlow}</span>
                    <span>
                      {day.activities.length} {t.timeline.plannedActivities}
                    </span>
                  </div>

                  {day.activities.map((act) => (
                    <ActivityRow key={act.id} activity={act} optionalLabel={t.timeline.optional} />
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/40 text-xs text-slate-400 flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{t.timeline.unstructuredDay}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface TransitSegmentCardProps {
  segment: TransportationSegment;
  isSelected?: boolean;
  onSelect?: () => void;
}

const TransitSegmentCard: React.FC<TransitSegmentCardProps> = ({
  segment,
  isSelected,
  onSelect,
}) => {
  const isFlight = segment.mode === 'flight';
  const isTrain = segment.mode === 'train';

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
      className={`p-3 rounded-lg border transition-all cursor-pointer ${
        isSelected
          ? 'bg-emerald-950/50 border-emerald-500 ring-1 ring-emerald-500/40'
          : 'bg-slate-950/80 hover:bg-slate-950 border-slate-800 hover:border-slate-700'
      }`}
    >
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-medium text-slate-200">
          {isFlight ? (
            <Plane className="w-4 h-4 text-blue-400 shrink-0" />
          ) : isTrain ? (
            <Train className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : segment.mode === 'bus' ? (
            <Bus className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <Car className="w-4 h-4 text-purple-400 shrink-0" />
          )}
          <span>
            {segment.from.name} → {segment.to.name}
          </span>
        </div>

        <div className="flex items-center gap-3 text-slate-400 text-[11px]">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>
              {Math.floor((segment.estimatedDurationMinutes || 0) / 60)}h{' '}
              {(segment.estimatedDurationMinutes || 0) % 60}m
            </span>
          </div>
          <span className="font-mono text-slate-500">{segment.distanceKm} km</span>
        </div>
      </div>

      {segment.operatorOrRoute && (
        <p className="mt-1.5 text-[11px] text-slate-400 pl-6 leading-relaxed">
          {segment.operatorOrRoute}
        </p>
      )}
    </div>
  );
};

const ActivityRow: React.FC<{ activity: Activity; optionalLabel: string }> = ({
  activity,
  optionalLabel,
}) => {
  return (
    <div className="flex items-start justify-between p-2 rounded-md hover:bg-slate-800/40 text-xs transition-colors">
      <div className="flex items-start gap-2.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-200">{activity.title}</span>
            {activity.isOptional && (
              <span className="text-[10px] text-slate-500 italic">{optionalLabel}</span>
            )}
          </div>
          {activity.description && (
            <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
              {activity.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-3 text-[11px]">
        {activity.time && (
          <span className="font-mono text-slate-400">{activity.time}</span>
        )}
        <ConfidenceBadge confidence={activity.confidence} />
      </div>
    </div>
  );
};

const ConfidenceBadge: React.FC<{ confidence?: ConfidenceLevel }> = ({
  confidence = 'medium',
}) => {
  const { t } = useI18n();

  if (confidence === 'high') {
    return (
      <span
        title={t.common.verified}
        className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
      >
        {t.common.verified}
      </span>
    );
  }
  if (confidence === 'low') {
    return (
      <span
        title={t.common.verify}
        className="px-1.5 py-0.2 rounded text-[10px] bg-amber-950/60 text-amber-400 border border-amber-800/40 flex items-center gap-0.5"
      >
        <AlertCircle className="w-2.5 h-2.5" />
        {t.common.verify}
      </span>
    );
  }
  return (
    <span
      title={t.common.aiSuggestion}
      className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700/60 flex items-center gap-0.5"
    >
      <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
      {t.common.aiSuggestion}
    </span>
  );
};
