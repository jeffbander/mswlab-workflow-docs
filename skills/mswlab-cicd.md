# Skill: mswlab-cicd

**Used in:** Claude Code (terminal)  
**Purpose:** Sets up GitHub Actions CI/CD pipeline with Semgrep security scanning  
**When to use:** After `mswlab-project-setup` Phase 10 is complete  

---

## Overview

This skill drops three GitHub Actions workflow files into `.github/workflows/` and configures branch protection. The result is a fully automated quality gate that runs on every PR before code can reach staging or production.

---

## The Three Workflows

### 1. `ci.yml` — Quality Gate

Runs on every PR to `staging` or `main`. All three checks must pass before merge is allowed.

| Check | Command | Fails when |
|---|---|---|
| TypeScript | `tsc --noEmit` | Any type errors |
| ESLint | `npm run lint` | Any lint violations |
| npm audit | `npm audit --audit-level=high` | High or critical CVEs in dependencies |

---

### 2. `semgrep.yml` — Security Scanning

Uses the MSWLab Semgrep account (`bander_lab`) with `SEMGREP_APP_TOKEN`.

| Trigger | Mode | What it scans |
|---|---|---|
| Pull request | Diff-aware | Only new code introduced by the PR |
| Push to `main` | Full scan | Entire codebase |
| Daily schedule | Full scan | Entire codebase |

**Rule packs applied:**
- `p/nextjs` — Next.js specific vulnerabilities
- `p/typescript` — TypeScript security anti-patterns
- `p/secrets` — Leaked secrets detection
- `p/owasp-top-ten` — OWASP Top 10 coverage

Results appear in the GitHub Security tab (SARIF upload) and in the Semgrep AppSec Platform dashboard.

---

### 3. `deploy-notify.yml` — Preview URL Comments

When Vercel finishes a preview deployment, this workflow automatically posts the preview URL as a comment on the PR. Reviewers can click straight to the live preview without hunting for the Vercel dashboard.

---

## Setup Steps

### Step 1 — Copy Workflow Files

```bash
mkdir -p .github/workflows
cp {skill-path}/ci.yml .github/workflows/
cp {skill-path}/semgrep.yml .github/workflows/
cp {skill-path}/deploy-notify.yml .github/workflows/
```

### Step 2 — Add GitHub Secrets

GitHub → repo → Settings → Secrets and Variables → Actions

| Secret | Value | How to get it |
|---|---|---|
| `SEMGREP_APP_TOKEN` | Semgrep account token | semgrep.dev → Settings → Tokens → Create |
| `DOPPLER_TOKEN` | Scoped read-only service token | See below |

**Generating the `DOPPLER_TOKEN`:**
```bash
doppler configs tokens create \
  --project {app-name} \
  --config dev \
  --name "github-actions-ci" \
  --plain
```

The output is a `dp.st.dev.xxxx` token — paste it as the `DOPPLER_TOKEN` secret.

### Step 3 — Branch Protection

GitHub → repo → Settings → Branches → Add branch protection rule → `main`

Required settings:
- [x] Require a pull request before merging
- [x] Require status checks to pass before merging
  - Add: `ci / typecheck`
  - Add: `ci / lint`
  - Add: `semgrep/ci` (advisory — won't block unless configured)
- [x] Require branches to be up to date
- [x] Do not allow bypassing

### Step 4 — Commit and Push

```bash
git add .github/
git commit -m "Add MSWLab CI/CD workflows"
git push origin staging
```

Open a PR from `staging` → `main` to verify checks run.

---

## Full Pipeline Flow

```
Feature branch pushed
        ↓
PR opened to staging
        ↓
GitHub Actions: ci.yml
    ├── tsc --noEmit          → must pass
    ├── ESLint                → must pass
    └── npm audit (high+)     → must pass
        ↓
Semgrep: diff-aware scan
    └── new security issues   → reported to Semgrep dashboard
        ↓
Vercel: preview deploy created
    └── deploy-notify.yml posts URL to PR comment
        ↓
Review + approve + merge to staging
        ↓
staging.{domain}.com updates automatically
        ↓
PR: staging → main (final review)
        ↓
All checks pass → merge
        ↓
Vercel: production deploy
    Command: npx convex deploy --cmd 'npm run build'
        ↓
app.{domain}.com — live
```

---

## Semgrep Account Setup

Semgrep organization: `bander_lab`

To connect a new repo to Semgrep AppSec Platform:
1. semgrep.dev → Projects → Scan new project → CI/CD → GitHub Actions
2. The `semgrep.yml` workflow file handles the rest automatically
3. Results appear in semgrep.dev → Findings after first scan

---

## Rotating Secrets

**DOPPLER_TOKEN:**
```bash
# Revoke old token
doppler configs tokens revoke dp.st.dev.xxxx

# Create new one
doppler configs tokens create --project {app-name} --config dev --name "github-actions-ci" --plain
# Update the GitHub secret
```

**SEMGREP_APP_TOKEN:**  
Semgrep dashboard → Settings → Tokens → Revoke + create new → update GitHub secret.

---

[← Back to Overview](../README.md)
