import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import {
  Trip,
  Destination,
  ItineraryDay,
  TransportationSegment,
  Activity,
  Accommodation,
  Location,
} from './types';
import { estimateTransportation, resolveLocationAsync } from '../services/geocoding/geocodingService';

/**
 * Creates an array of date strings 'YYYY-MM-DD' from start to end inclusive.
 */
export function generateDateRange(startDateStr: string, endDateStr: string): string[] {
  try {
    const start = parseISO(startDateStr);
    const end = parseISO(endDateStr);
    const daysCount = differenceInCalendarDays(end, start);
    if (daysCount < 0) return [startDateStr];

    const dates: string[] = [];
    for (let i = 0; i <= daysCount; i++) {
      dates.push(format(addDays(start, i), 'yyyy-MM-dd'));
    }
    return dates;
  } catch {
    return [startDateStr];
  }
}

/**
 * Generates an Itinerary with day-by-day structure based on ordered destinations,
 * nights per destination, start date, and transportation segments.
 */
export function buildItineraryFromDestinations(
  destinations: Destination[],
  startDate: string,
  endDate: string,
  existingDays?: ItineraryDay[],
  preferTrain = true
): { itineraryDays: ItineraryDay[]; transportationSegments: TransportationSegment[] } {
  const dates = generateDateRange(startDate, endDate);
  const segments: TransportationSegment[] = [];
  const days: ItineraryDay[] = [];

  if (destinations.length === 0 || dates.length === 0) {
    return { itineraryDays: [], transportationSegments: [] };
  }

  // Calculate total nights needed vs available days
  const availableNights = dates.length > 1 ? dates.length - 1 : 1;

  // Distribute nights proportionately or allocate strictly
  let runningDateIndex = 0;
  let prevDest: Destination | null = null;

  destinations.forEach((dest, destIndex) => {
    let nights = dest.plannedNights ?? dest.minimumNights ?? 2;
    // Scale or cap if needed to fit date range
    if (destIndex === destinations.length - 1) {
      // Last destination gets remaining nights
      nights = Math.max(1, availableNights - runningDateIndex);
    }

    const arrivalDate = dates[Math.min(runningDateIndex, dates.length - 1)];
    const depIndex = Math.min(runningDateIndex + nights, dates.length - 1);
    const departureDate = dates[depIndex];

    dest.arrivalDate = arrivalDate;
    dest.departureDate = departureDate;
    dest.plannedNights = nights;

    // Build transportation segment from previous destination to this destination
    if (prevDest && prevDest.location && dest.location) {
      const transitEstimate = estimateTransportation(
        prevDest.location,
        dest.location,
        preferTrain
      );

      const segmentId = `trans-${prevDest.id}-${dest.id}`;
      segments.push({
        id: segmentId,
        from: prevDest.location,
        to: dest.location,
        date: arrivalDate,
        departureTime: '09:30',
        arrivalTime: formatArrivalTime('09:30', transitEstimate.durationMinutes),
        mode: transitEstimate.mode,
        estimatedDurationMinutes: transitEstimate.durationMinutes,
        distanceKm: transitEstimate.distanceKm,
        source: 'estimated',
        operatorOrRoute: transitEstimate.description,
      });
    }

    const isLastDest = destIndex === destinations.length - 1;
    const daysToGenerate = isLastDest
      ? Math.max(nights, dates.length - runningDateIndex)
      : nights;

    // Assign days for this destination
    for (let i = 0; i < daysToGenerate; i++) {
      const dateIdx = runningDateIndex + i;
      if (dateIdx >= dates.length) break;

      const dayDate = dates[dateIdx];
      const isFirstDayInCity = i === 0;
      const isTravelDay = isFirstDayInCity && destIndex > 0;
      const isFinalDepartureDay = isLastDest && i === daysToGenerate - 1 && daysToGenerate > nights;

      // Check if there are existing activities or notes from previous state to preserve
      const existingDay = existingDays?.find((d) => d.date === dayDate);

      const dayTransit = isTravelDay && segments.length > 0 ? [segments[segments.length - 1]] : undefined;

      const activities: Activity[] = existingDay?.activities || (
        isFinalDepartureDay
          ? [
              {
                id: `act-${dest.name.toLowerCase()}-depart`,
                title: `Hotel Check-out & Departure from ${dest.name}`,
                time: '11:00',
                durationMinutes: 60,
                category: 'transit',
                description: 'Final packing, airport/train station transfer, and trip conclusion.',
                source: 'ai',
                confidence: 'high',
              },
            ]
          : generateDefaultActivitiesForCity(dest.name, i + 1, isTravelDay)
      );

      const accommodation: Accommodation = {
        id: `acc-${dest.id}`,
        name: `Hotel ${dest.name} Central / Boutique Stay`,
        location: dest.location,
        checkInDate: arrivalDate,
        checkOutDate: departureDate,
        nightsCount: nights,
        confirmed: false,
        source: 'ai',
      };

      days.push({
        date: dayDate,
        dayNumber: dateIdx + 1,
        location: dest.location,
        destinationId: dest.id,
        activities,
        transportation: dayTransit,
        accommodation: accommodation,
        notes: isFinalDepartureDay
          ? `Final day in ${dest.name}. Trip concludes with fixed commitments and departure journey.`
          : isTravelDay
          ? `Transit day from ${prevDest?.name} to ${dest.name}. Relaxed afternoon exploration.`
          : `Full day enjoying highlights, culture, and cuisine of ${dest.name}.`,
        isTravelDay,
      });
    }

    runningDateIndex += nights;
    prevDest = dest;
  });

  return { itineraryDays: days, transportationSegments: segments };
}

