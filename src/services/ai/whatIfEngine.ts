import { Trip, Destination } from '../../domain/types';
import { resolveLocation, calculateDistanceKm } from '../geocoding/geocodingService';
import { buildItineraryFromDestinations } from '../../domain/tripHelpers';
import { defaultOptimizer } from '../optimization/optimizer';
import {
  interpretWhatIfWithLlm,
  getActiveProviderId,
  getModelForProvider,
  isCurrentProviderConfigured,
} from './aiClient';
import { AiProviderId } from './providers/types';

export interface WhatIfResponse {
  userIntent: string;
  explanation: string;
  impactSummary: string;
  actionable: boolean;
  proposedTrip?: Trip;
  tradeOffs?: string[];
  engineUsed?: AiProviderId | 'local';
  modelName?: string;
}

export const ACTION_WORDS = new Set([
  'agregar',
  'sumar',
  'anadir',
  'incluir',
  'visitar',
  'poner',
  'meter',
  'quitar',
  'eliminar',
  'sacar',
  'borrar',
  'remover',
  'cambiar',
  'reemplazar',
  'sustituir',
  'swap',
  'replace',
  'change',
  'cambio',
  'cambios',
  'hacer',
  'hacerlo',
  'viaje',
  'viajes',
  'itinerario',
  'itinerarios',
  'destino',
  'destinos',
  'ciudad',
  'ciudades',
  'recorridad',
  'recorrido',
  'recorridos',
  'recorrida',
  'dias',
  'noches',
  'trenes',
  'vuelos',
  'transporte',
  'ruta',
  'rutas',
  'por',
  'para',
  'con',
  'favor',
  'quiero',
  'puedo',
  'podria',
  'gustaria',
  'hola',
  'add',
  'remove',
  'trip',
  'days',
  'nights',
  'more',
  'less',
  'want',
  'could',
  'please',
]);

export function detectCityInText(text: string): string | null {
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

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
    // Spain
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
    // Portugal & Switzerland & Greece & Croatia
    lisbon: 'Lisbon',
    lisboa: 'Lisbon',
    porto: 'Porto',
    oporto: 'Porto',
    zurich: 'Zurich',
    geneva: 'Geneva',
    ginebra: 'Geneva',
    athens: 'Athens',
    atenas: 'Athens',
    dubrovnik: 'Dubrovnik',
    split: 'Split',
    croacia: 'Dubrovnik',
    croatia: 'Dubrovnik',
    // Scandinavia (Denmark, Sweden, Norway, Finland)
    copenhagen: 'Copenhagen',
    copenhague: 'Copenhagen',
    kobenhavn: 'Copenhagen',
    dinamarca: 'Copenhagen',
    malmo: 'Malmö',
    malmoe: 'Malmö',
    stockholm: 'Stockholm',
    estocolmo: 'Stockholm',
    suecia: 'Stockholm',
    gothenburg: 'Gothenburg',
    gotemburgo: 'Gothenburg',
    oslo: 'Oslo',
    noruega: 'Oslo',
    bergen: 'Bergen',
    helsinki: 'Helsinki',
    finlandia: 'Helsinki',
    // Northern & Eastern Germany, Poland
    hamburg: 'Hamburg',
    hamburgo: 'Hamburg',
    warsaw: 'Warsaw',
    varsovia: 'Warsaw',
    polonia: 'Warsaw',
    krakow: 'Krakow',
    cracovia: 'Krakow',
    // Japan
    tokyo: 'Tokyo',
    tokio: 'Tokyo',
    kyoto: 'Kyoto',
    kioto: 'Kyoto',
    osaka: 'Osaka',
  };

  for (const [alias, canonical] of Object.entries(cityAliasMap)) {
    if (new RegExp(`\\b${alias}\\b`, 'i').test(normalized)) {
      return canonical;
    }
  }

  // Fallback: check capitalized words, explicitly ignoring action words
  const words = text.split(/[\s,?.!¿¡]+/);
  for (const w of words) {
    const normW = w.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (w.length > 3 && /^[A-Z]/.test(w) && !ACTION_WORDS.has(normW)) {
      return w;
    }
  }
  return null;
}

export function matchesCity(dest: Destination, targetCity: string): boolean {
  if (!dest || !targetCity) return false;
  const tNorm = targetCity.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const dNorm = dest.name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (tNorm === dNorm) return true;
  if (dest.location?.name) {
    const locNorm = dest.location.name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (tNorm === locNorm) return true;
  }
  const resolvedTarget = resolveLocation(targetCity);
  if (resolvedTarget.name) {
    const resNorm = resolvedTarget.name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (resNorm === dNorm) return true;
  }
  return false;
}

export function cleanCityCandidate(str: string): string {
  return str
    .replace(/\b(?:la\s+)?ciudad\s+de\b/gi, '')
    .replace(/\b(?:del?|de\s+la|en\s+el|from|out\s+of)\s+(?:recorridad|recorrido|ruta|viaje|itinerario|trip|route)\b/gi, '')
    .replace(/\b(?:de\s+)?(?:recorridad|recorrido)\b/gi, '')
    .replace(/\b(?:ciudad|city)\b/gi, '')
    .replace(/^[¿¡!?,.]+|[¿¡!?,.]+$/g, '')
    .trim();
}

export interface CitySwapIntent {
  cityToRemove: string;
  cityToAdd: string;
}

