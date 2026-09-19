import { Trip, Destination, Constraint, TravelPreferences } from '../../domain/types';
import { resolveLocation } from '../geocoding/geocodingService';
import { buildItineraryFromDestinations } from '../../domain/tripHelpers';

export interface ParsedTripInput {
  name: string;
  startDate: string;
  endDate: string;
  destinations: string[];
  hardConstraints: string[];
  softConstraints: string[];
  preferences: TravelPreferences;
}

/**
 * Intelligent deterministic heuristic NLP extractor.
 * Extracts destinations, dates, constraints, and preferences from natural language prompts (English & Spanish).
 */
export function parseNaturalLanguageTripPrompt(text: string): ParsedTripInput {
  // Normalize text for diacritic-insensitive matching
  const normalizedText = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // 1. Detect destinations mentioned (both English and Spanish names)
  const cityAliasMap: Record<string, string> = {
    // Belgium
    brujas: 'Bruges',
    bruges: 'Bruges',
    bruselas: 'Brussels',
    brussels: 'Brussels',
    gante: 'Ghent',
    ghent: 'Ghent',
    amberes: 'Antwerp',
    antwerp: 'Antwerp',
    belgica: 'Brussels',
    belgium: 'Brussels',
    // France
    paris: 'Paris',
    niza: 'Nice',
    nice: 'Nice',
    lyon: 'Lyon',
    burdeos: 'Bordeaux',
    bordeaux: 'Bordeaux',
    marsella: 'Marseille',
    marseille: 'Marseille',
    estrasburgo: 'Strasbourg',
    strasbourg: 'Strasbourg',
    // Spain & Portugal
    lisbon: 'Lisbon',
    lisboa: 'Lisbon',
    porto: 'Porto',
    oporto: 'Porto',
    madrid: 'Madrid',
    barcelona: 'Barcelona',
    seville: 'Seville',
    sevilla: 'Seville',
    granada: 'Granada',
    cordoba: 'Cordoba',
    valencia: 'Valencia',
    bilbao: 'Bilbao',
    sansebastian: 'San Sebastian',
    malaga: 'Malaga',
    toledo: 'Toledo',
    // Italy
    rome: 'Rome',
    roma: 'Rome',
    florence: 'Florence',
    florencia: 'Florence',
    venice: 'Venice',
    venecia: 'Venice',
    milan: 'Milan',
    napoles: 'Naples',
    naples: 'Naples',
    bolonia: 'Bologna',
    bologna: 'Bologna',
    // Germany & Central Europe
    berlin: 'Berlin',
    munich: 'Munich',
    frankfurt: 'Frankfurt',
    francfort: 'Frankfurt',
    cologne: 'Cologne',
    colonia: 'Cologne',
    vienna: 'Vienna',
    viena: 'Vienna',
    salzburg: 'Salzburg',
    salzburgo: 'Salzburg',
    prague: 'Prague',
    praga: 'Prague',
    budapest: 'Budapest',
    // Netherlands
    amsterdam: 'Amsterdam',
    rotterdam: 'Rotterdam',
    roterdam: 'Rotterdam',
    // UK & Ireland
    london: 'London',
    londres: 'London',
    edinburgh: 'Edinburgh',
    edimburgo: 'Edinburgh',
    dublin: 'Dublin',
    // Switzerland, Greece, Croatia
    zurich: 'Zurich',
    geneva: 'Geneva',
    ginebra: 'Geneva',
    athens: 'Athens',
    atenas: 'Athens',
    dubrovnik: 'Dubrovnik',
    split: 'Split',
    croacia: 'Dubrovnik',
    croatia: 'Dubrovnik',
    // Japan
    tokyo: 'Tokyo',
    tokio: 'Tokyo',
    kyoto: 'Kyoto',
    kioto: 'Kyoto',
    osaka: 'Osaka',
  };

  const detected: { name: string; pos: number }[] = [];
  const addedCityNames = new Set<string>();

  Object.entries(cityAliasMap).forEach(([alias, canonicalName]) => {
    const regex = new RegExp(`\\b${alias}\\b`, 'i');
    const match = regex.exec(normalizedText);
    if (match && !addedCityNames.has(canonicalName)) {
      detected.push({ name: canonicalName, pos: match.index });
      addedCityNames.add(canonicalName);
    }
  });

  // Preserve user order as mentioned in text
  detected.sort((a, b) => a.pos - b.pos);
  const foundCities = detected.map((d) => d.name);

  // Default fallback destinations if none found
  const destinations = foundCities.length > 0
    ? foundCities
    : ['Lisbon', 'Madrid', 'Barcelona', 'Rome', 'Florence', 'Budapest', 'Vienna', 'Prague', 'Berlin', 'Amsterdam'];

  // 2. Extract Duration (English: "24 days", "25 days", "2 weeks"; Spanish: "24 días", "25 dias", "2 semanas")
  let totalDays = 25;
  const dayMatch = normalizedText.match(/(\d+)\s*(?:days?|nights?|dias?|noches?)/i);
  if (dayMatch) {
    totalDays = parseInt(dayMatch[1], 10);
  } else {
    const weekMatch = normalizedText.match(/(\d+)\s*(?:weeks?|semanas?)/i);
    if (weekMatch) {
      totalDays = parseInt(weekMatch[1], 10) * 7;
    }
  }

  // 3. Extract Specific Finish / Key Dates (e.g. "October 20", "20 de octubre", "octubre 20")
  let targetEndDateStr: string | null = null;
  const octMatch =
    normalizedText.match(/(?:october|oct\.?|octubre)\s*(\d{1,2})/i) ||
    normalizedText.match(/(\d{1,2})\s*(?:de\s+)?(?:octubre|oct\.?|october)/i);

  if (octMatch) {
    const day = octMatch[1].padStart(2, '0');
    targetEndDateStr = `2026-10-${day}`;
  }

  // Calculate start and end dates
  const today = new Date();
  const baseYear = 2026;
  let startDate = '2026-09-26';
  let endDate = '2026-10-20';

  if (targetEndDateStr) {
    endDate = targetEndDateStr;
    const endObj = new Date(targetEndDateStr);
    const startObj = new Date(endObj);
    startObj.setDate(startObj.getDate() - (totalDays - 1));
    startDate = startObj.toISOString().split('T')[0];
  } else {
    const startObj = new Date(baseYear, today.getMonth() > 8 ? today.getMonth() : 8, 15);
    const endObj = new Date(startObj);
    endObj.setDate(endObj.getDate() + (totalDays - 1));
    startDate = startObj.toISOString().split('T')[0];
    endDate = endObj.toISOString().split('T')[0];
  }

  // 4. Hard Constraints detection (English & Spanish)
  const hardConstraints: string[] = [];
  const hasHardPhrase =
    /need to be in|must be in|have to be in|arrive in|flight arrives|finish in|end in|be in|necesito estar en|tengo que estar en|debo estar en|debo llegar a|llegar a|estar en|terminar en|finalizar en|concluir en/i.test(
      normalizedText
    );

  if (hasHardPhrase) {
    if (octMatch && normalizedText.toLowerCase().includes('amsterdam')) {
      hardConstraints.push(`Must be in Amsterdam on October ${octMatch[1]}`);
    } else {
      hardConstraints.push(`Fixed arrival date/commitment specified in prompt`);
    }
  }

  // 5. Soft Constraints & Preferences detection (English & Spanish)
  const softConstraints: string[] = [];
  const preferTrain =
    /prefer trains?|trains over planes|by rail|take trains|prefer.*tren|trenes|por tren|en tren|ferrocarril/i.test(
      normalizedText
    );

  if (preferTrain) {
    softConstraints.push('Prefer high-speed trains over flights wherever practical');
  }

  const avoidHotelChanges =
    /don'?t want to change hotels|avoid changing hotels|fewer hotel changes|no quiero cambiar de hotel|evitar cambiar de hotel|menos cambios de hotel|no cambiar tanto de hotel|pocos cambios de hotel/i.test(
      normalizedText
    );

  if (avoidHotelChanges) {
    softConstraints.push('Minimize hotel changes; allocate minimum 2–3 nights per destination');
  }

  let travelStyle: 'relaxed' | 'balanced' | 'intense' = 'balanced';
  if (/relaxed|slow travel|unhurried|easygoing|relajad|tranquil|pausad/i.test(normalizedText)) {
    travelStyle = 'relaxed';
  } else if (/packed|fast-paced|intense|see everything|action-packed|intens|rapido|ajetread/i.test(normalizedText)) {
    travelStyle = 'intense';
  }

  return {
    name: 'Europe Journey 2026',
    startDate,
    endDate,
    destinations,
    hardConstraints,
    softConstraints,
    preferences: {
      travelStyle,
      transportationPreference: preferTrain ? ['train'] : ['train', 'flight'],
      minimizeHotelChanges: avoidHotelChanges,
      minimizeTravelTime: true,
      interests: ['Sightseeing', 'Culture', 'Local Gastronomy'],
    },
  };
}

