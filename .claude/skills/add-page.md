---
name: add-page
description: Add a new documentation page to the OpenClaw Help Center. Use when the user wants to create a new help article, guide, or reference page. The user provides a topic/title and optionally content — the skill handles file creation, navigation updates, and committing.
user_invocable: true
---

# Add Page Skill

The user wants to add a new page to the OpenClaw Help Center documentation site.

## Instructions

1. **Gather info from the user's message:**
   - Page title (required)
   - Section: one of `getting-started`, `architecture`, `guides`, `reference` (infer from context, or ask)
   - Content description or bullet points (optional — generate helpful content if not provided)

2. **Create the MDX page:**
   - Create directory: `src/app/<section>/<slug>/` where `<slug>` is the kebab-case title
   - Create `page.mdx` inside it
   - Use standard MDX format: `# Title` as first line, then content with `##` sections
   - Use `<Callout>` components where appropriate (types: info, warning, tip, danger)
   - Write clear, concise documentation in the style of existing pages

3. **Update navigation:**
   - Add the new page to `src/lib/navigation.ts` under the appropriate section
   - If it's a new top-level section, add it to the `navigation` array

4. **Optionally update home page:**
   - If the page is important enough, add a card to `src/app/page.tsx`

5. **Build and verify:**
   - Run `npm run build` to ensure the site builds successfully
   - Fix any errors

6. **Commit and push:**
   - Commit all changes with a descriptive message
   - Push to `main` so GitHub Actions deploys automatically

## Content Style Guide
- Use second person ("you") when addressing the reader
- Keep paragraphs short (2-3 sentences)
- Use code blocks with language tags for commands and config
- Use Callout components for important notes, warnings, and tips
- Structure with h2 (`##`) for main sections and h3 (`###`) for subsections
