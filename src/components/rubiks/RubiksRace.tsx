'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Move, generateScramble } from '@/lib/rubiks/cube';
import type { RaceRecording, RaceSummaryRow, RecordedEvent } from '@/lib/rubiks/recording';
import recordingsData from '@/data/rubiks/recordings.json';
import ModelPanel from './ModelPanel';
import { PanelState, PublicModel, emptyPanel } from './types';

interface Status {
  configured: boolean;
  requiresAccessKey: boolean;
  liveAllowed: boolean;
  models: PublicModel[];
}

type Mode = 'replay' | 'live';

const ACCESS_KEY_STORAGE = 'rubiks-demo-key';
const SPEEDS = [1, 2, 5, 10];
const recordings = recordingsData as unknown as RaceRecording[];

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

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function summarize(ordered: PanelState[]): RaceSummaryRow[] {
  return ordered.map((p) => ({
    model: p.model.key,
    label: p.model.label,
    status: p.status === 'solved' ? 'solved' : p.status === 'error' ? 'error' : 'failed',
    elapsedMs: p.finalElapsedMs,
    moves: p.moves.length,
    inputTokens: p.usage?.inputTokens ?? null,
    outputTokens: p.usage?.outputTokens ?? null,
    cost: p.usage?.cost ?? null,
  }));
}

