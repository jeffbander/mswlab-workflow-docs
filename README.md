# MSWLab.ai — AI-Powered Development Workflow

> **For reviewers:** This document describes the complete system MSWLab uses to go from idea to production web application using AI-assisted development. No Claude access required to review this — everything is documented here.

---

## Table of Contents

1. [What This Is](#what-this-is)
2. [The Full Pipeline](#the-full-pipeline)
3. [Tech Stack](#tech-stack)
4. [The Four Skills](#the-four-skills)
5. [Security Architecture](#security-architecture)
6. [Secrets Management (Doppler)](#secrets-management-doppler)
7. [CI/CD Pipeline](#cicd-pipeline)
8. [Skill Files (Full Content)](#skill-files-full-content)
9. [GitHub Actions Workflows](#github-actions-workflows)
10. [Standards and Rules](#standards-and-rules)

---

## What This Is

MSWLab.ai builds clinical web applications for cardiology — patient dashboards, prior authorization tools, scheduling systems, SNF care coordination platforms. This document describes the standardized development pipeline used for every project.

The pipeline uses **Claude AI** (Anthropic) at two stages:
- **Claude.ai** (chat) — for idea validation, PRD creation, and design decisions
- **Claude Code** (terminal) — for building the actual application

Everything else — secrets, deployment, CI/CD, security scanning — is handled by best-in-class tools with no AI involvement.

---

## The Full Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: IDEATE (Claude.ai chat)                                           │
│                                                                             │
│  Raw Idea → Idea Validation → PRD Discussion → PRD.md created              │
│  Tools: idea-validator skill, launch-planner skill, design-guide skill      │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │ PRD.md committed to repo
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: DESIGN (Claude.ai chat)                                           │
│                                                                             │
│  UI direction, color palette, component decisions, data model review        │
│  Tools: design-guide skill                                                  │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │ Claude Code Starter Prompt generated
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: BUILD (Claude Code terminal)                                      │
│                                                                             │
│  Clone secure-vibe-coding-OS → Doppler setup → Clerk auth → Convex DB      │
│  → Vercel deploy → Build core user flow from PRD.md                        │
│  Tools: mswlab-project-setup skill, mswlab-claude-code-starter skill        │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │ Push to staging branch
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 4: SHIP (GitHub Actions + Vercel + Doppler)                          │
│                                                                             │
│  PR → CI checks (typecheck, lint, audit) → Semgrep security scan           │
│  → Vercel preview deploy → Review → Merge to main → Production             │
│  Tools: mswlab-cicd skill, Semgrep, Doppler, Vercel                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

Every MSWLab project uses the same standardized stack. Deviations require explicit justification.

| Layer | Tool | Purpose |
|---|---|---|
| Base template | [secure-vibe-coding-OS](https://github.com/harperaa/secure-vibe-coding-OS) | Security-hardened Next.js starter |
| Framework | Next.js 15 + App Router + TypeScript | Frontend + API routes |
| Auth | Clerk | User authentication + billing |
| Database | Convex (default) or Neon + Drizzle | Real-time DB or SQL |
| Deployment | Vercel | Hosting + preview deployments |
| Secrets | Doppler | Zero-.env-file secrets management |
| Security scanning | Semgrep | SAST — static application security testing |
| CI/CD | GitHub Actions | Quality gates + security scanning |

### Why secure-vibe-coding-OS?

Every project starts from this template rather than `create-next-app` because it ships with production-ready security built in from day one:

- **CSRF protection** — `withCsrf()` HOF wrapper for all state-changing API routes
- **Rate limiting** — `withRateLimit()` HOF, 5 requests/minute per IP
- **Input validation** — Zod schemas with XSS sanitization throughout
- **Security headers** — CSP, X-Frame-Options, HSTS applied automatically
- **Secure error handling** — no stack traces in production responses
- **Security monitoring dashboard** — admin-only real-time attack detection
- **Continual learning system** — `.claude/skills/lessons/` accumulates project-specific knowledge across sessions

---

## The Four Skills

A "skill" is a markdown instruction file that Claude reads to guide its behavior on a specific task. Skills are the standardized playbooks for the MSWLab development pipeline.

| Skill | Used In | Purpose |
|---|---|---|
| [`mswlab-prd-creator`](./skills/mswlab-prd-creator.md) | Claude.ai | Guides idea → PRD.md conversation |
| [`mswlab-claude-code-starter`](./skills/mswlab-claude-code-starter.md) | Claude.ai | Generates Claude Code handoff prompt |
| [`mswlab-project-setup`](./skills/mswlab-project-setup.md) | Claude Code | Full project initialization (10 phases) |
| [`mswlab-cicd`](./skills/mswlab-cicd.md) | Claude Code | CI/CD workflow setup |
| [`mswlab-handoff-plan-dispatch`](./skills/mswlab-handoff-plan-dispatch.md) | Claude Code | Full build dispatch — zero to deployed MVP in one prompt |

See [Skill Files](#skill-files-full-content) for full content of each skill.

---

## Security Architecture

### The Three Layers

**Layer 1 — Code Security (secure-vibe-coding-OS built-ins)**

Every API route is wrapped with security HOFs:

```typescript
// Standard endpoint — rate limiting only
export const POST = withRateLimit(handler)

// Sensitive endpoint — rate limiting + CSRF
export const POST = withRateLimit(withCsrf(handler))

// All input validated with Zod + XSS sanitization
const validation = validateRequest(mySchema, body)
if (!validation.success) return validation.response
```

**Layer 2 — Secrets Security (Doppler)**

No secrets ever touch files. No `.env.local`. No copy-pasting keys.

```
Doppler (single source of truth)
    ├── auto-syncs to → Vercel (all 3 environments)
    ├── injects into → local dev via `doppler run --`
    └── injects into → Claude Code sessions via `doppler run --`
```

**Layer 3 — Scanning Security (Semgrep)**

Every PR is diff-scanned before it can merge. Every push to main is fully scanned.

Rule packs applied to every project:
- `p/nextjs` — Next.js specific vulnerabilities
- `p/typescript` — TypeScript security anti-patterns
- `p/secrets` — Leaked secrets detection
- `p/owasp-top-ten` — OWASP Top 10 coverage

### Branch Protection

`main` branch requires:
- PR before merging (no direct pushes)
- All CI checks passing (typecheck, lint, npm audit)
- Semgrep scan passing
- At minimum one review

---

## Secrets Management (Doppler)

### Why Doppler

| Problem | Solution |
|---|---|
| Secrets in `.env.local` files on developer machines | Doppler injects at runtime — nothing on disk |
| Manually copying keys into Vercel dashboard | Doppler → Vercel auto-sync |
| Rotating a key requires updating 5 places | Update in Doppler once → propagates everywhere |
| New developer needs access | Issue a scoped read-only service token |

### Project Structure in Doppler

```
Doppler Workplace: MSWlab (Team Plan)
├── Project: {app-name}
│   ├── dev config   → local dev + Vercel Preview (staging branch)
│   └── prd config   → Vercel Production (main branch)
└── Project: {next-app}
    ├── dev config
    └── prd config
```

### Environment Variable Matrix

| Variable | Production | Staging/Preview | Local Dev |
|---|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_*` | `pk_test_*` | `pk_test_*` |
| `CLERK_SECRET_KEY` | `sk_live_*` | `sk_test_*` | `sk_test_*` |
| `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` | prod Clerk URL | dev Clerk URL | dev Clerk URL |
| `CONVEX_DEPLOY_KEY` | `prod:...` | — | — |
| `CONVEX_DEPLOYMENT` | auto (Convex) | `dev:{name}` | `dev:{name}` |
| `CSRF_SECRET` | same value | same value | same value |
| `SESSION_SECRET` | same value | same value | same value |

### Running Locally (No .env.local)

```bash
# Everything is injected at runtime by Doppler
doppler run -- npx convex dev    # Terminal 1
doppler run -- npm run dev       # Terminal 2
```

---

## CI/CD Pipeline

### Workflow Overview

```
Developer creates feature branch
         ↓
Opens PR to staging
         ↓
GitHub Actions runs automatically:
    ├── TypeScript check     → must pass to merge
    ├── ESLint               → must pass to merge
    └── npm audit            → fails on high/critical CVEs
         ↓
Semgrep diff-aware scan (new issues only)
         ↓
Vercel creates preview deployment
    → Preview URL posted as PR comment automatically
         ↓
Review + approve + merge to staging
         ↓
staging.{domain}.com updates (Vercel auto-deploy)
         ↓
PR from staging → main (final review)
         ↓
All checks pass → merge
         ↓
Vercel production deploy
    Build command: npx convex deploy --cmd 'npm run build'
         ↓
app.{domain}.com — live
```

### GitHub Secrets Required Per Project

Only 2 secrets needed per repository:

| Secret | Value | Purpose |
|---|---|---|
| `DOPPLER_TOKEN` | Scoped read-only Doppler service token | Inject dev secrets during CI |
| `SEMGREP_APP_TOKEN` | Semgrep account token | Authenticate scan results |

See [workflow files](./workflows/) for the actual GitHub Actions YAML.

---

## Skill Files (Full Content)

The following pages contain the complete content of each skill:

- **[mswlab-prd-creator](./skills/mswlab-prd-creator.md)** — How Claude.ai guides PRD creation
- **[mswlab-claude-code-starter](./skills/mswlab-claude-code-starter.md)** — The Claude Code handoff prompt template
- **[mswlab-project-setup](./skills/mswlab-project-setup.md)** — The 10-phase project initialization playbook
- **[mswlab-cicd](./skills/mswlab-cicd.md)** — CI/CD workflow setup instructions
- **[mswlab-handoff-plan-dispatch](./skills/mswlab-handoff-plan-dispatch.md)** — Full build dispatch prompt (all phases in one shot)

---

## GitHub Actions Workflows

The following workflow files are copied into `.github/workflows/` of every new project:

- **[ci.yml](./workflows/ci.yml)** — TypeScript, ESLint, npm audit quality gate
- **[semgrep.yml](./workflows/semgrep.yml)** — Semgrep security scanning
- **[deploy-notify.yml](./workflows/deploy-notify.yml)** — Vercel preview URL PR comments

---

## Standards and Rules

### Rules That Are Never Broken

**Secrets**
- Doppler is the only place secrets live — no `.env.local` ever
- `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` includes `https://` (not the old `CLERK_JWT_ISSUER_DOMAIN` pattern)
- `CONVEX_DEPLOY_KEY` only in Vercel production — never add `CONVEX_DEPLOYMENT` manually

**Git**
- Always start from `git clone https://github.com/harperaa/secure-vibe-coding-OS.git`
- Never `npx create-next-app`
- Never commit directly to `main` — staging → main always
- Feature branches are short-lived — delete after merge

**Code**
- All API routes use `withRateLimit` at minimum
- Sensitive routes use `withRateLimit(withCsrf(handler))`
- All user input validated with Zod schemas
- `handleApiError()` used in all catch blocks — no raw error exposure

**Vercel**
- Build command is always: `npx convex deploy --cmd 'npm run build'`
- Never manually enter env vars in Vercel — Doppler sync handles it

**Claude Code sessions**
- Run `/retrospective` at end of every session
- Run `/advise` before every non-trivial task
- Keep security skills updated: `git subtree pull --prefix=.claude/skills/security https://github.com/harperaa/secure-claude-skills.git main --squash`

### Naming Conventions

| Item | Pattern | Example |
|---|---|---|
| App name | lowercase, hyphenated | `cardioauth`, `snf-rounds` |
| GitHub repo | `mswlab/{app-name}` | `mswlab/cardioauth` |
| Vercel project | same as repo | `cardioauth` |
| Production domain | `app.{domain}.com` | `app.cardioauth.com` |
| Staging domain | `staging.{domain}.com` | `staging.cardioauth.com` |
| Doppler project | `{app-name}` | `cardioauth` |
| Clerk dev instance | `{app-name}-dev` | `cardioauth-dev` |

### Active Project Registry

| App | Domain | Stack | Status |
|---|---|---|---|
| LipidAI | `newlipids.site` | Next.js + Convex + Clerk | Active |
| CardioAuth | *(internal)* | Next.js + Convex + Clerk | Active |
| CCU Census | `sinai-inpatient-management.com` | Next.js + Convex + Clerk | Active |
| Strike Prep V2 | *(Vercel)* | Next.js + Convex + Clerk | Active |
| Women As One | `womenasone-resume.com` | Next.js + Neon + Clerk | Active |

---

*MSWLab.ai · Mount Sinai Health System · ProviderLoop*  
*Last updated: March 2026*
