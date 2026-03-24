import type { TimeRange } from '@/components/TrendFilters';

export function formatStarCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return n.toString();
}

export const categoryColors: Record<string, string> = {
  'AI / ML': 'border-purple-500/40 text-purple-400',
  'Agentic': 'border-violet-500/40 text-violet-400',
  'Security': 'border-red-500/40 text-red-400',
  'Web Framework': 'border-blue-500/40 text-blue-400',
  'DevTools': 'border-emerald-500/40 text-emerald-400',
  'Database': 'border-amber-500/40 text-amber-400',
  'Mobile': 'border-cyan-500/40 text-cyan-400',
  'Infra': 'border-orange-500/40 text-orange-400',
  'Language': 'border-pink-500/40 text-pink-400',
  'Data': 'border-teal-500/40 text-teal-400',
  'Other': 'border-gray-500/40 text-gray-400',
};

export const langColors: Record<string, string> = {
  TypeScript: 'bg-blue-400',
  Python: 'bg-yellow-400',
  Go: 'bg-cyan-400',
  Rust: 'bg-orange-400',
  JavaScript: 'bg-yellow-300',
  Java: 'bg-red-400',
  'C++': 'bg-pink-400',
  C: 'bg-gray-400',
  Swift: 'bg-orange-300',
  Kotlin: 'bg-purple-400',
  Ruby: 'bg-red-500',
  PHP: 'bg-indigo-400',
  Shell: 'bg-green-400',
  Dart: 'bg-teal-400',
  MDX: 'bg-yellow-500',
};

export const deltaKey: Record<TimeRange, string> = {
  day: 'delta_day',
  week: 'delta_week',
  month: 'delta_month',
  year: 'delta_year',
};
