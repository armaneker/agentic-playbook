---
name: edit-page
description: Edit an existing documentation page in the OpenClaw Help Center. Use when the user wants to update, fix, or improve content on an existing page.
user_invocable: true
---

# Edit Page Skill

The user wants to modify an existing page in the Help Center.

## Instructions

1. **Identify the page** from the user's message (title, URL path, or topic)
2. **Find the file** in `src/app/` — pages are `page.mdx` files in directories matching their URL
3. **Read the current content** before making changes
4. **Apply the requested changes** — could be:
   - Adding a new section
   - Updating outdated information
   - Fixing typos or improving clarity
   - Adding code examples or Callout components
5. **Build and verify** with `npm run build`
6. **Commit and push** to `main` for automatic deployment
