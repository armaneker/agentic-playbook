import Link from 'next/link';
import { Server, Cpu, BarChart3, Zap, Puzzle, Shield, BookOpen, TrendingUp, ArrowRight, Box, Layers, Compass } from 'lucide-react';

const tools = [
  {
    title: 'Concepts',
    description: 'Agent, harness, loop, graph, tools, context',
    href: '/concepts',
    icon: Layers,
    count: '6 pages',
    available: true,
  },
  {
    title: 'OpenClaw',
    description: 'Multi-agent gateway with isolated workspaces',
    href: '/openclaw',
    icon: Server,
    count: '6 guides',
    available: true,
  },
  {
    title: 'Paperclip',
    description: 'AI company orchestration',
    href: '/paperclip',
    icon: Cpu,
    count: 'Coming soon',
    available: false,
  },
  {
    title: 'LangSmith Fleet',
    description: 'Agent observability and monitoring',
    href: '/langsmith',
    icon: BarChart3,
    count: 'Coming soon',
    available: false,
  },
  {
    title: 'Skills',
    description: 'Anatomy, structure, and progressive loading',
    href: '/skills',
    icon: Zap,
    count: '6 guides',
    available: true,
  },
  {
    title: 'Security',
    description: 'Production hardening across tools',
    href: '/security',
    icon: Shield,
    count: 'Coming soon',
    available: false,
  },
  {
    title: 'Case Studies',
    description: 'Real-world agent deployments',
    href: '/case-studies',
    icon: BookOpen,
    count: 'Coming soon',
    available: false,
  },
  {
    title: 'Trending Repos',
    description: 'GitHub projects gaining stars right now',
    href: '/trends',
    icon: TrendingUp,
    count: '12 repos tracked',
    available: true,
  },
  {
    title: 'Demos',
    description: "Four models race to solve a Rubik's cube",
    href: '/demos/rubiks-cube',
    icon: Box,
    count: '1 demo',
    available: true,
  },
  {
    title: 'Career Path',
    description: 'Skills map for AI engineers',
    href: '/career',
    icon: Compass,
    count: '1 page',
    available: true,
  },
];

const latestGuides = [
  {
    title: 'Context and Memory',
    description: 'What goes into the prompt each step, and how to keep long runs from drowning in history',
    href: '/concepts/context',
    tool: 'Concepts',
  },
  {
    title: 'Tools',
    description: 'Designing tool interfaces a model can call reliably',
    href: '/concepts/tools',
    tool: 'Concepts',
  },
  {
    title: 'Agent = Model + Harness',
    description: 'What the model does alone and what the harness adds',
    href: '/concepts/agent',
    tool: 'Concepts',
  },
  {
    title: 'Software Engineering Fundamentals for AI Engineers',
    description: 'Five skill areas that decide whether agent-built software is good',
    href: '/career/software-fundamentals',
    tool: 'Career',
  },
  {
    title: 'How to Create a New OpenClaw Agent on Slack',
    description: 'Step-by-step guide with multi-bot config and troubleshooting',
    href: '/openclaw/create-slack-agent',
    tool: 'OpenClaw',
  },
];

export default function HomePage() {
  return (
    <div className="not-prose">
      {/* Hero */}
      <div className="mb-14">
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-50 mb-3">
          Agentic Playbook
        </h1>
        <p className="text-lg text-gray-300 mb-2">
          Tested guides for agentic workflows
        </p>
        <p className="text-base text-gray-500 max-w-2xl mb-6">
          Tested guides for setting up and running AI agent systems in production.
        </p>
        <div className="flex gap-3">
          <Link
            href="/getting-started"
            className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 transition-colors"
          >
            Get Started <ArrowRight size={14} />
          </Link>
          <Link
            href="/openclaw"
            className="inline-flex items-center gap-2 rounded-md border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:border-gray-500 hover:text-gray-100 transition-colors"
          >
            Browse Guides <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Browse by Tool */}
      <div className="mb-14">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
          Browse by Tool
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="group block rounded-lg border border-gray-800 bg-gray-900/50 p-4 transition-colors hover:border-brand-500/40 hover:bg-gray-900"
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <Icon size={16} className="text-brand-400" />
                  <span className="text-sm font-semibold text-gray-100 group-hover:text-brand-300">
                    {tool.title}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  {tool.description}
                </p>
                <span className={`text-xs font-medium ${tool.available ? 'text-brand-400' : 'text-gray-600'}`}>
                  {tool.count}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Latest Guides */}
      <div className="mb-14">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
          Latest Guides
        </h2>
        <div className="space-y-3">
          {latestGuides.map((guide) => (
            <Link
              key={guide.href}
              href={guide.href}
              className="group block rounded-lg border border-gray-800 bg-gray-900/50 p-4 transition-colors hover:border-brand-500/40 hover:bg-gray-900"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-brand-400/70">
                  {guide.tool}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-gray-100 group-hover:text-brand-300 mb-1">
                {guide.title}
              </h3>
              <p className="text-xs text-gray-500">
                {guide.description}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* About */}
      <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
          About This Project
        </h2>
        <p className="text-sm text-gray-400 mb-3">
          Agentic Playbook is a collection of tested guides for setting up and running AI agent systems in production.
        </p>
        <p className="text-sm text-gray-500">
          Built by{' '}
          <a href="https://github.com/armaneker/agentic-playbook" className="text-gray-400 hover:text-gray-200 transition-colors" target="_blank" rel="noopener noreferrer">
            Contribute on GitHub
          </a>
        </p>
      </div>
    </div>
  );
}
