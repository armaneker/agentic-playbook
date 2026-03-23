#!/usr/bin/env node

/**
 * Fetches trending GitHub repos and updates the trends data.
 *
 * 1. Queries GitHub Search API for rising repos across multiple categories
 * 2. Writes today's snapshot to src/data/trends/snapshots/
 * 3. Computes star deltas against previous snapshots
 * 4. Writes computed/trends.json for the frontend
 * 5. Updates repos.json master index (marks new repos for analysis)
 */

import { searchRepos, getRateLimit, getLatestRelease } from './lib/github-api.mjs';
import { computeDeltas } from './lib/trend-calculator.mjs';
import { categorize } from './lib/categorize.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'src/data/trends');
const SNAPSHOTS_DIR = join(DATA_DIR, 'snapshots');
const COMPUTED_DIR = join(DATA_DIR, 'computed');
const REPOS_FILE = join(DATA_DIR, 'repos.json');
const TRENDS_FILE = join(COMPUTED_DIR, 'trends.json');
const MAX_REPOS = 200;

function today() {
  return new Date().toISOString().split('T')[0];
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function loadJSON(file, fallback) {
  if (!existsSync(file)) return fallback;
  return JSON.parse(readFileSync(file, 'utf-8'));
}

function saveJSON(file, data) {
  const dir = join(file, '..');
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

/**
 * Prune snapshots older than 400 days, keeping at most 1 per week for data > 30 days old.
 */
function pruneSnapshots() {
  if (!existsSync(SNAPSHOTS_DIR)) return;

  const files = readdirSync(SNAPSHOTS_DIR).filter(f => f.endsWith('.json')).sort();
  const cutoff400 = daysAgo(400);
  const cutoff30 = daysAgo(30);

  const weekSeen = new Set();

  for (const file of files) {
    const dateStr = file.replace('.json', '');

    // Delete anything older than 400 days
    if (dateStr < cutoff400) {
      unlinkSync(join(SNAPSHOTS_DIR, file));
      console.log(`Pruned old snapshot: ${file}`);
      continue;
    }

    // For data between 30-400 days old, keep only 1 per week
    if (dateStr < cutoff30) {
      const d = new Date(dateStr);
      const weekKey = `${d.getFullYear()}-W${Math.floor(d.getDate() / 7)}`;
      if (weekSeen.has(weekKey)) {
        unlinkSync(join(SNAPSHOTS_DIR, file));
        console.log(`Pruned weekly duplicate: ${file}`);
      } else {
        weekSeen.add(weekKey);
      }
    }
  }
}

async function main() {
  console.log('Fetching trending repos...');

  const rateLimit = await getRateLimit();
  console.log(`Rate limit: ${rateLimit.remaining}/${rateLimit.limit} (resets ${rateLimit.resetAt})`);

  if (rateLimit.remaining < 20) {
    console.error('Rate limit too low, skipping this run.');
    process.exit(0);
  }

  // Run multiple search queries to catch different types of trending repos
  const queries = [
    { minStars: 500, pushedAfter: daysAgo(1), perPage: 30 },    // Active today
    { minStars: 100, createdAfter: daysAgo(7), perPage: 30 },   // New this week
    { minStars: 1000, pushedAfter: daysAgo(7), perPage: 30 },   // Popular this week
    { minStars: 100, createdAfter: daysAgo(30), perPage: 30 },  // New this month
    // AI/agent specific queries
    { minStars: 50, createdAfter: daysAgo(14), language: 'python', perPage: 20 },
    { minStars: 50, createdAfter: daysAgo(14), language: 'typescript', perPage: 20 },
  ];

  const seen = new Map(); // full_name -> repo data

  for (const query of queries) {
    try {
      const repos = await searchRepos(query);
      for (const repo of repos) {
        if (!seen.has(repo.full_name)) {
          seen.set(repo.full_name, repo);
        }
      }
      console.log(`Query fetched ${repos.length} repos (total unique: ${seen.size})`);
    } catch (err) {
      console.error(`Query failed: ${err.message}`);
    }
    // Small delay between queries to be polite
    await new Promise(r => setTimeout(r, 500));
  }

  if (seen.size === 0) {
    console.error('No repos fetched. Exiting.');
    process.exit(1);
  }

  // Load existing repos index
  const reposIndex = loadJSON(REPOS_FILE, { repos: {} });

  // Build today's snapshot
  const snapshotData = {};
  for (const [name, repo] of seen) {
    snapshotData[name] = {
      stars: repo.stargazers_count,
      forks: repo.forks_count,
    };

    // Update repos index
    if (!reposIndex.repos[name]) {
      reposIndex.repos[name] = {
        full_name: name,
        description: repo.description || '',
        language: repo.language || 'Unknown',
        url: repo.html_url,
        first_seen: today(),
        has_summary: false,
        topics: repo.topics || [],
        category: categorize(repo),
        version: null,
      };
      console.log(`New repo discovered: ${name} [${reposIndex.repos[name].category}]`);
    } else {
      // Update description/language/topics in case they changed
      reposIndex.repos[name].description = repo.description || reposIndex.repos[name].description;
      reposIndex.repos[name].language = repo.language || reposIndex.repos[name].language;
      reposIndex.repos[name].topics = repo.topics || reposIndex.repos[name].topics || [];
      // Re-categorize with updated topics
      reposIndex.repos[name].category = categorize({
        ...reposIndex.repos[name],
        topics: repo.topics || reposIndex.repos[name].topics || [],
      });
    }
  }

  // Save today's snapshot
  const snapshotFile = join(SNAPSHOTS_DIR, `${today()}.json`);
  saveJSON(snapshotFile, { date: today(), data: snapshotData });
  console.log(`Saved snapshot: ${today()}.json (${Object.keys(snapshotData).length} repos)`);

  // Compute deltas
  const deltas = computeDeltas(snapshotData);

  // Fetch latest release versions for repos that don't have one yet
  // (batch in groups to stay within rate limits)
  const needVersion = Object.entries(reposIndex.repos)
    .filter(([name, r]) => !r.version && snapshotData[name])
    .map(([name]) => name);

  if (needVersion.length > 0) {
    console.log(`Fetching versions for ${needVersion.length} repos...`);
    const BATCH = 20; // fetch 20 at a time to be safe on rate limits
    for (let i = 0; i < needVersion.length; i += BATCH) {
      const batch = needVersion.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map(async (name) => {
          const tag = await getLatestRelease(name);
          return [name, tag];
        })
      );
      for (const [name, tag] of results) {
        if (tag) {
          reposIndex.repos[name].version = tag;
          console.log(`  ${name}: ${tag}`);
        }
      }
      if (i + BATCH < needVersion.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }

  // Build trends.json for the frontend
  const trendRepos = Object.entries(snapshotData)
    .map(([name, data]) => {
      const idx = reposIndex.repos[name] || {};
      const d = deltas[name] || {};
      return {
        full_name: name,
        description: idx.description || '',
        language: idx.language || 'Unknown',
        url: idx.url || `https://github.com/${name}`,
        stars: data.stars,
        delta_day: d.delta_day || 0,
        delta_week: d.delta_week || 0,
        delta_month: d.delta_month || 0,
        delta_year: d.delta_year || 0,
        has_summary: idx.has_summary || false,
        category: idx.category || 'Other',
        version: idx.version || null,
      };
    })
    .sort((a, b) => b.delta_week - a.delta_week)
    .slice(0, MAX_REPOS);

  saveJSON(TRENDS_FILE, {
    updated_at: new Date().toISOString(),
    repos: trendRepos,
  });
  console.log(`Saved trends.json (${trendRepos.length} repos)`);

  // Save updated repos index
  saveJSON(REPOS_FILE, reposIndex);

  // Prune old snapshots
  pruneSnapshots();

  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
