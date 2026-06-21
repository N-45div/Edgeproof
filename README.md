# EdgeProof

EdgeProof is an Eve + Sola MCP agent that turns public edge exposure into evidence-backed code-to-edge breach paths.

Instead of reporting generic GitHub hygiene or another website scan, EdgeProof answers the security question that usually takes manual digging: **which public Cloudflare, Workers, or Web Checker asset is controlled by which GitHub repository, and what weak repo control could turn that into an incident?**

## What It Does

EdgeProof uses Sola MCP as a read-only security data plane for:

- Sola app/project discovery through `list_apps`
- EdgeProof project inspection through `get_app_details`
- saved query reuse through `get_app_queries_tool`
- Cloudflare, GitHub Cloud, and Sola Web Checker table discovery
- schema inspection before SQL
- read-only SQL evidence queries when Sola credits allow it
- Sola graph intelligence through `explore_data` when Sola credits allow it

The agent is domain-first by design. A GitHub finding only becomes a headline finding when it is tied to a Cloudflare, Workers, Web Checker, or public domain anchor.

## Core Workflow

1. Find the EdgeProof Sola project.
2. Inspect connected vendors, integration health, canvases, monitor rules, and saved queries.
3. Discover Cloudflare, GitHub Cloud, and Sola Web Checker tables and schemas.
4. Reuse existing EdgeProof saved queries where possible.
5. Build breach path packets:
   - public domain or edge asset
   - exposure evidence
   - linked or inferred GitHub repository
   - weak GitHub control
   - attack path narrative
   - severity
   - remediation
   - Sola evidence source

## Stack

- [Eve](https://vercel.com/eve) agent runtime
- Next.js web channel
- OpenRouter-compatible model provider through the AI SDK OpenAI adapter
- Sola MCP remote server
- Sola data sources: GitHub Cloud, Cloudflare, and Sola Web Checker

## Local Setup

Eve requires Node 24.

```bash
npm install --legacy-peer-deps
cp .env.example .env.local
```

Set local environment values in `.env.local`:

```bash
SOLA_MCP_URL=https://api.sola.security/mcp
SOLA_CLIENT_ID=your_sola_client_id
SOLA_SECURITY_KEY=your_sola_client_secret
SOLA_AUTH_MODE=client_credentials

OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_CONTEXT_WINDOW_TOKENS=128000
OPENROUTER_SITE_URL=http://localhost:2000
OPENROUTER_APP_NAME=EdgeProof Agent

EDGEPROOF_PROJECT_NAME=Edgeproof
DEMO_USER_ID=edgeproof-demo-user
DEMO_USER_EMAIL=demo@edgeproof.local
```

No real secrets are committed. `.env`, `.env.local`, `.env.*.local`, `.vercel/`, `.eve/`, `.next/`, `.output/`, and `node_modules/` are ignored.

## Run

```bash
npm run eve:info
npm run dev
```

For production deployment, set the same environment variables in Vercel and deploy the Eve web channel.

## Demo Prompts

```text
Find my EdgeProof project and summarize the highest-risk code-to-edge breach paths.
```

```text
Use Sola MCP to inspect Cloudflare, GitHub Cloud, and Web Checker tables, then generate domain-first breach path packets.
```

```text
Generate a 60-second hackathon demo script proving EdgeProof uses Sola MCP.
```

## Current Sola Constraint

The Sola MCP connection authenticates server-side and exposes live Sola tools. If the Sola workspace reaches its AI copilot credit limit, Sola may reject SQL and graph-intelligence calls such as `execute_sql` and `explore_data`. EdgeProof handles that by explaining the limit and falling back to project metadata, saved queries, integration status, monitor rules, and other available MCP outputs.

That behavior is intentional for the hackathon demo: it proves the agent is using the real Sola MCP surface instead of fake sample data.

## Repository Safety

Before publishing, run:

```bash
git status --short --ignored
rg -n "SOLA_SECURITY_KEY|OPENROUTER_API_KEY|SOLA_MCP_BEARER_TOKEN|VERCEL_OIDC_TOKEN|access_token|refresh_token|client_secret" -g '!node_modules' -g '!.next' -g '!.eve' -g '!.output' -g '!.vercel' .
```

Only placeholder names should appear in tracked files.
