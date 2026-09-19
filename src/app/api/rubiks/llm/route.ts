import { NextRequest, NextResponse } from 'next/server';
import { applyMoves, extractMoves, isSolved, misplacedStickers, toNet } from '@/lib/rubiks/cube';
import { estimateCost, getModel } from '@/lib/rubiks/models';
import { OPENROUTER_BASE, authorize, openRouterHeaders, scrambleFromBody, timeoutFromBody, sseStream } from '@/lib/rubiks/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

interface UpstreamUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  cost?: number;
  completion_tokens_details?: { reasoning_tokens?: number };
}

interface GenerationStats {
  tokens_prompt?: number;
  tokens_completion?: number;
  native_tokens_reasoning?: number;
  total_cost?: number;
}

function buildPrompt(net: string): string {
  return [
    'You are given a scrambled 3x3 Rubik\'s cube. Find a sequence of face turns that solves it.',
    '',
    'Cube net (unfolded). Letters are sticker colors: W white, Y yellow, G green, B blue, R red, O orange.',
    'Layout: the top 3 rows are the U face, the middle block is L F R B from left to right, the bottom 3 rows are the D face.',
    'Each face is shown as you would see it looking straight at it, with U above it (U is shown with B at its top, D with F at its top).',
    'Centers never move: U=white, D=yellow, F=green, B=blue, R=red, L=orange.',
    '',
    '```',
    net,
    '```',
    '',
    'Notation: U D R L F B are 90° clockwise turns of that face as seen looking at the face. A prime (\') means counterclockwise, 2 means 180°.',
    'The cube is solved when every face shows a single color.',
    '',
    'Work it out however you like, then end your answer with exactly one line in this form and nothing after it:',
    'MOVES: R U R\' U\'',
  ].join('\n');
}

