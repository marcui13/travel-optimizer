import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('react-native-mmkv', () => ({
  createMMKV: () => null,
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    getAllKeys: vi.fn(async () => []),
    multiGet: vi.fn(async () => []),
  },
}));

vi.mock('expo-constants', () => ({
  default: {
    appOwnership: 'expo',
    executionEnvironment: 'storeClient',
  },
  ExecutionEnvironment: {
    StoreClient: 'storeClient',
    Bare: 'bare',
    Standalone: 'standalone',
  },
}));

import * as storage from '../services/mobileStorage';
import { calculateTripStatistics, formatMinutesToHours } from '../../src/domain/statistics';
import { executeWhatIfScenario } from '../../src/services/ai/whatIfEngine';
import { defaultOptimizer } from '../../src/services/optimization/optimizer';
import { createTripFromPrompt } from '../../src/services/ai/localAiPlanner';
import { encodeTripToShareUrl, generateTripSummaryText } from '../../src/services/sharing/shareService';
import { resetTripWithCustomParams } from '../../src/domain/tripHelpers';

describe('Mobile App End-to-End Integration Suite', () => {
  beforeEach(() => {
    storage.mobileStorageDriver.clear?.();
  });

  it('1. Initializes storage with Grand Tour trip and calculates mobile metrics', () => {
    const history = storage.loadTripHistory();
    expect(history.length).toBeGreaterThanOrEqual(1);

    const activeTrip = storage.getActiveTrip(history);
    expect(activeTrip).toBeDefined();
    expect(activeTrip.name).toBeDefined();

    const stats = calculateTripStatistics(activeTrip);
    expect(stats.destinationCount).toBe(activeTrip.destinations.length);
    expect(stats.nightsCount).toBeGreaterThan(0);
    expect(stats.totalDistanceKm).toBeGreaterThan(0);
    expect(formatMinutesToHours(stats.totalTravelMinutes)).toBeDefined();
  });

  it('2. Evaluates What-If natural language scenarios on mobile trip', async () => {
    const history = storage.loadTripHistory();
    const activeTrip = storage.getActiveTrip(history);

    const whatIfResult = await executeWhatIfScenario(
      activeTrip,
      'Hacer el recorrido más relajado con trenes'
    );

    expect(whatIfResult).toBeDefined();
    expect(whatIfResult.explanation).toBeDefined();
    expect(whatIfResult.impactSummary).toBeDefined();
    expect(typeof whatIfResult.actionable).toBe('boolean');
  });

  it('3. Runs heuristic profile optimizations (efficient, relaxed)', async () => {
    const history = storage.loadTripHistory();
    const activeTrip = storage.getActiveTrip(history);

    const efficientResult = await defaultOptimizer.optimize(activeTrip, { profile: 'efficient' });
    expect(efficientResult.profile).toBe('efficient');
    expect(efficientResult.explanation).toBeDefined();

    const relaxedResult = await defaultOptimizer.optimize(activeTrip, { profile: 'relaxed' });
    expect(relaxedResult.profile).toBe('relaxed');
    expect(relaxedResult.explanation).toBeDefined();
  });

  it('4. Creates a new mobile trip from natural language prompt', () => {
    const prompt = '2 semanas por España e Italia visitando Madrid, Barcelona y Roma en tren';
    const newTrip = createTripFromPrompt(prompt);

    expect(newTrip.name).toBeDefined();
    expect(newTrip.destinations.length).toBeGreaterThanOrEqual(2);

    const updatedLibrary = storage.upsertTrip(newTrip);
    expect(updatedLibrary.some((t) => t.id === newTrip.id)).toBe(true);
  });

  it('5. Resets trip with custom parameters and updates city chips', async () => {
    const history = storage.loadTripHistory();
    const activeTrip = storage.getActiveTrip(history);

    const resetResult = await resetTripWithCustomParams(activeTrip, {
      name: 'Viaje Personalizado 2026',
      startDate: '2026-11-01',
      endDate: '2026-11-15',
      cityNames: ['Madrid', 'Valencia', 'Sevilla'],
      travelStyle: 'relaxed',
      preferTrain: true,
    });

    expect(resetResult.name).toBe('Viaje Personalizado 2026');
    expect(resetResult.startDate).toBe('2026-11-01');
    expect(resetResult.destinations.length).toBe(3);
    expect(resetResult.destinations[0].name).toBe('Madrid');
    expect(resetResult.destinations[1].name).toBe('Valencia');
    expect(resetResult.destinations[2].name).toBe('Sevilla');
  });

  it('6. Generates valid canonical share URLs and formatted summary text for mobile', () => {
    const history = storage.loadTripHistory();
    const activeTrip = storage.getActiveTrip(history);

    const shareUrl = encodeTripToShareUrl(activeTrip);
    expect(shareUrl).toContain('#share=');

    const summaryTextEs = generateTripSummaryText(activeTrip, 'es', shareUrl);
    expect(summaryTextEs).toContain(activeTrip.name);
    expect(summaryTextEs).toContain(shareUrl);

    const summaryTextEn = generateTripSummaryText(activeTrip, 'en', shareUrl);
    expect(summaryTextEn).toContain(activeTrip.name);
    expect(summaryTextEn).toContain(shareUrl);
  });
});