export function detectCitySwap(text: string): CitySwapIntent | null {
  const clean = text.trim();

  const patterns = [
    // 1. Spanish: "cambiar / reemplazar / sustituir [ciudad1] por / con [ciudad2]"
    /(?:quiero\s+)?(?:cambiar|reemplazar|sustituir|swap)\s+(?:a\s+|la\s+ciudad\s+(?:de\s+)?)?([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+?)\s+(?:por|con|para|to|for|with)\s+(?:a\s+|la\s+ciudad\s+(?:de\s+)?)?([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+)/i,
    // 2. Spanish: "sacar / quitar / eliminar [ciudad1] y poner / agregar / sumar [ciudad2]"
    /(?:quiero\s+)?(?:sacar|quitar|eliminar|borrar|remove|drop)\s+(?:a\s+|la\s+ciudad\s+(?:de\s+)?)?([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+?)\s+(?:y|and)\s+(?:poner|agregar|sumar|anadir|incluir|add|put|include)\s+(?:a\s+|la\s+ciudad\s+(?:de\s+)?)?([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+)/i,
    // 3. English: "swap / replace / change [city1] for / with / to [city2]"
    /(?:i\s+want\s+to\s+)?(?:swap|replace|change)\s+([a-zA-Z\s]+?)\s+(?:for|with|to)\s+([a-zA-Z\s]+)/i,
    // 4. English: "remove / drop [city1] and add / put [city2]"
    /(?:i\s+want\s+to\s+)?(?:remove|drop)\s+([a-zA-Z\s]+?)\s+and\s+(?:add|put|include)\s+([a-zA-Z\s]+)/i,
  ];

  for (const pat of patterns) {
    const match = clean.match(pat);
    if (match) {
      const rawRemove = cleanCityCandidate(match[1]);
      const rawAdd = cleanCityCandidate(match[2]);

      const cityRemove = detectCityInText(rawRemove) || rawRemove;
      const cityAdd = detectCityInText(rawAdd) || rawAdd;

      if (cityRemove && cityAdd && cityRemove.toLowerCase() !== cityAdd.toLowerCase()) {
        return { cityToRemove: cityRemove, cityToAdd: cityAdd };
      }
    }
  }
  return null;
}

/**
 * Handles conversational What-If modifications on the canonical Trip object (English & Spanish)
 * Uses high-power LLM when configured, falling back seamlessly to deterministic geometry & heuristics.
 */
async function internalExecuteWhatIf(
  trip: Trip,
  userInput: string
): Promise<WhatIfResponse> {
  const normalized = userInput
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const isSpanish =
    /[áéíóúñ¿¡]/i.test(userInput) ||
    /agregar|sumar|anadir|quitar|eliminar|sacar|borrar|relajad|tranquil|trenes|vuelos|dias|noches|italia|espana|puedo|quiero/i.test(
      normalized
    );

  // 1. High-power LLM Reasoning (if provider configured)
  if (isCurrentProviderConfigured()) {
    try {
      const llmResult = await interpretWhatIfWithLlm(trip, userInput);
      if (llmResult) {
        const activeProvider = getActiveProviderId();
        const activeModel = getModelForProvider(activeProvider);

        if (llmResult.action === 'add_destination' && llmResult.citiesToAdd && llmResult.citiesToAdd.length > 0) {
          const targetCityName = llmResult.citiesToAdd[0];
          const newDestLoc = resolveLocation(targetCityName);
          const alreadyExists = trip.destinations.some(
            (d) => d.name.toLowerCase() === newDestLoc.name.toLowerCase()
          );

          if (alreadyExists) {
            return {
              userIntent: llmResult.intentTitle,
              explanation: isSpanish
                ? `¡${newDestLoc.name} ya forma parte de tu itinerario actual!`
                : `${newDestLoc.name} is already part of your active itinerary!`,
              impactSummary: isSpanish ? 'Sin modificaciones requeridas.' : 'No modifications required.',
              actionable: false,
              engineUsed: activeProvider,
              modelName: activeModel,
            };
          }

          const newDest: Destination = {
            id: `dest-whatif-${Date.now()}`,
            name: newDestLoc.name,
            location: newDestLoc,
            plannedNights: llmResult.suggestedStayNights?.[targetCityName] || 2,
            minimumNights: 2,
            priority: 'medium',
            reasons: [isSpanish ? 'Agregado vía IA de alta gama' : 'Added via advanced reasoning AI'],
          };

          // Geometric minimum detour insertion
          const destinationsCopy = [...trip.destinations];
          const hardAnchoredDestIds = new Set(
            trip.constraints
              .filter((c) => c.type === 'hard' && c.targetDestinationId)
              .map((c) => c.targetDestinationId!)
          );
          const isLastAnchored = hardAnchoredDestIds.has(destinationsCopy[destinationsCopy.length - 1]?.id);
          const startK = hardAnchoredDestIds.has(destinationsCopy[0]?.id) ? 1 : 0;
          const endK = isLastAnchored ? destinationsCopy.length - 1 : destinationsCopy.length;

          let bestInsertIndex = Math.max(1, destinationsCopy.length - 1);
          let minDetour = Infinity;

          for (let k = startK; k <= endK; k++) {
            let detour = 0;
            if (k === 0) {
              const next = destinationsCopy[0];
              if (newDestLoc.latitude && next?.location?.latitude) {
                detour = calculateDistanceKm(
                  newDestLoc.latitude,
                  newDestLoc.longitude || 0,
                  next.location.latitude,
                  next.location.longitude || 0
                );
              }
            } else if (k === destinationsCopy.length) {
              const prev = destinationsCopy[destinationsCopy.length - 1];
              if (prev?.location?.latitude && newDestLoc.latitude) {
                detour = calculateDistanceKm(
                  prev.location.latitude,
                  prev.location.longitude || 0,
                  newDestLoc.latitude,
                  newDestLoc.longitude || 0
                );
              }
            } else {
              const prev = destinationsCopy[k - 1];
              const next = destinationsCopy[k];
              if (prev?.location?.latitude && next?.location?.latitude && newDestLoc.latitude) {
                const distOld = calculateDistanceKm(
                  prev.location.latitude,
                  prev.location.longitude || 0,
                  next.location.latitude,
                  next.location.longitude || 0
                );
                const distToNew = calculateDistanceKm(
                  prev.location.latitude,
                  prev.location.longitude || 0,
                  newDestLoc.latitude,
                  newDestLoc.longitude || 0
                );
                const distFromNew = calculateDistanceKm(
                  newDestLoc.latitude,
                  newDestLoc.longitude || 0,
                  next.location.latitude,
                  next.location.longitude || 0
                );
                detour = distToNew + distFromNew - distOld;
              }
            }

            if (detour < minDetour) {
              minDetour = detour;
              bestInsertIndex = k;
            }
          }

          destinationsCopy.splice(bestInsertIndex, 0, newDest);

          const preferTrain = trip.preferences?.transportationPreference?.includes('train') ?? true;
          const { itineraryDays, transportationSegments } = buildItineraryFromDestinations(
            destinationsCopy,
            trip.startDate,
            trip.endDate,
            trip.itinerary.days,
            preferTrain
          );

          return {
            userIntent: llmResult.intentTitle,
            explanation: llmResult.explanation,
            impactSummary: llmResult.impactSummary,
            actionable: true,
            proposedTrip: {
              ...trip,
              destinations: destinationsCopy,
              transportation: transportationSegments,
              itinerary: { days: itineraryDays },
              updatedAt: new Date().toISOString(),
            },
            tradeOffs: llmResult.tradeOffs,
            engineUsed: activeProvider,
            modelName: activeModel,
          };
        }

        if (
          (llmResult.action === 'replace_destination' ||
            (Boolean(llmResult.citiesToRemove?.length) && Boolean(llmResult.citiesToAdd?.length))) &&
          llmResult.citiesToRemove?.[0] &&
          llmResult.citiesToAdd?.[0]
        ) {
          const cityToRemove = llmResult.citiesToRemove[0];
          const targetCityName = llmResult.citiesToAdd[0];
          const removeIndex = trip.destinations.findIndex((d) => matchesCity(d, cityToRemove));

          if (removeIndex !== -1) {
            const newDestLoc = resolveLocation(targetCityName);
            const originalDest = trip.destinations[removeIndex];
            const newDest: Destination = {
              id: `dest-whatif-${Date.now()}`,
              name: newDestLoc.name,
              location: newDestLoc,
              plannedNights: originalDest.plannedNights || 2,
              minimumNights: 2,
              priority: 'medium',
              reasons: [isSpanish ? `Reemplazo de ${originalDest.name} vía IA` : `Replaced ${originalDest.name} via AI`],
            };

            const swappedDestinations = [...trip.destinations];
            swappedDestinations[removeIndex] = newDest;

            const preferTrain = trip.preferences?.transportationPreference?.includes('train') ?? true;
            const { itineraryDays, transportationSegments } = buildItineraryFromDestinations(
              swappedDestinations,
              trip.startDate,
              trip.endDate,
              trip.itinerary.days,
              preferTrain
            );

            const intermediateTrip: Trip = {
              ...trip,
              destinations: swappedDestinations,
              transportation: transportationSegments,
              itinerary: { days: itineraryDays },
              updatedAt: new Date().toISOString(),
            };

            const optResult = await defaultOptimizer.optimize(intermediateTrip, { profile: 'efficient' });
            const proposedTrip: Trip = {
              ...intermediateTrip,
              destinations: optResult.proposedDestinations || intermediateTrip.destinations,
              transportation: optResult.proposedTransportation || intermediateTrip.transportation,
              itinerary: optResult.proposedItinerary || intermediateTrip.itinerary,
              updatedAt: new Date().toISOString(),
            };

            return {
              userIntent: llmResult.intentTitle,
              explanation: llmResult.explanation,
              impactSummary: llmResult.impactSummary,
              actionable: true,
              proposedTrip,
              tradeOffs: llmResult.tradeOffs,
              engineUsed: activeProvider,
              modelName: activeModel,
            };
          }
        }

        if (llmResult.action === 'remove_destination' && llmResult.citiesToRemove && llmResult.citiesToRemove.length > 0) {
          const toRemoveSet = new Set(llmResult.citiesToRemove.map((c) => c.toLowerCase()));
          const destinationsFiltered = trip.destinations.filter(
            (d) => !toRemoveSet.has(d.name.toLowerCase()) && !toRemoveSet.has(d.location?.name?.toLowerCase() || '')
          );

          if (destinationsFiltered.length < trip.destinations.length && destinationsFiltered.length >= 1) {
            const preferTrain = trip.preferences?.transportationPreference?.includes('train') ?? true;
            const { itineraryDays, transportationSegments } = buildItineraryFromDestinations(
              destinationsFiltered,
              trip.startDate,
              trip.endDate,
              trip.itinerary.days,
              preferTrain
            );

            const intermediateTrip: Trip = {
              ...trip,
              destinations: destinationsFiltered,
              transportation: transportationSegments,
              itinerary: { days: itineraryDays },
              updatedAt: new Date().toISOString(),
            };

            const optResult = await defaultOptimizer.optimize(intermediateTrip, { profile: 'efficient' });
            const proposedTrip: Trip = {
              ...intermediateTrip,
              destinations: optResult.proposedDestinations || intermediateTrip.destinations,
              transportation: optResult.proposedTransportation || intermediateTrip.transportation,
              itinerary: optResult.proposedItinerary || intermediateTrip.itinerary,
              updatedAt: new Date().toISOString(),
            };

            return {
              userIntent: llmResult.intentTitle,
              explanation: llmResult.explanation,
              impactSummary: llmResult.impactSummary,
              actionable: true,
              proposedTrip,
              tradeOffs: llmResult.tradeOffs,
              engineUsed: activeProvider,
              modelName: activeModel,
            };
          }
        }

        if (llmResult.action === 'change_pacing' && llmResult.travelStyle) {
          const newPreferences = {
            ...trip.preferences,
            travelStyle: llmResult.travelStyle,
          };
          const workingDests = trip.destinations.map((d) => ({
            ...d,
            plannedNights: llmResult.travelStyle === 'relaxed' ? Math.max(3, d.plannedNights || 2) : 2,
          }));

          const preferTrain = newPreferences.transportationPreference?.includes('train') ?? true;
          const { itineraryDays, transportationSegments } = buildItineraryFromDestinations(
            workingDests,
            trip.startDate,
            trip.endDate,
            trip.itinerary.days,
            preferTrain
          );

          return {
            userIntent: llmResult.intentTitle,
            explanation: llmResult.explanation,
            impactSummary: llmResult.impactSummary,
            actionable: true,
            proposedTrip: {
              ...trip,
              destinations: workingDests,
              preferences: newPreferences,
              transportation: transportationSegments,
              itinerary: { days: itineraryDays },
              updatedAt: new Date().toISOString(),
            },
            tradeOffs: llmResult.tradeOffs,
            engineUsed: activeProvider,
            modelName: activeModel,
          };
        }

        if (llmResult.action === 'custom_advice') {
          return {
            userIntent: llmResult.intentTitle,
            explanation: llmResult.explanation,
            impactSummary: llmResult.impactSummary,
            actionable: false,
            tradeOffs: llmResult.tradeOffs,
            engineUsed: activeProvider,
            modelName: activeModel,
          };
        }
      }
    } catch (err) {
      console.warn('LLM What-If execution failed, proceeding to heuristic fallback:', err);
    }
  }

  // 2. Built-in Local Heuristic Solver (Zero-latency / Offline / Fallback)
  // 2.1 SWAP / REPLACE DESTINATION (e.g. "quiero cambiar x ciudad por y ciudad", "cambiar París por Brujas", "sacar X y poner Y")
  const swapIntent = detectCitySwap(userInput);
  if (swapIntent) {
    const { cityToRemove, cityToAdd } = swapIntent;

    const removeIndex = trip.destinations.findIndex((d) => matchesCity(d, cityToRemove));
    if (removeIndex === -1) {
      return {
        userIntent: isSpanish
          ? `Cambiar ${cityToRemove} por ${cityToAdd}`
          : `Swap ${cityToRemove} for ${cityToAdd}`,
        explanation: isSpanish
          ? `"${cityToRemove}" no se encuentra en tu lista actual de destinos.`
          : `"${cityToRemove}" was not found in your current destination list.`,
        impactSummary: isSpanish
          ? `Destinos actuales: ${trip.destinations.map((d) => d.name).join(', ')}.`
          : `Current destinations: ${trip.destinations.map((d) => d.name).join(', ')}.`,
        actionable: false,
      };
    }

    const originalDest = trip.destinations[removeIndex];
    const newLoc = resolveLocation(cityToAdd);

    // Check if new destination already exists in trip (other than the slot being replaced)
    const alreadyExists = trip.destinations.some(
      (d, idx) => idx !== removeIndex && matchesCity(d, newLoc.name)
    );
    if (alreadyExists) {
      return {
        userIntent: isSpanish
          ? `Cambiar ${originalDest.name} por ${newLoc.name}`
          : `Swap ${originalDest.name} for ${newLoc.name}`,
        explanation: isSpanish
          ? `¡${newLoc.name} ya forma parte de tu itinerario actual!`
          : `${newLoc.name} is already part of your active itinerary!`,
        impactSummary: isSpanish ? 'Sin modificaciones requeridas.' : 'No modifications required.',
        actionable: false,
      };
    }

    const newDest: Destination = {
      id: `dest-whatif-${Date.now()}`,
      name: newLoc.name,
      location: newLoc,
      plannedNights: originalDest.plannedNights || 2,
      minimumNights: 2,
      priority: 'medium',
      reasons: [
        isSpanish
          ? `Reemplazo de ${originalDest.name} vía What-If`
          : `Replaced ${originalDest.name} via What-If`,
      ],
    };

    const swappedDestinations = [...trip.destinations];
    swappedDestinations[removeIndex] = newDest;

    const preferTrain = trip.preferences?.transportationPreference?.includes('train') ?? true;
    const { itineraryDays, transportationSegments } = buildItineraryFromDestinations(
      swappedDestinations,
      trip.startDate,
      trip.endDate,
      trip.itinerary.days,
      preferTrain
    );

    const intermediateTrip: Trip = {
      ...trip,
      destinations: swappedDestinations,
      transportation: transportationSegments,
      itinerary: { days: itineraryDays },
      updatedAt: new Date().toISOString(),
    };

    // Automatic route reordering and optimization
    const optResult = await defaultOptimizer.optimize(intermediateTrip, { profile: 'efficient' });
    const proposedTrip: Trip = {
      ...intermediateTrip,
      destinations: optResult.proposedDestinations || intermediateTrip.destinations,
      transportation: optResult.proposedTransportation || intermediateTrip.transportation,
      itinerary: optResult.proposedItinerary || intermediateTrip.itinerary,
      updatedAt: new Date().toISOString(),
    };

    return {
      userIntent: isSpanish
        ? `Cambiar ${originalDest.name} por ${newLoc.name} y reoptimizar recorrido`
        : `Swap ${originalDest.name} for ${newLoc.name} and re-optimize route`,
      explanation: isSpanish
        ? `Se sustituyó ${originalDest.name} por ${newLoc.name}. El recorrido completo fue reordenado y optimizado automáticamente para garantizar la secuencia geográfica más coherente, recalculando trenes de alta velocidad y respetando tu llegada final.`
        : `Replaced ${originalDest.name} with ${newLoc.name}. The entire itinerary was automatically re-ordered and optimized for optimal geographic flow, recalculating rail connections and preserving arrival deadlines.`,
      impactSummary: isSpanish
        ? `Cambio: ${originalDest.name} ➔ ${newLoc.name}. Recorrido reoptimizado automáticamente con nuevas conexiones.`
        : `Swapped: ${originalDest.name} ➔ ${newLoc.name}. Route automatically re-optimized with updated transit legs.`,
      actionable: true,
      proposedTrip,
      tradeOffs: isSpanish
        ? [
            `Se eliminó ${originalDest.name} e ingresó ${newLoc.name} al itinerario.`,
            `El orden de las ciudades se optimizó automáticamente para minimizar horas de tránsito.`,
            `Tramos de transporte actualizados para conectar las ciudades adyacentes.`,
          ]
        : [
            `Removed ${originalDest.name} and added ${newLoc.name} to itinerary.`,
            `City sequence automatically optimized to minimize travel hours.`,
            `Transportation segments refreshed for the new geographic route.`,
          ],
    };
  }

  // 2.2 REMOVE DESTINATION (e.g. "quiero eliminar x ciudad de recorridad", "Quitar Berlín", "Sacar Praga", "Drop Barcelona")
  const isRemoval =
    normalized.includes('remove') ||
    normalized.includes('drop') ||
    normalized.includes('skip') ||
    normalized.includes('delete') ||
    normalized.includes('quitar') ||
    normalized.includes('eliminar') ||
    normalized.includes('sacar') ||
    normalized.includes('borrar') ||
    normalized.includes('remover');

  if (isRemoval) {
    let targetCity: string | null = null;
    const removeMatch = userInput.match(
      /(?:quitar|eliminar|sacar|borrar|remover|remove|drop|delete)\s+(?:a\s+|la\s+ciudad\s+(?:de\s+)?)?([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+?)(?:\s+(?:de|del|de\s+la|from)\s+(?:recorridad|recorrido|ruta|viaje|itinerario)|$|[¿¡!?,.])/i
    );
    if (removeMatch && removeMatch[1]) {
      const candidate = cleanCityCandidate(removeMatch[1]);
      if (candidate && !ACTION_WORDS.has(candidate.toLowerCase())) {
        targetCity = detectCityInText(candidate) || candidate;
      }
    }

    if (!targetCity) {
      targetCity = detectCityInText(userInput);
    }

    if (!targetCity) {
      return {
        userIntent: isSpanish ? 'Eliminar Destino' : 'Remove Destination',
        explanation: isSpanish
          ? '¿Qué destino te gustaría remover de tu itinerario?'
          : 'Which destination would you like to remove from your itinerary?',
        impactSummary: isSpanish
          ? 'Por favor indica la ciudad (ej: "Quiero eliminar Barcelona de recorridad").'
          : 'Please specify the city name (e.g., "Remove Berlin").',
        actionable: false,
      };
    }

    const filtered = trip.destinations.filter((d) => !matchesCity(d, targetCity!));
    if (filtered.length === trip.destinations.length) {
      return {
        userIntent: isSpanish ? `Quitar ${targetCity}` : `Remove ${targetCity}`,
        explanation: isSpanish
          ? `"${targetCity}" no se encuentra en tu lista actual de destinos.`
          : `"${targetCity}" was not found in your current destination list.`,
        impactSummary: isSpanish
          ? `Destinos actuales: ${trip.destinations.map((d) => d.name).join(', ')}.`
          : `Current destinations: ${trip.destinations.map((d) => d.name).join(', ')}.`,
        actionable: false,
      };
    }

    if (filtered.length < 1) {
      return {
        userIntent: isSpanish ? `Quitar ${targetCity}` : `Remove ${targetCity}`,
        explanation: isSpanish
          ? 'No es posible dejar el itinerario sin ningún destino.'
          : 'Cannot remove all destinations from the itinerary.',
        impactSummary: isSpanish ? 'Se requiere al menos 1 destino.' : 'At least 1 destination required.',
        actionable: false,
      };
    }

    const preferTrain = trip.preferences?.transportationPreference?.includes('train') ?? true;
    const { itineraryDays, transportationSegments } = buildItineraryFromDestinations(
      filtered,
      trip.startDate,
      trip.endDate,
      trip.itinerary.days,
      preferTrain
    );

    const intermediateTrip: Trip = {
      ...trip,
      destinations: filtered,
      transportation: transportationSegments,
      itinerary: { days: itineraryDays },
      updatedAt: new Date().toISOString(),
    };

    // Automatic route reordering and optimization
    const optResult = await defaultOptimizer.optimize(intermediateTrip, { profile: 'efficient' });
    const proposedTrip: Trip = {
      ...intermediateTrip,
      destinations: optResult.proposedDestinations || intermediateTrip.destinations,
      transportation: optResult.proposedTransportation || intermediateTrip.transportation,
      itinerary: optResult.proposedItinerary || intermediateTrip.itinerary,
      updatedAt: new Date().toISOString(),
    };

    return {
      userIntent: isSpanish
        ? `Eliminar ${targetCity} y reoptimizar recorrido`
        : `Remove ${targetCity} and re-optimize route`,
      explanation: isSpanish
        ? `Se removió ${targetCity} del itinerario y el recorrido restante fue reordenado y optimizado automáticamente. Se eliminaron desvíos geográficos, ahorrando horas de tránsito y reconectando los tramos restantes de forma continua.`
        : `Removed ${targetCity} from the itinerary and automatically re-ordered and optimized the remaining route. Backtracking was eliminated, saving transit hours and seamlessly linking remaining legs.`,
      impactSummary: isSpanish
        ? `-1 destino (${targetCity}). Recorrido reoptimizado automáticamente con conexiones directas.`
        : `-1 destination (${targetCity}). Route automatically re-optimized with direct transit connections.`,
      actionable: true,
      proposedTrip,
      tradeOffs: isSpanish
        ? [
            `Se quitó ${targetCity} del mapa y la línea de tiempo.`,
            `El recorrido se reordenó automáticamente para maximizar la eficiencia geográfica.`,
            `Noches liberadas redistribuidas armónicamente respetando tu llegada final (${trip.endDate}).`,
          ]
        : [
            `Removed ${targetCity} from map & timeline.`,
            `Route sequence automatically optimized for geographic efficiency.`,
            `Freed nights redistributed across remaining stops respecting your finish date (${trip.endDate}).`,
          ],
    };
  }

  // 2.3 ADD DESTINATION (e.g. "Add Vienna", "What if I add Croatia?", "Sumar Croacia", "Agregar Viena")
  if (
    normalized.includes('add') ||
    normalized.includes('fit') ||
    normalized.includes('include') ||
    normalized.includes('visit') ||
    normalized.includes('agregar') ||
    normalized.includes('sumar') ||
    normalized.includes('anadir') ||
    normalized.includes('incluir') ||
    normalized.includes('visitar')
  ) {
    const targetCity =
      detectCityInText(userInput) ||
      (normalized.includes('croacia') || normalized.includes('croatia') ? 'Dubrovnik' : 'Vienna');

    // Check if already in trip
    const exists = trip.destinations.some((d) => d.name.toLowerCase() === targetCity.toLowerCase());
    if (exists) {
      return {
        userIntent: isSpanish ? `Agregar ${targetCity}` : `Add ${targetCity}`,
        explanation: isSpanish
          ? `¡${targetCity} ya está incluida en tu itinerario actual!`
          : `${targetCity} is already included in your itinerary!`,
        impactSummary: isSpanish ? 'No se requieren modificaciones.' : 'No changes required.',
        actionable: false,
      };
    }

    const newDestLoc = resolveLocation(targetCity);
    const newDest: Destination = {
      id: `dest-whatif-${Date.now()}`,
      name: newDestLoc.name || targetCity,
      location: newDestLoc,
      plannedNights: 2,
      minimumNights: 2,
      priority: 'medium',
      reasons: [isSpanish ? 'Agregado mediante escenario What-If' : 'Added via conversational What-If scenario'],
    };

    // Find geographically optimal insertion spot using Minimum Detour Insertion
    const destinationsCopy = [...trip.destinations];
    let bestInsertIndex = Math.max(1, destinationsCopy.length - 1);
    let minDetour = Infinity;

    const hardAnchoredDestIds = new Set(
      trip.constraints
        .filter((c) => c.type === 'hard' && c.targetDestinationId)
        .map((c) => c.targetDestinationId!)
    );

    const isFirstAnchored = hardAnchoredDestIds.has(destinationsCopy[0]?.id);
    const isLastAnchored = hardAnchoredDestIds.has(destinationsCopy[destinationsCopy.length - 1]?.id);

    const startK = isFirstAnchored ? 1 : 0;
    const endK = isLastAnchored ? destinationsCopy.length - 1 : destinationsCopy.length;

    for (let k = startK; k <= endK; k++) {
      let detour = 0;
      if (k === 0) {
        const next = destinationsCopy[0];
        if (newDestLoc.latitude && next?.location?.latitude) {
          detour = calculateDistanceKm(
            newDestLoc.latitude,
            newDestLoc.longitude || 0,
            next.location.latitude,
            next.location.longitude || 0
          );
        }
      } else if (k === destinationsCopy.length) {
        const prev = destinationsCopy[destinationsCopy.length - 1];
        if (prev?.location?.latitude && newDestLoc.latitude) {
          detour = calculateDistanceKm(
            prev.location.latitude,
            prev.location.longitude || 0,
            newDestLoc.latitude,
            newDestLoc.longitude || 0
          );
        }
      } else {
        const prev = destinationsCopy[k - 1];
        const next = destinationsCopy[k];
        if (prev?.location?.latitude && next?.location?.latitude && newDestLoc.latitude) {
          const distOld = calculateDistanceKm(
            prev.location.latitude,
            prev.location.longitude || 0,
            next.location.latitude,
            next.location.longitude || 0
          );
          const distToNew = calculateDistanceKm(
            prev.location.latitude,
            prev.location.longitude || 0,
            newDestLoc.latitude,
            newDestLoc.longitude || 0
          );
          const distFromNew = calculateDistanceKm(
            newDestLoc.latitude,
            newDestLoc.longitude || 0,
            next.location.latitude,
            next.location.longitude || 0
          );
          detour = distToNew + distFromNew - distOld;
        }
      }

      if (detour < minDetour) {
        minDetour = detour;
        bestInsertIndex = k;
      }
    }

    destinationsCopy.splice(bestInsertIndex, 0, newDest);

    // Rebuild itinerary
    const preferTrain = trip.preferences?.transportationPreference?.includes('train') ?? true;
    const { itineraryDays, transportationSegments } = buildItineraryFromDestinations(
      destinationsCopy,
      trip.startDate,
      trip.endDate,
      trip.itinerary.days,
      preferTrain
    );

    const proposedTrip: Trip = {
      ...trip,
      destinations: destinationsCopy,
      transportation: transportationSegments,
      itinerary: { days: itineraryDays },
      updatedAt: new Date().toISOString(),
    };

    const prevCity = destinationsCopy[bestInsertIndex - 1]?.name;
    const lastCity = trip.destinations[trip.destinations.length - 1]?.name;

    return {
      userIntent: isSpanish ? `Agregar ${targetCity} al viaje` : `Add ${targetCity} to trip`,
      explanation: isSpanish
        ? `Encontré una inserción de ruta eficiente para ${targetCity} justo después de ${prevCity}. Las noches se rebalancearon armónicamente respetando estrictamente tu llegada fijada en ${lastCity}.`
        : `I found a feasible route insertion for ${targetCity} right after ${prevCity}. Nights were gently adjusted to fit your total duration while strictly respecting your fixed arrival in ${lastCity}.`,
      impactSummary: isSpanish
        ? `+1 destino, 2 noches en ${targetCity}. Conexiones de tránsito integradas sin demoras.`
        : `+1 destination, 2 nights in ${targetCity}. Reconnected scenic transit routes.`,
      actionable: true,
      proposedTrip,
      tradeOffs: isSpanish
        ? [
            `Estadías en ciudades contiguas balanceadas para mantener tu fecha de cierre (${trip.endDate}).`,
            `Se agregó 1 tramo panorámico en tren o vuelo corto.`,
          ]
        : [
            `Stay in adjacent cities re-balanced to maintain fixed finish date (${trip.endDate}).`,
            `Added 1 seamless rail or short flight connection.`,
          ],
    };
  }

  // 3. MORE TIME IN A SPECIFIC COUNTRY OR REGION
  if (
    normalized.includes('more day') ||
    normalized.includes('more time') ||
    normalized.includes('extend') ||
    normalized.includes('mas tiempo') ||
    normalized.includes('mas dias') ||
    normalized.includes('dias mas')
  ) {
    const isItaly = normalized.includes('italy') || normalized.includes('italia') || normalized.includes('roma');
    const isSpain = normalized.includes('spain') || normalized.includes('espana') || normalized.includes('madrid');

    const destinationsCopy = trip.destinations.map((d) => ({ ...d }));

    destinationsCopy.forEach((d) => {
      const match = isItaly
        ? ['rome', 'florence', 'venice'].includes(d.name.toLowerCase())
        : isSpain
        ? ['madrid', 'barcelona', 'seville'].includes(d.name.toLowerCase())
        : false;

      if (match) {
        d.plannedNights = (d.plannedNights || 2) + 1;
      }
    });

    const preferTrain = trip.preferences?.transportationPreference?.includes('train') ?? true;
    const { itineraryDays, transportationSegments } = buildItineraryFromDestinations(
      destinationsCopy,
      trip.startDate,
      trip.endDate,
      trip.itinerary.days,
      preferTrain
    );

    const proposedTrip: Trip = {
      ...trip,
      destinations: destinationsCopy,
      transportation: transportationSegments,
      itinerary: { days: itineraryDays },
      updatedAt: new Date().toISOString(),
    };

    return {
      userIntent: isSpanish
        ? isItaly
          ? 'Ampliar estadía en Italia'
          : isSpain
          ? 'Ampliar estadía en España'
          : 'Extender estadías'
        : isItaly
        ? 'Extend stay in Italy'
        : isSpain
        ? 'Extend stay in Spain'
        : 'Extend stay in key cities',
      explanation: isSpanish
        ? `Se agregaron noches adicionales a los principales centros culturales (${
            isItaly ? 'Roma y Florencia' : isSpain ? 'Madrid y Barcelona' : 'paradas clave'
          }), permitiendo visitas tranquilas y mayor inmersión gastronómica.`
        : `Extended stay by giving additional nights to cultural hubs (${
            isItaly ? 'Rome & Florence' : isSpain ? 'Madrid & Barcelona' : 'central stops'
          }). Day schedules adjusted with unhurried cultural and culinary experiences.`,
      impactSummary: isSpanish
        ? `+2 noches sumadas en la región elegida sin retrasar tu llegada final.`
        : `Extended stay by +2 nights in selected region without compromising downstream arrivals.`,
      actionable: true,
      proposedTrip,
    };
  }

  // 4. STYLE ADJUSTMENT: RELAXED
  if (
    normalized.includes('relax') ||
    normalized.includes('slow down') ||
    normalized.includes('less rush') ||
    normalized.includes('relaj') ||
    normalized.includes('tranquil') ||
    normalized.includes('menos apuro')
  ) {
    const optResult = await defaultOptimizer.optimize(trip, { profile: 'relaxed' });
    const proposedTrip: Trip = {
      ...trip,
      destinations: optResult.proposedDestinations || trip.destinations,
      transportation: optResult.proposedTransportation || trip.transportation,
      itinerary: optResult.proposedItinerary || trip.itinerary,
      preferences: { ...trip.preferences, travelStyle: 'relaxed' },
      updatedAt: new Date().toISOString(),
    };

    return {
      userIntent: isSpanish ? 'Hacer el viaje más relajado' : 'Make trip more relaxed',
      explanation: isSpanish
        ? 'Itinerario adaptado a ritmo Relajado: mínimo 3 noches por ciudad clave, salidas matinales sin apuro y eliminación de tramos consecutivos apresurados.'
        : 'Converted itinerary to Relaxed pacing: minimum 3 nights per major hub, unhurried morning departure windows, and eliminated tight consecutive transit legs.',
      impactSummary: isSpanish
        ? 'Ritmo cambiado a Relajado: menor densidad diaria de actividades y más tardes libres.'
        : 'Pacing shifted to Relaxed: lower daily activity density, more free time blocks.',
      actionable: true,
      proposedTrip,
    };
  }

  // 5. TRAINS ONLY / NO FLIGHTS
  if (
    normalized.includes('trains only') ||
    normalized.includes('no flights') ||
    normalized.includes('prefer train') ||
    normalized.includes('solo tren') ||
    normalized.includes('sin vuelos') ||
    normalized.includes('unicamente tren')
  ) {
    const updatedSegments = trip.transportation.map((s) => ({
      ...s,
      mode: 'train' as const,
      source: 'user' as const,
      notes: isSpanish
        ? 'Cambiado a tren de alta velocidad europeo a pedido del usuario.'
        : 'Switched to European High-Speed Rail per user request.',
    }));

    const proposedTrip: Trip = {
      ...trip,
      transportation: updatedSegments,
      preferences: {
        ...trip.preferences,
        transportationPreference: ['train'],
      },
      updatedAt: new Date().toISOString(),
    };

    return {
      userIntent: isSpanish
        ? 'Solo trenes (sin vuelos de cabotaje)'
        : 'Prefer trains only (no domestic flights)',
      explanation: isSpanish
        ? 'Se reemplazaron todos los vuelos internos por tramos panorámicos en tren de alta velocidad (AVE, Frecciarossa, Eurostar, Nightjet).'
        : 'Replaced domestic flight hops with scenic high-speed European rail segments (AVE, Frecciarossa, Eurostar, Nightjet).',
      impactSummary: isSpanish
        ? '100% transporte ferroviario en Europa. Cero molestias en aeropuertos.'
        : '100% rail travel across Europe. Zero airport security hassle.',
      actionable: true,
      proposedTrip,
    };
  }

  // Default fallback response
  return {
    userIntent: isSpanish ? 'Consulta What-If' : 'Custom What-If Inquiry',
    explanation: isSpanish
      ? `Analicé "${userInput}". Puedo reordenar tus destinos, cambiar medios de transporte, extender estadías en cualquier ciudad o suavizar el ritmo.`
      : `I evaluated "${userInput}". I can adjust your destination order, swap transport modes, expand stay nights in any city, or rebalance pacing.`,
    impactSummary: isSpanish
      ? 'Prueba pedidos como: "Sumar Croacia", "Quitar Berlín", "Hacerlo más relajado" o "Dame dos días más en Italia".'
      : 'Try requests like: "Add Croatia", "Remove Berlin", "Make it more relaxed", or "Give me two more days in Italy".',
    actionable: false,
  };
}

export async function executeWhatIfScenario(
  trip: Trip,
  userInput: string
): Promise<WhatIfResponse> {
  const result = await internalExecuteWhatIf(trip, userInput);
  return {
    ...result,
    engineUsed: result.engineUsed || 'local',
    modelName: result.modelName || 'Local Engine',
  };
}
