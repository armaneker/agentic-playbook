import { NextRequest, NextResponse } from 'next/server';
import { applyMoves, extractMoves, isSolved, misplacedStickers, toNet } from '@/lib/rubiks/cube';
import { estimateCost, getModel } from '@/lib/rubiks/models';
import { OPENROUTER_BASE, authorize, openRouterHeaders, scrambleFromBody, sseStream } from '@/lib/rubiks/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const REQUEST_TIMEOUT_MS = 280_000;

interface UpstreamUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  cost?: number;
  completion_tokens_details?: { reasoning_tokens?: number };
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

export async function POST(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return NextResponse.json({ error: denied }, { status: denied.includes('key') && denied.includes('Access') ? 401 : 503 });

  const body = await req.json().catch(() => null);
  const model = getModel(String(body?.model ?? ''));
  if (!model || model.kind !== 'llm') return NextResponse.json({ error: 'unknown model' }, { status: 400 });
  const parsed = scrambleFromBody(body);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { state: scrambled } = parsed;

  return sseStream(async (send) => {
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const upstream = await fetch(`${OPENROUTER_BASE}/api/v1/chat/completions`, {
      method: 'POST',
      headers: openRouterHeaders(),
      signal: controller.signal,
      body: JSON.stringify({
        model: model.openRouterId,
        messages: [{ role: 'user', content: buildPrompt(toNet(scrambled)) }],
        stream: true,
        usage: { include: true },
        max_tokens: model.maxTokens ?? 16000,
        reasoning: model.reasoningEffort ? { effort: model.reasoningEffort } : undefined,
      }),
    }).catch((err: unknown) => {
      throw new Error(controller.signal.aborted ? 'Timed out waiting for the model' : `OpenRouter request failed: ${String(err)}`);
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => '');
      clearTimeout(timer);
      throw new Error(`OpenRouter ${upstream.status}: ${text.slice(0, 300)}`);
    }

    send({ type: 'started', model: model.key });

    let answer = '';
    let reasoningChars = 0;
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
      let json: { choices?: { delta?: { content?: string; reasoning?: string } }[]; usage?: UpstreamUsage; error?: { message?: string } };
      try { json = JSON.parse(payload); } catch { return; }
      if (json.error) throw new Error(json.error.message ?? 'upstream error');
      const delta = json.choices?.[0]?.delta;
      if (delta?.reasoning) reasoningChars += delta.reasoning.length;
      if (delta?.content) {
        if (firstTokenMs === null) firstTokenMs = Date.now() - started;
        answer += delta.content;
      }
      if (json.usage) acc.usage = json.usage;
      const now = Date.now();
      if (now - lastFlush > 150) {
        lastFlush = now;
        send({ type: 'progress', answerChars: answer.length, reasoningChars, elapsedMs: now - started, tail: answer.slice(-160) });
      }
    };

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
      if (controller.signal.aborted) throw new Error('Timed out waiting for the model');
      throw err;
    } finally {
      clearTimeout(timer);
    }

    const elapsedMs = Date.now() - started;
    const { moves, source } = extractMoves(answer);
    const final = applyMoves(scrambled, moves);
    const finalUsage = acc.usage;
    const inputTokens = finalUsage?.prompt_tokens ?? 0;
    const outputTokens = finalUsage?.completion_tokens ?? 0;
    const reasoningTokens = finalUsage?.completion_tokens_details?.reasoning_tokens ?? null;
    const costFromProvider = typeof finalUsage?.cost === 'number';
    const cost = costFromProvider ? (finalUsage!.cost as number) : estimateCost(model, inputTokens, outputTokens);

    send({
      type: 'done',
      model: model.key,
      elapsedMs,
      firstTokenMs,
      moves,
      moveSource: source,
      solved: isSolved(final),
      misplacedAfter: misplacedStickers(final),
      usage: { inputTokens, outputTokens, reasoningTokens, cost, costFromProvider },
      answer: answer.slice(-2000),
    });
  });
}
