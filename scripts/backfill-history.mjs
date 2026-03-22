#!/usr/bin/env node

/**
 * Backfills daily historical star data from Jan 1 2026 to today.
 *
 * Strategy:
 * - Builds a timeline per repo by sampling ~30 stargazer pages (one-time cost)
 * - Interpolates star counts for all dates from that timeline (no extra API calls)
 * - For repos with >40k stars: the API only shows the first 40k (oldest) stargazers,
 *   so recent dates are estimated using the velocity of invisible newer stars
 * - Skips dates that already have snapshots (safe to re-run)
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

const API_STAR_CAP = 40000; // GitHub API limit

const headers = {
  Accept: 'application/vnd.github.star+json',
  Authorization: `Bearer ${TOKEN}`,
  'X-GitHub-Api-Version': '2022-11-28',
};

const defaultHeaders = {
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${TOKEN}`,
  'X-GitHub-Api-Version': '2022-11-28',
};

async function getStarCount(fullName) {
  const res = await fetch(`https://api.github.com/repos/${fullName}`, { headers: defaultHeaders });
  if (!res.ok) return null;
  const data = await res.json();
  return data.stargazers_count;
}

async function getStargazersPage(fullName, page, perPage = 100) {
  const url = `https://api.github.com/repos/${fullName}/stargazers?per_page=${perPage}&page=${page}`;
  const res = await fetch(url, { headers });
  if (!res.ok) return { items: [], lastPage: 1 };
  const items = await res.json();
  const link = res.headers.get('link') || '';
  const lastMatch = link.match(/page=(\d+)>; rel="last"/);
  const lastPage = lastMatch ? parseInt(lastMatch[1]) : page;
  return { items, lastPage };
}

/**
 * For small repos (≤40k stars): binary search for exact star count at cutoff.
 */
async function starsAtDateExact(fullName, totalStars, cutoffDate) {
  const perPage = 100;
  const totalPages = Math.ceil(totalStars / perPage);
  if (totalPages === 0) return 0;

  let low = 1;
  let high = totalPages;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const { items } = await getStargazersPage(fullName, mid, perPage);
    if (items.length === 0) { high = mid; continue; }
    const firstDate = new Date(items[0].starred_at);
    if (firstDate < cutoffDate) {
      low = mid + 1;
    } else {
      high = mid;
    }
    await new Promise(r => setTimeout(r, 80));
  }

  const { items } = await getStargazersPage(fullName, low, perPage);
  let countOnPage = 0;
  for (const item of items) {
    if (new Date(item.starred_at) < cutoffDate) countOnPage++;
  }
  return (low - 1) * perPage + countOnPage;
}

/**
 * For large repos (>40k stars): the API only returns the first 40k stargazers
 * (oldest, page 1 = first person who starred). Stars beyond page 400 are invisible.
 *
 * Strategy:
 * - If cutoff falls within the visible window: binary search for exact count
 * - If cutoff is after the visible window: all visible stars predate the cutoff,
 *   estimate how many of the invisible (newer) stars also predate it using velocity
 */
async function starsAtDateEstimated(fullName, totalStars, cutoffDate) {
  const perPage = 100;

  // Page 1 = oldest stargazer (first person to star the repo)
  const { items: firstItems, lastPage } = await getStargazersPage(fullName, 1, perPage);
  if (firstItems.length === 0) return totalStars;

  const oldestDate = new Date(firstItems[0].starred_at);
  const accessibleCount = lastPage * perPage; // first ~40k (oldest) stars
  const inaccessibleCount = totalStars - accessibleCount; // remaining newer stars

  // Get newest accessible stargazer (last visible page)
  const { items: lastItems } = await getStargazersPage(fullName, lastPage, perPage);
  const newestAccessibleDate = lastItems.length > 0
    ? new Date(lastItems[lastItems.length - 1].starred_at)
    : oldestDate;

  // Before the repo existed
  if (cutoffDate <= oldestDate) return 0;

  // Cutoff is within the accessible (oldest) window — binary search works
  if (cutoffDate <= newestAccessibleDate) {
    let low = 1;
    let high = lastPage;

    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      const { items } = await getStargazersPage(fullName, mid, perPage);
      if (items.length === 0) { high = mid; continue; }
      const firstDate = new Date(items[0].starred_at);
      if (firstDate < cutoffDate) {
        low = mid + 1;
      } else {
        high = mid;
      }
      await new Promise(r => setTimeout(r, 80));
    }

    const { items } = await getStargazersPage(fullName, low, perPage);
    let countOnPage = 0;
    for (const item of items) {
      if (new Date(item.starred_at) < cutoffDate) countOnPage++;
    }
    // No baseStars — accessible window IS the oldest stars, count is absolute
    return (low - 1) * perPage + countOnPage;
  }

  // Cutoff is AFTER the accessible window — all ~40k visible stars predate cutoff.
  // Estimate how many of the invisible (newer) stars also predate the cutoff.
  const now = new Date();
  const inaccessibleWindowDays = (now - newestAccessibleDate) / (1000 * 60 * 60 * 24);
  const ratePerDay = inaccessibleWindowDays > 0 ? inaccessibleCount / inaccessibleWindowDays : 0;

  // Stars earned between cutoff and now
  const daysAfterCutoff = (now - cutoffDate) / (1000 * 60 * 60 * 24);
  const starsAfterCutoff = Math.round(daysAfterCutoff * ratePerDay);

  return Math.max(0, totalStars - starsAfterCutoff);
}

