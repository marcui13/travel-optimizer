import { Trip, TripStatistics } from './types';
import { calculateDistanceKm } from '../services/geocoding/geocodingService';

export function calculateTripStatistics(trip: Trip): TripStatistics {
  const destinationCount = trip.destinations.length;
  const nightsCount = Math.max(0, trip.itinerary.days.length - 1);

  let totalDistanceKm = 0;
  let totalTravelMinutes = 0;

  const modeCounts = {
    flight: 0,
    train: 0,
    bus: 0,
    car: 0,
    ferry: 0,
    walking: 0,
    unknown: 0,
  };

  // Tally transportation segments
  trip.transportation.forEach((seg) => {
    let segDist = seg.distanceKm || 0;
    if (segDist === 0 && seg.from?.latitude && seg.to?.latitude) {
      segDist = calculateDistanceKm(
        seg.from.latitude,
        seg.from.longitude || 0,
        seg.to.latitude,
        seg.to.longitude || 0
      );
    }
    totalDistanceKm += segDist;

    const dur = seg.estimatedDurationMinutes || 120;
    totalTravelMinutes += dur;

    if (seg.mode in modeCounts) {
      modeCounts[seg.mode]++;
    } else {
      modeCounts.unknown++;
    }
  });

  const transferCount = trip.transportation.length;

  // Hotel changes: Count transitions between different accommodations
  let hotelChangesCount = 0;
  let lastAccommodationId: string | undefined = undefined;

  trip.itinerary.days.forEach((day) => {
    if (day.accommodation?.id) {
      if (lastAccommodationId && lastAccommodationId !== day.accommodation.id) {
        hotelChangesCount++;
      }
      lastAccommodationId = day.accommodation.id;
    }
  });

  // Free time days: days with no travel and <= 2 activities
  let freeTimeDays = 0;
  let travelDaysCount = 0;

  trip.itinerary.days.forEach((day) => {
    if (day.isTravelDay || (day.transportation && day.transportation.length > 0)) {
      travelDaysCount++;
    } else if (day.activities.length <= 2) {
      freeTimeDays++;
    }
  });

  return {
    destinationCount,
    nightsCount,
    totalDistanceKm,
    totalTravelMinutes,
    transferCount,
    hotelChangesCount,
    modeCounts,
    freeTimeDays,
    travelDaysCount,
  };
}

export function formatMinutesToHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours === 0) return `${remaining}m`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}
