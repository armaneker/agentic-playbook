#!/usr/bin/env node

/**
 * Generate human-readable transcripts from MDX guide pages.
 * Uses OpenAI to rewrite technical MDX content as clean spoken prose.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node scripts/generate-transcripts.mjs
 *   OPENAI_API_KEY=sk-... node scripts/generate-transcripts.mjs --force
 *   OPENAI_API_KEY=sk-... node scripts/generate-transcripts.mjs --page openclaw/architecture
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GUIDE_PAGES } from './lib/guide-pages.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const APP_DIR = path.join(ROOT, 'src/app');
const TRANSCRIPT_DIR = path.join(ROOT, 'public/transcripts');
const MANIFEST_PATH = path.join(ROOT, 'src/data/transcript-manifest.json');

let openaiClient = null;
async function getClient() {
  if (!openaiClient) {
    const { default: OpenAI } = await import('openai');
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

function hashContent(text) {
  return crypto.createHash('md5').update(text).digest('hex');
}

function pagePathToSlug(pagePath) {
  return pagePath.replace(/\//g, '-');
}

const SYSTEM_PROMPT = `You are rewriting technical documentation into a human-readable transcript suitable for audio narration.

Rules:
- Write in a clear, direct, senior engineer voice. No filler, no hype.
- Convert the content into flowing prose paragraphs. No markdown headings, no bullet lists, no numbered lists.
- Do NOT include code blocks, CLI commands, file paths, YAML snippets, or configuration examples. Instead, briefly describe what they accomplish in plain language.
- Preserve the logical flow and all key concepts from the original.
- Use natural transitions between topics ("Next," "From there," "The key thing here is," etc.)
- Keep technical terms and proper nouns (tool names, protocol names) intact.
- Do not add information that isn't in the original. Do not editorialize.
- Output plain text only — no markdown formatting of any kind.
- Aim for a conversational but professional tone, as if explaining to a colleague over coffee.`;

async function generateTranscript(mdxContent, pagePath) {
  const openai = await getClient();

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Rewrite this technical documentation page as a human-readable transcript for audio narration:\n\n${mdxContent}`,
      },
    ],
    temperature: 0.3,
  });

  return response.choices[0]?.message?.content ?? '';
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
    ? GUIDE_PAGES.filter((p) => p === singlePage || p.endsWith(singlePage))
    : GUIDE_PAGES;

  if (pages.length === 0) {
    console.error(`No matching page found for: ${singlePage}`);
    console.error('Available pages:', GUIDE_PAGES.join(', '));
    process.exit(1);
  }

  console.log(`Generating transcripts for ${pages.length} pages (force=${force})...\n`);

  fs.mkdirSync(TRANSCRIPT_DIR, { recursive: true });

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
    const contentHash = hashContent(mdxContent);
    const slug = pagePathToSlug(pagePath);
    const transcriptPath = path.join(TRANSCRIPT_DIR, `${slug}.md`);

    // Check if already generated and unchanged
    if (!force && manifest[pagePath]?.mdxHash === contentHash && fs.existsSync(transcriptPath)) {
      console.log(`  SKIP ${pagePath} — unchanged`);
      skipped++;
      continue;
    }

    console.log(`  GENERATE ${pagePath} (${mdxContent.length} chars)`);

    try {
      const transcript = await generateTranscript(mdxContent, pagePath);

      fs.writeFileSync(transcriptPath, transcript);

      manifest[pagePath] = {
        mdxHash: contentHash,
        transcriptHash: hashContent(transcript),
        file: `${slug}.md`,
        generatedAt: new Date().toISOString(),
        charCount: transcript.length,
      };

      generated++;
      console.log(`    → ${transcript.length} chars\n`);
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

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
