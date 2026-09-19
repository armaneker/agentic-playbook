import type { Move } from '@/lib/rubiks/cube';

export interface PublicModel {
  key: string;
  label: string;
  provider: string;
  openRouterId: string;
  kind: 'llm' | 'jev';
  color: string;
  pricing: { inputPerM: number; outputPerM: number };
}

export interface Usage {
  inputTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  cost: number;
  costFromProvider: boolean;
}

export interface JevStep {
  step: number;
  move: Move;
  latencyMs: number;
  probability: number | null;
  confidence: number | null;
  misplaced: number;
}

export type PanelStatus = 'idle' | 'waiting' | 'thinking' | 'moving' | 'solved' | 'failed' | 'timeout' | 'error';

export interface PanelState {
  model: PublicModel;
  status: PanelStatus;
  moves: Move[];
  usage: Usage | null;
  /** Time from request start until the model finished answering (LLM) or the loop ended (Jev). */
  finalElapsedMs: number | null;
  firstTokenMs: number | null;
  answerChars: number;
  reasoningChars: number;
  /** Streamed text, capped to the most recent part. */
  reasoningText: string;
  answerText: string;
  lastStep: JevStep | null;
  avgLatencyMs: number | null;
  misplacedAfter: number | null;
  error: string | null;
  answerTail: string | null;
  /** Why the run ended, as reported by the server. */
  outcome: string | null;
  timeoutMs: number | null;
}

export function emptyPanel(model: PublicModel): PanelState {
  return {
    model,
    status: 'idle',
    moves: [],
    usage: null,
    finalElapsedMs: null,
    firstTokenMs: null,
    answerChars: 0,
    reasoningChars: 0,
    reasoningText: '',
    answerText: '',
    lastStep: null,
    avgLatencyMs: null,
    misplacedAfter: null,
    error: null,
    answerTail: null,
    outcome: null,
    timeoutMs: null,
  };
}
