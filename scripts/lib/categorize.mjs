/**
 * Maps GitHub topics and repo metadata to a single category.
 *
 * Categories (in priority order — first match wins):
 *   AI / ML, Agentic, Security, DevTools, Web Framework,
 *   Database, Mobile, Infra, Language, Data, Other
 */

const CATEGORY_RULES = [
  {
    name: 'Agentic',
    topics: ['agent', 'agents', 'agentic', 'autonomous-agents', 'ai-agent', 'ai-agents', 'mcp', 'langchain', 'langgraph', 'autogen', 'crewai', 'openai-agents', 'tool-use', 'function-calling'],
    namePatterns: [/agent/i, /\bcrew\b/i, /\bmcp\b/i, /autopilot/i, /copilot/i],
  },
  {
    name: 'AI / ML',
    topics: ['artificial-intelligence', 'ai', 'machine-learning', 'deep-learning', 'nlp', 'natural-language-processing', 'llm', 'large-language-model', 'generative-ai', 'gpt', 'openai', 'chatgpt', 'claude', 'transformers', 'pytorch', 'tensorflow', 'computer-vision', 'stable-diffusion', 'diffusion', 'rag', 'embedding', 'vector', 'neural-network', 'huggingface', 'fine-tuning', 'prompt-engineering'],
    namePatterns: [/\bai\b/i, /\bllm\b/i, /\bgpt\b/i, /\bml\b/i, /diffusion/i, /neural/i, /transformer/i],
  },
  {
    name: 'Security',
    topics: ['security', 'cybersecurity', 'penetration-testing', 'vulnerability', 'encryption', 'authentication', 'oauth', 'devsecops', 'firewall', 'malware', 'ctf'],
    namePatterns: [/security/i, /\bauth\b/i, /encrypt/i, /vuln/i],
  },
  {
    name: 'Web Framework',
    topics: ['web', 'web-framework', 'nextjs', 'react', 'vue', 'svelte', 'angular', 'frontend', 'full-stack', 'tailwindcss', 'css', 'html', 'remix', 'astro', 'nuxt', 'django', 'flask', 'fastapi', 'express', 'rails', 'laravel'],
    namePatterns: [/next\.?js/i, /react/i, /vue/i, /svelte/i, /angular/i, /django/i, /flask/i, /fastapi/i, /express/i, /rails/i, /laravel/i],
  },
  {
    name: 'DevTools',
    topics: ['developer-tools', 'devtools', 'cli', 'terminal', 'editor', 'ide', 'linter', 'formatter', 'testing', 'ci-cd', 'automation', 'build-tool', 'bundler', 'package-manager', 'monorepo', 'docker', 'containers', 'devops', 'git'],
    namePatterns: [/\bcli\b/i, /lint/i, /format/i, /bundl/i, /docker/i],
  },
  {
    name: 'Database',
    topics: ['database', 'sql', 'nosql', 'postgres', 'mysql', 'mongodb', 'redis', 'sqlite', 'orm', 'prisma', 'drizzle', 'supabase', 'firebase'],
    namePatterns: [/\bdb\b/i, /postgres/i, /mysql/i, /mongo/i, /redis/i, /sqlite/i, /supabase/i],
  },
  {
    name: 'Mobile',
    topics: ['mobile', 'ios', 'android', 'react-native', 'flutter', 'swift', 'kotlin', 'expo'],
    namePatterns: [/react.native/i, /flutter/i, /\bios\b/i, /android/i, /expo/i],
  },
  {
    name: 'Infra',
    topics: ['infrastructure', 'cloud', 'kubernetes', 'k8s', 'terraform', 'aws', 'gcp', 'azure', 'serverless', 'microservices', 'networking', 'load-balancer', 'proxy', 'cdn'],
    namePatterns: [/k8s/i, /kubernetes/i, /terraform/i, /\baws\b/i, /serverless/i],
  },
  {
    name: 'Language',
    topics: ['programming-language', 'compiler', 'interpreter', 'runtime', 'wasm', 'webassembly'],
    namePatterns: [/compiler/i, /interpreter/i, /\bwasm\b/i],
  },
  {
    name: 'Data',
    topics: ['data-science', 'data-engineering', 'analytics', 'visualization', 'etl', 'data-pipeline', 'pandas', 'jupyter', 'notebook', 'scraping', 'web-scraping', 'crawler'],
    namePatterns: [/scrape/i, /crawl/i, /analytics/i, /pipeline/i],
  },
];

/**
 * Categorize a repo based on its topics, name, and description.
 * @param {{ topics?: string[], full_name: string, description?: string }} repo
 * @returns {string} Category name
 */
export function categorize(repo) {
  const topics = (repo.topics || []).map(t => t.toLowerCase());
  const name = repo.full_name || '';
  const desc = (repo.description || '').toLowerCase();

  for (const rule of CATEGORY_RULES) {
    // Check topics
    if (rule.topics.some(t => topics.includes(t))) {
      return rule.name;
    }
    // Check repo name patterns
    if (rule.namePatterns.some(p => p.test(name) || p.test(desc))) {
      return rule.name;
    }
  }

  return 'Other';
}
