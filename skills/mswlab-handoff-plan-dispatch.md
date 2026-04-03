# Skill: mswlab-handoff-plan-dispatch

**Used in:** Claude Code (terminal) or any AI coding agent  
**Purpose:** Complete dispatch prompt to build a full MSWLab clinical web application from idea to deployed MVP  
**When to use:** When you have an app idea and want to hand off the entire build to an AI agent in one shot  

---

## Overview

This is the **master dispatch prompt**. Unlike the other skills which are used in stages (PRD first, then starter prompt, then setup, then CI/CD), this document packages the entire MSWLab pipeline into a single handoff. Paste this into Claude Code to go from zero to deployed MVP.

This prompt assumes:
- You have a clear idea of what you're building (or will define it inline)
- You have access to Doppler, Clerk, Convex, Vercel, and GitHub
- You're ready to build now

---

## The Dispatch Prompt

Copy everything below the line and paste into Claude Code as your first message.

---

```
# MSWLab Full Build Dispatch — From Zero to Deployed MVP

You are an expert full-stack developer executing the MSWLab.ai standardized build pipeline. Your job is to take this project from nothing to a working, deployed, security-hardened clinical web application.

Read this entire prompt before writing any code. Execute each phase in order. Do not skip phases. Ask clarifying questions only if critical information is missing.

---

## PHASE 0 — PROJECT DEFINITION

Before anything else, confirm or define these values. If any are blank, stop and ask.

- **App name:** {APP_NAME}
  (lowercase, hyphenated, max 3 words — e.g., `cardioauth`, `snf-rounds`)
- **One-line summary:** {WHAT_IT_DOES}
  (Who uses it and what's the one thing they do? e.g., "A cardiologist views risk scores for all SNF patients in one dashboard")
- **Primary user:** {PRIMARY_USER}
  (e.g., "cardiologist", "front desk coordinator", "care manager")
- **Domain:** {DOMAIN}
  (e.g., `cardioauth.com`, `newlipids.site`, or `mswlab.ai` subdomain)
- **Database:** {CONVEX | NEON}
  (Convex is default for real-time. Neon + Drizzle for complex SQL joins.)
- **Mobile required:** {YES | NO — desktop-first is default}

---

## PHASE 1 — GENERATE THE PRD

Create a `PRD.md` file in the repo root using this exact structure:

```markdown
# PRD: {App Name}
*MSWLab.ai — {today's date}*
*Status: Ready for Claude Code*

## One-Line Summary
{The one-sentence pitch from Phase 0}

## Problem
{2-3 sentences: what pain does this solve, for whom, why existing tools fail}

## Users
- **Primary:** {role}
- **Secondary:** {role, if any}

## Core User Flow (MVP)
{Numbered steps, MAX 5. This is the critical path only.}
1. User opens app → sees {what}
2. User {does core action}
3. System {responds/processes}
4. User {sees result}
5. {Optional: secondary action}

## Phase 2 (NOT in MVP — build later)
- {Feature cut from scope}
- {Feature cut from scope}

## Data Model
{MAX 5 entities for MVP. More = scope creep.}

### {Entity 1}
- `id` — string
- `{field}` — {type}
- `created_at` — timestamp

### {Entity 2}
- ...

## UI Direction
- **Feel:** {2-3 adjectives — e.g., "clinical, dense, trustworthy"}
- **Color palette:** {primary + accent — e.g., "dark navy (#0F172A) + teal (#14B8A6)"}
- **Layout:** {card-based / table-heavy / split-panel dashboard}
- **Mobile:** {required / desktop-first}
- **Reference:** {existing app with the right feel, if any}

## Tech Stack
- **Framework:** Next.js 15 + App Router + TypeScript
- **Auth:** Clerk
- **Database:** {Convex / Neon + Drizzle}
- **Deployment:** Vercel (main + staging branches)
- **Secrets:** Doppler (dev + prd configs)
- **Base:** secure-vibe-coding-OS template
- **Security:** CSRF protection, rate limiting, input validation (built in)

## Key Pages / Routes
- `/` — {landing or redirect}
- `/dashboard` — {main view}
- `/dashboard/{feature}` — {detail view}

## Success Criteria (MVP is done when...)
- [ ] {User can accomplish core task}
- [ ] {Data persists and displays correctly}
- [ ] {Auth works — sign up, sign in, protected routes}
- [ ] Deploys to staging.{domain}.com without errors
- [ ] No .env.local in repo

## Out of Scope
- {Anything explicitly NOT in MVP}
```

Commit `PRD.md` to the repo root.

---

## PHASE 2 — PROJECT SETUP (10 sub-phases)

Execute every sub-phase in order. Do not skip any.

### 2.1 — Clone Base Template

```bash
git clone https://github.com/harperaa/secure-vibe-coding-OS.git {app-name}
cd {app-name}
npm install
```

NEVER use `npx create-next-app`. Always start from secure-vibe-coding-OS.

### 2.2 — Re-initialize Git

```bash
rm -rf .git
git init
git remote add origin https://github.com/mswlab/{app-name}.git
git add .
git commit -m "Initial commit from secure-vibe-coding-OS + MSWLab config"
git branch -M main
git push -u origin main
git checkout -b staging
git push -u origin staging
```

### 2.3 — Doppler Configuration

Create these two files and commit them:

**`doppler-template.yaml`** — defines secret names (no values):
```yaml
projects:
  - name: "{app-name}"
    environments:
      - name: Development
        slug: dev
        configs:
          - slug: dev
      - name: Production
        slug: prd
        configs:
          - slug: prd
    secrets:
      dev:
        NEXT_PUBLIC_SITE_NAME: ""
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ""
        CLERK_SECRET_KEY: ""
        NEXT_PUBLIC_CLERK_FRONTEND_API_URL: ""
        CONVEX_DEPLOYMENT: ""
        NEXT_PUBLIC_CONVEX_URL: ""
        CSRF_SECRET: ""
        SESSION_SECRET: ""
      prd:
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ""
        CLERK_SECRET_KEY: ""
        NEXT_PUBLIC_CLERK_FRONTEND_API_URL: ""
        CONVEX_DEPLOY_KEY: ""
        CSRF_SECRET: "${dev.CSRF_SECRET}"
        SESSION_SECRET: "${dev.SESSION_SECRET}"
```

**`doppler.yaml`**:
```yaml
setup:
  - project: "{app-name}"
    config: dev
```

Then run:
```bash
doppler import
doppler setup --no-interactive
```

### 2.4 — Clerk Authentication

1. Go to clerk.com → Create Application → name: `{app-name}-dev`
2. Enable Email + Google sign-in
3. Copy `pk_test_*` and `sk_test_*` keys → paste into Doppler dev config
4. Create JWT Template: Configure → JWT Templates → Add → select **Convex**
5. Copy Issuer URL → paste as `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` in Doppler
   - **MUST include `https://` prefix**
6. Set up Clerk Billing: Billing → Settings → Connect Stripe → Create Plan → **Enable Billing**

### 2.5 — Convex Database

```bash
doppler run -- npx convex dev
```

Copy the `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` values → paste into Doppler.

Set Convex dashboard env vars (Settings → Environment Variables):
- `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` (same value from Doppler)
- `ADMIN_EMAIL` (your admin email)

### 2.6 — Clerk → Convex Webhook

1. Convex Dashboard → Settings → URL & Deploy Key → copy HTTP Actions URL
2. Clerk → Configure → Webhooks → Add Endpoint
3. URL: `{HTTP Actions URL}/clerk-users-webhook`
4. Subscribe: `user.created`, `user.updated`, `user.deleted`, `paymentAttempt.updated`
5. Copy signing secret → set `CLERK_WEBHOOK_SECRET` in Convex dashboard

### 2.7 — Doppler → Vercel Sync

In Doppler Dashboard → Integrations, create 3 syncs:

| Doppler Config | → Vercel Environment |
|---|---|
| `dev` | Development |
| `dev` | Preview |
| `prd` | Production |

**After this, NEVER manually enter env vars in Vercel again.**

### 2.8 — Vercel Deployment

1. Connect the GitHub repo to Vercel
2. **CRITICAL — Override build command:**
   ```
   npx convex deploy --cmd 'npm run build'
   ```
3. Configure domains:
   - `app.{domain}.com` → Production (main branch)
   - `staging.{domain}.com` → Preview (staging branch)

### 2.9 — DNS (if domain is ready, otherwise skip)

| Record | Name | Value |
|---|---|---|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |
| CNAME | `staging` | `cname.vercel-dns.com` |
| CNAME | `clerk` | `frontend-api.clerk.services` |

### 2.10 — Verify Setup

```bash
# Terminal 1
doppler run -- npx convex dev

# Terminal 2
doppler run -- npm run dev
```

Confirm:
- [ ] App loads at localhost:3000
- [ ] Clerk sign-up/sign-in works
- [ ] No `.env.local` file exists
- [ ] Rate limit test passes: `node scripts/test-rate-limit.js`

---

## PHASE 3 — BUILD THE APP

Now build the Core User Flow from the PRD. Work in this exact order:

### 3.1 — Database Schema

Create `convex/schema.ts` (or `db/schema.ts` for Neon) matching the PRD data model exactly. Keep it minimal — you can add fields later.

### 3.2 — Core Queries & Mutations

Build the data layer first:
- CRUD operations for each entity
- Auth-gated queries (user can only see their own data)
- Any computed/derived data the UI needs

### 3.3 — Auth-Protected Layout

- Set up Clerk provider in the app layout
- Create protected route groups: `(auth)/` for logged-in pages
- Create public route group for landing/marketing pages
- Middleware to redirect unauthenticated users

### 3.4 — Pages (in Core User Flow order)

Build each page from the PRD's "Key Pages / Routes" section:
1. Dashboard / main view first
2. Detail views second
3. Forms / input pages third
4. Settings / admin last

For each page:
- Server components by default, client components only when needed
- Use the UI Direction from the PRD for all visual decisions
- Responsive if mobile is required, desktop-first otherwise

### 3.5 — API Routes

Wrap ALL API routes with security:

```typescript
import { withRateLimit } from '@/lib/withRateLimit'
import { withCsrf } from '@/lib/withCsrf'
import { validateRequest } from '@/lib/validateRequest'
import { handleApiError } from '@/lib/errorHandler'

async function handler(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = validateRequest(mySchema, body)
    if (!validation.success) return validation.response
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'endpoint-name')
  }
}

// Standard endpoints
export const POST = withRateLimit(handler)

// Sensitive endpoints (auth, payments, data writes)
export const POST = withRateLimit(withCsrf(handler))
```

### 3.6 — UI Polish

Match the PRD UI Direction:
- Apply the color palette consistently
- Match the layout style (card-based, table-heavy, etc.)
- Match the feel adjectives
- Loading states, empty states, error states

---

## PHASE 4 — CI/CD SETUP

### 4.1 — Create `.github/workflows/ci.yml`

```yaml
name: CI
on:
  pull_request:
    branches: [main, staging]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm run lint
      - run: npm audit --audit-level=high
```

### 4.2 — Create `.github/workflows/semgrep.yml`

```yaml
name: Semgrep
on:
  pull_request: {}
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * *'

jobs:
  semgrep:
    runs-on: ubuntu-latest
    container:
      image: semgrep/semgrep
    steps:
      - uses: actions/checkout@v4
      - run: semgrep ci
        env:
          SEMGREP_APP_TOKEN: ${{ secrets.SEMGREP_APP_TOKEN }}
```

### 4.3 — Create `.github/workflows/deploy-notify.yml`

```yaml
name: Deploy Notify
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Post preview URL
        uses: actions/github-script@v7
        with:
          script: |
            const { data: deployments } = await github.rest.repos.listDeployments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              sha: context.payload.pull_request.head.sha,
            });
            if (deployments.length > 0) {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body: `Preview deployment is ready.`,
              });
            }
```

### 4.4 — GitHub Secrets

Add to the GitHub repo settings:
- `DOPPLER_TOKEN` — scoped read-only Doppler service token
- `SEMGREP_APP_TOKEN` — Semgrep account token

---

## PHASE 5 — QUALITY GATES

Before calling any feature done, every one of these must pass:

- [ ] `npx tsc --noEmit` — TypeScript compiles clean
- [ ] `npm run lint` — ESLint passes
- [ ] All API routes use `withRateLimit` at minimum
- [ ] Sensitive routes use `withRateLimit(withCsrf(handler))`
- [ ] All user input validated with Zod schemas
- [ ] `handleApiError()` in all catch blocks
- [ ] No hardcoded secrets anywhere — Doppler only
- [ ] No `.env.local` file in the repo
- [ ] Push to staging branch → verify it deploys
- [ ] Test the full Core User Flow end-to-end on staging

---

## PHASE 6 — SHIP TO PRODUCTION

1. Create PR from `staging` → `main`
2. All CI checks must pass (TypeScript, ESLint, audit, Semgrep)
3. Verify preview deploy works
4. Merge to main
5. Verify production deploy at `app.{domain}.com`
6. Run verification checklist:
   - [ ] Sign up works
   - [ ] Core user flow works end-to-end
   - [ ] No console errors
   - [ ] Security dashboard accessible to admin

---

## PHASE 7 — SESSION CLOSE

Run `/retrospective` to capture:
- What was built
- What decisions were made and why
- What was deferred to Phase 2
- Any gotchas or lessons learned

---

## NON-NEGOTIABLE RULES

These are never broken. Violating any of these is a build failure.

1. **Doppler only** — Never create `.env.local`. Never hardcode secrets.
2. **secure-vibe-coding-OS** — Always clone the template. Never `create-next-app`.
3. **Security wrappers** — Every API route uses `withRateLimit` minimum.
4. **Branch strategy** — Feature → staging → main. Never push directly to main.
5. **Build command** — Vercel uses `npx convex deploy --cmd 'npm run build'`.
6. **Clerk URL** — `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` includes `https://`.
7. **No scope creep** — Build the PRD Core User Flow. Nothing else. Phase 2 exists for a reason.
8. **Validate inputs** — All user input goes through Zod schemas.
9. **Handle errors** — `handleApiError()` in every catch block.
10. **Retrospective** — Run `/retrospective` when done.

---

## NAMING CONVENTIONS

| Item | Pattern | Example |
|---|---|---|
| App name | lowercase, hyphenated | `cardioauth` |
| GitHub repo | `mswlab/{app-name}` | `mswlab/cardioauth` |
| Vercel project | same as repo | `cardioauth` |
| Production domain | `app.{domain}.com` | `app.cardioauth.com` |
| Staging domain | `staging.{domain}.com` | `staging.cardioauth.com` |
| Doppler project | `{app-name}` | `cardioauth` |
| Clerk dev instance | `{app-name}-dev` | `cardioauth-dev` |

---

## EXECUTION ORDER SUMMARY

```
Phase 0: Define project → fill in placeholders above
Phase 1: Generate PRD.md → commit to repo root
Phase 2: Setup (clone → git → Doppler → Clerk → Convex → Vercel → DNS → verify)
Phase 3: Build (schema → queries → auth → pages → API routes → polish)
Phase 4: CI/CD (workflows → GitHub secrets)
Phase 5: Quality gates (all checks green)
Phase 6: Ship (staging PR → main PR → production verify)
Phase 7: Retrospective
```

Start with Phase 0. Confirm all project details before writing any code.
```

---

## How to Use This Prompt

### Option A — Fill in the blanks first, then paste
1. Replace all `{PLACEHOLDERS}` with your project-specific values
2. Open Claude Code: `claude` (in any directory)
3. Paste the entire dispatch prompt
4. Claude Code executes all 7 phases in order

### Option B — Paste as-is and let Claude ask
1. Open Claude Code
2. Paste the dispatch prompt with blank placeholders
3. Claude Code will stop at Phase 0 and ask you to define the project
4. Answer the questions, then Claude continues through all phases

### Option C — Attach a PRD
1. If you already have a `PRD.md` (from the `mswlab-prd-creator` skill), skip Phase 1
2. Tell Claude Code: "PRD.md is already in this repo. Skip Phase 1."
3. Claude reads the PRD and begins at Phase 2

---

## When to Use This vs. the Individual Skills

| Scenario | Use |
|---|---|
| You want to walk through idea validation interactively | `mswlab-prd-creator` in Claude.ai |
| You have a PRD and want a focused handoff prompt | `mswlab-claude-code-starter` |
| You want to build everything in one shot | **This dispatch prompt** |
| You only need to set up CI/CD on an existing project | `mswlab-cicd` |

This dispatch prompt is the "give me everything" option. It combines all four skills into one sequential execution plan.

---

[← Back to Overview](../README.md)