/**
 * Route to the right strategy based on repo size.
 */
async function starsAtDate(fullName, totalStars, cutoffDate) {
  if (totalStars <= API_STAR_CAP) {
    return starsAtDateExact(fullName, totalStars, cutoffDate);
  }
  return starsAtDateEstimated(fullName, totalStars, cutoffDate);
}

/**
 * Build a timeline for a repo by sampling stargazer pages.
 * Returns an array of { starIndex, date } sorted by starIndex.
 * This lets us look up stars-at-date for many dates with ONE set of API calls.
 */
async function buildTimeline(fullName, totalStars) {
  const perPage = 100;
  const totalPages = Math.ceil(Math.min(totalStars, API_STAR_CAP) / perPage);
  if (totalPages === 0) return [];

  // Sample ~30 evenly spaced pages (plus first and last) for a good timeline
  const sampleCount = Math.min(30, totalPages);
  const pageIndices = new Set([1, totalPages]);
  for (let i = 0; i < sampleCount; i++) {
    pageIndices.add(Math.max(1, Math.min(totalPages, Math.round(1 + (totalPages - 1) * i / (sampleCount - 1)))));
  }

  const timeline = [];
  const sortedPages = [...pageIndices].sort((a, b) => a - b);

  for (const page of sortedPages) {
    const { items } = await getStargazersPage(fullName, page, perPage);
    if (items.length === 0) continue;

    // Record first and last item on each sampled page
    timeline.push({
      starIndex: (page - 1) * perPage + 1,
      date: new Date(items[0].starred_at),
    });
    if (items.length > 1) {
      timeline.push({
        starIndex: (page - 1) * perPage + items.length,
        date: new Date(items[items.length - 1].starred_at),
      });
    }
    await new Promise(r => setTimeout(r, 50));
  }

  timeline.sort((a, b) => a.starIndex - b.starIndex);
  return timeline;
}

/**
 * Given a pre-built timeline, estimate stars at a cutoff date.
 * Uses linear interpolation between sampled points.
 */
function starsAtDateFromTimeline(timeline, totalStars, cutoffDate) {
  if (timeline.length === 0) return 0;

  const oldestDate = timeline[0].date;
  const newestDate = timeline[timeline.length - 1].date;
  const maxSampled = timeline[timeline.length - 1].starIndex;

  // Before the first star
  if (cutoffDate <= oldestDate) return 0;

  // Within the sampled window — interpolate
  if (cutoffDate <= newestDate) {
    // Find the two surrounding samples
    for (let i = 0; i < timeline.length - 1; i++) {
      if (cutoffDate >= timeline[i].date && cutoffDate <= timeline[i + 1].date) {
        const span = timeline[i + 1].date - timeline[i].date;
        if (span === 0) return timeline[i].starIndex;
        const frac = (cutoffDate - timeline[i].date) / span;
        const starCount = timeline[i].starIndex + frac * (timeline[i + 1].starIndex - timeline[i].starIndex);
        return Math.round(starCount);
      }
    }
    // Fallback: cutoff is at the edge
    return maxSampled;
  }

  // After the sampled window (repo has >40k stars, cutoff is recent)
  // Estimate using velocity of invisible stars
  const inaccessibleCount = totalStars - maxSampled;
  const now = new Date();
  const inaccessibleDays = (now - newestDate) / (1000 * 60 * 60 * 24);
  const ratePerDay = inaccessibleDays > 0 ? inaccessibleCount / inaccessibleDays : 0;
  const daysAfterCutoff = (now - cutoffDate) / (1000 * 60 * 60 * 24);
  const starsAfterCutoff = Math.round(daysAfterCutoff * ratePerDay);
  return Math.max(0, totalStars - starsAfterCutoff);
}

