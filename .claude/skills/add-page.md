---
name: add-page
description: Add a new documentation page to Agentic Playbook. Use when the user wants to create a new guide, article, or reference page. The user provides a topic/title and optionally content — the skill handles file creation, navigation updates, and committing.
user_invocable: true
---

# Add Page Skill

The user wants to add a new page to Agentic Playbook.

## Instructions

1. **Gather info from the user's message:**
   - Page title (required)
   - Category: one of `openclaw`, `paperclip`, `langsmith`, `skills-and-plugins`, `security`, `case-studies`, `getting-started` (infer from context, or ask)
   - Content description or bullet points (optional — generate helpful content if not provided)

2. **Create the MDX page:**
   - Create directory: `src/app/<category>/<slug>/` where `<slug>` is the kebab-case title
   - Create `page.mdx` inside it
   - Start with `<GuideHeader tool="..." difficulty="..." lastTested="..." readTime="..." />`
   - Use `# Title` as first heading, then content with `##` sections
   - Use `<Callout>` components where appropriate (types: info, warning, tip, danger)

3. **Update navigation:**
   - Add the new page to `src/lib/navigation.ts` under the appropriate section

4. **Optionally update home page:**
   - Add to the `latestGuides` array in `src/app/page.tsx` if it's a significant new guide
   - Update the guide count on the tool card if applicable

5. **Build and verify:**
   - Run `npm run build` to ensure the site builds successfully

6. **Commit and push:**
   - Commit all changes with a descriptive message
   - Push to `main` so GitHub Actions deploys automatically

## Content Style Guide
- Use second person ("you") when addressing the reader
- Keep paragraphs short (2-3 sentences)
- Use code blocks with language tags for commands and config
- Use Callout components for important notes, warnings, and tips
- Structure with h2 (`##`) for main sections and h3 (`###`) for subsections
- Include a Troubleshooting section for step-by-step guides