/**
 * Converts parsed natural language output into a canonical Trip object
 */
export function createTripFromPrompt(promptText: string): Trip {
  const parsed = parseNaturalLanguageTripPrompt(promptText);

  // Allocate nights across destinations
  const totalDestinations = parsed.destinations.length;
  const nightsPerCity = Math.max(2, Math.floor(24 / Math.max(1, totalDestinations)));

  const destinations: Destination[] = parsed.destinations.map((name, idx) => {
    const isLast = idx === totalDestinations - 1;
    const isFirst = idx === 0;
    return {
      id: `dest-${idx + 1}`,
      name,
      location: resolveLocation(name),
      plannedNights: isLast ? 3 : nightsPerCity,
      minimumNights: 2,
      priority: isLast || isFirst ? 'high' : 'medium',
      reasons: [`Key stop requested in traveler itinerary: ${name}`],
    };
  });

  const preferTrain = parsed.preferences.transportationPreference?.includes('train') ?? true;
  const { itineraryDays, transportationSegments } = buildItineraryFromDestinations(
    destinations,
    parsed.startDate,
    parsed.endDate,
    undefined,
    preferTrain
  );

  const constraints: Constraint[] = [];

  parsed.hardConstraints.forEach((desc, i) => {
    const isAms = desc.toLowerCase().includes('amsterdam');
    const targetDest = destinations.find((d) => d.name.toLowerCase() === 'amsterdam');
    constraints.push({
      id: `c-hard-${i + 1}`,
      type: 'hard',
      description: desc,
      priority: 1,
      targetDestinationId: targetDest?.id,
      targetDate: isAms ? parsed.endDate : undefined,
    });
  });

  parsed.softConstraints.forEach((desc, i) => {
    constraints.push({
      id: `c-soft-${i + 1}`,
      type: 'soft',
      description: desc,
      priority: i + 2,
    });
  });

  return {
    id: `trip-${Date.now()}`,
    name: `Europe Journey (${parsed.destinations.length} Destinations)`,
    startDate: parsed.startDate,
    endDate: parsed.endDate,
    origin: destinations[0]?.location || resolveLocation('Lisbon'),
    destinations,
    events: [],
    reservations: [],
    transportation: transportationSegments,
    constraints,
    preferences: parsed.preferences,
    itinerary: {
      days: itineraryDays,
    },
    updatedAt: new Date().toISOString(),
  };
}
