# OpenClaw Help Center

## Project Overview
A static documentation site for OpenClaw multi-agent systems, built with Next.js 14, MDX, and Tailwind CSS. Deployed to GitHub Pages via GitHub Actions.

**Live URL:** https://armaneker.github.io/openclaw-helpcenter/

## Tech Stack
- **Framework:** Next.js 14 (static export)
- **Content:** MDX pages in `src/app/` using Next.js App Router
- **Styling:** Tailwind CSS with `@tailwindcss/typography`, dark theme, indigo brand colors
- **Deployment:** GitHub Actions → GitHub Pages

## Content Structure
Content lives as MDX files following the Next.js App Router convention:
```
src/app/
  page.tsx                         # Home page (card grid)
  getting-started/page.mdx        # Getting started guide
  architecture/
    page.mdx                      # Architecture overview
    agent-roles/page.mdx
    communication/page.mdx
    configuration/page.mdx
    security/page.mdx
  guides/
    page.mdx                      # Guides index
    create-slack-agent/page.mdx
    deployment/page.mdx
  reference/
    cli/page.mdx                  # CLI reference
```

## Adding New Content

### Adding a new page
1. Create a new directory under `src/app/` matching the desired URL path
2. Add a `page.mdx` file inside it with your content
3. Update `src/lib/navigation.ts` to add the page to the sidebar
4. If it should appear on the home page, update the `cards` array in `src/app/page.tsx`

### MDX features available
- All standard Markdown (headings, lists, code blocks, tables, links)
- `<Callout type="info|warning|tip|danger" title="Optional title">` component
- Headings automatically get anchor links (rehype-slug + rehype-autolink-headings)
- Table of contents auto-generates from h2/h3 headings

### Example MDX page
```mdx
# Page Title

Introduction paragraph.

## Section One

Content here.

<Callout type="tip" title="Pro Tip">
  Helpful information goes here.
</Callout>

## Section Two

More content.
```

## Development
```bash
npm run dev    # Start dev server on port 3000
npm run build  # Build static site to /out
```

## Deployment
Push to `main` branch triggers automatic deployment to GitHub Pages via `.github/workflows/deploy.yml`.

## Key Files
- `next.config.mjs` — Next.js config with MDX and basePath support
- `tailwind.config.ts` — Tailwind config with brand colors and typography
- `src/lib/navigation.ts` — Sidebar navigation structure
- `src/components/Callout.tsx` — Callout component for MDX
- `mdx-components.tsx` — MDX component registration
