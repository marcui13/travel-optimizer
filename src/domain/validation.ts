import { Trip, ValidationIssue } from './types';
import { calculateDistanceKm } from '../services/geocoding/geocodingService';
import { parseISO, isBefore } from 'date-fns';

/**
 * Validates a Trip model deterministically.
 * Never calls an LLM for pure date math, overlaps, or geometry checks.
 */
export function validateTrip(trip: Trip): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 1. Date Range Feasibility
  try {
    const start = parseISO(trip.startDate);
    const end = parseISO(trip.endDate);
    if (isBefore(end, start)) {
      issues.push({
        id: 'val-date-range-reversed',
        severity: 'error',
        category: 'invalid_date_range',
        message: `Trip end date (${trip.endDate}) is earlier than start date (${trip.startDate}).`,
        suggestion: 'Adjust trip start or end date.',
      });
    }
  } catch {
    issues.push({
      id: 'val-date-invalid',
      severity: 'error',
      category: 'invalid_date_range',
      message: 'Invalid ISO date format detected in trip dates.',
    });
  }

  // 2. Duplicate Destinations in immediate succession
  for (let i = 0; i < trip.destinations.length - 1; i++) {
    const d1 = trip.destinations[i];
    const d2 = trip.destinations[i + 1];
    if (d1.name.toLowerCase() === d2.name.toLowerCase()) {
      issues.push({
        id: `val-dup-${d1.id}-${d2.id}`,
        severity: 'warning',
        category: 'duplicate_destination',
        message: `Consecutive duplicate destination detected: "${d1.name}".`,
        destinationId: d2.id,
        suggestion: 'Merge consecutive stays into one single destination stop.',
      });
    }
  }

  // 3. Hard Constraint Verification
  (trip.constraints || []).forEach((c) => {
    if (c.type === 'hard') {
      if (c.targetDestinationId && c.targetDate) {
        const dest = trip.destinations.find((d) => d.id === c.targetDestinationId);
        if (dest && dest.arrivalDate && dest.departureDate) {
          if (c.targetDate < dest.arrivalDate || c.targetDate > dest.departureDate) {
            // If the hard constraint date is outside the stay window
            issues.push({
              id: `val-hard-${c.id}`,
              severity: 'error',
              category: 'hard_constraint_violation',
              message: `Hard constraint violated: "${c.description}". Destination ${dest.name} is scheduled for ${dest.arrivalDate} to ${dest.departureDate}, which does not cover required date ${c.targetDate}.`,
              destinationId: dest.id,
              date: c.targetDate,
              suggestion: 'Re-align itinerary days to ensure arrival and stay covers the hard deadline.',
            });
          }
        }
      }
    }
  });

  // 4. Overlapping Events on the same day
  const eventsByDate = new Map<string, typeof trip.events>();
  (trip.events || []).forEach((evt) => {
    const dateKey = evt.startDateTime.split('T')[0];
    const list = eventsByDate.get(dateKey) || [];
    list.push(evt);
    eventsByDate.set(dateKey, list);
  });

  eventsByDate.forEach((dayEvents, dateKey) => {
    for (let i = 0; i < dayEvents.length; i++) {
      for (let j = i + 1; j < dayEvents.length; j++) {
        const e1 = dayEvents[i];
        const e2 = dayEvents[j];

        if (e1.startDateTime && e1.endDateTime && e2.startDateTime && e2.endDateTime) {
          const s1 = new Date(e1.startDateTime).getTime();
          const e1Time = new Date(e1.endDateTime).getTime();
          const s2 = new Date(e2.startDateTime).getTime();
          const e2Time = new Date(e2.endDateTime).getTime();

          // Check if [s1, e1] overlaps [s2, e2]
          if (Math.max(s1, s2) < Math.min(e1Time, e2Time)) {
            issues.push({
              id: `val-overlap-${e1.id}-${e2.id}`,
              severity: 'error',
              category: 'overlap',
              message: `Conflicting events detected on ${dateKey}: "${e1.title}" and "${e2.title}" overlap in time.`,
              date: dateKey,
              relatedIds: [e1.id, e2.id],
              suggestion: 'Reschedule one of the events or adjust duration.',
            });
          }
        }
      }
    }
  });

  // 5. Impossible Schedule: Activity scheduled before transit arrival
  (trip.itinerary?.days || []).forEach((day) => {
    const transit = day.transportation?.[0];
    if (transit && transit.arrivalTime) {
      const arrTime = transit.arrivalTime;
      day.activities.forEach((act) => {
        if (act.time && act.category !== 'transit') {
          // Compare times (HH:mm)
          if (act.time < arrTime) {
            issues.push({
              id: `val-impossible-${day.date}-${act.id}`,
              severity: 'error',
              category: 'impossible_schedule',
              message: `Impossible schedule on ${day.date}: Activity "${act.title}" is set for ${act.time}, but transit arrives at ${arrTime}.`,
              date: day.date,
              relatedIds: [act.id, transit.id],
              suggestion: `Move "${act.title}" to after ${arrTime} (e.g. allow at least 1 hour for baggage and hotel check-in).`,
            });
          }
        }
      });
    }

    // 6. Excessive Itinerary Density
    const nonOptionalActivities = day.activities.filter((a) => !a.isOptional);
    if (nonOptionalActivities.length > 4) {
      issues.push({
        id: `val-density-${day.date}`,
        severity: 'warning',
        category: 'excessive_density',
        message: `High itinerary density on ${day.date} (${nonOptionalActivities.length} scheduled activities). May cause traveler fatigue.`,
        date: day.date,
        suggestion: 'Consider marking 1 or 2 activities as optional or spreading across multiple days.',
      });
    }
  });

  // 7. Backtracking Detection (Triangular geographic check)
  // If destination sequence A -> B -> C has B -> C heading back towards A or zig-zagging
  if (trip.destinations.length >= 3) {
    for (let i = 0; i < trip.destinations.length - 2; i++) {
      const d1 = trip.destinations[i];
      const d2 = trip.destinations[i + 1];
      const d3 = trip.destinations[i + 2];

      if (
        d1.location?.latitude && d1.location?.longitude &&
        d2.location?.latitude && d2.location?.longitude &&
        d3.location?.latitude && d3.location?.longitude
      ) {
        const dist12 = calculateDistanceKm(
          d1.location.latitude,
          d1.location.longitude,
          d2.location.latitude,
          d2.location.longitude
        );
        const dist23 = calculateDistanceKm(
          d2.location.latitude,
          d2.location.longitude,
          d3.location.latitude,
          d3.location.longitude
        );
        const dist13 = calculateDistanceKm(
          d1.location.latitude,
          d1.location.longitude,
          d3.location.latitude,
          d3.location.longitude
        );

        // Sequence A -> B -> C has total leg distance = dist12 + dist23.
        // If visiting C before B (A -> C -> B) saves significant travel (dist12 - dist13 > 150km and dist23 > 150km),
        // or if C is much closer to A than B (dist13 < dist12 * 0.65 with long legs):
        const savingKm = Math.round(dist12 - dist13);
        const isBacktracking = (savingKm > 150 && dist23 > 150) || (dist13 < dist12 * 0.65 && dist23 > 250 && dist12 > 250);

        if (isBacktracking && savingKm > 0) {
          issues.push({
            id: `val-backtrack-${d1.id}-${d2.id}-${d3.id}`,
            severity: 'warning',
            category: 'backtracking',
            message: `Geographic backtracking detected along ${d1.name} → ${d2.name} → ${d3.name}. ${d3.name} is closer to ${d1.name} than to ${d2.name}.`,
            relatedIds: [d1.id, d2.id, d3.id],
            suggestion: `Consider visiting ${d3.name} before ${d2.name} to save approximately ${savingKm} km of travel.`,
          });
        }
      }
    }
  }

  return issues;
}
