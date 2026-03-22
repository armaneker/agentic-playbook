---
name: publish
description: Commit and push all pending changes to deploy the site. Use when the user says "publish", "deploy", "push", or "go live".
user_invocable: true
---

# Publish Skill

The user wants to deploy current changes to the live site.

## Instructions

1. **Build first** — run `npm run build` to verify everything compiles
2. **If build fails**, fix the errors before proceeding
3. **Stage all relevant changes** (avoid staging secrets or `.env` files)
4. **Commit** with a descriptive message
5. **Push to `main`** — this triggers the GitHub Actions workflow that deploys to GitHub Pages
6. **Confirm** to the user that changes have been pushed and link to the live site: https://agentic-playbook.dev/
7. Optionally check the GitHub Actions run status with `gh run list --limit 1`
