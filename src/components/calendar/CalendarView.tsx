import React from 'react';
import { Trip } from '../../domain/types';
import { useI18n } from '../../i18n/I18nContext';
import { Train, Ticket, MapPin, Calendar as CalendarIcon } from 'lucide-react';
import { parseISO, format } from 'date-fns';

interface CalendarViewProps {
  trip: Trip;
  selectedDayDate?: string | null;
  onSelectDay?: (date: string, destinationId?: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  trip,
  selectedDayDate,
  onSelectDay,
}) => {
  const { t, dateLocale } = useI18n();
  const days = trip.itinerary.days;

  if (days.length === 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="bg-slate-900/60 border border-slate-800 rounded-xl p-12 text-center flex flex-col items-center justify-center space-y-3"
      >
        <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
          <CalendarIcon className="w-6 h-6 text-slate-400" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h3 className="text-sm font-semibold text-slate-200">
            {t.calendar.noDaysTitle}
          </h3>
          <p className="text-xs text-slate-400">
            {t.calendar.noDaysDesc}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 sm:p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-800">
        <div>
          <h3 className="font-semibold text-slate-100 text-sm">{t.calendar.monthlyGrid}</h3>
          <p className="text-xs text-slate-400">
            {trip.startDate} to {trip.endDate} • {days.length} {t.calendar.totalDays}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-emerald-600/40 border border-emerald-500"></span>{' '}
            {t.calendar.stay}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-blue-600/40 border border-blue-500"></span>{' '}
            {t.calendar.transit}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-amber-600/40 border border-amber-500"></span>{' '}
            {t.calendar.commitment}
          </span>
        </div>
      </div>

      {/* Grid of days */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {days.map((day) => {
          const isSelected = day.date === selectedDayDate;
          const dayEvents = trip.events.filter((e) => e.startDateTime.startsWith(day.date));
          const hasFixedEvent = dayEvents.some((e) => e.fixed);

          let dayNum = day.dayNumber;
          let dateFormatted = day.date;
          let dayName = '';
          try {
            const parsed = parseISO(day.date);
            dateFormatted = format(parsed, 'MMM d', { locale: dateLocale });
            dayName = format(parsed, 'EEE', { locale: dateLocale });
          } catch {
            // ignore
          }

          return (
            <div
              key={day.date}
              tabIndex={0}
              role="button"
              aria-label={`${t.timeline.day} ${dayNum}: ${day.location?.name || t.timeline.inTransit} - ${dateFormatted}`}
              onClick={() => onSelectDay?.(day.date, day.destinationId)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectDay?.(day.date, day.destinationId);
                }
              }}
              className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between min-h-[105px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                isSelected
                  ? 'bg-slate-800 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg'
                  : 'bg-slate-950/70 hover:bg-slate-900 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs pb-1">
                  <span className="font-semibold text-slate-200 capitalize">{dateFormatted}</span>
                  <span className="text-[10px] text-slate-500 font-mono">D{dayNum}</span>
                </div>
                <span className="text-[10px] text-slate-400 capitalize">{dayName}</span>

                {/* City location badge */}
                <div className="mt-1.5 flex items-center gap-1 text-xs">
                  <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="font-medium text-slate-300 truncate">
                    {day.location?.name || t.timeline.inTransit}
                  </span>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/60">
                <span className="text-slate-500 text-[10px]">
                  {day.activities.length} {t.calendar.activitiesShort}
                </span>

                <div className="flex items-center gap-1">
                  {day.isTravelDay && (
                    <span title={t.timeline.travelDay} className="text-blue-400">
                      <Train className="w-3 h-3" />
                    </span>
                  )}
                  {hasFixedEvent && (
                    <span title={t.timeline.fixedCommitment} className="text-amber-400">
                      <Ticket className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
