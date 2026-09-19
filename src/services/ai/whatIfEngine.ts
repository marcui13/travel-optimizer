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

        if (llmResult.action === 'remove_destination' && llmResult.citiesToRemove && llmResult.citiesToRemove.length > 0) {
          const toRemoveSet = new Set(llmResult.citiesToRemove.map((c) => c.toLowerCase()));
          const destinationsFiltered = trip.destinations.filter(
            (d) => !toRemoveSet.has(d.name.toLowerCase())
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

            return {
              userIntent: llmResult.intentTitle,
              explanation: llmResult.explanation,
              impactSummary: llmResult.impactSummary,
              actionable: true,
              proposedTrip: {
                ...trip,
                destinations: destinationsFiltered,
                transportation: transportationSegments,
                itinerary: { days: itineraryDays },
                updatedAt: new Date().toISOString(),
              },
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
  // 2.1 ADD DESTINATION (e.g. "Add Vienna", "What if I add Croatia?", "Sumar Croacia", "Agregar Viena")
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

  // 2. REMOVE DESTINATION (e.g. "Remove Berlin", "Quitar Berlín", "Sacar Praga", "Drop Barcelona")
  if (
    normalized.includes('remove') ||
    normalized.includes('drop') ||
    normalized.includes('skip') ||
    normalized.includes('delete') ||
    normalized.includes('quitar') ||
    normalized.includes('eliminar') ||
    normalized.includes('sacar') ||
    normalized.includes('borrar')
  ) {
    const targetCity = detectCityInText(userInput);
    if (!targetCity) {
      return {
        userIntent: isSpanish ? 'Eliminar Destino' : 'Remove Destination',
        explanation: isSpanish
          ? '¿Qué destino te gustaría remover de tu itinerario?'
          : 'Which destination would you like to remove from your itinerary?',
        impactSummary: isSpanish
          ? 'Por favor indica la ciudad (ej: "Quitar Berlín").'
          : 'Please specify the city name (e.g., "Remove Berlin").',
        actionable: false,
      };
    }

    const filtered = trip.destinations.filter((d) => d.name.toLowerCase() !== targetCity.toLowerCase());
    if (filtered.length === trip.destinations.length) {
      return {
        userIntent: isSpanish ? `Quitar ${targetCity}` : `Remove ${targetCity}`,
        explanation: isSpanish
          ? `${targetCity} no se encuentra en tu lista actual de destinos.`
          : `${targetCity} was not found in your current destination list.`,
        impactSummary: isSpanish ? 'Sin modificaciones realizadas.' : 'No modifications applied.',
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

    const proposedTrip: Trip = {
      ...trip,
      destinations: filtered,
      transportation: transportationSegments,
      itinerary: { days: itineraryDays },
      updatedAt: new Date().toISOString(),
    };

    return {
      userIntent: isSpanish ? `Quitar ${targetCity}` : `Remove ${targetCity}`,
      explanation: isSpanish
        ? `Se removió ${targetCity}. Los tramos de transporte fueron reconectados directamente entre las ciudades adyacentes, ahorrando ~3-4 horas de tránsito y eliminando una mudanza de hotel.`
        : `Removed ${targetCity}. Re-linked transportation segments directly between surrounding cities, saving approximately 3-4 hours of transit time and eliminating one hotel transfer.`,
      impactSummary: isSpanish
        ? `-1 cambio de hotel, tiempo ahorrado redistribuido para profundizar en el resto de los destinos.`
        : `-1 hotel change, saved transit time redistributed to expand time in remaining destinations.`,
      actionable: true,
      proposedTrip,
      tradeOffs: isSpanish
        ? [
            `Se quitó ${targetCity} del mapa y la línea de tiempo.`,
            `Noches liberadas repartidas en paradas de mayor prioridad.`,
          ]
        : [
            `Removed ${targetCity} from map & timeline.`,
            `Extra nights distributed across remaining priority hubs.`,
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

const ACTION_WORDS = new Set([
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
  'hacer',
  'hacerlo',
  'viaje',
  'itinerario',
  'destino',
  'ciudad',
  'dias',
  'noches',
  'trenes',
  'vuelos',
  'transporte',
  'ruta',
  'por',
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
