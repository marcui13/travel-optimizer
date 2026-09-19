export interface Location {
  name: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  cityCode?: string;
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface Destination {
  id: string;
  name: string;
  location: Location;
  arrivalDate?: string;
  departureDate?: string;
  minimumNights?: number;
  maximumNights?: number;
  priority?: 'low' | 'medium' | 'high';
  reasons?: string[];
  plannedNights?: number;
}

export type EventType =
  | 'flight'
  | 'train'
  | 'hotel'
  | 'activity'
  | 'reservation'
  | 'event'
  | 'other';

export interface Event {
  id: string;
  title: string;
  location?: Location;
  startDateTime: string; // ISO 8601 or YYYY-MM-DDTHH:mm
  endDateTime?: string;
  type: EventType;
  fixed: boolean;
  source: 'user' | 'image' | 'ai';
  confidence?: ConfidenceLevel;
  notes?: string;
  externalRef?: string;
}

export type ReservationType =
  | 'hotel'
  | 'flight'
  | 'train'
  | 'restaurant'
  | 'activity'
  | 'other';

export interface Reservation {
  id: string;
  type: ReservationType;
  name: string;
  location?: Location;
  startDateTime?: string;
  endDateTime?: string;
  confirmed: boolean;
  source: 'user' | 'image' | 'ai';
  bookingReference?: string;
  details?: string;
}

export type TransportMode =
  | 'flight'
  | 'train'
  | 'bus'
  | 'car'
  | 'ferry'
  | 'walking'
  | 'unknown';

export interface TransportationSegment {
  id: string;
  from: Location;
  to: Location;
  date?: string; // YYYY-MM-DD
  departureTime?: string; // HH:mm
  arrivalTime?: string; // HH:mm
  mode: TransportMode;
  estimatedDurationMinutes?: number;
  distanceKm?: number;
  source: 'user' | 'ai' | 'estimated';
  operatorOrRoute?: string;
  bookingRef?: string;
  notes?: string;
}

export interface Constraint {
  id: string;
  type: 'hard' | 'soft';
  description: string;
  priority?: number; // 1 (highest) to 5
  targetDestinationId?: string;
  targetDate?: string;
}

export interface TravelPreferences {
  travelStyle: 'relaxed' | 'balanced' | 'intense';
  transportationPreference?: string[]; // e.g. ['train', 'flight']
  minimizeHotelChanges?: boolean;
  minimizeTravelTime?: boolean;
  interests?: string[];
  budget?: {
    amount?: number;
    currency?: string;
  };
}

export interface Activity {
  id: string;
  title: string;
  time?: string; // HH:mm
  durationMinutes?: number;
  location?: Location;
  category?: 'sightseeing' | 'food' | 'culture' | 'relaxation' | 'transit' | 'custom';
  description?: string;
  isOptional?: boolean;
  confidence?: ConfidenceLevel;
  source?: 'user' | 'ai' | 'image';
}

export interface Accommodation {
  id: string;
  name: string;
  location?: Location;
  checkInDate: string;
  checkOutDate: string;
  nightsCount: number;
  address?: string;
  confirmed?: boolean;
  source?: 'user' | 'ai' | 'image';
  bookingReference?: string;
}

export interface ItineraryDay {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  location?: Location;
  destinationId?: string;
  activities: Activity[];
  transportation?: TransportationSegment[];
  accommodation?: Accommodation;
  notes?: string;
  isTravelDay?: boolean;
}

export interface OptimizationChange {
  id: string;
  type: 'destinationMoved' | 'nightsAdjusted' | 'transitChanged' | 'destinationAdded' | 'destinationRemoved';
  description: string;
  reason: string;
  before?: string;
  after?: string;
}

export interface OptimizationResult {
  profile: 'efficient' | 'balanced' | 'relaxed';
  changes: OptimizationChange[];
  explanation: string;
  metrics?: {
    travelTimeBefore?: number;
    travelTimeAfter?: number;
    hotelChangesBefore?: number;
    hotelChangesAfter?: number;
    distanceKmBefore?: number;
    distanceKmAfter?: number;
  };
  proposedItinerary?: Itinerary;
  proposedDestinations?: Destination[];
  proposedTransportation?: TransportationSegment[];
  createdAt: string;
}

export interface Itinerary {
  days: ItineraryDay[];
  optimization?: OptimizationResult;
}

export type TripStatus = 'planned' | 'active' | 'completed' | 'draft';

export interface Trip {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status?: TripStatus;
  origin?: Location;
  destinations: Destination[];
  events: Event[];
  reservations: Reservation[];
  transportation: TransportationSegment[];
  constraints: Constraint[];
  preferences: TravelPreferences;
  itinerary: Itinerary;
  updatedAt?: string;
}

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  category:
    | 'overlap'
    | 'impossible_schedule'
    | 'missing_date'
    | 'duplicate_destination'
    | 'conflicting_reservation'
    | 'insufficient_travel_time'
    | 'excessive_density'
    | 'invalid_date_range'
    | 'backtracking'
    | 'hard_constraint_violation';
  message: string;
  date?: string;
  destinationId?: string;
  suggestion?: string;
  relatedIds?: string[];
}

export interface TripStatistics {
  destinationCount: number;
  nightsCount: number;
  totalDistanceKm: number;
  totalTravelMinutes: number;
  transferCount: number;
  hotelChangesCount: number;
  modeCounts: {
    flight: number;
    train: number;
    bus: number;
    car: number;
    ferry: number;
    walking: number;
    unknown: number;
  };
  freeTimeDays: number;
  travelDaysCount: number;
}
