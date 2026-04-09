'use client';

import { Clock, BarChart3, Wrench, Calendar } from 'lucide-react';
import ReadAloud from './ReadAloud';
import TranscriptPanel from './TranscriptPanel';

const difficultyColors: Record<string, string> = {
  Beginner: 'text-green-400',
  Intermediate: 'text-yellow-400',
  Advanced: 'text-red-400',
};

interface GuideHeaderProps {
  tool: string;
  difficulty: string;
  lastTested: string;
  readTime: string;
}

export default function GuideHeader({ tool, difficulty, lastTested, readTime }: GuideHeaderProps) {
  return (
    <div className="not-prose">
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-3 text-sm text-gray-400">
        <span className="flex items-center gap-1.5">
          <Wrench size={14} className="text-brand-400" />
          {tool}
        </span>
        <span className="text-gray-700">&middot;</span>
        <span className="flex items-center gap-1.5">
          <BarChart3 size={14} className={difficultyColors[difficulty] || 'text-gray-400'} />
          {difficulty}
        </span>
        <span className="text-gray-700">&middot;</span>
        <span className="flex items-center gap-1.5">
          <Calendar size={14} />
          Last tested: {lastTested}
        </span>
        <span className="text-gray-700">&middot;</span>
        <span className="flex items-center gap-1.5">
          <Clock size={14} />
          ~{readTime} read
        </span>
        <ReadAloud />
      </div>
      <TranscriptPanel />
    </div>
  );
}
