import { NextRequest } from 'next/server';
import { CubeState, Move, applyMoves, isMove, solvedCube } from './cube';

export const OPENROUTER_BASE = process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai';
export const MAX_SCRAMBLE_LENGTH = 25;
export const DEFAULT_TIMEOUT_MS = 120_000;
export const MIN_TIMEOUT_MS = 15_000;
export const MAX_TIMEOUT_MS = 280_000; // under Vercel's 300 s function limit

export function openRouterHeaders() {
  return {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://agentic-playbook.dev',
    'X-Title': 'Agentic Playbook - LLM Rubik\'s Cube Race',
  };
}

export function isConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export function requiresAccessKey(): boolean {
  return Boolean(process.env.RUBIKS_DEMO_ACCESS_KEY);
}

/** Returns an error message when the request may not run, otherwise null. */
export function authorize(req: NextRequest): string | null {
  if (!isConfigured()) return 'OPENROUTER_API_KEY is not set on the server';
  if (requiresAccessKey() && req.headers.get('x-demo-key') !== process.env.RUBIKS_DEMO_ACCESS_KEY) {
    return 'Access key required';
  }
  return null;
}

/** Validates the scramble from the request body and returns the scrambled cube. */
export function scrambleFromBody(body: unknown): { scramble: Move[]; state: CubeState } | { error: string } {
  const raw = (body as { scramble?: unknown })?.scramble;
  if (!Array.isArray(raw) || raw.length === 0) return { error: 'scramble must be a non-empty array of moves' };
  if (raw.length > MAX_SCRAMBLE_LENGTH) return { error: `scramble must be at most ${MAX_SCRAMBLE_LENGTH} moves` };
  if (!raw.every((m) => typeof m === 'string' && isMove(m))) return { error: 'scramble contains an invalid move' };
  const scramble = raw as Move[];
  return { scramble, state: applyMoves(solvedCube(), scramble) };
}

/** Per-model time limit from the request body, clamped to what the platform allows. */
export function timeoutFromBody(body: unknown): number {
  const raw = Number((body as { timeoutMs?: unknown })?.timeoutMs);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, Math.round(raw)));
}

/** Server-sent events writer over a ReadableStream. */
export function sseStream(run: (send: (event: Record<string, unknown>) => void) => Promise<void>) {
  const encoder = new TextEncoder();
  let closed = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: Record<string, unknown>) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      run(send)
        .catch((err: unknown) => {
          send({ type: 'error', message: err instanceof Error ? err.message : String(err) });
        })
        .finally(() => {
          closed = true;
          controller.close();
        });
    },
    cancel() {
      closed = true;
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
