/**
 * Compute star deltas by comparing today's snapshot against previous snapshots.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const SNAPSHOTS_DIR = join(process.cwd(), 'src/data/trends/snapshots');

/**
 * Load a snapshot file for a given date string (YYYY-MM-DD).
 * Returns { "owner/repo": { stars, forks } } or null if not found.
 */
function loadSnapshot(dateStr) {
  const file = join(SNAPSHOTS_DIR, `${dateStr}.json`);
  if (!existsSync(file)) return null;
  const data = JSON.parse(readFileSync(file, 'utf-8'));
  return data.data || {};
}

/**
 * Format a date as YYYY-MM-DD.
 */
function fmt(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Find the closest available snapshot to a target date (searching backwards up to 7 days).
 */
function findClosestSnapshot(targetDate) {
  for (let i = 0; i < 7; i++) {
    const d = new Date(targetDate);
    d.setDate(d.getDate() - i);
    const snap = loadSnapshot(fmt(d));
    if (snap) return snap;
  }
  return null;
}

/**
 * Compute deltas for all repos in today's snapshot.
 *
 * @param {Object} todayData - Today's snapshot: { "owner/repo": { stars, forks } }
 * @returns {Object} - { "owner/repo": { delta_day, delta_week, delta_month, delta_year } }
 */
export function computeDeltas(todayData) {
  const now = new Date();

  const dayAgo = new Date(now);
  dayAgo.setDate(dayAgo.getDate() - 1);
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(now);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const yearAgo = new Date(now);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);

  const snapDay = findClosestSnapshot(dayAgo);
  const snapWeek = findClosestSnapshot(weekAgo);
  const snapMonth = findClosestSnapshot(monthAgo);
  const snapYear = findClosestSnapshot(yearAgo);

  const deltas = {};

  for (const [name, current] of Object.entries(todayData)) {
    const stars = current.stars || 0;
    deltas[name] = {
      delta_day: snapDay?.[name] ? stars - (snapDay[name].stars || 0) : 0,
      delta_week: snapWeek?.[name] ? stars - (snapWeek[name].stars || 0) : 0,
      delta_month: snapMonth?.[name] ? stars - (snapMonth[name].stars || 0) : 0,
      delta_year: snapYear?.[name] ? stars - (snapYear[name].stars || 0) : 0,
    };
  }

  return deltas;
}
