# Skill: mswlab-project-setup

**Used in:** Claude Code (terminal)  
**Purpose:** Complete 10-phase initialization of a new MSWLab web application  
**Base template:** [secure-vibe-coding-OS](https://github.com/harperaa/secure-vibe-coding-OS)  

---

## Overview

This is the most comprehensive skill in the MSWLab system. It walks Claude Code through the full initialization of a new project — from cloning the security-hardened base template through production deployment. Every MSWLab project goes through these phases in order.

**Key principle:** No `.env.local` is ever created. All secrets are managed by Doppler and injected at runtime.

---

## Prerequisites (One-Time Per Machine)

```bash
# Install Doppler CLI
brew install dopplerhq/cli/doppler

# Authenticate to MSWlab Doppler workspace
doppler login
```

---

## The 10 Phases

### Phase 0 — Project Definition (5 min)

Before any code:
- App name (lowercase, hyphenated, ≤3 words)
- Domain umbrella (mswlab.ai / providerloop.com / custom .com)
- Database choice (Convex default, or Neon for complex SQL)
- MVP scope (one sentence)

---

### Phase 1 — Repository + Doppler Files (10 min)

**Clone the security-hardened template:**
```bash
git clone https://github.com/harperaa/secure-vibe-coding-OS.git {app-name}
cd {app-name}
npm install
```

**Re-initialize git with clean history:**
```bash
rm -rf .git
git init
git remote add origin https://github.com/mswlab/{app-name}.git
```

**Add Doppler configuration files** (from this skill's templates):
- `doppler-template.yaml` — defines all secret names (safe to commit, no values)
- `doppler.yaml` — maps directory to Doppler project/config

**Create two-branch strategy:**
```bash
git add .
git commit -m "Initial commit from secure-vibe-coding-OS + MSWLab Doppler config"
git branch -M main
git push -u origin main

git checkout -b staging
git push -u origin staging
```

**Branch rule:** Feature branches → staging → main. Never commit directly to main.

---

### Phase 2 — Doppler Setup (15 min)

```bash
# Import the project structure into Doppler
doppler import

# Link local directory to Doppler dev config
doppler setup --no-interactive

# Open Doppler dashboard to fill in secret values
doppler open dashboard
```

**Secrets to fill in dev config:**

| Secret | Source |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API Keys |
| `CLERK_SECRET_KEY` | Clerk dashboard → API Keys |
| `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` | Clerk JWT Template (Phase 3) |
| `CONVEX_DEPLOYMENT` | Output of `npx convex dev` (Phase 4) |
| `NEXT_PUBLIC_CONVEX_URL` | Output of `npx convex dev` |
| `CSRF_SECRET` | `node -p "require('crypto').randomBytes(32).toString('base64url')"` |
| `SESSION_SECRET` | Same command as above |
| `ANTHROPIC_API_KEY` | Anthropic console |

> ⚠️ `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` includes `https://`. This template uses the full URL form, unlike older MSWLab projects that used `CLERK_JWT_ISSUER_DOMAIN` (no prefix).

---

### Phase 3 — Clerk Authentication + Billing

**Create Clerk dev application:**
- clerk.com → Create Application → name: `{app-name}-dev`
- Enable Email + Google
- Copy `pk_test_` + `sk_test_` keys → paste into Doppler dev config

**Create JWT Template for Convex (REQUIRED):**
1. Clerk Dashboard → Configure → JWT Templates → Add → select **Convex**
2. Save → copy Issuer URL (`https://{instance}.clerk.accounts.dev`)
3. Paste as `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` in Doppler

**Set up Clerk Billing (app errors without this):**
1. Clerk → Billing → Settings → Connect Stripe
2. Create a Plan → set name + price → **Save**
3. Click **Enable Billing** at top ← easy to miss

---

### Phase 4 — Convex + Webhook

```bash
# Initialize Convex dev deployment
doppler run -- npx convex dev
# Copy CONVEX_DEPLOYMENT and NEXT_PUBLIC_CONVEX_URL shown → paste into Doppler
```

**Set Convex env vars** (Convex Dashboard → dev → Settings → Environment Variables):
```bash
doppler secrets get NEXT_PUBLIC_CLERK_FRONTEND_API_URL --plain
# paste the output as NEXT_PUBLIC_CLERK_FRONTEND_API_URL in Convex
```
Also set: `ADMIN_EMAIL`

**Create Clerk → Convex webhook:**
1. Convex Dashboard → dev → Settings → URL & Deploy Key → Show credentials
2. Copy HTTP Actions URL (ends in `.convex.site`)
3. Clerk → Configure → Webhooks → Add Endpoint
4. URL: `{HTTP Actions URL}/clerk-users-webhook`
5. Subscribe: `user.created`, `user.updated`, `user.deleted`, `paymentAttempt.updated`
6. Copy signing secret → set `CLERK_WEBHOOK_SECRET` in Convex dashboard

---

### Phase 5 — Connect Doppler → Vercel (3 integrations)

In **Doppler Dashboard → {app-name} → Integrations**, create 3 syncs:

| Doppler Config | → Vercel Environment |
|---|---|
| `dev` | Development |
| `dev` | Preview |
| `prd` | Production |

After this, Vercel env vars auto-sync whenever Doppler is updated. **Never manually enter env vars in Vercel again.**

---

### Phase 6 — Run Locally

```bash
# Terminal 1 (always start first)
doppler run -- npx convex dev

# Terminal 2
doppler run -- npm run dev
```

No `.env.local`. Doppler injects everything at runtime.

**Verify security:**
```bash
node scripts/test-rate-limit.js    # requests 1-5 → 200, requests 6-10 → 429
bash scripts/security-check.sh    # dependency audit
```

---

### Phase 7 — Vercel Deployment

**Connect repo to Vercel**, then:

> ⚠️ Override the build command — this is critical:

Vercel → Project → Settings → Build & Development Settings:
```
Build Command: npx convex deploy --cmd 'npm run build'
```

Without this, Convex functions are NOT deployed to production.

**Vercel env vars are handled by Doppler sync** — no manual entry needed.

**Configure domains:**
- `app.{domain}.com` → Production (main branch)
- `staging.{domain}.com` → Preview (staging branch)

---

### Phase 8 — Custom Domain + DNS

| Record | Name | Value |
|---|---|---|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |
| CNAME | `staging` | `cname.vercel-dns.com` |
| CNAME | `clerk` | `frontend-api.clerk.services` |

---

### Phase 9 — Production Setup

1. Create production Clerk instance (Clerk → top dropdown → Clone dev settings)
2. Toggle Stripe to Live Mode
3. Get Convex prod deploy key → add to Doppler `prd` config as `CONVEX_DEPLOY_KEY`
4. Doppler auto-syncs `CONVEX_DEPLOY_KEY` to Vercel production
5. Set Convex prod dashboard env vars
6. Create production Clerk webhook → Convex prod HTTP Actions URL

---

### Phase 10 — Verification Checklist

- [ ] `http://localhost:3000` — dev Clerk, dev Convex
- [ ] `https://staging.{domain}.com` — test Clerk, dev Convex
- [ ] `https://app.{domain}.com` — live Clerk, prod Convex
- [ ] User signup syncs to Convex `users` table
- [ ] `/dashboard/security` visible as `ADMIN_EMAIL`
- [ ] Rate limit test passes
- [ ] No `.env.local` file in repo

---

## Continual Learning System

The secure-vibe-coding-OS template includes a self-improving knowledge base:

```bash
# Before every non-trivial task in Claude Code:
/advise

# After completing work:
/retrospective
```

Lessons accumulate in `.claude/skills/lessons/` — documented patterns, what worked, what failed, exact parameters. Each session makes the next one faster.

---

## Using the Built-In Security Wrappers

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

---

## Doppler Template Files

These two files are committed to every new project repo:

### `doppler-template.yaml`
Defines all secret **names** (not values) — safe to commit. Running `doppler import` creates the full project structure in Doppler from this file.

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
        CSRF_SECRET: ""
        SESSION_SECRET: ""
        # ... etc
      prd:
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ""
        CONVEX_DEPLOY_KEY: ""
        CSRF_SECRET: "${dev.CSRF_SECRET}"   # references dev value
        SESSION_SECRET: "${dev.SESSION_SECRET}"
        # ... etc
```

### `doppler.yaml`
Maps the local directory to the Doppler project/config:
```yaml
setup:
  - project: "{app-name}"
    config: dev
```

---

[← Back to Overview](../README.md)
