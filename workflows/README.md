# GitHub Actions Workflow Files

These three files are copied into `.github/workflows/` of every new MSWLab project.

---

## [`ci.yml`](./ci.yml) — Quality Gate

Runs on every PR. Three jobs that must all pass before merge:

- **TypeScript check** — `tsc --noEmit` — catches type errors before they reach staging
- **ESLint** — enforces code style and catches common mistakes
- **npm audit** — fails on high or critical CVEs in production dependencies

```
Triggers: pull_request to main or staging, push to main or staging
Blocks merge: yes (when configured in branch protection)
Runtime: ~2-3 minutes
```

---

## [`semgrep.yml`](./semgrep.yml) — Security Scanning

Runs Semgrep SAST (static application security testing) using the MSWLab Semgrep account.

- **On PRs:** diff-aware scan — only reports new issues introduced by the PR
- **On push to main:** full codebase scan
- **Daily:** scheduled full scan

Rule packs: `p/nextjs`, `p/typescript`, `p/secrets`, `p/owasp-top-ten`

```
Triggers: pull_request, push to main, daily schedule, manual dispatch
Blocks merge: advisory by default (can be made required)
Results: GitHub Security tab + Semgrep AppSec Platform dashboard
```

---

## [`deploy-notify.yml`](./deploy-notify.yml) — Preview URL Comments

Listens for Vercel deployment status events and posts the preview URL as a PR comment automatically. Keeps code review tight — reviewer clicks straight to the live preview.

```
Triggers: deployment_status (Vercel webhook)
Posts: Preview URL comment on the PR
Updates: Replaces existing comment on subsequent pushes
```

---

[← Back to Overview](../README.md)
