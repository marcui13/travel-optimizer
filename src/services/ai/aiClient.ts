import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiProviderId, WhatIfAiIntentResult } from './providers/types';
import { PROVIDER_CATALOG } from './providers/catalog';
import {
  TripPromptAiResult,
  extractAndParseJson,
  GEMINI_TRIP_SCHEMA,
  GEMINI_WHAT_IF_SCHEMA,
  GEMINI_VISION_SCHEMA,
} from './schemas/aiSchemas';
import { VisionExtractionResult, extractFromImage } from './visionExtractor';
import { parseNaturalLanguageTripPrompt } from './localAiPlanner';
import { Trip } from '../../domain/types';

const STORAGE_KEY_PROVIDER = 'travel_optimizer_ai_provider';
const STORAGE_PREFIX_KEY = 'travel_optimizer_key_';
const STORAGE_PREFIX_MODEL = 'travel_optimizer_model_';
const STORAGE_KEY_OLLAMA_URL = 'travel_optimizer_ollama_url';

function safeGetItem(key: string): string | null {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    return window.localStorage.getItem(key);
  }
  return null;
}

function safeSetItem(key: string, value: string): void {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    window.localStorage.setItem(key, value);
  }
}

export function getActiveProviderId(): AiProviderId {
  const stored = safeGetItem(STORAGE_KEY_PROVIDER) as AiProviderId;
  if (stored && PROVIDER_CATALOG[stored]) {
    return stored;
  }
  return 'gemini';
}

export function setActiveProviderId(provider: AiProviderId): void {
  safeSetItem(STORAGE_KEY_PROVIDER, provider);
}

export function getApiKeyForProvider(provider: AiProviderId): string {
  if (provider === 'gemini') {
    // Preserve backwards compatibility with legacy key
    const legacyKey = safeGetItem('travel_optimizer_gemini_api_key');
    if (legacyKey) return legacyKey;
  }
  return safeGetItem(`${STORAGE_PREFIX_KEY}${provider}`) || '';
}

export function setApiKeyForProvider(provider: AiProviderId, key: string): void {
  const trimmed = key.trim();
  safeSetItem(`${STORAGE_PREFIX_KEY}${provider}`, trimmed);
  if (provider === 'gemini') {
    safeSetItem('travel_optimizer_gemini_api_key', trimmed);
  }
}

export function getModelForProvider(provider: AiProviderId): string {
  const stored = safeGetItem(`${STORAGE_PREFIX_MODEL}${provider}`);
  if (stored) return stored;
  if (provider === 'gemini') {
    const legacy = safeGetItem('travel_optimizer_gemini_model');
    if (legacy) return legacy;
  }
  return PROVIDER_CATALOG[provider]?.defaultModel || 'gemini-2.0-flash-thinking-exp-01-21';
}

export function setModelForProvider(provider: AiProviderId, model: string): void {
  safeSetItem(`${STORAGE_PREFIX_MODEL}${provider}`, model);
  if (provider === 'gemini') {
    safeSetItem('travel_optimizer_gemini_model', model);
  }
}

export function getOllamaUrl(): string {
  return safeGetItem(STORAGE_KEY_OLLAMA_URL) || 'http://localhost:11434';
}

export function setOllamaUrl(url: string): void {
  safeSetItem(STORAGE_KEY_OLLAMA_URL, url.trim().replace(/\/+$/, ''));
}

export function isCurrentProviderConfigured(): boolean {
  if (typeof window === 'undefined') return false;
  const provider = getActiveProviderId();
  if (provider === 'ollama') return true;
  return !!getApiKeyForProvider(provider);
}

/**
 * Tests connection to the selected provider
 */
