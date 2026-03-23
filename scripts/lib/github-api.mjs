/**
 * GitHub API helpers for fetching trending repo data.
 * Uses the GitHub Search API with GITHUB_TOKEN for 5000 req/hr rate limit.
 */

const BASE = 'https://api.github.com';
const TOKEN = process.env.GITHUB_TOKEN;

const headers = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

async function fetchJSON(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${res.status}: ${body}`);
  }
  return res.json();
}

/**
 * Search for repos created/pushed after a given date, sorted by stars.
 * Returns up to `perPage` results.
 */
export async function searchRepos({ minStars = 100, pushedAfter, createdAfter, language, perPage = 30 }) {
  const parts = [`stars:>=${minStars}`];
  if (pushedAfter) parts.push(`pushed:>=${pushedAfter}`);
  if (createdAfter) parts.push(`created:>=${createdAfter}`);
  if (language) parts.push(`language:${language}`);

  const q = encodeURIComponent(parts.join(' '));
  const url = `${BASE}/search/repositories?q=${q}&sort=stars&order=desc&per_page=${perPage}`;
  const data = await fetchJSON(url);
  return data.items || [];
}

/**
 * Get a single repo's current metadata.
 */
export async function getRepo(fullName) {
  return fetchJSON(`${BASE}/repos/${fullName}`);
}

/**
 * Get a repo's README content (decoded from base64).
 */
export async function getReadme(fullName) {
  try {
    const data = await fetchJSON(`${BASE}/repos/${fullName}/readme`);
    return Buffer.from(data.content, 'base64').toString('utf-8');
  } catch {
    return null;
  }
}

/**
 * Get the latest release tag for a repo. Returns null if no releases.
 */
export async function getLatestRelease(fullName) {
  try {
    const data = await fetchJSON(`${BASE}/repos/${fullName}/releases/latest`);
    return data.tag_name || null;
  } catch {
    return null;
  }
}

/**
 * Check remaining rate limit.
 */
export async function getRateLimit() {
  const data = await fetchJSON(`${BASE}/rate_limit`);
  return {
    remaining: data.rate.remaining,
    limit: data.rate.limit,
    resetAt: new Date(data.rate.reset * 1000).toISOString(),
  };
}
