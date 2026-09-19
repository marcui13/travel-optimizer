import { GoogleGenerativeAI } from '@google/generative-ai';
import { Trip, OptimizationResult } from '../../domain/types';
import { extractFromImage, VisionExtractionResult } from './visionExtractor';
import { parseNaturalLanguageTripPrompt } from './localAiPlanner';
import { defaultOptimizer } from '../optimization/optimizer';

const STORAGE_KEY_GEMINI_API_KEY = 'travel_optimizer_gemini_api_key';
const STORAGE_KEY_GEMINI_MODEL = 'travel_optimizer_gemini_model';

export interface GeminiModelInfo {
  id: string;
  name: string;
  category: 'thinking' | 'reasoning' | 'fast';
  description: string;
  badge: string;
  badgeEn: string;
  recommendedFor: string;
  recommendedForEn: string;
}

export const GEMINI_MODELS: GeminiModelInfo[] = [
  {
    id: 'gemini-2.0-flash-thinking-exp-01-21',
    name: 'Gemini 2.0 Flash Thinking',
    category: 'thinking',
    description: 'Cadena de pensamiento explícita paso a paso. Ideal para itinerarios complejos, múltiples restricciones y análisis de compensaciones.',
    badge: 'Pensamiento Paso a Paso',
    badgeEn: 'Step-by-Step Thinking',
    recommendedFor: 'Itinerarios complejos y comparativas de ruta',
    recommendedForEn: 'Complex multi-constraint itineraries & trade-off analysis',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    category: 'reasoning',
    description: 'El modelo insignia de Google para razonamiento profundo, comprensión contextual extensa y planificación multivariable.',
    badge: 'Insignia / Razonamiento Profundo',
    badgeEn: 'Flagship / Deep Reasoning',
    recommendedFor: 'Planificación profunda y personalización avanzada',
    recommendedForEn: 'Deep planning & advanced customization',
  },
  {
    id: 'gemini-2.0-pro-exp-02-05',
    name: 'Gemini 2.0 Pro',
    category: 'reasoning',
    description: 'Alta capacidad analítica para resolución de fechas estrictas y optimización lógica.',
    badge: 'Lógica Avanzada',
    badgeEn: 'Advanced Logic',
    recommendedFor: 'Restricciones estrictas y resolución de conflictos',
    recommendedForEn: 'Strict constraints & schedule conflict resolution',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    category: 'fast',
    description: 'Última generación con excelente balance entre ultra-baja latencia y alta calidad de extracción.',
    badge: 'Rápido y Moderno',
    badgeEn: 'Fast & Modern',
    recommendedFor: 'Respuestas instantáneas y lectura de imágenes',
    recommendedForEn: 'Instant responses & rapid image parsing',
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    category: 'fast',
    description: 'Modelo de segunda generación balanceado para interacción conversacional rápida.',
    badge: 'Rápido v2.0',
    badgeEn: 'Fast v2.0',
    recommendedFor: 'Consultas rápidas',
    recommendedForEn: 'Rapid queries',
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    category: 'reasoning',
    description: 'Modelo maduro para análisis de documentos extensos y razonamiento contextual.',
    badge: 'Estable Pro',
    badgeEn: 'Stable Pro',
    recommendedFor: 'Documentos extensos y estabilidad',
    recommendedForEn: 'Long documents & stability',
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    category: 'fast',
    description: 'Modelo clásico de alta velocidad y bajo consumo de cuota.',
    badge: 'Estable Rápido',
    badgeEn: 'Stable Fast',
    recommendedFor: 'Uso general estándar',
    recommendedForEn: 'General standard use',
  },
];

export function getStoredApiKey(): string {
  return localStorage.getItem(STORAGE_KEY_GEMINI_API_KEY) || '';
}

export function setStoredApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEY_GEMINI_API_KEY, key.trim());
}

export function getStoredModel(): string {
  return localStorage.getItem(STORAGE_KEY_GEMINI_MODEL) || 'gemini-2.0-flash-thinking-exp-01-21';
}

export function setStoredModel(model: string): void {
  localStorage.setItem(STORAGE_KEY_GEMINI_MODEL, model);
}

export function isGeminiConfigured(): boolean {
  return !!getStoredApiKey();
}

/**
 * Executes a Gemini request if key is provided; otherwise gracefully falls back to local heuristic intelligence.
 */
