import Link from 'next/link';
import { BookOpen, Layout, Terminal, Shield, MessageSquare, Rocket } from 'lucide-react';

const cards = [
  {
    title: 'Getting Started',
    description: 'Set up your first OpenClaw agent and get it running in minutes.',
    href: '/getting-started',
    icon: Rocket,
  },
  {
    title: 'Architecture',
    description: 'Understand the multi-agent gateway pattern and how agents are isolated.',
    href: '/architecture',
    icon: Layout,
  },
  {
    title: 'Agent Roles',
    description: 'Design agents for different functions — engineering, analytics, product, and more.',
    href: '/architecture/agent-roles',
    icon: BookOpen,
  },
  {
    title: 'Security',
    description: 'Tool policies, sandboxing, and least-privilege access for production agents.',
    href: '/architecture/security',
    icon: Shield,
  },
  {
    title: 'Create a Slack Agent',
    description: 'Step-by-step guide to creating a new agent and connecting it to Slack.',
    href: '/guides/create-slack-agent',
    icon: MessageSquare,
  },
  {
    title: 'CLI Reference',
    description: 'Quick reference for all common OpenClaw CLI commands.',
    href: '/reference/cli',
    icon: Terminal,
  },
];

export default function HomePage() {
  return (
    <div className="not-prose">
      <div className="mb-12">
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-50 mb-4">
          OpenClaw Help Center
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl">
          Guidelines, best practices, and step-by-step guides for running
          OpenClaw multi-agent systems in production.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group block rounded-lg border border-gray-800 bg-gray-900/50 p-5 transition-colors hover:border-brand-500/40 hover:bg-gray-900"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon size={18} className="text-brand-400" />
                <h2 className="text-sm font-semibold text-gray-100 group-hover:text-brand-300">
                  {card.title}
                </h2>
              </div>
              <p className="text-sm text-gray-500 group-hover:text-gray-400">
                {card.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
