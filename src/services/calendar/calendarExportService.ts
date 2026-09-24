import { Trip, Destination, TransportationSegment } from '../../domain/types';

export interface CalendarEventOptions {
  title: string;
  description?: string;
  location?: string;
  startDate: string; // YYYY-MM-DD or YYYY-MM-DDTHH:mm or ISO string
  endDate?: string; // YYYY-MM-DD or YYYY-MM-DDTHH:mm or ISO string
  isAllDay?: boolean;
}

/**
 * Normalizes a date string into YYYYMMDD format for all-day Google Calendar events.
 * For all-day events, Google Calendar treats the end date as EXCLUSIVE.
 * If isEnd is true and it's an all-day event, we advance by 1 day.
 */
export function formatGCalAllDayDate(dateStr: string, isEnd = false): string {
  const cleanDate = dateStr.slice(0, 10);
  const parts = cleanDate.split('-').map(Number);
  const year = parts[0];
  const month = parts[1] - 1;
  const day = parts[2];

  const d = new Date(Date.UTC(year, month, day));
  if (isEnd) {
    d.setUTCDate(d.getUTCDate() + 1);
  }

  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/**
 * Normalizes a date string with time into YYYYMMDDTHHmmss format.
 */
export function formatGCalDateTime(dateStr: string, timeStr = '00:00'): string {
  const datePart = dateStr.slice(0, 10).replace(/-/g, '');
  let timePart = '000000';

  if (dateStr.includes('T')) {
    const timeMatch = dateStr.split('T')[1].slice(0, 5).replace(/:/g, '');
    timePart = `${timeMatch.padEnd(4, '0')}00`;
  } else if (timeStr) {
    const cleanTime = timeStr.replace(/:/g, '');
    timePart = `${cleanTime.padEnd(4, '0')}00`;
  }

  return `${datePart}T${timePart}`;
}

/**
 * Generates an official Google Calendar 1-click web URL to create an event.
 */
export function generateGoogleCalendarUrl(options: CalendarEventOptions): string {
  const isAllDay = options.isAllDay ?? !options.startDate.includes('T');
  let datesParam: string;

  if (isAllDay) {
    const start = formatGCalAllDayDate(options.startDate, false);
    const end = formatGCalAllDayDate(options.endDate || options.startDate, true);
    datesParam = `${start}/${end}`;
  } else {
    const start = formatGCalDateTime(options.startDate);
    const end = options.endDate
      ? formatGCalDateTime(options.endDate)
      : formatGCalDateTime(options.startDate, '01:00');
    datesParam = `${start}/${end}`;
  }

  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', options.title);
  url.searchParams.set('dates', datesParam);

  if (options.description) {
    url.searchParams.set('details', options.description);
  }

  if (options.location) {
    url.searchParams.set('location', options.location);
  }

  return url.toString();
}

/**
 * Generates a Google Calendar URL for the entire trip as a master overview event.
 */
export function generateMasterTripGoogleCalendarUrl(trip: Trip): string {
  const stopsList = trip.destinations.map((d, i) => `${i + 1}. ${d.name}`).join('\n');
  const durationDays = trip.itinerary?.days?.length || trip.destinations.length;

  const description = [
    `🗺️ Itinerario Completo: ${trip.name}`,
    `🗓️ Fechas: ${trip.startDate} → ${trip.endDate} (${durationDays} días)`,
    '',
    '📍 Paradas del viaje:',
    stopsList,
    '',
    `🚆 Trayectos de transporte: ${trip.transportation.length}`,
    '',
    '✨ Creado y optimizado con Travel Optimizer (Trust the Detour)',
    'https://travel-optimizer-tau.vercel.app',
  ].join('\n');

  const location = trip.destinations.length > 0
    ? trip.destinations.map((d) => d.name).join(' → ')
    : 'Europa';

  return generateGoogleCalendarUrl({
    title: `✈️ Viaje: ${trip.name}`,
    startDate: trip.startDate,
    endDate: trip.endDate,
    isAllDay: true,
    description,
    location,
  });
}

/**
 * Generates a Google Calendar URL for a specific destination stay.
 */
export function generateDestinationStayGoogleCalendarUrl(
  trip: Trip,
  destination: Destination,
  destIndex: number
): string {
  // Find matching days in itinerary
  const matchingDays = trip.itinerary?.days?.filter((d) => d.destinationId === destination.id) || [];
  const startDate = matchingDays[0]?.date || destination.arrivalDate || trip.startDate;
  const endDate = matchingDays[matchingDays.length - 1]?.date || destination.departureDate || startDate;

  const activities = matchingDays.flatMap((d) => d.activities || []);
  const activitiesText = activities.length > 0
    ? `\n🎯 Actividades sugeridas:\n${activities.map((a: any) => `• ${a.title || a.name}`).join('\n')}`
    : '';

  const locationStr = destination.location?.name
    ? `${destination.location.name}${destination.location.country ? `, ${destination.location.country}` : ''}`
    : destination.name;

  const description = [
    `📍 Parada #${destIndex + 1}: ${destination.name}`,
    `Duración: ${destination.plannedNights || matchingDays.length || 1} noches`,
    activitiesText,
    '',
    `Viaje: ${trip.name}`,
    'https://travel-optimizer-tau.vercel.app',
  ].filter(Boolean).join('\n');

  return generateGoogleCalendarUrl({
    title: `📍 Estancia en ${destination.name} (${destination.plannedNights || matchingDays.length || 1} noches)`,
    startDate,
    endDate,
    isAllDay: true,
    description,
    location: locationStr,
  });
}

/**
 * Returns an appropriate emoji for transport mode.
 */
function getTransportEmoji(mode: string): string {
  switch (mode?.toLowerCase()) {
    case 'flight':
      return '✈️';
    case 'train':
      return '🚆';
    case 'bus':
      return '🚌';
    case 'car':
      return '🚗';
    case 'ferry':
      return '⛴️';
    default:
      return '🚀';
  }
}

/**
 * Generates a Google Calendar URL for a transportation segment.
 */
export function generateTransitGoogleCalendarUrl(segment: TransportationSegment): string {
  const emoji = getTransportEmoji(segment.mode);
  const modeName = segment.mode === 'flight' ? 'Vuelo' : segment.mode === 'train' ? 'Tren' : segment.mode === 'bus' ? 'Autobús' : 'Traslado';
  const title = `${emoji} ${modeName}: ${segment.from.name} → ${segment.to.name}`;

  const date = segment.date || new Date().toISOString().slice(0, 10);
  const depTime = segment.departureTime || '09:00';
  const arrTime = segment.arrivalTime || (segment.estimatedDurationMinutes ? formatAddMinutes(depTime, segment.estimatedDurationMinutes) : '12:00');

  const startIso = `${date}T${depTime}:00`;
  const endIso = `${date}T${arrTime}:00`;

  const detailsList = [
    `${emoji} Trayecto: ${segment.from.name} → ${segment.to.name}`,
    segment.operatorOrRoute ? `Operador: ${segment.operatorOrRoute}` : undefined,
    segment.distanceKm ? `Distancia: ${segment.distanceKm} km` : undefined,
    segment.estimatedDurationMinutes ? `Duración estimada: ${Math.floor(segment.estimatedDurationMinutes / 60)}h ${segment.estimatedDurationMinutes % 60}m` : undefined,
    segment.bookingRef ? `Localizador / Reserva: ${segment.bookingRef}` : undefined,
    segment.notes ? `Notas: ${segment.notes}` : undefined,
  ].filter(Boolean).join('\n');

  return generateGoogleCalendarUrl({
    title,
    startDate: startIso,
    endDate: endIso,
    isAllDay: false,
    description: detailsList,
    location: `${segment.from.name} → ${segment.to.name}`,
  });
}

function formatAddMinutes(timeStr: string, minutes: number): string {
  const [hh, mm] = timeStr.split(':').map(Number);
  const total = hh * 60 + mm + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

/**
 * Escapes characters for iCalendar (RFC 5545) text fields.
 */
function escapeIcsText(str: string): string {
  return (str || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Formats a Date object or ISO string to iCalendar UTC timestamp: YYYYMMDDTHHmmssZ
 */
export function formatIcsTimestamp(d: Date = new Date()): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}T${hh}${min}${ss}Z`;
}

/**
 * Formats an all-day date for iCalendar (VALUE=DATE:YYYYMMDD)
 * For RFC 5545, DTEND is exclusive.
 */
function formatIcsAllDay(dateStr: string, isEnd = false): string {
  return formatGCalAllDayDate(dateStr, isEnd);
}

/**
 * Builds standard RFC 5545 iCalendar (.ics) file string representing the entire trip.
 */
export function generateTripIcsContent(trip: Trip): string {
  const nowUtc = formatIcsTimestamp(new Date());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Travel Optimizer//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(trip.name)}`,
    `X-WR-CALDESC:${escapeIcsText('Itinerario completo generado con Travel Optimizer')}`,
    'X-WR-TIMEZONE:UTC',
  ];

  // 1. Master Trip Event
  const masterSummary = `✈️ Viaje: ${trip.name}`;
  const stopsSummary = trip.destinations.map((d, i) => `${i + 1}. ${d.name}`).join('\\n');
  const masterDesc = `Itinerario completo de viaje: ${trip.name}\\nFechas: ${trip.startDate} a ${trip.endDate}\\n\\nParadas:\\n${stopsSummary}\\n\\nGenerado con Travel Optimizer: https://travel-optimizer-tau.vercel.app`;
  const masterLocation = trip.destinations.map((d) => d.name).join(' → ') || 'Europa';

  lines.push('BEGIN:VEVENT');
  lines.push(`UID:trip-master-${trip.id}@travel-optimizer`);
  lines.push(`DTSTAMP:${nowUtc}`);
  lines.push(`DTSTART;VALUE=DATE:${formatIcsAllDay(trip.startDate, false)}`);
  lines.push(`DTEND;VALUE=DATE:${formatIcsAllDay(trip.endDate, true)}`);
  lines.push(`SUMMARY:${escapeIcsText(masterSummary)}`);
  lines.push(`DESCRIPTION:${escapeIcsText(masterDesc)}`);
  lines.push(`LOCATION:${escapeIcsText(masterLocation)}`);
  lines.push('STATUS:CONFIRMED');
  lines.push('TRANSP:TRANSPARENT');
  lines.push('END:VEVENT');

  // 2. City Stays
  trip.destinations.forEach((dest, idx) => {
    const days = trip.itinerary?.days?.filter((d) => d.destinationId === dest.id) || [];
    const start = days[0]?.date || dest.arrivalDate || trip.startDate;
    const end = days[days.length - 1]?.date || dest.departureDate || start;
    const nights = dest.plannedNights || days.length || 1;

    const activities = days.flatMap((d) => d.activities || []);
    const acts = activities.length > 0 ? `\\nActividades sugeridas:\\n${activities.map((a: any) => `• ${a.title || a.name}`).join('\\n')}` : '';
    const desc = `Estancia en ${dest.name} (${nights} noches)\\nViaje: ${trip.name}${acts}`;
    const loc = dest.location?.name ? `${dest.location.name}${dest.location.country ? `, ${dest.location.country}` : ''}` : dest.name;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:stay-${dest.id}-${idx}@travel-optimizer`);
    lines.push(`DTSTAMP:${nowUtc}`);
    lines.push(`DTSTART;VALUE=DATE:${formatIcsAllDay(start, false)}`);
    lines.push(`DTEND;VALUE=DATE:${formatIcsAllDay(end, true)}`);
    lines.push(`SUMMARY:${escapeIcsText(`📍 ${dest.name} (${nights} noches)`)}`);
    lines.push(`DESCRIPTION:${escapeIcsText(desc)}`);
    lines.push(`LOCATION:${escapeIcsText(loc)}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('TRANSP:TRANSPARENT');
    lines.push('END:VEVENT');
  });

  // 3. Transportation Segments
  trip.transportation.forEach((seg, idx) => {
    const date = seg.date || trip.startDate;
    const dep = seg.departureTime || '09:00';
    const arr = seg.arrivalTime || '12:00';
    const startStr = `${date.replace(/-/g, '')}T${dep.replace(/:/g, '')}00`;
    const endStr = `${date.replace(/-/g, '')}T${arr.replace(/:/g, '')}00`;

    const emoji = getTransportEmoji(seg.mode);
    const modeName = seg.mode === 'flight' ? 'Vuelo' : seg.mode === 'train' ? 'Tren' : seg.mode === 'bus' ? 'Autobús' : 'Traslado';
    const summary = `${emoji} ${modeName}: ${seg.from.name} → ${seg.to.name}`;

    const descParts = [
      `Trayecto: ${seg.from.name} a ${seg.to.name}`,
      seg.operatorOrRoute ? `Operador: ${seg.operatorOrRoute}` : undefined,
      seg.distanceKm ? `Distancia: ${seg.distanceKm} km` : undefined,
      seg.estimatedDurationMinutes ? `Duración estimada: ${Math.floor(seg.estimatedDurationMinutes / 60)}h ${seg.estimatedDurationMinutes % 60}m` : undefined,
      seg.bookingRef ? `Reserva: ${seg.bookingRef}` : undefined,
    ].filter(Boolean).join('\\n');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:transit-${seg.id || idx}@travel-optimizer`);
    lines.push(`DTSTAMP:${nowUtc}`);
    lines.push(`DTSTART:${startStr}`);
    lines.push(`DTEND:${endStr}`);
    lines.push(`SUMMARY:${escapeIcsText(summary)}`);
    lines.push(`DESCRIPTION:${escapeIcsText(descParts)}`);
    lines.push(`LOCATION:${escapeIcsText(`${seg.from.name} → ${seg.to.name}`)}`);
    lines.push('STATUS:CONFIRMED');

    // Add alarm reminder 1 hour prior to departure
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-PT60M');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:${escapeIcsText(`Recordatorio: ${summary} en 1 hora`)}`);
    lines.push('END:VALARM');

    lines.push('END:VEVENT');
  });

  // 4. Fixed Events & Reservations
  if (Array.isArray(trip.events)) {
    trip.events.forEach((evt, idx) => {
      const startClean = evt.startDateTime.replace(/[-:]/g, '').slice(0, 15);
      const endClean = evt.endDateTime ? evt.endDateTime.replace(/[-:]/g, '').slice(0, 15) : startClean;

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:event-${evt.id || idx}@travel-optimizer`);
      lines.push(`DTSTAMP:${nowUtc}`);
      lines.push(`DTSTART:${startClean}`);
      lines.push(`DTEND:${endClean}`);
      lines.push(`SUMMARY:${escapeIcsText(`🎟️ ${evt.title}`)}`);
      lines.push(`DESCRIPTION:${escapeIcsText(evt.notes || 'Evento confirmado')}`);
      if (evt.location?.name) {
        lines.push(`LOCATION:${escapeIcsText(evt.location.name)}`);
      }
      lines.push('STATUS:CONFIRMED');
      lines.push('END:VEVENT');
    });
  }

  lines.push('END:VCALENDAR');

  // RFC 5545 requires CRLF line endings
  return lines.join('\r\n');
}

/**
 * Triggers client-side browser download of the full trip .ics file.
 */
export function downloadTripIcsFile(trip: Trip): void {
  if (typeof window === 'undefined') return;

  const icsContent = generateTripIcsContent(trip);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const filename = `${trip.name.toLowerCase().replace(/[^a-z0-9]/gi, '_')}_calendar.ics`;

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Returns direct URL to Google Calendar import settings page.
 */
export function getGoogleCalendarImportUrl(): string {
  return 'https://calendar.google.com/calendar/u/0/r/settings/export';
}
