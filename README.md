# Agentic Playbook

Tested guides for setting up and running AI agent systems in production.

**[Read the guides →](https://agentic-playbook.dev/)**

## What This Is

Agentic Playbook is a collection of tested guides for setting up and running AI agent systems in production.

## Guides Available

### OpenClaw
- [Create a Slack Agent](https://agentic-playbook.dev/openclaw/create-slack-agent/) — Full walkthrough with multi-bot config and troubleshooting
- Architecture & Multi-Agent Gateway
- Agent Roles
- CLI Reference
- Security
- Deployment

### Coming Soon
- Paperclip — AI company orchestration
- LangSmith Fleet — Agent observability
- Skills & Plugins — Extending agent capabilities
- Security — Production hardening
- Case Studies — Real-world agent deployments

## Demos

- [LLM Rubik's Cube Race](https://agentic-playbook.dev/demos/rubiks-cube/) — Claude Fable 5.1, GPT-6 Astra, Grok 4.6 and TypeSafe Jev solve the same scramble, with time, tokens and cost per model. Visitors watch recorded races; live runs need an access key.

## Deployment

Vercel deploys `main` automatically. Environment variables:

- `OPENROUTER_API_KEY` — live Rubik's cube races
- `RUBIKS_DEMO_ACCESS_KEY` — required on the page to start a live race; without it visitors only see replays
- `OPENAI_API_KEY` — read-aloud audio (`/api/tts`)

## Contributing

See our [Contributing Guide](https://agentic-playbook.dev/about/contributing/).

## Author

Built by Arman Eker.