function formatArrivalTime(depTime: string, durationMinutes: number): string {
  const [h, m] = depTime.split(':').map(Number);
  const totalM = h * 60 + m + durationMinutes;
  const arrH = Math.floor(totalM / 60) % 24;
  const arrM = totalM % 60;
  return `${String(arrH).padStart(2, '0')}:${String(arrM).padStart(2, '0')}`;
}

export function generateDefaultActivitiesForCity(
  cityName: string,
  dayInCity: number,
  isTravelDay: boolean
): Activity[] {
  const activities: Activity[] = [];
  const normCity = cityName.toLowerCase();

  if (isTravelDay) {
    activities.push({
      id: `act-${normCity}-d${dayInCity}-1`,
      title: `Arrival & Hotel Check-in in ${cityName}`,
      time: '14:00',
      durationMinutes: 60,
      category: 'transit',
      description: 'Drop bags, refresh, and get oriented in the neighborhood.',
      source: 'ai',
      confidence: 'high',
    });
    activities.push({
      id: `act-${normCity}-d${dayInCity}-2`,
      title: `Evening Stroll & Welcome Dinner`,
      time: '18:30',
      durationMinutes: 120,
      category: 'food',
      description: `Local dinner tasting authentic regional specialties of ${cityName}.`,
      source: 'ai',
      confidence: 'medium',
    });
  } else if (dayInCity === 1) {
    activities.push({
      id: `act-${normCity}-d${dayInCity}-1`,
      title: `${cityName} Landmark Walking Tour`,
      time: '10:00',
      durationMinutes: 180,
      category: 'sightseeing',
      description: 'Discover primary historical quarters, grand squares, and architecture.',
      source: 'ai',
      confidence: 'high',
    });
    activities.push({
      id: `act-${normCity}-d${dayInCity}-2`,
      title: 'Cultural Museum or Historic Palace Visit',
      time: '14:30',
      durationMinutes: 120,
      category: 'culture',
      description: 'Immerse in local art treasures and heritage.',
      source: 'ai',
      confidence: 'medium',
    });
    activities.push({
      id: `act-${normCity}-d${dayInCity}-3`,
      title: 'Scenic Sunset Viewpoint & Aperitif',
      time: '18:00',
      durationMinutes: 90,
      category: 'relaxation',
      description: 'Panoramic views overlooking the cityscape.',
      source: 'ai',
      confidence: 'medium',
    });
  } else {
    activities.push({
      id: `act-${normCity}-d${dayInCity}-1`,
      title: 'Neighborhood Exploration & Artisanal Markets',
      time: '10:30',
      durationMinutes: 150,
      category: 'culture',
      description: 'Wander lively local markets, artisan boutiques, and hidden alleys.',
      source: 'ai',
      confidence: 'medium',
    });
    activities.push({
      id: `act-${normCity}-d${dayInCity}-2`,
      title: 'Afternoon Leisure & Cafe Culture',
      time: '15:00',
      durationMinutes: 120,
      category: 'relaxation',
      description: 'Unstructured time to relax, people-watch, and explore at your own pace.',
      source: 'ai',
      confidence: 'high',
      isOptional: true,
    });
  }

  return activities;
}