export async function testProviderConnection(
  providerId: AiProviderId,
  apiKey?: string,
  ollamaUrl?: string
): Promise<{ success: boolean; message: string }> {
  const key = apiKey !== undefined ? apiKey.trim() : getApiKeyForProvider(providerId);
  const model = getModelForProvider(providerId);

  try {
    if (providerId === 'gemini') {
      if (!key) return { success: false, message: 'Falta la clave API de Google Gemini.' };
      const genAI = new GoogleGenerativeAI(key);
      const m = genAI.getGenerativeModel({ model });
      const res = await m.generateContent('ping');
      if (res.response) {
        return { success: true, message: `Conexión exitosa con ${model}!` };
      }
    } else if (providerId === 'openai') {
      if (!key) return { success: false, message: 'Falta la clave API de OpenAI.' };
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: model.startsWith('o') ? model : 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Say "pong"' }],
          max_completion_tokens: 10,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, message: `Error OpenAI (${res.status}): ${err?.error?.message || res.statusText}` };
      }
      return { success: true, message: `Conexión exitosa con OpenAI (${model})!` };
    } else if (providerId === 'anthropic') {
      if (!key) return { success: false, message: 'Falta la clave API de Anthropic.' };
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Say "pong"' }],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, message: `Error Anthropic (${res.status}): ${err?.error?.message || res.statusText}` };
      }
      return { success: true, message: `Conexión exitosa con Anthropic (${model})!` };
    } else if (providerId === 'ollama') {
      const url = ollamaUrl || getOllamaUrl();
      const res = await fetch(`${url}/api/tags`, { method: 'GET' });
      if (!res.ok) {
        return { success: false, message: `No se pudo conectar a Ollama en ${url}. Verifica que Ollama esté ejecutándose.` };
      }
      const data = await res.json();
      const models = data?.models?.map((m: { name: string }) => m.name) || [];
      return {
        success: true,
        message: `Conexión exitosa con Ollama! Modelos locales disponibles: ${models.slice(0, 3).join(', ')}${models.length > 3 ? '...' : ''}`,
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Error de red: ${msg}` };
  }

  return { success: false, message: 'Proveedor no soportado.' };
}

/**
 * Universal LLM text-to-JSON completion dispatcher supporting all active providers
 */
async function callActiveLlmJson<T>(
  systemPrompt: string,
  userPrompt: string,
  fallback: T,
  schema?: object
): Promise<T> {
  const provider = getActiveProviderId();
  const apiKey = getApiKeyForProvider(provider);
  const model = getModelForProvider(provider);

  if (provider !== 'ollama' && !apiKey) {
    return fallback;
  }

  try {
    if (provider === 'gemini') {
      const genAI = new GoogleGenerativeAI(apiKey);
      const genModel = genAI.getGenerativeModel({
        model,
        generationConfig: {
          responseMimeType: 'application/json',
          ...(schema ? { responseSchema: schema as any } : {}),
        },
      });
      const result = await genModel.generateContent([systemPrompt, userPrompt]);
      return extractAndParseJson<T>(result.response.text(), fallback);
    }

    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content;
        return extractAndParseJson<T>(content, fallback);
      }
    }

    if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model,
          max_tokens: 3000,
          system: `${systemPrompt}\nReturn strictly a valid raw JSON object. Do NOT wrap in backticks or markdown preamble.`,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const content = json.content?.[0]?.text;
        return extractAndParseJson<T>(content, fallback);
      }
    }

    if (provider === 'ollama') {
      const url = getOllamaUrl();
      const res = await fetch(`${url}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: `${systemPrompt}\nOutput strictly valid JSON matching the requested schema.` },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content;
        return extractAndParseJson<T>(content, fallback);
      }
    }
  } catch (err) {
    console.warn(`[aiClient] Call to ${provider} (${model}) failed, returning fallback:`, err);
  }

  return fallback;
}

/**
 * Generates structured trip components from natural language prompt
 */
export async function generateItineraryWithAi(
  prompt: string,
  onStatusUpdate?: (status: string) => void
): Promise<{ tripPromptParsed: TripPromptAiResult; aiExplanation: string }> {
  if (isCurrentProviderConfigured()) {
    const provider = getActiveProviderId();
    const model = getModelForProvider(provider);
    onStatusUpdate?.(`Conectando con ${PROVIDER_CATALOG[provider]?.name || provider} (${model})...`);

    const systemPrompt = `You are a world-class travel planning architect for Travel Optimizer.
Given the traveler's request:
1. Extract destination cities in optimal geographic sequence.
2. Determine realistic start and end dates (format YYYY-MM-DD).
3. Identify hard constraints (e.g. fixed arrival date or flight) and soft preferences.
4. Provide a clear 2-sentence rationale explaining the route coherence.
Return ONLY valid JSON matching this schema:
{
  "name": "Trip Title",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "destinations": ["City1", "City2", ...],
  "hardConstraints": ["string"],
  "softConstraints": ["string"],
  "aiExplanation": "string"
}`;

    const fallback: TripPromptAiResult = {
      name: 'Custom Trip',
      startDate: '2026-09-26',
      endDate: '2026-10-20',
      destinations: [],
      hardConstraints: [],
      softConstraints: [],
      aiExplanation: '',
    };

    const parsed = await callActiveLlmJson<TripPromptAiResult>(
      systemPrompt,
      prompt,
      fallback,
      GEMINI_TRIP_SCHEMA
    );

    if (parsed.destinations.length > 0) {
      return {
        tripPromptParsed: parsed,
        aiExplanation:
          parsed.aiExplanation ||
          `Itinerario personalizado diseñado con la inteligencia de ${PROVIDER_CATALOG[provider]?.name || provider}.`,
      };
    }
  }

  // Local fallback
  onStatusUpdate?.('Procesando con motor heurístico local...');
  const local = parseNaturalLanguageTripPrompt(prompt);
  return {
    tripPromptParsed: {
      name: local.name,
      startDate: local.startDate,
      endDate: local.endDate,
      destinations: local.destinations,
      hardConstraints: local.hardConstraints,
      softConstraints: local.softConstraints,
      aiExplanation:
        'Diseñado con heurísticas locales de optimización, sincronizando trenes de alta velocidad y compromisos de fechas fijas.',
    },
    aiExplanation:
      'Diseñado con heurísticas locales de optimización, sincronizando trenes de alta velocidad y compromisos de fechas fijas.',
  };
}

