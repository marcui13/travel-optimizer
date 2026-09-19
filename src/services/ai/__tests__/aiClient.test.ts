import { describe, it, expect } from 'vitest';
import { PROVIDER_CATALOG } from '../providers/catalog';
import { extractAndParseJson } from '../schemas/aiSchemas';
import {
  getActiveProviderId,
  getModelForProvider,
  generateItineraryWithAi,
} from '../aiClient';
import { executeWhatIfScenario } from '../whatIfEngine';
import { getEuropeGrandTourSampleTrip } from '../../../domain/tripDefaults';

describe('Multi-Provider AI Intelligence & Structured Schemas', () => {
  describe('1. Provider Catalog & Frontier Models', () => {
    it('contains all 4 providers: Gemini, OpenAI, Claude, and Ollama', () => {
      const providers = Object.keys(PROVIDER_CATALOG);
      expect(providers).toContain('gemini');
      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
      expect(providers).toContain('ollama');
    });

    it('includes Google Gemini frontier thinking & reasoning models', () => {
      const gemini = PROVIDER_CATALOG.gemini;
      const modelIds = gemini.models.map((m) => m.id);
      expect(modelIds).toContain('gemini-2.0-flash-thinking-exp-01-21');
      expect(modelIds).toContain('gemini-2.5-pro');
      expect(modelIds).toContain('gemini-2.0-pro-exp-02-05');
      expect(modelIds).toContain('gemini-2.5-flash');
    });

    it('includes OpenAI o3-mini and flagship models', () => {
      const openai = PROVIDER_CATALOG.openai;
      const modelIds = openai.models.map((m) => m.id);
      expect(modelIds).toContain('o3-mini');
      expect(modelIds).toContain('gpt-4o');
      expect(modelIds).toContain('o1');
    });

    it('includes Anthropic Claude 3.7 Sonnet with hybrid reasoning', () => {
      const anthropic = PROVIDER_CATALOG.anthropic;
      const modelIds = anthropic.models.map((m) => m.id);
      expect(modelIds).toContain('claude-3-7-sonnet-20250219');
      expect(modelIds).toContain('claude-3-5-sonnet-20241022');
    });

    it('includes Ollama private local models (DeepSeek-R1 & Llama 3.3)', () => {
      const ollama = PROVIDER_CATALOG.ollama;
      const modelIds = ollama.models.map((m) => m.id);
      expect(modelIds).toContain('deepseek-r1:latest');
      expect(modelIds).toContain('llama3.3:70b');
    });
  });

  describe('2. Strict JSON Extraction & Schema Sanitization', () => {
    it('parses standard JSON strings cleanly', () => {
      const parsed = extractAndParseJson('{"name": "Madrid", "nights": 3}', { name: '', nights: 0 });
      expect(parsed).toEqual({ name: 'Madrid', nights: 3 });
    });

    it('strips markdown code blocks (```json ... ```)', () => {
      const raw = '```json\n{"action": "add_destination", "cities": ["Bruges"]}\n```';
      const parsed = extractAndParseJson(raw, { action: '', cities: [] });
      expect(parsed).toEqual({ action: 'add_destination', cities: ['Bruges'] });
    });

    it('extracts embedded JSON surrounded by preamble or conversational text', () => {
      const raw =
        'Certainly! Here is the JSON itinerary proposal you asked for:\n{"intentTitle": "Add Bruges", "action": "add_destination"}\nHope this helps!';
      const parsed = extractAndParseJson(raw, { intentTitle: '', action: '' });
      expect(parsed).toEqual({ intentTitle: 'Add Bruges', action: 'add_destination' });
    });

    it('gracefully returns fallback on malformed or invalid text without throwing', () => {
      const fallback = { error: true };
      const parsed = extractAndParseJson('Not a JSON string at all', fallback);
      expect(parsed).toBe(fallback);
    });
  });

  describe('3. Default Configuration & Heuristic Fallback', () => {
    it('defaults active provider to gemini with thinking model', () => {
      expect(getActiveProviderId()).toBe('gemini');
      expect(getModelForProvider('gemini')).toBe('gemini-2.0-flash-thinking-exp-01-21');
    });

    it('falls back seamlessly to local planner when unconfigured', async () => {
      const res = await generateItineraryWithAi('3 weeks in Spain: Madrid, Seville, Barcelona');
      expect(res.tripPromptParsed.destinations.length).toBeGreaterThan(0);
      expect(res.aiExplanation).toContain('heurísticas locales');
    });

    it('marks engineUsed as local in What-If scenario when offline', async () => {
      const trip = getEuropeGrandTourSampleTrip();
      const res = await executeWhatIfScenario(trip, 'Hacerlo más relajado');
      expect(res.actionable).toBe(true);
      expect(res.engineUsed).toBe('local');
    });
  });
});
