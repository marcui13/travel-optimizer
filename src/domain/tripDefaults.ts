import { Trip, Destination, Constraint, Event, Reservation } from './types';
import { resolveLocation } from '../services/geocoding/geocodingService';
import { buildItineraryFromDestinations } from './tripHelpers';

export function getEuropeGrandTourSampleTrip(): Trip {
  const startDate = '2026-09-26';
  const endDate = '2026-10-20';

  const destinationNames = [
    { name: 'Lisbon', nights: 3, priority: 'high' as const },
    { name: 'Madrid', nights: 3, priority: 'high' as const },
    { name: 'Barcelona', nights: 2, priority: 'medium' as const },
    { name: 'Rome', nights: 3, priority: 'high' as const },
    { name: 'Florence', nights: 2, priority: 'medium' as const },
    { name: 'Budapest', nights: 2, priority: 'medium' as const },
    { name: 'Vienna', nights: 2, priority: 'high' as const },
    { name: 'Prague', nights: 2, priority: 'high' as const },
    { name: 'Berlin', nights: 2, priority: 'medium' as const },
    { name: 'Amsterdam', nights: 3, priority: 'high' as const },
  ];

  const destinations: Destination[] = destinationNames.map((d, index) => ({
    id: `dest-${index + 1}`,
    name: d.name,
    location: resolveLocation(d.name),
    plannedNights: d.nights,
    minimumNights: d.nights >= 3 ? 2 : 1,
    priority: d.priority,
    reasons: [
      `Key city highlight on European journey`,
      d.name === 'Amsterdam' ? 'Mandatory finish date commitment' : 'Historic & cultural landmarks',
    ],
  }));

  const { itineraryDays, transportationSegments } = buildItineraryFromDestinations(
    destinations,
    startDate,
    endDate,
    undefined,
    true
  );

  const constraints: Constraint[] = [
    {
      id: 'c-hard-1',
      type: 'hard',
      description: 'Must arrive in Amsterdam by October 20 for fixed event.',
      priority: 1,
      targetDestinationId: 'dest-10',
      targetDate: '2026-10-20',
    },
    {
      id: 'c-hard-2',
      type: 'hard',
      description: 'Flight arrives into Lisbon on September 26 at 09:15.',
      priority: 1,
      targetDestinationId: 'dest-1',
      targetDate: '2026-09-26',
    },
    {
      id: 'c-soft-1',
      type: 'soft',
      description: 'Prefer high-speed trains over domestic flights where travel time is under 5-6 hours.',
      priority: 2,
    },
    {
      id: 'c-soft-2',
      type: 'soft',
      description: 'Avoid changing hotels too often; minimum 2 nights per major hub.',
      priority: 3,
    },
    {
      id: 'c-soft-3',
      type: 'soft',
      description: 'Leave free unstructured afternoons for culinary exploration.',
      priority: 4,
    },
  ];

  const reservations: Reservation[] = [
    {
      id: 'res-1',
      type: 'flight',
      name: 'Transatlantic Flight to Lisbon (TP102)',
      location: resolveLocation('Lisbon'),
      startDateTime: '2026-09-26T09:15',
      confirmed: true,
      source: 'user',
      bookingReference: 'TP-94821',
      details: 'Terminal 1 Humberto Delgado Airport',
    },
    {
      id: 'res-2',
      type: 'train',
      name: 'Renfe AVE High-Speed: Madrid Atocha to Barcelona Sants',
      location: resolveLocation('Madrid'),
      startDateTime: '2026-10-02T10:30',
      endDateTime: '2026-10-02T13:15',
      confirmed: true,
      source: 'user',
      bookingReference: 'RNF-88194',
      details: 'Carriage 4, Seats 12A-12B',
    },
    {
      id: 'res-3',
      type: 'hotel',
      name: 'Boutique Hotel Canal House Amsterdam',
      location: resolveLocation('Amsterdam'),
      startDateTime: '2026-10-20T15:00',
      endDateTime: '2026-10-23T11:00',
      confirmed: true,
      source: 'image',
      bookingReference: 'BK-55201',
      details: 'Deluxe Canal View King Suite',
    },
  ];

  const events: Event[] = [
    {
      id: 'evt-1',
      title: 'Amsterdam Music & Arts Festival Closing Night',
      location: resolveLocation('Amsterdam'),
      startDateTime: '2026-10-20T20:00',
      endDateTime: '2026-10-20T23:30',
      type: 'event',
      fixed: true,
      source: 'user',
      confidence: 'high',
      notes: 'Fixed hard date commitment in Amsterdam.',
      externalRef: 'TICKET-AMS-99',
    },
    {
      id: 'evt-2',
      title: 'Vatican Museums & Sistine Chapel Reserved Morning Entry',
      location: resolveLocation('Rome'),
      startDateTime: '2026-10-06T09:00',
      endDateTime: '2026-10-06T12:00',
      type: 'reservation',
      fixed: true,
      source: 'user',
      confidence: 'high',
      notes: 'Skip-the-line group entrance pass.',
    },
    {
      id: 'evt-3',
      title: 'Uffizi Gallery Renaissance Masterpieces Tour',
      location: resolveLocation('Florence'),
      startDateTime: '2026-10-09T14:30',
      endDateTime: '2026-10-09T17:00',
      type: 'reservation',
      fixed: false,
      source: 'ai',
      confidence: 'medium',
      notes: 'Suggested priority booking to avoid peak queues.',
    },
  ];

  return {
    id: 'trip-europe-grand-tour',
    name: 'Europe Grand Odyssey 2026',
    startDate,
    endDate,
    status: 'planned',
    origin: resolveLocation('Lisbon'),
    destinations,
    events,
    reservations,
    transportation: transportationSegments,
    constraints,
    preferences: {
      travelStyle: 'balanced',
      transportationPreference: ['train', 'flight'],
      minimizeHotelChanges: true,
      minimizeTravelTime: true,
      interests: ['Architecture & History', 'Local Gastronomy', 'Scenic Rail Journeys'],
      budget: {
        amount: 4500,
        currency: 'EUR',
      },
    },
    itinerary: {
      days: itineraryDays,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function getJapanGoldenRouteSampleTrip(): Trip {
  const startDate = '2025-05-10';
  const endDate = '2025-05-21';

  const destinationNames = [
    { name: 'Tokyo', nights: 4, priority: 'high' as const },
    { name: 'Kyoto', nights: 4, priority: 'high' as const },
    { name: 'Osaka', nights: 3, priority: 'medium' as const },
  ];

  const destinations: Destination[] = destinationNames.map((d, idx) => ({
    id: `jp-dest-${idx + 1}`,
    name: d.name,
    location: resolveLocation(d.name),
    plannedNights: d.nights,
    minimumNights: 2,
    priority: d.priority,
    reasons: [
      d.name === 'Tokyo' ? 'Skyscrapers, Shibuya Crossing, and culinary masters' :
      d.name === 'Kyoto' ? 'Fushimi Inari, Arashiyama Bamboo Grove, and Gion' :
      'Street food heaven in Dotonbori and Osaka Castle',
    ],
  }));

  const { itineraryDays, transportationSegments } = buildItineraryFromDestinations(
    destinations,
    startDate,
    endDate,
    undefined,
    true
  );

  const events: Event[] = [
    {
      id: 'jp-evt-1',
      title: 'Tsukiji Outer Market Culinary Walk',
      location: resolveLocation('Tokyo'),
      startDateTime: '2025-05-12T09:30',
      endDateTime: '2025-05-12T12:00',
      type: 'activity',
      fixed: true,
      source: 'user',
      confidence: 'high',
      notes: 'Morning fresh sushi and street bites tasting.',
    },
    {
      id: 'jp-evt-2',
      title: 'Fushimi Inari Shrine Sunset Torii Trail',
      location: resolveLocation('Kyoto'),
      startDateTime: '2025-05-16T16:00',
      endDateTime: '2025-05-16T18:30',
      type: 'activity',
      fixed: true,
      source: 'user',
      confidence: 'high',
      notes: 'Walk up the mountain pass through thousands of vermilion torii gates.',
    },
  ];

  const reservations: Reservation[] = [
    {
      id: 'jp-res-1',
      type: 'flight',
      name: 'Transpacific Flight to Tokyo Haneda (NH106)',
      location: resolveLocation('Tokyo'),
      startDateTime: '2025-05-10T14:30',
      confirmed: true,
      source: 'user',
      bookingReference: 'ANA-78219',
      details: 'Haneda International Terminal 3',
    },
    {
      id: 'jp-res-2',
      type: 'train',
      name: 'Tokaido Shinkansen Nozomi (Tokyo to Kyoto)',
      location: resolveLocation('Tokyo'),
      startDateTime: '2025-05-14T10:00',
      endDateTime: '2025-05-14T12:15',
      confirmed: true,
      source: 'user',
      bookingReference: 'JR-55018',
      details: 'Car 5, Reserved Seats 8A-8B with Mount Fuji view',
    },
  ];

  return {
    id: 'trip-japan-golden-route',
    name: 'Ruta Clásica por Japón: Tokio, Kioto y Osaka',
    startDate,
    endDate,
    status: 'completed',
    origin: resolveLocation('Tokyo'),
    destinations,
    events,
    reservations,
    transportation: transportationSegments,
    constraints: [],
    preferences: {
      travelStyle: 'balanced',
      transportationPreference: ['train'],
      minimizeHotelChanges: true,
      minimizeTravelTime: true,
      interests: ['Gastronomy', 'Culture & Temples', 'Shinkansen Rail'],
      budget: {
        amount: 3800,
        currency: 'USD',
      },
    },
    itinerary: {
      days: itineraryDays,
    },
    updatedAt: '2025-05-22T10:00:00.000Z',
  };
}

export function getAndaluciaSampleTrip(): Trip {
  const startDate = '2026-11-05';
  const endDate = '2026-11-12';

  const destinationNames = [
    { name: 'Seville', nights: 3, priority: 'high' as const },
    { name: 'Granada', nights: 2, priority: 'high' as const },
    { name: 'Cordoba', nights: 2, priority: 'medium' as const },
  ];

  const destinations: Destination[] = destinationNames.map((d, idx) => ({
    id: `and-dest-${idx + 1}`,
    name: d.name,
    location: resolveLocation(d.name),
    plannedNights: d.nights,
    minimumNights: 2,
    priority: d.priority,
    reasons: [
      d.name === 'Seville' ? 'Plaza de España, Real Alcázar, and lively tapas bars' :
      d.name === 'Granada' ? 'Majestic Alhambra Palaces and Albayzín viewpoint' :
      'Great Mosque-Cathedral and Jewish Quarter',
    ],
  }));

  const { itineraryDays, transportationSegments } = buildItineraryFromDestinations(
    destinations,
    startDate,
    endDate,
    undefined,
    true
  );

  return {
    id: 'trip-andalucia-cultural',
    name: 'Escapada por Andalucía: Sevilla, Granada y Córdoba',
    startDate,
    endDate,
    status: 'planned',
    origin: resolveLocation('Seville'),
    destinations,
    events: [],
    reservations: [],
    transportation: transportationSegments,
    constraints: [],
    preferences: {
      travelStyle: 'relaxed',
      transportationPreference: ['train'],
      minimizeHotelChanges: true,
      minimizeTravelTime: true,
      interests: ['Architecture', 'Flamenco', 'Tapas & Wine'],
      budget: {
        amount: 1800,
        currency: 'EUR',
      },
    },
    itinerary: {
      days: itineraryDays,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function getDefaultTripLibrary(): Trip[] {
  return [
    getEuropeGrandTourSampleTrip(),
    getJapanGoldenRouteSampleTrip(),
    getAndaluciaSampleTrip(),
  ];
}

export const SAMPLE_TRIPS = [
  {
    id: 'trip-europe-grand-tour',
    title: 'Europe Grand Odyssey (25 Days)',
    subtitle: 'Lisbon → Madrid → Rome → Amsterdam',
    daysCount: 25,
    cityCount: 10,
    getTrip: getEuropeGrandTourSampleTrip,
  },
  {
    id: 'trip-japan-golden-route',
    title: 'Japan Golden Route (12 Days - Realizado)',
    subtitle: 'Tokyo → Kyoto → Osaka',
    daysCount: 12,
    cityCount: 3,
    getTrip: getJapanGoldenRouteSampleTrip,
  },
  {
    id: 'trip-andalucia-cultural',
    title: 'Andalucía Cultural Escape (7 Days)',
    subtitle: 'Seville → Granada → Cordoba',
    daysCount: 7,
    cityCount: 3,
    getTrip: getAndaluciaSampleTrip,
  },
];
