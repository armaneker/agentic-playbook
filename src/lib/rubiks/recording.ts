import type { Move } from './cube';

/** A model definition as it was at recording time, so old recordings replay unchanged. */
export interface RecordedModel {
  key: string;
  label: string;
  provider: string;
  openRouterId: string;
  kind: 'llm' | 'jev';
  color: string;
  pricing: { inputPerM: number; outputPerM: number };
}

/** One server event as the browser received it, with the time since the race started. */
export interface RecordedEvent {
  t: number;
  model: string;
  ev: Record<string, unknown>;
}

export interface RaceSummaryRow {
  model: string;
  label: string;
  status: 'solved' | 'failed' | 'timeout' | 'error';
  elapsedMs: number | null;
  moves: number;
  inputTokens: number | null;
  outputTokens: number | null;
  cost: number | null;
}

export interface RaceRecording {
  version: 1;
  id: string;
  recordedAt: string;
  scramble: Move[];
  seed: number;
  depth: number;
  jevMaxSteps: number;
  timeLimitMs?: number;
  models: RecordedModel[];
  events: RecordedEvent[];
  summary: RaceSummaryRow[];
}

export function isRaceRecording(value: unknown): value is RaceRecording {
  if (!value || typeof value !== 'object') return false;
  const r = value as Partial<RaceRecording>;
  return (
    r.version === 1 &&
    typeof r.id === 'string' &&
    Array.isArray(r.scramble) &&
    Array.isArray(r.models) &&
    Array.isArray(r.events) &&
    Array.isArray(r.summary)
  );
}