/** After an aborted stream OpenRouter has no usage chunk; ask its generation endpoint instead. */
async function fetchGenerationStats(id: string): Promise<GenerationStats | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    await new Promise((r) => setTimeout(r, 1200));
    try {
      const res = await fetch(`${OPENROUTER_BASE}/api/v1/generation?id=${encodeURIComponent(id)}`, {
        headers: openRouterHeaders(),
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const json = (await res.json()) as { data?: GenerationStats };
        if (json.data && typeof json.data.total_cost === 'number') return json.data;
      }
    } catch { /* retry */ }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return NextResponse.json({ error: denied }, { status: denied.startsWith('Access') ? 401 : 503 });

  const body = await req.json().catch(() => null);
  const model = getModel(String(body?.model ?? ''));
  if (!model || model.kind !== 'llm') return NextResponse.json({ error: 'unknown model' }, { status: 400 });
  const parsed = scrambleFromBody(body);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { state: scrambled } = parsed;
  const timeoutMs = timeoutFromBody(body);

  const effort = (process.env.RUBIKS_REASONING_EFFORT as 'low' | 'medium' | 'high' | undefined) ?? model.reasoningEffort;
  const maxTokens = Number(process.env.RUBIKS_MAX_TOKENS) || model.maxTokens || 16000;

  return sseStream(async (send) => {
    const started = Date.now();
    send({ type: 'started', model: model.key, timeoutMs });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const upstream = await fetch(`${OPENROUTER_BASE}/api/v1/chat/completions`, {
      method: 'POST',
      headers: openRouterHeaders(),
      signal: controller.signal,
      body: JSON.stringify({
        model: model.openRouterId,
        messages: [{ role: 'user', content: buildPrompt(toNet(scrambled)) }],
        stream: true,
        usage: { include: true },
        max_tokens: maxTokens,
        reasoning: effort ? { effort } : undefined,
      }),
    }).catch((err: unknown) => {
      throw new Error(controller.signal.aborted ? 'Timed out before the model answered' : `OpenRouter request failed: ${String(err)}`);
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => '');
      clearTimeout(timer);
      throw new Error(`OpenRouter ${upstream.status}: ${text.slice(0, 300)}`);
    }

    let answer = '';
    let reasoningChars = 0;
    // Text produced since the last progress flush. Reasoning text stops being forwarded after a cap
    // so a very long think does not bloat recordings; the counter keeps going.
    let pendingReasoning = '';
    let pendingAnswer = '';
    let reasoningForwarded = 0;
    const REASONING_FORWARD_CAP = 40_000;
    let generationId: string | null = null;
    let finishReason: string | null = null;
    const acc: { usage: UpstreamUsage | null } = { usage: null };
    let firstTokenMs: number | null = null;
    let lastFlush = 0;

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const handleLine = (line: string) => {
      if (!line.startsWith('data:')) return; // ": OPENROUTER PROCESSING" keep-alives land here
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') return;
      let json: {
        id?: string;
        choices?: { delta?: { content?: string; reasoning?: string }; finish_reason?: string | null }[];
        usage?: UpstreamUsage;
        error?: { message?: string };
      };
      try { json = JSON.parse(payload); } catch { return; }
      if (json.error) throw new Error(json.error.message ?? 'upstream error');
      if (json.id && !generationId) generationId = json.id;
      const choice = json.choices?.[0];
      const delta = choice?.delta;
      if (choice?.finish_reason) finishReason = choice.finish_reason;
      if (delta?.reasoning) {
        reasoningChars += delta.reasoning.length;
        if (reasoningForwarded < REASONING_FORWARD_CAP) {
          pendingReasoning += delta.reasoning;
          reasoningForwarded += delta.reasoning.length;
        }
      }
      if (delta?.content) {
        if (firstTokenMs === null) firstTokenMs = Date.now() - started;
        answer += delta.content;
        pendingAnswer += delta.content;
      }
      if (json.usage) acc.usage = json.usage;
      const now = Date.now();
      if (now - lastFlush > 300) flush(now);
    };

    const flush = (now: number) => {
      lastFlush = now;
      send({
        type: 'progress',
        answerChars: answer.length,
        reasoningChars,
        elapsedMs: now - started,
        reasoningDelta: pendingReasoning || undefined,
        answerDelta: pendingAnswer || undefined,
      });
      pendingReasoning = '';
      pendingAnswer = '';
    };

    let timedOut = false;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, idx).trimEnd();
          buffer = buffer.slice(idx + 1);
          handleLine(line);
        }
      }
      if (buffer.trim()) handleLine(buffer.trim());
    } catch (err) {
      if (!controller.signal.aborted) throw err;
      timedOut = true;
    } finally {
      clearTimeout(timer);
    }

    if (pendingReasoning || pendingAnswer) flush(Date.now());
    const elapsedMs = Date.now() - started;
    const { moves, source } = extractMoves(answer);
    const final = applyMoves(scrambled, moves);

    let inputTokens = acc.usage?.prompt_tokens ?? null;
    let outputTokens = acc.usage?.completion_tokens ?? null;
    let reasoningTokens = acc.usage?.completion_tokens_details?.reasoning_tokens ?? null;
    let cost = typeof acc.usage?.cost === 'number' ? acc.usage.cost : null;
    let costFromProvider = cost !== null;

    if (cost === null && generationId) {
      // The stream was cut (timeout or provider hiccup); OpenRouter still knows what it billed.
      const stats = await fetchGenerationStats(generationId);
      if (stats) {
        inputTokens = stats.tokens_prompt ?? inputTokens;
        outputTokens = stats.tokens_completion ?? outputTokens;
        reasoningTokens = stats.native_tokens_reasoning ?? reasoningTokens;
        cost = stats.total_cost ?? null;
        costFromProvider = cost !== null;
      }
    }
    if (cost === null) {
      // Last resort: rough estimate from what we saw (4 chars per token).
      inputTokens = inputTokens ?? 800;
      outputTokens = outputTokens ?? Math.round((answer.length + reasoningChars) / 4);
      cost = estimateCost(model, inputTokens, outputTokens);
      costFromProvider = false;
    }

    const solved = isSolved(final);
    send({
      type: 'done',
      model: model.key,
      elapsedMs,
      firstTokenMs,
      moves,
      moveSource: source,
      solved,
      outcome: solved ? 'solved' : timedOut ? 'timeout' : finishReason === 'length' ? 'max-tokens' : 'failed',
      misplacedAfter: misplacedStickers(final),
      usage: { inputTokens, outputTokens, reasoningTokens, cost, costFromProvider },
      answer: answer.slice(-3000),
    });
  });
}