/**
 * Analyzes multimodal travel documents with Gemini or local simulation
 */
export async function analyzeImageWithAi(
  imageDataUrl: string,
  imageFileName?: string,
  onStatusUpdate?: (status: string) => void
): Promise<VisionExtractionResult> {
  const provider = getActiveProviderId();
  const apiKey = getApiKeyForProvider(provider);

  // Gemini has native multimodal in SDK
  if (provider === 'gemini' && apiKey && imageDataUrl.startsWith('data:image')) {
    try {
      onStatusUpdate?.('Analizando documento con Gemini Vision...');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: getModelForProvider('gemini'),
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: GEMINI_VISION_SCHEMA as any,
        },
      });

      const base64Data = imageDataUrl.split(',')[1];
      const mimeType = imageDataUrl.split(';')[0].split(':')[1] || 'image/jpeg';

      const prompt = `Analyze this travel document, ticket, calendar screenshot, or booking voucher.
Extract all flight, train, hotel, or activity items with dates, times, and booking reference.`;

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
      const parsed = extractAndParseJson<VisionExtractionResult | null>(text, null);
      if (parsed && parsed.items && parsed.items.length > 0) {
        return parsed;
      }
    } catch (err) {
      console.warn('Gemini vision analysis failed, falling back to local extractor:', err);
    }
  }

  onStatusUpdate?.('Extrayendo reservas y fechas con motor local...');
  return extractFromImage(imageDataUrl, imageFileName);
}

/**
 * Evaluates conversational What-If intent using active LLM
 */
export async function interpretWhatIfWithLlm(
  trip: Trip,
  userInput: string
): Promise<WhatIfAiIntentResult | null> {
  if (!isCurrentProviderConfigured()) return null;

  const currentRoute = trip.destinations
    .map((d, i) => `${i + 1}. ${d.name} (${d.plannedNights || 2} noches)`)
    .join('\n');
  const hardConstraints = trip.constraints
    .filter((c) => c.type === 'hard')
    .map((c) => `- ${c.description}`)
    .join('\n');

  const systemPrompt = `You are the lead itinerary optimization reasoning agent for Travel Optimizer.
You assist travelers who ask "What-If" questions about their active trip.

Current active trip:
Name: "${trip.name}"
Date window: ${trip.startDate} to ${trip.endDate}
Destinations sequence:
${currentRoute}

Hard constraints (MUST be preserved):
${hardConstraints || 'None'}

The user asks: "${userInput}".

Analyze their intent and return strictly valid JSON matching this schema:
{
  "intentTitle": "Brief title of the intent (e.g. 'Agregar Brujas' or 'Make it more relaxed')",
  "action": "add_destination" | "remove_destination" | "reorder" | "change_pacing" | "custom_advice",
  "citiesToAdd": ["CityName"],
  "citiesToRemove": ["CityName"],
  "travelStyle": "relaxed" | "balanced" | "intense",
  "explanation": "Clear, friendly explanation in the SAME LANGUAGE as the user (Spanish if query is in Spanish, English if in English). Explain why this proposal works, what changes, and how the arrival commitment is respected in 2-3 sentences.",
  "impactSummary": "Concise bullet summary of the change (e.g. '+1 destino, 2 noches en Brujas. Trenes rebalanceados.')",
  "tradeOffs": ["Trade-off 1", "Trade-off 2"]
}`;

  const fallback: WhatIfAiIntentResult | null = null;
  return callActiveLlmJson<WhatIfAiIntentResult | null>(
    systemPrompt,
    userInput,
    fallback,
    GEMINI_WHAT_IF_SCHEMA
  );
}
