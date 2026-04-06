#!/usr/bin/env node

/**
 * Pre-generate audio files for all guide pages.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node scripts/generate-audio.mjs
 *   OPENAI_API_KEY=sk-... node scripts/generate-audio.mjs --force   # regenerate all
 *   OPENAI_API_KEY=sk-... node scripts/generate-audio.mjs --page openclaw/architecture  # single page
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const APP_DIR = path.join(ROOT, 'src/app');
const AUDIO_DIR = path.join(ROOT, 'public/audio');
const MANIFEST_PATH = path.join(ROOT, 'src/data/audio-manifest.json');

// Guide pages to generate audio for (relative to src/app/)
const GUIDE_PAGES = [
  'getting-started/first-agent',
  'getting-started/agent-memory',
  'openclaw/architecture',
  'openclaw/agent-roles',
  'openclaw/create-slack-agent',
  'openclaw/cli-reference',
  'openclaw/deployment',
  'openclaw/security',
  'openclaw/mission-control',
  'skills/anatomy',
  'skills/frontmatter',
  'skills/steps',
  'skills/references',
  'skills/scripts',
  'skills/progressive-loading',
  'skills/testing',
  'about/contributing',
];

const LANGUAGE = 'en'; // Pre-generate English only; other languages use API fallback

let openaiClient = null;
async function getClient() {
  if (!openaiClient) {
    const { default: OpenAI } = await import('openai');
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

/**
 * Strip MDX/markdown to plain readable text
 */
function mdxToPlainText(content) {
  let text = content;

  // Remove import statements
  text = text.replace(/^import\s+.*$/gm, '');

  // Remove export statements
  text = text.replace(/^export\s+.*$/gm, '');

  // Remove JSX self-closing components like <GuideHeader ... />
  text = text.replace(/<\w+[^>]*\/>/g, '');

  // Remove JSX block components like <Callout ...>...</Callout>
  // Handle multi-line: remove opening tag, keep inner content, remove closing tag
  text = text.replace(/<Callout[^>]*>/g, '');
  text = text.replace(/<\/Callout>/g, '');
  text = text.replace(/<SkillAnatomyDiagram\s*\/>/g, '');

  // Remove fenced code blocks entirely (```...```)
  text = text.replace(/```[\s\S]*?```/g, '');

  // Remove inline code
  text = text.replace(/`([^`]+)`/g, '$1');

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Remove markdown links, keep text: [text](url) → text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove markdown images
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');

  // Remove heading markers
  text = text.replace(/^#{1,6}\s+/gm, '');

  // Remove bold/italic markers
  text = text.replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1');
  text = text.replace(/_{1,3}([^_]+)_{1,3}/g, '$1');

  // Remove horizontal rules
  text = text.replace(/^[-*_]{3,}$/gm, '');

  // Remove list markers
  text = text.replace(/^\s*[-*+]\s+/gm, '');
  text = text.replace(/^\s*\d+\.\s+/gm, '');

  // Remove blockquote markers
  text = text.replace(/^\s*>\s?/gm, '');

  // Remove YAML frontmatter (--- ... ---)
  text = text.replace(/^---[\s\S]*?---/m, '');

  // Collapse multiple newlines
  text = text.replace(/\n{3,}/g, '\n\n');

  // Collapse whitespace
  text = text.replace(/[ \t]+/g, ' ');

  return text.trim();
}

/**
 * Hash content to detect changes
 */
function hashContent(text) {
  return crypto.createHash('md5').update(text).digest('hex');
}

async function generateAudio(text, outputPath) {
  const openai = await getClient();

  // OpenAI TTS has a 4096-char limit per call. Split if needed.
  const MAX_CHUNK = 4096;
  const chunks = [];

  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= MAX_CHUNK) {
      chunks.push(remaining);
      break;
    }
    // Find a good break point (sentence end)
    let breakAt = remaining.lastIndexOf('. ', MAX_CHUNK);
    if (breakAt < MAX_CHUNK * 0.5) breakAt = remaining.lastIndexOf(' ', MAX_CHUNK);
    if (breakAt < 0) breakAt = MAX_CHUNK;
    chunks.push(remaining.slice(0, breakAt + 1));
    remaining = remaining.slice(breakAt + 1).trim();
  }

  const audioBuffers = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(`    Chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`);
    const speech = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: chunks[i],
      response_format: 'mp3',
    });
    audioBuffers.push(Buffer.from(await speech.arrayBuffer()));
  }

  // Concatenate MP3 buffers (MP3 is concatenable)
  const combined = Buffer.concat(audioBuffers);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, combined);

  return combined.length;
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY environment variable is required');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const singlePageIdx = args.indexOf('--page');
  const singlePage = singlePageIdx >= 0 ? args[singlePageIdx + 1] : null;

  // Load existing manifest
  let manifest = {};
  if (fs.existsSync(MANIFEST_PATH)) {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  }

  const pages = singlePage
    ? GUIDE_PAGES.filter(p => p === singlePage || p.endsWith(singlePage))
    : GUIDE_PAGES;

  if (pages.length === 0) {
    console.error(`No matching page found for: ${singlePage}`);
    console.error('Available pages:', GUIDE_PAGES.join(', '));
    process.exit(1);
  }

  console.log(`Generating audio for ${pages.length} pages (force=${force})...\n`);

  let generated = 0;
  let skipped = 0;
  let errors = 0;

  for (const pagePath of pages) {
    const mdxPath = path.join(APP_DIR, pagePath, 'page.mdx');

    if (!fs.existsSync(mdxPath)) {
      console.log(`  SKIP ${pagePath} — no page.mdx found`);
      skipped++;
      continue;
    }

    const mdxContent = fs.readFileSync(mdxPath, 'utf-8');
    const plainText = mdxToPlainText(mdxContent);
    const contentHash = hashContent(plainText);

    // Check if already generated and unchanged
    const slug = pagePath.replace(/\//g, '-');
    const audioPath = path.join(AUDIO_DIR, `${slug}-${LANGUAGE}.mp3`);

    if (!force && manifest[pagePath]?.hash === contentHash && fs.existsSync(audioPath)) {
      console.log(`  SKIP ${pagePath} — unchanged`);
      skipped++;
      continue;
    }

    console.log(`  GENERATE ${pagePath} (${plainText.length} chars)`);

    try {
      const size = await generateAudio(plainText, audioPath);
      manifest[pagePath] = {
        hash: contentHash,
        file: `${slug}-${LANGUAGE}.mp3`,
        language: LANGUAGE,
        size,
        generatedAt: new Date().toISOString(),
        charCount: plainText.length,
      };
      generated++;
      console.log(`    → ${(size / 1024 / 1024).toFixed(1)} MB\n`);
    } catch (err) {
      console.error(`  ERROR ${pagePath}:`, err.message);
      errors++;
    }
  }

  // Save manifest
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  console.log(`\nDone: ${generated} generated, ${skipped} skipped, ${errors} errors`);
  console.log(`Manifest: ${MANIFEST_PATH}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