/**
 * Creates a blank template trip
 */
export function createNewTripTemplate(name: string, startDate: string, endDate: string): Trip {
  const origin: Location = { name: 'Lisbon', country: 'Portugal', latitude: 38.7223, longitude: -9.1393 };
  const dest1: Destination = {
    id: 'dest-1',
    name: 'Lisbon',
    location: origin,
    plannedNights: 3,
    priority: 'high',
  };

  const { itineraryDays, transportationSegments } = buildItineraryFromDestinations(
    [dest1],
    startDate,
    endDate
  );

  return {
    id: `trip-${Date.now()}`,
    name,
    startDate,
    endDate,
    origin,
    destinations: [dest1],
    events: [],
    reservations: [],
    transportation: transportationSegments,
    constraints: [],
    preferences: {
      travelStyle: 'balanced',
      transportationPreference: ['train'],
      minimizeHotelChanges: true,
      minimizeTravelTime: true,
      interests: ['Sightseeing', 'Food & Dining', 'Culture & History'],
    },
    itinerary: {
      days: itineraryDays,
    },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Checks if a trip has already been completed.
 */
export function isTripCompleted(trip: Trip): boolean {
  if (trip.status === 'completed') return true;
  if (trip.status === 'planned' || trip.status === 'draft') return false;

  // Fallback: check if endDate is strictly before today
  try {
    const end = parseISO(trip.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return end < today;
  } catch {
    return false;
  }
}

/**
 * Shifts all dates of a trip into the future or to a specified new start date.
 * Maintains city order, nights per destination, transportation segments, and day itineraries.
 */
export function shiftTripDates(trip: Trip, newStartDate: string): Trip {
  const oldStart = parseISO(trip.startDate);
  const newStart = parseISO(newStartDate);
  const daysDiff = differenceInCalendarDays(newStart, oldStart);

  const shiftDate = (d?: string): string | undefined => {
    if (!d) return undefined;
    try {
      return format(addDays(parseISO(d), daysDiff), 'yyyy-MM-dd');
    } catch {
      return d;
    }
  };

  const shiftDateTime = (dt?: string): string | undefined => {
    if (!dt) return undefined;
    try {
      const parsed = parseISO(dt);
      const shifted = addDays(parsed, daysDiff);
      return format(shifted, dt.includes('T') ? "yyyy-MM-dd'T'HH:mm" : 'yyyy-MM-dd');
    } catch {
      return dt;
    }
  };

  const newEndDate = shiftDate(trip.endDate) || trip.endDate;

  const shiftedDestinations: Destination[] = trip.destinations.map((d) => ({
    ...d,
    arrivalDate: shiftDate(d.arrivalDate),
    departureDate: shiftDate(d.departureDate),
  }));

  const shiftedTransportation: TransportationSegment[] = trip.transportation.map((s) => ({
    ...s,
    date: shiftDate(s.date),
  }));

  const shiftedDays: ItineraryDay[] = trip.itinerary.days.map((day) => ({
    ...day,
    date: shiftDate(day.date) || day.date,
    transportation: day.transportation?.map((t) => ({
      ...t,
      date: shiftDate(t.date),
    })),
    accommodation: day.accommodation
      ? {
          ...day.accommodation,
          checkInDate: shiftDate(day.accommodation.checkInDate) || day.accommodation.checkInDate,
          checkOutDate: shiftDate(day.accommodation.checkOutDate) || day.accommodation.checkOutDate,
        }
      : undefined,
  }));

  const shiftedEvents = trip.events.map((evt) => ({
    ...evt,
    startDateTime: shiftDateTime(evt.startDateTime) || evt.startDateTime,
    endDateTime: shiftDateTime(evt.endDateTime),
  }));

  const shiftedReservations = trip.reservations.map((res) => ({
    ...res,
    startDateTime: shiftDateTime(res.startDateTime),
    endDateTime: shiftDateTime(res.endDateTime),
  }));

  const shiftedConstraints = trip.constraints.map((c) => ({
    ...c,
    targetDate: shiftDate(c.targetDate),
  }));

  return {
    ...trip,
    startDate: newStartDate,
    endDate: newEndDate,
    status: 'planned',
    destinations: shiftedDestinations,
    transportation: shiftedTransportation,
    events: shiftedEvents,
    reservations: shiftedReservations,
    constraints: shiftedConstraints,
    itinerary: {
      ...trip.itinerary,
      days: shiftedDays,
    },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Resets a trip to a clean baseline state:
 * - Rebuilds day-by-day itinerary and transportation cleanly from destinations
 * - Optionally shifts dates if newStartDate is provided
 * - Clears ad-hoc added events/images
 * - Sets status to 'planned'
 */
export function resetTripToCleanState(trip: Trip, newStartDate?: string): Trip {
  const baseStartDate = newStartDate || trip.startDate;
  const daysDiff = newStartDate
    ? differenceInCalendarDays(parseISO(newStartDate), parseISO(trip.startDate))
    : 0;

  const baseEndDate = newStartDate
    ? format(addDays(parseISO(trip.endDate), daysDiff), 'yyyy-MM-dd')
    : trip.endDate;

  const preferTrain = trip.preferences?.transportationPreference?.includes('train') ?? true;

  const { itineraryDays, transportationSegments } = buildItineraryFromDestinations(
    trip.destinations,
    baseStartDate,
    baseEndDate,
    undefined,
    preferTrain
  );

  // Keep user-originated fixed events only, shifting dates if needed
  const cleanedEvents = trip.events
    .filter((e) => e.fixed && e.source === 'user')
    .map((e) => {
      if (daysDiff === 0) return e;
      try {
        const shifted = addDays(parseISO(e.startDateTime), daysDiff);
        return {
          ...e,
          startDateTime: format(shifted, e.startDateTime.includes('T') ? "yyyy-MM-dd'T'HH:mm" : 'yyyy-MM-dd'),
          endDateTime: e.endDateTime
            ? format(addDays(parseISO(e.endDateTime), daysDiff), e.endDateTime.includes('T') ? "yyyy-MM-dd'T'HH:mm" : 'yyyy-MM-dd')
            : undefined,
        };
      } catch {
        return e;
      }
    });

  // Keep user reservations only
  const cleanedReservations = trip.reservations
    .filter((r) => r.source === 'user')
    .map((r) => {
      if (daysDiff === 0 || !r.startDateTime) return r;
      try {
        const shifted = addDays(parseISO(r.startDateTime), daysDiff);
        return {
          ...r,
          startDateTime: format(shifted, r.startDateTime.includes('T') ? "yyyy-MM-dd'T'HH:mm" : 'yyyy-MM-dd'),
          endDateTime: r.endDateTime
            ? format(addDays(parseISO(r.endDateTime), daysDiff), r.endDateTime.includes('T') ? "yyyy-MM-dd'T'HH:mm" : 'yyyy-MM-dd')
            : undefined,
        };
      } catch {
        return r;
      }
    });

  return {
    ...trip,
    startDate: baseStartDate,
    endDate: baseEndDate,
    status: 'planned',
    transportation: transportationSegments,
    events: cleanedEvents,
    reservations: cleanedReservations,
    itinerary: {
      days: itineraryDays,
    },
    updatedAt: new Date().toISOString(),
  };
}

export interface ResetTripCustomParams {
  name?: string;
  startDate?: string;
  endDate?: string;
  cityNames?: string[];
  travelStyle?: 'relaxed' | 'balanced' | 'intense';
  preferTrain?: boolean;
}

/**
 * Resets a trip by editing any initial fields (name, dates, cities, style, transport)
 * and cleanly rebuilding the itinerary and transportation.
 */
export async function resetTripWithCustomParams(
  trip: Trip,
  params: ResetTripCustomParams
): Promise<Trip> {
  const newName = params.name?.trim() || trip.name;
  const newStartDate = params.startDate || trip.startDate;
  const newEndDate = params.endDate || trip.endDate;
  const preferTrain = params.preferTrain ?? (trip.preferences?.transportationPreference?.includes('train') ?? true);
  const travelStyle = params.travelStyle ?? (trip.preferences?.travelStyle ?? 'balanced');

  // Determine destinations
  let newDestinations: Destination[] = [];
  if (params.cityNames && params.cityNames.length > 0) {
    const totalDays = Math.max(1, differenceInCalendarDays(parseISO(newEndDate), parseISO(newStartDate)));
    const avgNights = Math.max(1, Math.floor(totalDays / params.cityNames.length));

    newDestinations = await Promise.all(
      params.cityNames.map(async (cityName, idx) => {
        const trimmed = cityName.trim();
        // Check if existing destination matches this name
        const existing = trip.destinations.find(
          (d) => d.name.toLowerCase() === trimmed.toLowerCase()
        );
        let loc: Location;
        if (existing?.location && existing.location.latitude && existing.location.longitude) {
          loc = existing.location;
        } else {
          loc = await resolveLocationAsync(trimmed);
        }

        const isFirst = idx === 0;
        const isLast = idx === params.cityNames!.length - 1;
        return {
          id: existing ? existing.id : `dest-${Date.now()}-${idx + 1}`,
          name: trimmed,
          location: loc,
          plannedNights: existing?.plannedNights ?? avgNights,
          minimumNights: existing?.minimumNights ?? 1,
          priority: isFirst || isLast ? ('high' as const) : (existing?.priority ?? ('medium' as const)),
        };
      })
    );
  } else {
    newDestinations = trip.destinations;
  }

  // Rebuild itinerary days and transportation segments
  const { itineraryDays, transportationSegments } = buildItineraryFromDestinations(
    newDestinations,
    newStartDate,
    newEndDate,
    undefined,
    preferTrain
  );

  // Update origin if destinations exist
  const newOrigin = newDestinations.length > 0 ? newDestinations[0].location : trip.origin;

  // Clean events: keep user-fixed events that fall within the new date range
  const cleanedEvents = trip.events.filter((e) => {
    if (!e.fixed) return false;
    const evDate = e.startDateTime.slice(0, 10);
    return evDate >= newStartDate && evDate <= newEndDate;
  });

  // Clean reservations: keep confirmed user reservations that fall within the new date range
  const cleanedReservations = trip.reservations.filter((r) => {
    if (r.source !== 'user') return false;
    if (!r.startDateTime) return false;
    const resDate = r.startDateTime.slice(0, 10);
    return resDate >= newStartDate && resDate <= newEndDate;
  });

  // Constraints: update end constraint if last city exists
  const lastCity = newDestinations[newDestinations.length - 1];
  const updatedConstraints = trip.constraints.map((c) => {
    if (c.targetDestinationId && lastCity) {
      return {
        ...c,
        targetDestinationId: lastCity.id,
        targetDate: newEndDate,
        description: `Finish trip in ${lastCity.name} by ${newEndDate}`,
      };
    }
    return c;
  });

  return {
    ...trip,
    name: newName,
    startDate: newStartDate,
    endDate: newEndDate,
    origin: newOrigin,
    status: 'planned',
    destinations: newDestinations,
    transportation: transportationSegments,
    events: cleanedEvents,
    reservations: cleanedReservations,
    constraints: updatedConstraints,
    preferences: {
      ...trip.preferences,
      travelStyle,
      transportationPreference: preferTrain ? ['train'] : ['flight'],
    },
    itinerary: {
      days: itineraryDays,
    },
    updatedAt: new Date().toISOString(),
  };
}