function fmt(date) {
  return date.toISOString().split('T')[0];
}

function saveSnapshot(dateStr, data) {
  mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  writeFileSync(
    join(SNAPSHOTS_DIR, `${dateStr}.json`),
    JSON.stringify({ date: dateStr, data }, null, 2) + '\n'
  );
  console.log(`  Saved snapshot: ${dateStr}.json (${Object.keys(data).length} repos)`);
}

async function main() {
  const trends = JSON.parse(readFileSync(TRENDS_FILE, 'utf-8'));
  const repos = trends.repos;

  if (repos.length === 0) {
    console.error('No repos in trends.json');
    process.exit(1);
  }

  const rlRes = await fetch('https://api.github.com/rate_limit', { headers: defaultHeaders });
  const rl = await rlRes.json();
  console.log(`Rate limit: ${rl.rate.remaining}/${rl.rate.limit}`);

  if (rl.rate.remaining < 500) {
    console.error('Not enough rate limit. Need at least 500 requests.');
    process.exit(1);
  }

  const now = new Date();

  // Generate daily snapshots from Jan 1 2026 to today
  const startDate = new Date('2026-01-01');
  const targets = [];
  for (let d = new Date(startDate); d < now; d.setDate(d.getDate() + 1)) {
    targets.push({ label: fmt(d), date: new Date(d) });
  }

  // Skip dates that already have snapshots with data
  const activeDates = targets.filter(t => {
    const file = join(SNAPSHOTS_DIR, `${fmt(t.date)}.json`);
    if (!existsSync(file)) return true;
    try {
      const snap = JSON.parse(readFileSync(file, 'utf-8'));
      return Object.keys(snap.data || {}).length === 0;
    } catch { return true; }
  });

  const maxRepos = Math.min(repos.length, 25);
  console.log(`\nBackfilling ${activeDates.length} dates (${targets.length} total, ${targets.length - activeDates.length} already done) for top ${maxRepos} repos...\n`);

  if (activeDates.length === 0) {
    console.log('All dates already have snapshots. Nothing to do.');
    return;
  }

  const snapshots = {};
  for (const t of activeDates) {
    snapshots[fmt(t.date)] = {};
  }

  for (let i = 0; i < maxRepos; i++) {
    const repo = repos[i];
    const totalStars = await getStarCount(repo.full_name);
    if (!totalStars) {
      console.log(`[${i + 1}/${maxRepos}] ${repo.full_name} — skipped (couldn't fetch)`);
      continue;
    }

    console.log(`[${i + 1}/${maxRepos}] ${repo.full_name} (${totalStars} stars)`);

    // Build timeline once per repo (~30 API calls), then query all dates from it
    console.log(`  Building timeline...`);
    const timeline = await buildTimeline(repo.full_name, totalStars);
    console.log(`  Timeline: ${timeline.length} sample points`);

    if (timeline.length > 0) {
      console.log(`  Range: ${fmt(timeline[0].date)} → ${fmt(timeline[timeline.length - 1].date)}`);
    }

    for (const t of activeDates) {
      try {
        const starsAtCutoff = starsAtDateFromTimeline(timeline, totalStars, t.date);
        const delta = totalStars - starsAtCutoff;
        snapshots[fmt(t.date)][repo.full_name] = { stars: starsAtCutoff, forks: 0 };
      } catch (err) {
        console.error(`  Error for ${t.label}: ${err.message}`);
      }
    }

    // Show a few sample dates
    const sampleDates = [activeDates[0], activeDates[Math.floor(activeDates.length / 2)], activeDates[activeDates.length - 1]];
    for (const t of sampleDates) {
      if (!t) continue;
      const snap = snapshots[fmt(t.date)][repo.full_name];
      if (snap) {
        console.log(`  ${t.label}: ${snap.stars} stars (Δ +${totalStars - snap.stars})`);
      }
    }

    if (i % 5 === 4) {
      const checkRl = await fetch('https://api.github.com/rate_limit', { headers: defaultHeaders });
      const checkData = await checkRl.json();
      console.log(`  Rate limit remaining: ${checkData.rate.remaining}`);
      if (checkData.rate.remaining < 100) {
        console.error('  Rate limit low, stopping early.');
        break;
      }
    }
  }

  for (const [dateStr, data] of Object.entries(snapshots)) {
    if (Object.keys(data).length > 0) {
      saveSnapshot(dateStr, data);
    }
  }

  console.log('\nRecomputing deltas with historical data...');
  execFileSync('node', ['scripts/fetch-trends.mjs'], {
    stdio: 'inherit',
    env: process.env,
  });

  console.log('\nDone!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