export async function generateItineraryWithAi(
  prompt: string,
  onStatusUpdate?: (status: string) => void
): Promise<{ tripPromptParsed: ReturnType<typeof parseNaturalLanguageTripPrompt>; aiExplanation: string }> {
  const apiKey = getStoredApiKey();

  if (apiKey) {
    try {
      onStatusUpdate?.('Connecting to Gemini API...');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: getStoredModel() });

      const systemPrompt = `You are an AI travel planning architect for Travel Optimizer.
Given the user's travel request:
1. Extract the destination cities in logical order.
2. Determine start and end dates (format YYYY-MM-DD).
3. Identify hard constraints (e.g. fixed arrival date) and soft constraints.
4. Provide a brief 2-sentence rationale for the recommended route.
Return ONLY valid JSON matching this schema:
{
  "name": "string",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "destinations": ["City1", "City2", ...],
  "hardConstraints": ["string"],
  "softConstraints": ["string"],
  "aiExplanation": "string"
}`;

      onStatusUpdate?.('Analyzing constraints with Gemini...');
      const result = await model.generateContent([systemPrompt, prompt]);
      const responseText = result.response.text();

      // Extract json block
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          tripPromptParsed: {
            name: parsed.name || 'Custom Trip',
            startDate: parsed.startDate || '2026-09-26',
            endDate: parsed.endDate || '2026-10-20',
            destinations: parsed.destinations || [],
            hardConstraints: parsed.hardConstraints || [],
            softConstraints: parsed.softConstraints || [],
            preferences: {
              travelStyle: 'balanced',
              transportationPreference: ['train'],
              minimizeHotelChanges: true,
              minimizeTravelTime: true,
              interests: ['Sightseeing', 'Culture', 'Local Gastronomy'],
            },
          },
          aiExplanation: parsed.aiExplanation || 'Generated personalized travel itinerary using Gemini intelligence.',
        };
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to local heuristic engine:', err);
    }
  }

  // Built-in zero-latency heuristic engine
  onStatusUpdate?.('Processing with local travel reasoning engine...');
  const localParsed = parseNaturalLanguageTripPrompt(prompt);
  return {
    tripPromptParsed: localParsed,
    aiExplanation: 'Crafted with built-in travel optimization heuristics, balancing high-speed rail and hard date commitments.',
  };
}

/**
 * Analyzes multimodal image with Gemini or local vision simulation
 */
export async function analyzeImageWithAi(
  imageDataUrl: string,
  imageFileName?: string,
  onStatusUpdate?: (status: string) => void
): Promise<VisionExtractionResult> {
  const apiKey = getStoredApiKey();

  if (apiKey && imageDataUrl.startsWith('data:image')) {
    try {
      onStatusUpdate?.('Analyzing document with Gemini Vision...');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: getStoredModel() });

      const base64Data = imageDataUrl.split(',')[1];
      const mimeType = imageDataUrl.split(';')[0].split(':')[1] || 'image/jpeg';

      const prompt = `Analyze this travel document, ticket, calendar screenshot, or booking confirmation.
Extract any flight, train, hotel, or activity items.
Return ONLY valid JSON matching this schema:
{
  "detectedDocumentType": "flight_confirmation" | "hotel_voucher" | "calendar_screenshot" | "train_ticket" | "itinerary_note",
  "summary": "string",
  "items": [
    {
      "id": "string",
      "type": "flight" | "train" | "hotel" | "activity" | "event",
      "title": "string",
      "locationName": "CityName",
      "startDate": "YYYY-MM-DD",
      "startTime": "HH:mm",
      "endDate": "YYYY-MM-DD",
      "endTime": "HH:mm",
      "bookingRef": "string",
      "fixed": boolean,
      "confidence": "high" | "medium" | "low",
      "notes": "string",
      "selected": true
    }
  ]
}`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType,
          },
        },
      ]);

      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as VisionExtractionResult;
      }
    } catch (err) {
      console.warn('Gemini vision analysis failed, falling back to local vision extractor:', err);
    }
  }

  onStatusUpdate?.('Extracting reservations and dates...');
  return extractFromImage(imageDataUrl, imageFileName);
}

/**
 * Optimizes the trip using Gemini reasoning or deterministic optimizer
 */
export async function optimizeTripWithAi(
  trip: Trip,
  profile: 'efficient' | 'balanced' | 'relaxed',
  customInstruction?: string
): Promise<OptimizationResult> {
  // Always use the deterministic optimizer as foundation so hard constraints and geography are respected
  const baseResult = await defaultOptimizer.optimize(trip, {
    profile,
    userCustomGoal: customInstruction,
  });

  const apiKey = getStoredApiKey();
  if (apiKey && customInstruction) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: getStoredModel() });

      const prompt = `Travel Optimizer:
We are optimizing this itinerary with profile "${profile}".
User custom request: "${customInstruction}".
Current sequence: ${trip.destinations.map((d) => d.name).join(' -> ')}.
Hard constraints: ${trip.constraints.filter((c) => c.type === 'hard').map((c) => c.description).join('; ')}.

Provide a concise, thoughtful explanation of why this optimization benefits the traveler in 2 sentences max.`;

      const res = await model.generateContent(prompt);
      const aiText = res.response.text();
      if (aiText && aiText.trim()) {
        baseResult.explanation = aiText.trim();
      }
    } catch (err) {
      console.warn('Gemini explanation failed, keeping heuristic explanation:', err);
    }
  }

  return baseResult;
}
