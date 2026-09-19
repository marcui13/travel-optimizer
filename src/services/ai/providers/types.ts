export type AiProviderId = 'gemini' | 'openai' | 'anthropic' | 'ollama';

export interface ModelMetadata {
  id: string;
  name: string;
  category: 'thinking' | 'reasoning' | 'fast';
  description: string;
  badge: string;
  badgeEn: string;
  recommendedFor: string;
  recommendedForEn: string;
}

export interface ProviderCatalogItem {
  id: AiProviderId;
  name: string;
  description: string;
  descriptionEn: string;
  requiresApiKey: boolean;
  defaultModel: string;
  models: ModelMetadata[];
  apiKeyPlaceholder: string;
  docUrl: string;
}

export interface WhatIfAiIntentResult {
  intentTitle: string;
  action: 'add_destination' | 'remove_destination' | 'replace_destination' | 'reorder' | 'change_pacing' | 'custom_advice';
  citiesToAdd?: string[];
  citiesToRemove?: string[];
  travelStyle?: 'relaxed' | 'balanced' | 'intense';
  suggestedStayNights?: Record<string, number>;
  explanation: string;
  impactSummary: string;
  tradeOffs: string[];
}