export default function RubiksRace() {
  const [status, setStatus] = useState<Status | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>(recordings.length ? 'replay' : 'live');
  const [accessKey, setAccessKey] = useState('');
  const [liveAllowed, setLiveAllowed] = useState(false);
  const [keyChecking, setKeyChecking] = useState(false);
  const [recordingId, setRecordingId] = useState<string>(recordings[0]?.id ?? '');
  const [speed, setSpeed] = useState(1);
  // Fixed initial seed so server and client render the same scramble; randomized after mount.
  const [seed, setSeed] = useState(1);
  const [depth, setDepth] = useState(3);
  const [jevMaxSteps, setJevMaxSteps] = useState(40);
  const [panels, setPanels] = useState<Record<string, PanelState>>({});
  const [running, setRunning] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [copied, setCopied] = useState<'results' | 'recording' | null>(null);
  const [lastRecording, setLastRecording] = useState<RaceRecording | null>(null);

  const startedAt = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const replayTimer = useRef<number | null>(null);
  const eventLog = useRef<RecordedEvent[]>([]);
  const pendingTimeouts = useRef<number[]>([]);

  const recording = useMemo(() => recordings.find((r) => r.id === recordingId) ?? null, [recordingId]);
  const liveScramble = useMemo<Move[]>(() => generateScramble(seed, depth), [seed, depth]);
  const scramble: Move[] = mode === 'replay' && recording ? recording.scramble : liveScramble;
  const models: PublicModel[] = mode === 'replay' && recording ? recording.models : status?.models ?? [];

  const resetPanels = useCallback((list: PublicModel[]) => {
    setPanels(Object.fromEntries(list.map((m) => [m.key, emptyPanel(m)])));
  }, []);

  useEffect(() => {
    const stored = readStoredKey();
    setAccessKey(stored);
    setSeed(Math.floor(Math.random() * 1_000_000));
    fetch('/api/rubiks/status/', { headers: stored ? { 'x-demo-key': stored } : {} })
      .then((r) => r.json())
      .then((s: Status) => {
        setStatus(s);
        setLiveAllowed(s.liveAllowed);
      })
      .catch((err) => setStatusError(String(err)));
  }, []);

  // Panels follow the model list of the active mode.
  useEffect(() => {
    if (running) return;
    resetPanels(models);
    setResetKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, recordingId, status]);

  const update = useCallback((key: string, patch: Partial<PanelState> | ((p: PanelState) => Partial<PanelState>)) => {
    setPanels((prev) => {
      const current = prev[key];
      if (!current) return prev;
      const next = typeof patch === 'function' ? patch(current) : patch;
      return { ...prev, [key]: { ...current, ...next } };
    });
  }, []);

  /** Applies one server event to a panel. Shared by live streaming and replay. */
  const handleEvent = useCallback((model: PublicModel, ev: Record<string, unknown>, timeScale: number) => {
    const key = model.key;
    switch (ev.type) {
      case 'started':
        update(key, { status: 'thinking' });
        break;
      case 'progress':
        update(key, { answerChars: ev.answerChars as number, reasoningChars: ev.reasoningChars as number });
        break;
      case 'step': {
        const step = {
          step: ev.step as number,
          move: ev.move as Move,
          latencyMs: ev.latencyMs as number,
          probability: (ev.probability as number | null) ?? null,
          confidence: (ev.confidence as number | null) ?? null,
          misplaced: ev.misplaced as number,
        };
        const usage = ev.usage as { inputTokens: number; outputTokens: number; cost: number };
        update(key, (p) => ({
          status: 'thinking',
          moves: [...p.moves, step.move],
          lastStep: step,
          usage: { ...usage, reasoningTokens: null, costFromProvider: true },
        }));
        break;
      }
      case 'done': {
        const moves = ev.moves as Move[];
        const solved = ev.solved as boolean;
        const animate = model.kind === 'llm' && moves.length > 0;
        update(key, (p) => ({
          status: animate ? 'moving' : solved ? 'solved' : 'failed',
          moves: model.kind === 'llm' ? moves : p.moves,
          usage: ev.usage as PanelState['usage'],
          finalElapsedMs: ev.elapsedMs as number,
          firstTokenMs: (ev.firstTokenMs as number | null) ?? null,
          avgLatencyMs: (ev.avgLatencyMs as number | null) ?? null,
          misplacedAfter: ev.misplacedAfter as number,
          answerTail: (ev.answer as string | undefined) ?? null,
        }));
        if (animate) {
          // Let the turn animation play out before showing the verdict.
          const wait = Math.min(15_000, moves.length * 210 + 300) / timeScale;
          const id = window.setTimeout(() => update(key, { status: solved ? 'solved' : 'failed' }), wait);
          pendingTimeouts.current.push(id);
        }
        break;
      }
      case 'error':
        update(key, { status: 'error', error: String(ev.message) });
        break;
    }
  }, [update]);

  // Live clock.
  useEffect(() => {
    if (!running || mode !== 'live') return;
    const id = setInterval(() => {
      if (startedAt.current !== null) setElapsedMs(performance.now() - startedAt.current);
    }, 50);
    return () => clearInterval(id);
  }, [running, mode]);

  const runModel = useCallback(async (model: PublicModel, signal: AbortSignal) => {
    const key = model.key;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessKey) headers['x-demo-key'] = accessKey;
    update(key, { status: 'waiting' });
    const log = (ev: Record<string, unknown>) => {
      if (startedAt.current === null) return;
      eventLog.current.push({ t: Math.round(performance.now() - startedAt.current), model: key, ev });
    };
    try {
      const res = await fetch(model.kind === 'jev' ? '/api/rubiks/jev/' : '/api/rubiks/llm/', {
        method: 'POST',
        headers,
        signal,
        body: JSON.stringify({ model: key, scramble: liveScramble, maxSteps: jevMaxSteps }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      let finished = false;
      for await (const ev of readSse(res)) {
        log(ev);
        handleEvent(model, ev, 1);
        if (ev.type === 'done' || ev.type === 'error') finished = true;
      }
      if (!finished) {
        const ev = { type: 'error', message: 'Stream ended without a result' };
        log(ev);
        handleEvent(model, ev, 1);
      }
    } catch (err) {
      if (signal.aborted) { update(key, { status: 'idle' }); return; }
      const ev = { type: 'error', message: err instanceof Error ? err.message : String(err) };
      log(ev);
      handleEvent(model, ev, 1);
    }
  }, [accessKey, jevMaxSteps, liveScramble, update, handleEvent]);

  const clearPending = () => {
    for (const id of pendingTimeouts.current) clearTimeout(id);
    pendingTimeouts.current = [];
  };

  const startLive = useCallback(async () => {
    if (!status || running || !liveAllowed) return;
    abortRef.current?.abort();
    clearPending();
    const controller = new AbortController();
    abortRef.current = controller;
    resetPanels(status.models);
    setResetKey((k) => k + 1);
    setCopied(null);
    setLastRecording(null);
    eventLog.current = [];
    startedAt.current = performance.now();
    setElapsedMs(0);
    setRunning(true);
    await Promise.all(status.models.map((m) => runModel(m, controller.signal)));
    setRunning(false);
  }, [status, running, liveAllowed, resetPanels, runModel]);

  const startReplay = useCallback(() => {
    if (!recording || running) return;
    clearPending();
    resetPanels(recording.models);
    setResetKey((k) => k + 1);
    setCopied(null);
    setElapsedMs(0);
    setRunning(true);
    const byKey = Object.fromEntries(recording.models.map((m) => [m.key, m]));
    const events = [...recording.events].sort((a, b) => a.t - b.t);
    const lastT = events.length ? events[events.length - 1].t : 0;
    const t0 = performance.now();
    let idx = 0;
    const tick = () => {
      const vt = (performance.now() - t0) * speed;
      setElapsedMs(vt);
      while (idx < events.length && events[idx].t <= vt) {
        const e = events[idx++];
        const model = byKey[e.model];
        if (model) handleEvent(model, e.ev, speed);
      }
      if (idx >= events.length && vt >= lastT) {
        if (replayTimer.current !== null) clearInterval(replayTimer.current);
        replayTimer.current = null;
        setRunning(false);
      }
    };
    replayTimer.current = window.setInterval(tick, 40);
  }, [recording, running, speed, resetPanels, handleEvent]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    if (replayTimer.current !== null) clearInterval(replayTimer.current);
    replayTimer.current = null;
    setRunning(false);
  }, []);

  useEffect(() => () => { stop(); clearPending(); }, [stop]);

  const reshuffle = useCallback(() => {
    if (running) return;
    setSeed(Math.floor(Math.random() * 1_000_000));
    setResetKey((k) => k + 1);
    if (status) resetPanels(status.models);
    setLastRecording(null);
  }, [running, status, resetPanels]);

  const saveKey = async (value: string) => {
    setAccessKey(value);
    try { localStorage.setItem(ACCESS_KEY_STORAGE, value); } catch { /* private mode */ }
    setKeyChecking(true);
    try {
      const s: Status = await fetch('/api/rubiks/status/', { headers: value ? { 'x-demo-key': value } : {} }).then((r) => r.json());
      setLiveAllowed(s.liveAllowed);
    } catch { setLiveAllowed(false); }
    setKeyChecking(false);
  };

  const ordered = models.map((m) => panels[m.key]).filter(Boolean);
  const finished = ordered.length > 0 && ordered.every((p) => ['solved', 'failed', 'error'].includes(p.status));

  // Package the last live race as a recording once every panel has settled.
  useEffect(() => {
    if (mode !== 'live' || running || !finished || lastRecording || !status || eventLog.current.length === 0) return;
    const now = new Date();
    setLastRecording({
      version: 1,
      id: `race-${now.toISOString().replace(/[:.]/g, '-')}`,
      recordedAt: now.toISOString(),
      scramble: liveScramble,
      seed,
      depth,
      jevMaxSteps,
      models: status.models,
      events: eventLog.current,
      summary: summarize(ordered),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, running, finished]);

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
      `Rubik's cube race — scramble ${scramble.join(' ')} (${scramble.length} moves)`,
      '',
      '| Model | Result | Time | Moves | Tokens in / out | Cost |',
      '|---|---|---|---|---|---|',
      ...rows,
    ].join('\n');
  }, [finished, ordered, scramble]);

  const copyText = async (text: string, what: 'results' | 'recording') => {
    try { await navigator.clipboard.writeText(text); setCopied(what); } catch { /* clipboard blocked */ }
  };

  const downloadRecording = () => {
    if (!lastRecording) return;
    const blob = new Blob([JSON.stringify(lastRecording, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${lastRecording.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (statusError) return <p className="text-sm text-rose-300">Could not load demo status: {statusError}</p>;

  const canStart = mode === 'replay' ? Boolean(recording) : Boolean(status?.configured && liveAllowed);

  return (
    <div className="not-prose space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <ModeButton active={mode === 'replay'} disabled={running} onClick={() => setMode('replay')}>
          Replay{recordings.length ? ` (${recordings.length})` : ''}
        </ModeButton>
        <ModeButton active={mode === 'live'} disabled={running} onClick={() => setMode('live')}>
          Live
        </ModeButton>
        <span className="text-xs text-gray-500 ml-1">
          {mode === 'replay'
            ? 'Recorded races play back with their original timing. No model is called.'
            : status?.requiresAccessKey
              ? 'Live races call the models and cost money. They need the access key.'
              : 'Live races call the models and cost money.'}
        </span>
      </div>

      {mode === 'live' && status && !status.configured && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          The server has no <code className="font-mono">OPENROUTER_API_KEY</code>. Set it in the deployment environment to run live races.
        </div>
      )}

      {mode === 'replay' && !recording && (
        <div className="rounded-lg border border-gray-700 bg-gray-900/60 px-4 py-3 text-sm text-gray-400">
          No recordings yet. Run a live race, download the recording, and add it with{' '}
          <code className="font-mono text-gray-300">node scripts/add-rubiks-recording.mjs &lt;file&gt;</code>.
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-gray-800 bg-gray-900/60 px-4 py-3">
        {mode === 'replay' ? (
          <>
            <label className="text-xs text-gray-400">
              Recording
              <select
                value={recordingId}
                disabled={running || !recordings.length}
                onChange={(e) => setRecordingId(e.target.value)}
                className="block mt-1 max-w-[18rem] rounded-md border border-gray-700 bg-gray-950 px-2 py-1 text-sm text-gray-100"
              >
                {recordings.map((r) => {
                  const solved = r.summary.filter((s) => s.status === 'solved').map((s) => s.label);
                  return (
                    <option key={r.id} value={r.id}>
                      {fmtDate(r.recordedAt)} · {r.scramble.length} moves · {solved.length ? `solved by ${solved.join(', ')}` : 'nobody solved'}
                    </option>
                  );
                })}
              </select>
            </label>
            <div className="text-xs text-gray-400" role="group" aria-label="Playback speed">
              <span>Speed</span>
              <div className="flex gap-1 mt-1">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    disabled={running}
                    onClick={() => setSpeed(s)}
                    className={`rounded-md px-2 py-1 text-xs font-medium ${speed === s ? 'bg-gray-700 text-gray-100' : 'text-gray-400 hover:bg-gray-800'} disabled:opacity-40`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
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
                Access key {keyChecking ? <span className="text-gray-500">checking</span> : liveAllowed ? <span className="text-emerald-400">unlocked</span> : accessKey ? <span className="text-rose-400">wrong key</span> : null}
                <input type="password" value={accessKey} onChange={(e) => saveKey(e.target.value)} disabled={running} className="block mt-1 w-40 rounded-md border border-gray-700 bg-gray-950 px-2 py-1 text-sm text-gray-100" />
              </label>
            )}
          </>
        )}
        <div className="flex gap-2 ml-auto">
          {mode === 'live' && (
            <button onClick={reshuffle} disabled={running} className="rounded-md border border-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-40">
              New scramble
            </button>
          )}
          {running ? (
            <button onClick={stop} className="rounded-md bg-rose-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-rose-500">
              Stop
            </button>
          ) : (
            <button
              onClick={mode === 'replay' ? startReplay : startLive}
              disabled={!canStart}
              className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-40"
            >
              {mode === 'replay' ? 'Play recording' : 'Start race'}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
        <span>Scramble: <span className="font-mono text-gray-300">{scramble.join(' ')}</span></span>
        {mode === 'live' && <span>seed {seed}</span>}
        {mode === 'replay' && recording && <span>recorded {fmtDate(recording.recordedAt)}</span>}
        {running && <span className="tabular-nums text-gray-300">{(elapsedMs / 1000).toFixed(1)} s{mode === 'replay' && speed !== 1 ? ` · ${speed}x` : ''}</span>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {ordered.map((p) => (
          <ModelPanel key={p.model.key} panel={p} scramble={scramble} resetKey={resetKey} elapsedMs={elapsedMs} />
        ))}
      </div>

      {finished && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-100">Results</h2>
            <div className="flex gap-3 text-xs">
              <button onClick={() => copyText(resultsMarkdown, 'results')} className="text-gray-400 hover:text-gray-200">
                {copied === 'results' ? 'Copied' : 'Copy as Markdown'}
              </button>
              {lastRecording && (
                <>
                  <button onClick={downloadRecording} className="text-gray-400 hover:text-gray-200">Download recording</button>
                  <button onClick={() => copyText(JSON.stringify(lastRecording), 'recording')} className="text-gray-400 hover:text-gray-200">
                    {copied === 'recording' ? 'Copied' : 'Copy recording JSON'}
                  </button>
                </>
              )}
            </div>
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

function ModeButton({ active, disabled, onClick, children }: { active: boolean; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 ${
        active ? 'bg-gray-700 text-gray-100' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
      }`}
    >
      {children}
    </button>
  );
}

function rank(a: PanelState, b: PanelState): number {
  const score = (p: PanelState) => (p.status === 'solved' ? 0 : p.status === 'failed' ? 1 : 2);
  const d = score(a) - score(b);
  if (d !== 0) return d;
  if (a.status === 'solved' && b.status === 'solved') return (a.finalElapsedMs ?? 0) - (b.finalElapsedMs ?? 0);
  return (a.misplacedAfter ?? 99) - (b.misplacedAfter ?? 99);
}
