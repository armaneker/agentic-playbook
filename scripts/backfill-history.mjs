#!/usr/bin/env node

/**
 * Backfills historical star data by using the GitHub Stargazers API.
 *
 * The Stargazers API with `application/vnd.github.star+json` returns
 * a `starred_at` timestamp for each star. By paginating from the last page
 * backward, we can count how many stars a repo had at any past date.
 *
 * This generates synthetic snapshot files for key dates so the trend
 * calculator can compute accurate deltas.
 *
 * Usage: GITHUB_TOKEN=ghp_xxx node scripts/backfill-history.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';

const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) {
  console.error('GITHUB_TOKEN required');
  process.exit(1);
}

const DATA_DIR = join(process.cwd(), 'src/data/trends');
const SNAPSHOTS_DIR = join(DATA_DIR, 'snapshots');
const TRENDS_FILE = join(DATA_DIR, 'computed/trends.json');

const headers = {
  Accept: 'application/vnd.github.star+json',
  Authorization: `Bearer ${TOKEN}`,
  'X-GitHub-Api-Version': '2022-11-28',
};

/**
 * Get total stargazer count for a repo.
 */
async function getStarCount(fullName) {
  const res = await fetch(`https://api.github.com/repos/${fullName}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${TOKEN}`,
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.stargazers_count;
}

/**
 * Get stargazers page (with timestamps).
 * Returns array of { starred_at: "2026-01-15T..." }
 */
async function getStargazersPage(fullName, page, perPage = 100) {
  const url = `https://api.github.com/repos/${fullName}/stargazers?per_page=${perPage}&page=${page}`;
  const res = await fetch(url, { headers });
  if (!res.ok) return { items: [], lastPage: 1 };

  const items = await res.json();

  // Parse Link header for last page
  const link = res.headers.get('link') || '';
  const lastMatch = link.match(/page=(\d+)>; rel="last"/);
  const lastPage = lastMatch ? parseInt(lastMatch[1]) : page;

  return { items, lastPage };
}

/**
 * Find how many stars a repo had at a given cutoff date.
 * Uses binary search on stargazer pages to find the cutoff efficiently.
 */
async function starsAtDate(fullName, totalStars, cutoffDate) {
  const perPage = 100;
  const totalPages = Math.ceil(totalStars / perPage);

  if (totalPages === 0) return 0;

  // Binary search: find the page where starred_at crosses the cutoff
  let low = 1;
  let high = totalPages;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const { items } = await getStargazersPage(fullName, mid, perPage);

    if (items.length === 0) {
      high = mid;
      continue;
    }

    const firstDate = new Date(items[0].starred_at);

    if (firstDate < cutoffDate) {
      low = mid + 1;
    } else {
      high = mid;
    }

    await new Promise(r => setTimeout(r, 100));
  }

  // Refine by scanning the boundary page
  const { items } = await getStargazersPage(fullName, low, perPage);
  let countOnPage = 0;
  for (const item of items) {
    if (new Date(item.starred_at) < cutoffDate) {
      countOnPage++;
    }
  }

  return (low - 1) * perPage + countOnPage;
}

function fmt(date) {
  return date.toISOString().split('T')[0];
}

function saveSnapshot(dateStr, data) {
  const file = join(SNAPSHOTS_DIR, `${dateStr}.json`);
  mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  writeFileSync(file, JSON.stringify({ date: dateStr, data }, null, 2) + '\n');
  console.log(`  Saved snapshot: ${dateStr}.json`);
}

async function main() {
  const trends = JSON.parse(readFileSync(TRENDS_FILE, 'utf-8'));
  const repos = trends.repos;

  if (repos.length === 0) {
    console.error('No repos in trends.json');
    process.exit(1);
  }

  // Check rate limit
  const rlRes = await fetch('https://api.github.com/rate_limit', {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const rl = await rlRes.json();
  console.log(`Rate limit: ${rl.rate.remaining}/${rl.rate.limit}`);

  if (rl.rate.remaining < 500) {
    console.error('Not enough rate limit. Need at least 500 requests.');
    process.exit(1);
  }

  // Target dates for backfill
  const now = new Date();
  const targets = [
    { label: '1 day ago', date: new Date(now - 1 * 24 * 60 * 60 * 1000) },
    { label: '7 days ago', date: new Date(now - 7 * 24 * 60 * 60 * 1000) },
    { label: '30 days ago', date: new Date(now - 30 * 24 * 60 * 60 * 1000) },
    { label: '90 days ago', date: new Date(now - 90 * 24 * 60 * 60 * 1000) },
    { label: '180 days ago', date: new Date(now - 180 * 24 * 60 * 60 * 1000) },
    { label: '365 days ago', date: new Date(now - 365 * 24 * 60 * 60 * 1000) },
  ];

  // Skip dates that already have snapshots
  const activeDates = targets.filter(t => {
    const file = join(SNAPSHOTS_DIR, `${fmt(t.date)}.json`);
    if (existsSync(file)) {
      console.log(`Skipping ${t.label} (${fmt(t.date)}) — snapshot exists`);
      return false;
    }
    return true;
  });

  if (activeDates.length === 0) {
    console.log('All target dates already have snapshots.');
    return;
  }

  // Process top repos (limit to avoid API exhaustion)
  const maxRepos = Math.min(repos.length, 25);
  console.log(`\nBackfilling ${activeDates.length} dates for top ${maxRepos} repos...\n`);

  const snapshots = {};
  for (const t of activeDates) {
    snapshots[fmt(t.date)] = {};
  }

  for (let i = 0; i < maxRepos; i++) {
    const repo = repos[i];
    console.log(`[${i + 1}/${maxRepos}] ${repo.full_name} (${repo.stars} stars)`);

    const totalStars = await getStarCount(repo.full_name);
    if (!totalStars) {
      console.log(`  Skipped (couldn't fetch)`);
      continue;
    }

    for (const t of activeDates) {
      try {
        const starsAtCutoff = await starsAtDate(repo.full_name, totalStars, t.date);
        snapshots[fmt(t.date)][repo.full_name] = {
          stars: starsAtCutoff,
          forks: 0,
        };
        console.log(`  ${t.label}: ${starsAtCutoff} stars (delta: +${totalStars - starsAtCutoff})`);
      } catch (err) {
        console.error(`  Error for ${t.label}: ${err.message}`);
      }
    }

    // Check rate limit periodically
    if (i % 5 === 4) {
      const checkRl = await fetch('https://api.github.com/rate_limit', {
        headers: { Authorization: `Bearer ${TOKEN}` },
      });
      const checkData = await checkRl.json();
      console.log(`  Rate limit remaining: ${checkData.rate.remaining}`);
      if (checkData.rate.remaining < 100) {
        console.error('  Rate limit low, stopping early.');
        break;
      }
    }
  }

  // Save all snapshots
  for (const [dateStr, data] of Object.entries(snapshots)) {
    if (Object.keys(data).length > 0) {
      saveSnapshot(dateStr, data);
    }
  }

  // Recompute trends.json with new snapshots
  console.log('\nRecomputing deltas with historical data...');
  execFileSync('node', ['scripts/fetch-trends.mjs'], {
    stdio: 'inherit',
    env: process.env,
  });

  console.log('\nDone! Historical data backfilled.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
