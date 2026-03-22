# Agentic Playbook — Project Guide

## What is this?

A static documentation site for agentic workflow guides, built with Next.js 14, MDX, and Tailwind CSS. Deployed via GitHub Pages.

Live site: https://agentic-playbook.dev/

## Tech Stack

- Next.js 14 (App Router, static export)
- MDX for content pages
- Tailwind CSS + @tailwindcss/typography
- GitHub Actions for deploy on push to main

## Content Structure

All content lives in `src/app/` using the App Router convention. Guides are organized by tool/category:

- `src/app/openclaw/` — OpenClaw guides
- `src/app/paperclip/` — Paperclip guides
- `src/app/langsmith/` — LangSmith Fleet guides
- `src/app/skills-and-plugins/` — Skills & Plugins guides
- `src/app/security/` — Security guides
- `src/app/case-studies/` — Case studies

Each guide is a `page.mdx` that starts with the `<GuideHeader>` component for metadata display.

## Adding a New Guide

1. Create a new directory under the appropriate category in `src/app/`
2. Add `page.mdx` starting with `<GuideHeader tool="..." difficulty="..." lastTested="..." readTime="..." />`
3. Update navigation in `src/lib/navigation.ts`
4. Optionally add to the "Latest Guides" section on the homepage (`src/app/page.tsx`)

## Adding a New Category

1. Create a new directory in `src/app/`
2. Add a category overview `page.mdx`
3. Add a card to the homepage "Browse by Tool" section
4. Add the section to `src/lib/navigation.ts`

## MDX Components Available

- `<Callout type="info|warning|tip|danger" title="Optional">` — Callout boxes
- `<GuideHeader tool="..." difficulty="..." lastTested="..." readTime="..." />` — Guide metadata bar
- All standard Markdown (headings, lists, code blocks, tables, links)
- Headings automatically get anchor links

## Commands

- `npm run dev` — local development
- `npm run build` — production build (static export)

## Deployment

Push to `main` triggers automatic deployment via Vercel Git integration. No deploy workflow needed.

## Key Files

- `next.config.mjs` — Next.js config with MDX and trailingSlash
- `tailwind.config.ts` — Tailwind config with brand colors and typography
- `src/lib/navigation.ts` — Sidebar navigation structure
- `src/components/GuideHeader.tsx` — Guide metadata component
- `src/components/Callout.tsx` — Callout component for MDX
- `mdx-components.tsx` — MDX component registration (Callout, GuideHeader, Link override)
- `src/app/page.tsx` — Homepage with tool cards and latest guides

## Writing Style

**Read `.claude/style-guide.md` before writing any content.** It defines the voice, banned phrases, and structure rules for all pages.

Short version: write like a senior engineer explaining something to a peer. No filler, no AI crutch phrases, no selling. Just clear instructions.

## Design Principles

- Every guide must be tested end-to-end
- Include working commands, configs, and troubleshooting sections
- Show "Coming soon" sections — don't hide planned categories
- Keep it minimal — no animations, no heavy JS, fast page loads
