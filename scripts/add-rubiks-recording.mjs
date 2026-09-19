#!/usr/bin/env node
/**
 * Append a downloaded race recording to src/data/rubiks/recordings.json.
 *
 *   node scripts/add-rubiks-recording.mjs ~/Downloads/rubiks-race-2026-09-19.json
 *
 * Newest recordings go first. Re-adding a recording with the same id replaces it.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const target = resolve('src/data/rubiks/recordings.json');
const input = process.argv[2];
if (!input) {
  console.error('usage: node scripts/add-rubiks-recording.mjs <recording.json>');
  process.exit(1);
}

const recording = JSON.parse(readFileSync(resolve(input), 'utf8'));
if (recording.version !== 1 || typeof recording.id !== 'string' || !Array.isArray(recording.events)) {
  console.error('not a race recording (expected version 1 with id and events)');
  process.exit(1);
}

const existing = JSON.parse(readFileSync(target, 'utf8'));
const others = existing.filter((r) => r.id !== recording.id);
const next = [recording, ...others];
writeFileSync(target, JSON.stringify(next, null, 2) + '\n');
console.log(`${others.length === existing.length ? 'added' : 'replaced'} ${recording.id}; ${next.length} recording(s) total`);
