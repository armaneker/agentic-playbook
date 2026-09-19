'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Move, generateScramble } from '@/lib/rubiks/cube';
import ModelPanel from './ModelPanel';
import { PanelState, PublicModel, emptyPanel } from './types';

interface Status {
  configured: boolean;
  requiresAccessKey: boolean;
  models: PublicModel[];
}

const ACCESS_KEY_STORAGE = 'rubiks-demo-key';

function readStoredKey(): string {
  try { return localStorage.getItem(ACCESS_KEY_STORAGE) ?? ''; } catch { return ''; }
}

async function* readSse(res: Response): AsyncGenerator<Record<string, unknown>> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data:')) continue;
        try { yield JSON.parse(line.slice(5)); } catch { /* ignore malformed line */ }
      }
    }
  }
}

export default function RubiksRace() {
  const [status, setStatus] = useState<Status | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [accessKey, setAccessKey] = useState('');
  // Fixed initial seed so server and client render the same scramble; randomized after mount.
  const [seed, setSeed] = useState(1);
  const [depth, setDepth] = useState(3);
  const [jevMaxSteps, setJevMaxSteps] = useState(40);
  const [panels, setPanels] = useState<Record<string, PanelState>>({});
  const [running, setRunning] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [copied, setCopied] = useState(false);
  const startedAt = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scramble = useMemo<Move[]>(() => generateScramble(seed, depth), [seed, depth]);

  useEffect(() => {
    setAccessKey(readStoredKey());
    setSeed(Math.floor(Math.random() * 1_000_000));
    fetch('/api/rubiks/status/')
      .then((r) => r.json())
      .then((s: Status) => {
        setStatus(s);
        setPanels(Object.fromEntries(s.models.map((m) => [m.key, emptyPanel(m)])));
      })
      .catch((err) => setStatusError(String(err)));
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      if (startedAt.current !== null) setElapsedMs(performance.now() - startedAt.current);
    }, 50);
    return () => clearInterval(id);
  }, [running]);

  const update = useCallback((key: string, patch: Partial<PanelState> | ((p: PanelState) => Partial<PanelState>)) => {
    setPanels((prev) => {
      const current = prev[key];
      if (!current) return prev;
      const next = typeof patch === 'function' ? patch(current) : patch;
      return { ...prev, [key]: { ...current, ...next } };
    });
  }, []);

  const runModel = useCallback(async (model: PublicModel, signal: AbortSignal) => {
    const key = model.key;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessKey) headers['x-demo-key'] = accessKey;
    update(key, { status: 'waiting' });
    try {
      const res = await fetch(model.kind === 'jev' ? '/api/rubiks/jev/' : '/api/rubiks/llm/', {
        method: 'POST',
        headers,
        signal,
        body: JSON.stringify({ model: key, scramble, maxSteps: jevMaxSteps }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      for await (const ev of readSse(res)) {
        switch (ev.type) {
          case 'started':
            update(key, { status: 'thinking' });
            break;
          case 'progress':
            update(key, {
              answerChars: ev.answerChars as number,
              reasoningChars: ev.reasoningChars as number,
            });
            break;
          case 'step': {
            const step = {
              step: ev.step as number,
              move: ev.move as Move,
              latencyMs: ev.latencyMs as number,
              probability: ev.probability as number | null,
              confidence: ev.confidence as number | null,
              misplaced: ev.misplaced as number,
            };
            update(key, (p) => ({
              status: 'thinking',
              moves: [...p.moves, step.move],
              lastStep: step,
              usage: { ...(ev.usage as { inputTokens: number; outputTokens: number; cost: number }), reasoningTokens: null, costFromProvider: true },
            }));
            break;
          }
          case 'done': {
            const moves = ev.moves as Move[];
            const solved = ev.solved as boolean;
            update(key, (p) => ({
              status: model.kind === 'llm' && moves.length ? 'moving' : solved ? 'solved' : 'failed',
              moves: model.kind === 'llm' ? moves : p.moves,
              usage: ev.usage as PanelState['usage'],
              finalElapsedMs: ev.elapsedMs as number,
              firstTokenMs: (ev.firstTokenMs as number | null) ?? null,
              avgLatencyMs: (ev.avgLatencyMs as number | null) ?? null,
              misplacedAfter: ev.misplacedAfter as number,
              answerTail: (ev.answer as string | undefined) ?? null,
            }));
            if (model.kind === 'llm' && moves.length) {
              // Let the animation play out before showing the verdict.
              const wait = Math.min(15_000, moves.length * 210 + 300);
              await new Promise((r) => setTimeout(r, wait));
              update(key, { status: solved ? 'solved' : 'failed' });
            }
            break;
          }
          case 'error':
            throw new Error(String(ev.message));
        }
      }
      update(key, (p) => (p.status === 'thinking' || p.status === 'waiting' ? { status: 'failed', error: 'Stream ended without a result' } : {}));
    } catch (err) {
      if (signal.aborted) { update(key, { status: 'idle' }); return; }
      update(key, { status: 'error', error: err instanceof Error ? err.message : String(err) });
    }
  }, [accessKey, jevMaxSteps, scramble, update]);

  const start = useCallback(async () => {
    if (!status || running) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPanels(Object.fromEntries(status.models.map((m) => [m.key, emptyPanel(m)])));
    setResetKey((k) => k + 1);
    setCopied(false);
    startedAt.current = performance.now();
    setElapsedMs(0);
    setRunning(true);
    await Promise.all(status.models.map((m) => runModel(m, controller.signal)));
    setRunning(false);
  }, [status, running, runModel]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setRunning(false);
  }, []);

  const reshuffle = useCallback(() => {
    if (running) return;
    setSeed(Math.floor(Math.random() * 1_000_000));
    setResetKey((k) => k + 1);
    if (status) setPanels(Object.fromEntries(status.models.map((m) => [m.key, emptyPanel(m)])));
  }, [running, status]);

  const saveKey = (value: string) => {
    setAccessKey(value);
    try { localStorage.setItem(ACCESS_KEY_STORAGE, value); } catch { /* private mode */ }
  };

  const ordered = status ? status.models.map((m) => panels[m.key]).filter(Boolean) : [];
  const finished = ordered.length > 0 && ordered.every((p) => ['solved', 'failed', 'error'].includes(p.status));

  const resultsMarkdown = useMemo(() => {
    if (!finished) return '';
    const rows = ordered.map((p) => {
      const t = p.finalElapsedMs === null ? '—' : `${(p.finalElapsedMs / 1000).toFixed(1)} s`;
      const tok = p.usage ? `${p.usage.inputTokens} / ${p.usage.outputTokens}` : '—';
      const cost = p.usage ? `$${p.usage.cost.toFixed(4)}` : '—';
      const result = p.status === 'solved' ? 'Solved' : p.status === 'error' ? 'Error' : `Not solved (${p.misplacedAfter ?? '?'} stickers off)`;
      return `| ${p.model.label} | ${result} | ${t} | ${p.moves.length} | ${tok} | ${cost} |`;
    });
    return [
      `Rubik's cube race — scramble ${scramble.join(' ')} (seed ${seed}, ${depth} moves)`,
      '',
      '| Model | Result | Time | Moves | Tokens in / out | Cost |',
      '|---|---|---|---|---|---|',
      ...rows,
    ].join('\n');
  }, [finished, ordered, scramble, seed, depth]);

  const copyResults = async () => {
    try { await navigator.clipboard.writeText(resultsMarkdown); setCopied(true); } catch { /* clipboard blocked */ }
  };

  if (statusError) return <p className="text-sm text-rose-300">Could not load demo status: {statusError}</p>;

  return (
    <div className="not-prose space-y-5">
      {status && !status.configured && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          The server has no <code className="font-mono">OPENROUTER_API_KEY</code>. Set it in the deployment environment to run the race.
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-gray-800 bg-gray-900/60 px-4 py-3">
        <label className="text-xs text-gray-400">
          Scramble depth <span className="text-gray-200 font-semibold tabular-nums">{depth}</span>
          <input type="range" min={1} max={20} value={depth} disabled={running} onChange={(e) => setDepth(Number(e.target.value))} className="block w-36 mt-1 accent-brand-500" />
        </label>
        <label className="text-xs text-gray-400">
          Jev max steps <span className="text-gray-200 font-semibold tabular-nums">{jevMaxSteps}</span>
          <input type="range" min={5} max={100} step={5} value={jevMaxSteps} disabled={running} onChange={(e) => setJevMaxSteps(Number(e.target.value))} className="block w-36 mt-1 accent-brand-500" />
        </label>
        {status?.requiresAccessKey && (
          <label className="text-xs text-gray-400">
            Access key
            <input type="password" value={accessKey} onChange={(e) => saveKey(e.target.value)} disabled={running} className="block mt-1 w-40 rounded-md border border-gray-700 bg-gray-950 px-2 py-1 text-sm text-gray-100" />
          </label>
        )}
        <div className="flex gap-2 ml-auto">
          <button onClick={reshuffle} disabled={running} className="rounded-md border border-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-40">
            New scramble
          </button>
          {running ? (
            <button onClick={stop} className="rounded-md bg-rose-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-rose-500">
              Stop
            </button>
          ) : (
            <button onClick={start} disabled={!status?.configured} className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-40">
              Start race
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
        <span>Scramble: <span className="font-mono text-gray-300">{scramble.join(' ')}</span></span>
        <span>seed {seed}</span>
        {running && <span className="tabular-nums text-gray-300">{(elapsedMs / 1000).toFixed(1)} s</span>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {ordered.map((p) => (
          <ModelPanel key={p.model.key} panel={p} scramble={scramble} resetKey={resetKey} elapsedMs={elapsedMs} />
        ))}
      </div>

      {finished && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-100">Results</h2>
            <button onClick={copyResults} className="text-xs text-gray-400 hover:text-gray-200">{copied ? 'Copied' : 'Copy as Markdown'}</button>
          </div>
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-gray-500">
              <tr className="[&>th]:px-4 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
                <th>Model</th><th>Result</th><th>Time</th><th>Moves</th><th>Tokens in / out</th><th>Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {[...ordered].sort(rank).map((p) => (
                <tr key={p.model.key} className="[&>td]:px-4 [&>td]:py-2 tabular-nums">
                  <td className="font-medium text-gray-100">{p.model.label}</td>
                  <td className={p.status === 'solved' ? 'text-emerald-300' : 'text-rose-300'}>
                    {p.status === 'solved' ? 'Solved' : p.status === 'error' ? 'Error' : `Not solved${p.misplacedAfter !== null ? ` · ${p.misplacedAfter} stickers off` : ''}`}
                  </td>
                  <td>{p.finalElapsedMs === null ? '—' : `${(p.finalElapsedMs / 1000).toFixed(1)} s`}</td>
                  <td>{p.moves.length}</td>
                  <td>{p.usage ? `${p.usage.inputTokens.toLocaleString()} / ${p.usage.outputTokens.toLocaleString()}` : '—'}</td>
                  <td>{p.usage ? `$${p.usage.cost.toFixed(4)}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function rank(a: PanelState, b: PanelState): number {
  const score = (p: PanelState) => (p.status === 'solved' ? 0 : p.status === 'failed' ? 1 : 2);
  const d = score(a) - score(b);
  if (d !== 0) return d;
  if (a.status === 'solved' && b.status === 'solved') return (a.finalElapsedMs ?? 0) - (b.finalElapsedMs ?? 0);
  return (a.misplacedAfter ?? 99) - (b.misplacedAfter ?? 99);
}
