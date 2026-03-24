#!/usr/bin/env node

/**
 * Generates MDX summary pages for newly discovered repos.
 *
 * 1. Reads repos.json and finds entries where has_summary is false
 * 2. For each (up to MAX_PER_RUN), fetches README and metadata from GitHub
 * 3. Calls the Anthropic API to generate an MDX summary
 * 4. Writes the summary to src/app/trends/projects/{owner}-{repo}/page.mdx
 * 5. Updates repos.json to mark has_summary = true
 */

import { getRepo, getReadme } from './lib/github-api.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'src/data/trends');
const REPOS_FILE = join(DATA_DIR, 'repos.json');
const PROJECTS_DIR = join(process.cwd(), 'src/app/trends/projects');
const TRENDS_FILE = join(DATA_DIR, 'computed/trends.json');
const MAX_PER_RUN = 5;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY is required.');
  process.exit(1);
}

function loadJSON(file) {
  return JSON.parse(readFileSync(file, 'utf-8'));
}

function saveJSON(file, data) {
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

/**
 * Generate a short 2-3 sentence blurb for the popup.
 */
async function generateBlurb(repoData, readme) {
  const readmeSnippet = readme ? readme.slice(0, 4000) : 'No README available.';

  const prompt = `Write a 2-3 sentence summary of this GitHub project. First sentence: what it is. Second sentence: what it does / why someone would use it. Third (optional): a notable detail.

Write like a senior engineer. No filler, no hype. Just facts.

Repository: ${repoData.full_name}
Description: ${repoData.description || 'No description'}
Language: ${repoData.language || 'Unknown'}
Stars: ${repoData.stargazers_count || 'Unknown'}
Topics: ${(repoData.topics || []).join(', ') || 'None'}

README (first 4000 chars):
${readmeSnippet}

Output ONLY the 2-3 sentences, nothing else.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.content[0]?.text?.trim() || null;
}

/**
 * Call the Anthropic Messages API to generate a summary.
 */
async function generateSummary(repoData, readme) {
  const readmeSnippet = readme
    ? readme.slice(0, 8000)  // Cap to avoid huge prompts
    : 'No README available.';

  const prompt = `You are writing a summary page for a developer documentation site called Agentic Playbook. The site uses MDX.

Given this GitHub repository's information, write an MDX page that covers:
1. What the project is (1-2 sentences)
2. What it does (key features as a bullet list)
3. How to install it
4. Basic usage example
5. Notable details (license, language, community size)

Rules:
- Write like a senior engineer explaining to a peer. No filler.
- Never use phrases like "hands-on", "production-grade", "dive deep", "let's get started", "comprehensive guide"
- Start with a GuideHeader component, then an h1 title
- Use <Callout> components for important notes (types: info, warning, tip, danger)
- Use code blocks with language tags
- Keep it concise — aim for 200-400 words of content

Repository: ${repoData.full_name}
Description: ${repoData.description || 'No description'}
Language: ${repoData.language || 'Unknown'}
Stars: ${repoData.stargazers_count || 'Unknown'}
Topics: ${(repoData.topics || []).join(', ') || 'None'}
URL: ${repoData.html_url}
License: ${repoData.license?.spdx_id || 'Unknown'}

README (first 8000 chars):
${readmeSnippet}

Output ONLY the MDX content. Start with the GuideHeader component like this:
<GuideHeader tool="${repoData.full_name.split('/')[1]}" difficulty="Beginner" lastTested="${new Date().toISOString().slice(0, 7)}" readTime="5 min" />`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.content[0]?.text || '';
}

/**
 * Sanitize MDX — escape bare < that MDX would parse as JSX.
 * Uses lookahead to keep allowed tags intact without string slicing.
 */
function sanitizeMDX(content) {
  return content.replace(
    /<(?!\/?(?:Callout|GuideHeader|a|code|br|img|hr|sup|sub|em|strong|details|summary)\b)(?![/!])/g,
    '&lt;'
  );
}

/**
 * Validate MDX output — basic checks to avoid broken pages.
 */
function validateMDX(content) {
  if (!content || content.length < 100) return false;
  if (!content.includes('#')) return false;  // Must have at least one heading
  return true;
}

async function main() {
  console.log('Analyzing new repos...');

  const reposIndex = loadJSON(REPOS_FILE);

  // Cache fetched GitHub data to avoid redundant API calls across phases
  const dataCache = new Map();
  async function fetchRepoData(name) {
    if (!dataCache.has(name)) {
      dataCache.set(name, { repoData: await getRepo(name), readme: await getReadme(name) });
    }
    return dataCache.get(name);
  }

  // Phase 1: Generate blurbs for repos that don't have one
  const needsBlurb = Object.entries(reposIndex.repos)
    .filter(([, repo]) => !repo.blurb)
    .slice(0, 20);

  if (needsBlurb.length > 0) {
    console.log(`Generating blurbs for ${needsBlurb.length} repos...`);
    for (const [name] of needsBlurb) {
      try {
        const { repoData, readme } = await fetchRepoData(name);
        const blurb = await generateBlurb(repoData, readme);
        if (blurb) {
          reposIndex.repos[name].blurb = blurb;
          console.log(`  Blurb: ${name}`);
        }
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.error(`  Blurb error for ${name}: ${err.message}`);
      }
    }
  }

  // Phase 2: Generate full MDX summaries for repos without one
  const needsSummary = Object.entries(reposIndex.repos)
    .filter(([, repo]) => !repo.has_summary)
    .slice(0, MAX_PER_RUN);

  if (needsSummary.length > 0) {
    console.log(`Generating full summaries for ${needsSummary.length} repos...`);
  }

  let generated = 0;

  for (const [name] of needsSummary) {
    console.log(`Analyzing: ${name}...`);

    try {
      const { repoData, readme } = await fetchRepoData(name);
      const mdxContent = await generateSummary(repoData, readme);

      if (!validateMDX(mdxContent)) {
        console.error(`  Invalid MDX generated for ${name}, skipping.`);
        continue;
      }

      const slug = name.replace('/', '-');
      const pageDir = join(PROJECTS_DIR, slug);
      mkdirSync(pageDir, { recursive: true });
      writeFileSync(join(pageDir, 'page.mdx'), sanitizeMDX(mdxContent));
      console.log(`  Written: src/app/trends/projects/${slug}/page.mdx`);

      reposIndex.repos[name].has_summary = true;
      generated++;

      if (!reposIndex.repos[name].blurb) {
        const blurb = await generateBlurb(repoData, readme);
        if (blurb) reposIndex.repos[name].blurb = blurb;
      }

      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`  Error analyzing ${name}: ${err.message}`);
    }
  }

  // Update repos.json
  saveJSON(REPOS_FILE, reposIndex);

  // Update has_summary and blurb flags in trends.json too
  if (existsSync(TRENDS_FILE)) {
    const trends = loadJSON(TRENDS_FILE);
    for (const repo of trends.repos) {
      const idx = reposIndex.repos[repo.full_name];
      if (idx) {
        repo.has_summary = idx.has_summary || false;
        repo.blurb = idx.blurb || null;
      }
    }
    saveJSON(TRENDS_FILE, trends);
  }

  console.log(`Done. Generated ${generated} summaries, ${needsBlurb.length} blurbs.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
