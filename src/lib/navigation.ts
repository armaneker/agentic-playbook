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
      { title: 'AI Agents & Memory', href: '/getting-started/agent-memory' },
      { title: 'The RPI Loop', href: '/getting-started/rpi-loop' },
    ],
  },
  {
    title: 'Skills',
    href: '/skills',
    children: [
      { title: 'Overview', href: '/skills' },
      { title: 'Anatomy of a Skill', href: '/skills/anatomy' },
      { title: 'YAML Frontmatter', href: '/skills/frontmatter' },
      { title: 'Writing Steps', href: '/skills/steps' },
      { title: 'References', href: '/skills/references' },
      { title: 'Scripts', href: '/skills/scripts' },
      { title: 'Progressive Loading', href: '/skills/progressive-loading' },
      { title: 'Testing & Iteration', href: '/skills/testing' },
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
      { title: 'Local Ollama Models', href: '/openclaw/ollama' },
      { title: 'Mission Control', href: '/openclaw/mission-control' },
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
