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
    <div className="relative pl-4 sm:pl-7 space-y-3 sm:space-y-4 pb-12 before:absolute before:top-4 before:bottom-6 before:left-[7px] sm:before:left-[13px] before:w-0.5 before:bg-slate-800">
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
                ? 'bg-slate-900 border-emerald-500/80 ring-2 ring-emerald-500/20 shadow-lg'
                : isSelectedDest
                ? 'bg-slate-900/90 border-emerald-500/40 shadow-sm'
                : 'bg-slate-900/60 hover:bg-slate-900/90 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            {/* Route Spine Node on the left line */}
            <div
              aria-hidden="true"
              className={`absolute -left-[14px] sm:-left-[21px] top-3.5 sm:top-4 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border-2 z-10 transition-colors ${
                isSelectedDay
                  ? 'bg-emerald-400 border-emerald-300 ring-4 ring-emerald-500/20'
                  : isSelectedDest
                  ? 'bg-emerald-500/80 border-emerald-400'
                  : day.isTravelDay
                  ? 'bg-slate-900 border-emerald-500'
                  : 'bg-slate-900 border-slate-600 group-hover:border-slate-400'
              }`}
            />

            {/* Day Header Bar */}
            <div className="p-3 sm:p-4 pb-2.5 sm:pb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-md flex flex-col items-center justify-center font-mono font-bold text-xs border shrink-0 ${
                    day.isTravelDay
                      ? 'bg-slate-800 text-emerald-400 border-emerald-700/60'
                      : 'bg-slate-800/70 text-slate-200 border-slate-700/60'
                  }`}
                >
                  <span className="text-[8px] sm:text-[9px] text-slate-400 uppercase tracking-wider leading-none mb-0.5">{t.timeline.day}</span>
                  <span className="text-xs sm:text-sm leading-none">{day.dayNumber}</span>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <h3 className="font-semibold text-slate-100 text-xs sm:text-sm capitalize truncate">
                      {formattedDate}
                    </h3>
                    <span className="text-[11px] sm:text-xs text-slate-400 capitalize shrink-0">• {dayOfWeek}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-300 mt-0.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (day.destinationId) onSelectDestination?.(day.destinationId);
                      }}
                      className="font-medium hover:text-emerald-300 hover:underline truncate"
                    >
                      {day.location?.name || t.timeline.inTransit}
                    </button>
                    {day.location?.country && (
                      <span className="text-slate-500 shrink-0">, {day.location.country}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Day Badges */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                {day.isTravelDay && (
                  <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-medium bg-slate-800 text-sky-300 border border-slate-700">
                    <Train className="w-3 h-3" />
                    <span className="hidden xs:inline">{t.timeline.travelDay}</span>
                    <span className="xs:hidden">Viaje</span>
                  </span>
                )}
                {dayEvents.some((e) => e.fixed) && (
                  <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-medium bg-slate-800 text-amber-300 border border-slate-700">
                    <Ticket className="w-3 h-3" />
                    <span className="hidden xs:inline">{t.timeline.fixedCommitment}</span>
                    <span className="xs:hidden">Fijo</span>
                  </span>
                )}
              </div>
            </div>

            {/* Day Body Content */}
            <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
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
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80 text-xs">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-medium text-slate-200">
                        {t.timeline.checkIn}: {day.accommodation.name}
                      </span>
                      <span className="text-slate-400 font-mono text-[11px] ml-2">
                        ({day.accommodation.nightsCount} {t.common.nights.toLowerCase()})
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-slate-800/80 border border-slate-700 px-2 py-0.5 rounded uppercase tracking-wider">
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
                      className="flex items-start justify-between p-2.5 rounded-lg bg-amber-950/15 border border-amber-800/30 text-xs"
                    >
                      <div className="flex items-start gap-2">
                        <Ticket className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium text-amber-200">{evt.title}</p>
                          {evt.notes && <p className="text-slate-400 text-[11px] mt-0.5">{evt.notes}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {evt.startDateTime.includes('T') && (
                          <span className="font-mono text-slate-400 text-[11px]">
                            {evt.startDateTime.split('T')[1].slice(0, 5)}
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-900/30 text-amber-300 border border-amber-700/40">
                          {evt.fixed ? 'Fijo' : 'Evento'}
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
                    <span className="font-mono">
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
      className={`p-2.5 sm:p-3 rounded-lg border transition-all cursor-pointer ${
        isSelected
          ? 'bg-emerald-950/40 border-emerald-500/70 ring-1 ring-emerald-500/30 text-emerald-200'
          : 'bg-slate-950/60 hover:bg-slate-950 border-slate-800/80 hover:border-slate-700 text-slate-200'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 text-xs">
        <div className="flex items-center gap-1.5 sm:gap-2 font-medium tracking-tight min-w-0">
          <span className="p-1 rounded bg-slate-800 text-slate-300 border border-slate-700/60 shrink-0">
            {isFlight ? (
              <Plane className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            ) : isTrain ? (
              <Train className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : segment.mode === 'bus' ? (
              <Bus className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <Car className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            )}
          </span>
          <span className="font-semibold text-slate-100 truncate">{segment.from.name}</span>
          <span className="text-slate-500 shrink-0">→</span>
          <span className="font-semibold text-slate-100 truncate">{segment.to.name}</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 text-slate-400 text-[10px] sm:text-[11px] font-mono shrink-0 ml-auto">
          <div className="flex items-center gap-1 text-slate-300">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>
              {Math.floor((segment.estimatedDurationMinutes || 0) / 60)}h{' '}
              {(segment.estimatedDurationMinutes || 0) % 60}m
            </span>
          </div>
          <span className="text-slate-500">•</span>
          <span>{segment.distanceKm} km</span>
        </div>
      </div>

      {segment.operatorOrRoute && (
        <div className="mt-1.5 pt-1.5 border-t border-slate-800/50 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400">
          <span className="text-slate-400 font-mono text-[9px] sm:text-[10px] uppercase tracking-wider">{segment.operatorOrRoute}</span>
          {segment.departureTime && (
            <span className="font-mono text-slate-500">
              {segment.departureTime} {segment.arrivalTime ? `→ ${segment.arrivalTime}` : ''}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

const ActivityRow: React.FC<{ activity: Activity; optionalLabel: string }> = ({
  activity,
  optionalLabel,
}) => {
  return (
    <div className="flex items-start justify-between p-2 rounded-md hover:bg-slate-800/30 text-xs transition-colors border border-transparent hover:border-slate-800">
      <div className="flex items-start gap-2.5">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1.5 shrink-0" />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-200">{activity.title}</span>
            {activity.isOptional && (
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">({optionalLabel})</span>
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
        className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800/80 text-emerald-400 border border-slate-700"
      >
        {t.common.verified}
      </span>
    );
  }
  if (confidence === 'low') {
    return (
      <span
        title={t.common.verify}
        className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-950/40 text-amber-300 border border-amber-800/50 flex items-center gap-1"
      >
        <AlertCircle className="w-2.5 h-2.5" />
        {t.common.verify}
      </span>
    );
  }
  return (
    <span
      title={t.common.aiSuggestion}
      className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800/60 text-slate-400 border border-slate-700/50 flex items-center gap-1"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      {t.common.aiSuggestion}
    </span>
  );
};
