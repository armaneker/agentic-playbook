'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Move } from '@/lib/rubiks/cube';
import type { PanelState } from './types';

const Cube3D = dynamic(() => import('./Cube3D'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-lg bg-gray-800/40" />,
});

interface Props {
  panel: PanelState;
  scramble: Move[];
  resetKey: number;
  elapsedMs: number;
}

function fmtMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`;
}

function fmtCost(usd: number | null): string {
  if (usd === null) return '—';
  if (usd === 0) return '$0';
  if (usd < 0.001) return `$${usd.toFixed(5)}`;
  return `$${usd.toFixed(4)}`;
}

function fmtTokens(n: number | null): string {
  if (n === null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

const STATUS_LABEL: Record<PanelState['status'], string> = {
  idle: 'Ready',
  waiting: 'Connecting',
  thinking: 'Thinking',
  moving: 'Applying moves',
  solved: 'Solved',
  failed: 'Not solved',
  timeout: 'Timed out',
  error: 'Error',
};

const STATUS_CLASS: Record<PanelState['status'], string> = {
  idle: 'bg-gray-800 text-gray-400',
  waiting: 'bg-gray-800 text-gray-300',
  thinking: 'bg-amber-500/15 text-amber-300',
  moving: 'bg-sky-500/15 text-sky-300',
  solved: 'bg-emerald-500/15 text-emerald-300',
  failed: 'bg-rose-500/15 text-rose-300',
  timeout: 'bg-amber-500/15 text-amber-300',
  error: 'bg-rose-500/15 text-rose-300',
};

export default function ModelPanel({ panel, scramble, resetKey, elapsedMs }: Props) {
  const { model } = panel;
  const [showReply, setShowReply] = useState(false);
  const running = panel.status === 'waiting' || panel.status === 'thinking' || panel.status === 'moving';
  const shownElapsed = panel.finalElapsedMs ?? (running ? elapsedMs : null);
  const finished = ['solved', 'failed', 'timeout', 'error'].includes(panel.status);
  const remaining = panel.timeoutMs !== null && running && panel.finalElapsedMs === null ? Math.max(0, panel.timeoutMs - elapsedMs) : null;

  return (
    <div className="flex flex-col rounded-xl border border-gray-800 bg-gray-900/60 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800" style={{ borderTopColor: model.color, borderTopWidth: 3 }}>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-100 truncate">{model.label}</div>
          <div className="text-[11px] text-gray-500 truncate">
            {model.provider} · {model.kind === 'jev' ? 'one decision per move' : 'full solution in one reply'}
          </div>
        </div>
        <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[panel.status]}`}>
          {STATUS_LABEL[panel.status]}
        </span>
      </div>

      <div className="relative h-52 sm:h-56">
        <Cube3D scramble={scramble} moves={panel.moves} resetKey={resetKey} className="absolute inset-0" turnMs={model.kind === 'jev' ? 260 : 200} active={panel.status === 'thinking' || panel.status === 'waiting'} />
        {panel.status === 'thinking' && model.kind === 'llm' && (
          <div className="absolute left-3 bottom-2 right-3 flex items-center gap-2 text-[11px] text-gray-500 font-mono truncate">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            {panel.reasoningChars > 0 && <span>reasoning {fmtTokens(panel.reasoningChars)} chars · </span>}
            {panel.answerChars > 0 ? <span>answer {fmtTokens(panel.answerChars)} chars</span> : <span>waiting for the reply · providers often stream nothing while the model reasons</span>}
            {remaining !== null && <span className="ml-auto shrink-0 text-gray-600">limit in {Math.ceil(remaining / 1000)} s</span>}
          </div>
        )}
        {panel.status === 'timeout' && (
          <div className="absolute left-3 bottom-2 right-3 text-[11px] text-amber-300/80 font-mono truncate">
            hit the {panel.timeoutMs ? Math.round(panel.timeoutMs / 1000) : '?'} s limit{panel.moves.length ? ` · applied the ${panel.moves.length} moves found so far` : ' · no moves in the partial reply'}
          </div>
        )}
        {panel.outcome === 'max-tokens' && (
          <div className="absolute left-3 bottom-2 right-3 text-[11px] text-rose-300/80 font-mono truncate">
            hit the token cap before finishing
          </div>
        )}
        {model.kind === 'jev' && panel.lastStep && running && (
          <div className="absolute left-3 bottom-2 right-3 text-[11px] text-gray-500 font-mono truncate">
            step {panel.lastStep.step} · {panel.lastStep.move} · {fmtMs(panel.lastStep.latencyMs)}
            {panel.lastStep.probability !== null && ` · p=${panel.lastStep.probability.toFixed(2)}`}
            {` · ${panel.lastStep.misplaced} misplaced`}
          </div>
        )}
        {panel.error && (
          <div className="absolute inset-x-3 bottom-2 text-[11px] text-rose-300 font-mono line-clamp-2">{panel.error}</div>
        )}
      </div>

      <dl className="grid grid-cols-4 gap-px bg-gray-800 border-t border-gray-800 text-center">
        <Stat label="Time" value={shownElapsed === null ? '—' : fmtMs(shownElapsed)} />
        <Stat label="Moves" value={panel.moves.length ? String(panel.moves.length) : '—'} />
        <Stat
          label="Tokens"
          value={panel.usage ? `${fmtTokens(panel.usage.inputTokens)}/${fmtTokens(panel.usage.outputTokens)}` : '—'}
          hint="in/out"
        />
        <Stat label="Cost" value={fmtCost(panel.usage?.cost ?? null)} hint={panel.usage && !panel.usage.costFromProvider ? 'estimated' : undefined} />
      </dl>

      <div className="px-4 py-2 text-[11px] text-gray-500 border-t border-gray-800 flex justify-between gap-2">
        <span className="truncate font-mono">{model.openRouterId}</span>
        <span className="shrink-0">${model.pricing.inputPerM}/M in · ${model.pricing.outputPerM}/M out</span>
      </div>

      {finished && (panel.answerTail || panel.moves.length > 0) && (
        <div className="border-t border-gray-800">
          <button onClick={() => setShowReply((v) => !v)} className="w-full px-4 py-1.5 text-left text-[11px] text-gray-400 hover:text-gray-200">
            {showReply ? 'Hide' : 'Show'} {model.kind === 'jev' ? 'moves' : 'reply'}
          </button>
          {showReply && (
            <pre className="max-h-48 overflow-auto px-4 pb-3 text-[11px] leading-relaxed text-gray-300 whitespace-pre-wrap break-words font-mono">
              {model.kind === 'jev' ? panel.moves.join(' ') : panel.answerTail}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-gray-900/80 px-2 py-2">
      <dt className="text-[10px] uppercase tracking-wider text-gray-500">{label}{hint ? <span className="normal-case tracking-normal"> ({hint})</span> : null}</dt>
      <dd className="text-sm font-semibold text-gray-100 tabular-nums truncate">{value}</dd>
    </div>
  );
}
