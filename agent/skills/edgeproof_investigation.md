---
description: Investigate EdgeProof code-to-edge breach paths with Sola MCP.
---

# EdgeProof Investigation Skill

Use this skill when the user asks for EdgeProof findings, Sola evidence, hackathon demo material, Cloudflare-to-GitHub mapping, or MCP usage proof.

If the Sola connection returns `needsAuthorization: true`, stop immediately and report that Sola MCP authorization is not complete. Do not call Sola MCP tool names through shell commands.

## Required MCP Tool Coverage

For a full investigation, use the Sola MCP tools in this order:

1. `list_apps` or `list_projects`
   - Find the EdgeProof app/project ID.
2. `get_app_details` or `get_project_details`
   - Capture integrations, status, canvases, monitor rules, and tables.
3. `get_app_queries_tool` or `get_project_queries_tool`
   - Reuse existing EdgeProof queries before creating new SQL.
4. `get_vendor_tables`
   - Discover Cloudflare, GitHub Cloud, and Sola Web Checker tables.
5. `get_vendor_schemas`
   - Inspect exact columns for target tables.
6. `execute_sql` only if credits are available
   - Run read-only evidence queries.
7. `explore_data` only if credits are available
   - Ask Sola graph intelligence for cross-source breach paths.

If `execute_sql` or `explore_data` returns an AI copilot credit limit error, do not retry. Produce a best-effort summary from app details, saved queries, canvases, monitor rules, connector status, and table/schema metadata.

## Good Natural Language Prompts For `explore_data`

Use these when SQL table names are unclear or when cross-source reasoning matters:

```text
In the EdgeProof project, identify public Cloudflare or Workers domains that map to GitHub repositories with weak branch protection, deployment workflows, broad admin permissions, or missing vulnerability scanning. Return evidence-backed code-to-edge breach path packets only.
```

```text
Find every Cloudflare, Workers, or Web Checker asset that has a public exposure and explain which GitHub repository or workflow can affect it. Exclude generic GitHub findings unless they are tied to a public domain.
```

```text
Summarize the highest-risk EdgeProof breach paths for a 60-second hackathon demo. Show the Sola MCP tools and data sources used.
```

## Output Standard

Return no more than five primary findings. Each finding must include:

- Domain or public edge asset
- Source of exposure
- Linked or inferred repository
- Weak GitHub control
- Why the path matters
- Evidence pulled from Sola
- Remediation

If evidence is incomplete because a connector is `PARTIAL_SUCCESS`, syncing, disabled, or missing tables, say that directly and explain what still worked.
