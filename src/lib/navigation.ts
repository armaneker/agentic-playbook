export interface NavItem {
  title: string;
  href: string;
  children?: NavItem[];
}

export const navigation: NavItem[] = [
  {
    title: 'Getting Started',
    href: '/getting-started',
    children: [
      { title: 'What is Agentic Playbook?', href: '/getting-started' },
      { title: 'Your First Agent in 15 Minutes', href: '/getting-started/first-agent' },
    ],
  },
  {
    title: 'OpenClaw',
    href: '/openclaw',
    children: [
      { title: 'Architecture & Multi-Agent Gateway', href: '/openclaw/architecture' },
      { title: 'Agent Roles', href: '/openclaw/agent-roles' },
      { title: 'Create a Slack Agent', href: '/openclaw/create-slack-agent' },
      { title: 'CLI Reference', href: '/openclaw/cli-reference' },
      { title: 'Deployment', href: '/openclaw/deployment' },
      { title: 'Security', href: '/openclaw/security' },
    ],
  },
  {
    title: 'Paperclip',
    href: '/paperclip',
  },
  {
    title: 'LangSmith Fleet',
    href: '/langsmith',
  },
  {
    title: 'Skills & Plugins',
    href: '/skills-and-plugins',
  },
  {
    title: 'Security',
    href: '/security',
  },
  {
    title: 'Case Studies',
    href: '/case-studies',
  },
  {
    title: 'Trending Repos',
    href: '/trends',
  },
  {
    title: 'About',
    href: '/about/contributing',
    children: [
      { title: 'Contributing', href: '/about/contributing' },
    ],
  },
];
