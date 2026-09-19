export interface TripPromptAiResult {
  name: string;
  startDate: string;
  endDate: string;
  destinations: string[];
  hardConstraints: string[];
  softConstraints: string[];
  aiExplanation: string;
}

/**
 * Strict JSON Schema definition for Gemini generationConfig.responseSchema
 */
export const GEMINI_TRIP_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    startDate: { type: 'string', description: 'YYYY-MM-DD' },
    endDate: { type: 'string', description: 'YYYY-MM-DD' },
    destinations: {
      type: 'array',
      items: { type: 'string' },
      description: 'Ordered list of visited cities',
    },
    hardConstraints: {
      type: 'array',
      items: { type: 'string' },
    },
    softConstraints: {
      type: 'array',
      items: { type: 'string' },
    },
    aiExplanation: { type: 'string' },
  },
  required: ['name', 'startDate', 'endDate', 'destinations', 'aiExplanation'],
};

export const GEMINI_WHAT_IF_SCHEMA = {
  type: 'object',
  properties: {
    intentTitle: { type: 'string' },
    action: {
      type: 'string',
      enum: ['add_destination', 'remove_destination', 'replace_destination', 'reorder', 'change_pacing', 'custom_advice'],
    },
    citiesToAdd: {
      type: 'array',
      items: { type: 'string' },
    },
    citiesToRemove: {
      type: 'array',
      items: { type: 'string' },
    },
    travelStyle: {
      type: 'string',
      enum: ['relaxed', 'balanced', 'intense'],
    },
    explanation: { type: 'string' },
    impactSummary: { type: 'string' },
    tradeOffs: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['intentTitle', 'action', 'explanation', 'impactSummary', 'tradeOffs'],
};

export const GEMINI_VISION_SCHEMA = {
  type: 'object',
  properties: {
    detectedDocumentType: {
      type: 'string',
      enum: ['flight_confirmation', 'hotel_voucher', 'calendar_screenshot', 'train_ticket', 'itinerary_note'],
    },
    summary: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: {
            type: 'string',
            enum: ['flight', 'train', 'hotel', 'activity', 'event'],
          },
          title: { type: 'string' },
          locationName: { type: 'string' },
          startDate: { type: 'string' },
          startTime: { type: 'string' },
          endDate: { type: 'string' },
          endTime: { type: 'string' },
          bookingRef: { type: 'string' },
          fixed: { type: 'boolean' },
          confidence: {
            type: 'string',
            enum: ['high', 'medium', 'low'],
          },
          notes: { type: 'string' },
          selected: { type: 'boolean' },
        },
        required: ['id', 'type', 'title', 'locationName', 'startDate', 'fixed', 'selected'],
      },
    },
  },
  required: ['detectedDocumentType', 'summary', 'items'],
};

/**
 * Universal robust JSON extractor that handles markdown wrappers, trailing commas, or preamble text
 */
export function extractAndParseJson<T>(rawText: string, fallback: T): T {
  if (!rawText || typeof rawText !== 'string') return fallback;

  try {
    // 1. Clean markdown code fences
    let cleaned = rawText.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
    }

    // 2. Find outermost JSON object
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      cleaned = cleaned.substring(start, end + 1);
    }

    return JSON.parse(cleaned) as T;
  } catch (err) {
    console.warn('JSON parsing failed, falling back:', err, rawText);
    return fallback;
  }
}
