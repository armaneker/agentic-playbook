import { NextRequest, NextResponse } from 'next/server';
import {
  ALL_MOVES, Move, applyMove, isMove, isSolved, misplacedStickers, solvedFaces,
  toColorGrids, toNet, MOVE_DESCRIPTIONS, CubeState, toFacelets,
} from '@/lib/rubiks/cube';
import { estimateCost, getModel } from '@/lib/rubiks/models';
import { OPENROUTER_BASE, authorize, openRouterHeaders, scrambleFromBody, sseStream } from '@/lib/rubiks/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const DEFAULT_MAX_STEPS = 40;
const HARD_MAX_STEPS = 100;
const STEP_TIMEOUT_MS = 20_000;
const TOTAL_BUDGET_MS = 280_000;

interface DecisionAnswer {
  choice?: string;
  probabilities?: Record<string, number>;
  confidence?: number;
}

interface DecisionResponse {
  answers?: Record<string, DecisionAnswer>;
  usage?: { input_tokens?: number; output_tokens?: number; cost?: number };
  error?: { message?: string };
}

function candidateMoves(lastMove: Move | null): Move[] {
  // A turn of the face just turned can only undo or extend the previous turn, so skip it.
  if (!lastMove) return ALL_MOVES;
  return ALL_MOVES.filter((m) => m[0] !== lastMove[0]);
}

function buildState(state: CubeState, history: Move[], step: number, maxSteps: number) {
  return {
    task: 'Solve a 3x3 Rubik\'s cube one face turn at a time. The cube is solved when every face shows a single color.',
    color_legend: 'W white (U center), Y yellow (D center), G green (F center), B blue (B center), R red (R center), O orange (L center). Centers never move.',
    faces: toColorGrids(state),
    net: toNet(state),
    facelets_URFDLB: toFacelets(state),
    moves_so_far: history,
    step,
    max_steps: maxSteps,
    misplaced_stickers: misplacedStickers(state),
    solved_faces: solvedFaces(state),
  };
}

export async function POST(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return NextResponse.json({ error: denied }, { status: denied.startsWith('Access') ? 401 : 503 });

  const body = await req.json().catch(() => null);
  const model = getModel('jev');
  if (!model) return NextResponse.json({ error: 'jev model missing from config' }, { status: 500 });
  const parsed = scrambleFromBody(body);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const maxSteps = Math.min(HARD_MAX_STEPS, Math.max(1, Number(body?.maxSteps) || DEFAULT_MAX_STEPS));

  return sseStream(async (send) => {
    const started = Date.now();
    let state = parsed.state;
    const history: Move[] = [];
    let inputTokens = 0;
    let outputTokens = 0;
    let cost = 0;
    let costFromProvider = true;
    let latencies: number[] = [];
    const seen = new Map<string, number>();

    send({ type: 'started', model: model.key, maxSteps });

    let outcome: 'solved' | 'max-steps' | 'timeout' = 'max-steps';
    for (let step = 1; step <= maxSteps; step++) {
      if (Date.now() - started > TOTAL_BUDGET_MS) { outcome = 'timeout'; break; }
      const lastMove = history[history.length - 1] ?? null;
      const candidates = candidateMoves(lastMove);
      const criteria: Record<string, string> = {};
      for (const m of candidates) criteria[m] = MOVE_DESCRIPTIONS[m];

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), STEP_TIMEOUT_MS);
      const t0 = Date.now();
      const res = await fetch(`${OPENROUTER_BASE}/api/alpha/decisions`, {
        method: 'POST',
        headers: openRouterHeaders(),
        signal: controller.signal,
        body: JSON.stringify({
          model: model.openRouterId,
          state: buildState(state, history, step, maxSteps),
          questions: {
            next_move: {
              type: 'choice',
              instructions:
                'Pick the one face turn that brings this cube closest to fully solved. ' +
                'Prefer moves that increase the number of stickers matching their face center and complete whole faces. ' +
                'Do not repeat the pattern of the last few moves.',
              criteria,
            },
          },
        }),
      }).catch((err: unknown) => {
        throw new Error(controller.signal.aborted ? `Jev step ${step} timed out` : `OpenRouter request failed: ${String(err)}`);
      }).finally(() => clearTimeout(timer));
      const latencyMs = Date.now() - t0;

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 300)}`);
      }
      const json = (await res.json()) as DecisionResponse;
      if (json.error) throw new Error(json.error.message ?? 'upstream error');
      const answer = json.answers?.next_move;
      if (!answer) throw new Error('Decisions response had no next_move answer');

      let move: Move | null = answer.choice && isMove(answer.choice) ? answer.choice : null;
      if (!move && answer.probabilities) {
        const best = Object.entries(answer.probabilities).sort((a, b) => b[1] - a[1])[0];
        if (best && isMove(best[0])) move = best[0];
      }
      if (!move) throw new Error('Jev returned a move outside the offered options');

      const stepIn = json.usage?.input_tokens ?? 0;
      const stepOut = json.usage?.output_tokens ?? 0;
      inputTokens += stepIn;
      outputTokens += stepOut;
      if (typeof json.usage?.cost === 'number') cost += json.usage.cost;
      else { costFromProvider = false; cost += estimateCost(model, stepIn, stepOut); }
      latencies.push(latencyMs);

      state = applyMove(state, move);
      history.push(move);
      const key = toFacelets(state);
      seen.set(key, (seen.get(key) ?? 0) + 1);

      send({
        type: 'step',
        step,
        move,
        latencyMs,
        confidence: answer.confidence ?? null,
        probability: answer.probabilities?.[move] ?? null,
        topChoices: answer.probabilities
          ? Object.entries(answer.probabilities).sort((a, b) => b[1] - a[1]).slice(0, 3)
          : [],
        misplaced: misplacedStickers(state),
        solvedFaces: solvedFaces(state),
        revisits: (seen.get(key) ?? 1) - 1,
        elapsedMs: Date.now() - started,
        usage: { inputTokens, outputTokens, cost },
      });

      if (isSolved(state)) { outcome = 'solved'; break; }
    }

    send({
      type: 'done',
      model: model.key,
      elapsedMs: Date.now() - started,
      moves: history,
      solved: outcome === 'solved',
      outcome,
      steps: history.length,
      avgLatencyMs: latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null,
      misplacedAfter: misplacedStickers(state),
      usage: { inputTokens, outputTokens, reasoningTokens: null, cost, costFromProvider },
    });
  });
}
