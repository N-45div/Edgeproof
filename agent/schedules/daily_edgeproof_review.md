---
cron: "0 8 * * *"
---

Run the EdgeProof investigation workflow against the Sola workspace.

Find new or unresolved code-to-edge breach paths involving Cloudflare, Workers, Sola Web Checker, and GitHub Cloud.

Return:
- new Critical findings since the last review
- unresolved Critical findings
- connector sync problems
- one short email-ready summary

Exclude generic GitHub posture unless it is tied to a public edge asset.
