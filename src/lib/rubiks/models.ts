/**
 * Models that take part in the race. All four are called through OpenRouter
 * with one API key (OPENROUTER_API_KEY).
 *
 * `kind: 'llm'`  — chat completion; the model writes a full move sequence.
 * `kind: 'jev'`  — TypeSafe Jev via the OpenRouter Decisions endpoint; the model
 *                  picks one move per call and is asked again until solved.
 *
 * Prices are USD per 1M tokens and are only used when OpenRouter does not
 * return `usage.cost` for a request.
 */

export type ModelKind = 'llm' | 'jev';

export interface RaceModel {
  key: string;
  label: string;
  provider: string;
  openRouterId: string;
  kind: ModelKind;
  /** Accent color for the panel header. */
  color: string;
  pricing: { inputPerM: number; outputPerM: number };
  /** LLM only: reasoning effort passed to OpenRouter. */
  reasoningEffort?: 'low' | 'medium' | 'high';
  /** LLM only: cap on completion tokens (reasoning included). */
  maxTokens?: number;
}

export const RACE_MODELS: RaceModel[] = [
  {
    key: 'fable',
    label: 'Claude Fable 5.1',
    provider: 'Anthropic',
    openRouterId: 'anthropic/claude-fable-5.1',
    kind: 'llm',
    color: '#d97757',
    pricing: { inputPerM: 10, outputPerM: 50 },
    reasoningEffort: 'medium',
    maxTokens: 24000,
  },
  {
    key: 'astra',
    label: 'GPT-6 Astra',
    provider: 'OpenAI',
    openRouterId: 'openai/gpt-6-astra',
    kind: 'llm',
    color: '#10a37f',
    pricing: { inputPerM: 10, outputPerM: 50 },
    reasoningEffort: 'medium',
    maxTokens: 24000,
  },
  {
    key: 'grok',
    label: 'Grok 4.6',
    provider: 'xAI',
    openRouterId: 'x-ai/grok-4.6',
    kind: 'llm',
    color: '#9ca3af',
    pricing: { inputPerM: 2, outputPerM: 6 },
    reasoningEffort: 'medium',
    maxTokens: 24000,
  },
  {
    key: 'jev',
    label: 'Jev',
    provider: 'TypeSafe',
    openRouterId: 'typesafe/jev-latest',
    kind: 'jev',
    color: '#818cf8',
    pricing: { inputPerM: 0.042, outputPerM: 0 },
  },
];

export function getModel(key: string): RaceModel | undefined {
  return RACE_MODELS.find((m) => m.key === key);
}

export function estimateCost(model: RaceModel, inputTokens: number, outputTokens: number): number {
  return (inputTokens * model.pricing.inputPerM + outputTokens * model.pricing.outputPerM) / 1_000_000;
}

/** Public shape sent to the browser (no secrets, nothing server-only). */
export function publicModels() {
  return RACE_MODELS.map(({ key, label, provider, openRouterId, kind, color, pricing }) => ({
    key, label, provider, openRouterId, kind, color, pricing,
  }));
}
