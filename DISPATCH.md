# Cath Lab Nurse Documentation Assistant — Full Build Dispatch Prompt

> **How to use:** Copy everything below the line into Claude Code as your first message.

---

```
You are starting a new MSWLab project. Read and follow these instructions exactly.

# MSWLab Full Build Dispatch — Cath Lab Nurse Documentation Assistant

You are an expert full-stack developer executing the MSWLab.ai standardized build pipeline. Your job is to take this project from nothing to a working, deployed, security-hardened clinical web application.

Read this entire prompt before writing any code. Execute each phase in order. Do not skip phases.

---

## PHASE 0 — PROJECT DEFINITION (confirmed)

- **App name:** cath-lab-docs
- **One-line summary:** A cath lab nurse can document an interventional cardiology case in real time on an iPad using voice capture, OCR snapshots, and manual entry — producing a confirmed, export-ready procedure note without post-case recall.
- **Primary user:** Cath Lab Nurse
- **Domain:** TBD (use Vercel preview URLs for now)
- **Database:** CONVEX (real-time timeline updates, reactive UI for live case documentation)
- **Mobile required:** iPad-first (1024px+ landscape optimized, touch-friendly 44px+ targets)

All values confirmed. Proceed to Phase 1.

---

## PHASE 1 — READ THE PRD

Before writing any code, read `PRD.md` in this repo root. It contains:
- Full data model (6 tables: cases, events, snapshots, devices, exports, auditLog)
- 10 allowed event types with source mappings
- Core user flow (5 steps)
- UI direction (dark navy + teal, split-panel, clinical density)
- Note generation logic (8 sections, confirmed-only, omit-empty policy)
- Demo mode spec (ON by default, auto-wipe, banner)
- Security constraints (confirm-first, no hallucination, push-to-talk only)
- Success criteria (13 checkboxes)

The PRD is your contract. Build exactly what it describes.

---

## PHASE 2 — PROJECT SETUP

Execute every sub-phase in order.

### 2.1 — Clone Base Template

```bash
git clone https://github.com/harperaa/secure-vibe-coding-OS.git cath-lab-docs
cd cath-lab-docs
npm install
```

NEVER use `npx create-next-app`. Always start from secure-vibe-coding-OS.

### 2.2 — Re-initialize Git

```bash
rm -rf .git
git init
git remote add origin https://github.com/mswlab/cath-lab-docs.git
git add .
git commit -m "Initial commit from secure-vibe-coding-OS + MSWLab config"
git branch -M main
git push -u origin main
git checkout -b staging
git push -u origin staging
```

### 2.3 — Doppler Configuration

Create and commit these files:

**`doppler-template.yaml`:**
```yaml
projects:
  - name: "cath-lab-docs"
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
        DEMO_MODE: "true"
        AUTO_WIPE_HOURS: "24"
      prd:
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ""
        CLERK_SECRET_KEY: ""
        NEXT_PUBLIC_CLERK_FRONTEND_API_URL: ""
        CONVEX_DEPLOY_KEY: ""
        CSRF_SECRET: "${dev.CSRF_SECRET}"
        SESSION_SECRET: "${dev.SESSION_SECRET}"
        DEMO_MODE: "true"
        AUTO_WIPE_HOURS: "24"
```

**`doppler.yaml`:**
```yaml
setup:
  - project: "cath-lab-docs"
    config: dev
```

Then run:
```bash
doppler import
doppler setup --no-interactive
```

### 2.4 — Clerk Authentication

1. clerk.com → Create Application → name: `cath-lab-docs-dev`
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

Copy `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` → paste into Doppler.

Set Convex dashboard env vars (Settings → Environment Variables):
- `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` (same value)
- `ADMIN_EMAIL` (your admin email)

### 2.6 — Clerk → Convex Webhook

1. Convex Dashboard → Settings → URL & Deploy Key → copy HTTP Actions URL
2. Clerk → Configure → Webhooks → Add Endpoint
3. URL: `{HTTP Actions URL}/clerk-users-webhook`
4. Subscribe: `user.created`, `user.updated`, `user.deleted`
5. Copy signing secret → set `CLERK_WEBHOOK_SECRET` in Convex dashboard

### 2.7 — Doppler → Vercel Sync

In Doppler → cath-lab-docs → Integrations, create 3 syncs:

| Doppler Config | → Vercel Environment |
|---|---|
| `dev` | Development |
| `dev` | Preview |
| `prd` | Production |

### 2.8 — Vercel Deployment

1. Connect GitHub repo to Vercel
2. **Override build command:** `npx convex deploy --cmd 'npm run build'`
3. Domains (when ready):
   - `app.{domain}.com` → Production (main branch)
   - `staging.{domain}.com` → Preview (staging branch)

### 2.9 — Verify Setup

```bash
doppler run -- npx convex dev    # Terminal 1
doppler run -- npm run dev       # Terminal 2
```

Confirm: app loads, Clerk works, no `.env.local`.

---

## PHASE 3 — BUILD THE APP

Build in this exact order. Refer to PRD.md for all details.

### 3.1 — Convex Schema (`convex/schema.ts`)

Define all 6 tables exactly as specified in the PRD Data Model section:
- `cases` — case metadata with demoMode flag
- `events` — clinical timeline entries with eventType, source, confidence, confirmed
- `snapshots` — OCR image captures with extractedData and confirmed flag
- `devices` — implanted device tracking with confirmed flag
- `exports` — generated notes/PDFs stored in Convex file storage
- `auditLog` — full before/after compliance trail

Add proper indexes:
- `events` by `caseId` + `eventTime`
- `snapshots` by `caseId`
- `devices` by `caseId`
- `auditLog` by `caseId` + `timestamp`
- `exports` by `caseId`
- `cases` by `userId` + `status`

### 3.2 — Core Mutations & Queries

**Cases:**
- `createCase` — creates case with demoMode from env, status=active
- `getCase` — fetch by ID, auth-gated to owner
- `listCases` — list user's cases filtered by status
- `completeCase` — set status=completed
- `wipeCase` — purge all related data (events, snapshots, devices, exports, audit) for demo cases

**Events:**
- `createEvent` — add event to case timeline; confirmed=true for manual, false for ocr/asr; writes auditLog
- `listEvents` — chronological events for a case
- `updateEvent` — edit event payload; writes auditLog with before/after snapshots
- `confirmEvent` — set confirmed=true, confirmedAt, confirmedBy; writes auditLog
- `deleteEvent` — remove event; writes auditLog

**Snapshots:**
- `uploadSnapshot` — store image via Convex file storage, create snapshot record
- `updateSnapshotExtraction` — store OCR results on snapshot
- `confirmSnapshot` — confirm extracted data
- `listSnapshots` — snapshots for a case

**Devices:**
- `createDevice` — add device to case (from OCR extraction or manual)
- `confirmDevice` — confirm device details
- `listDevices` — devices for a case

**Exports:**
- `generateNote` — build plaintext from confirmed events only (see Note Generation Logic in PRD)
- `assertNoUnconfirmed` — check all OCR/ASR events/snapshots/devices are confirmed; throw if not
- `createExport` — store plaintext + optional PDF; must call assertNoUnconfirmed first

**Audit:**
- `logAudit` — internal helper; writes actor, action, targetType, targetId, before/after snapshots
- `listAuditLog` — audit trail for a case

**Demo Mode:**
- `autoWipeDemoCases` — scheduled Convex cron that wipes demo cases older than AUTO_WIPE_HOURS

### 3.3 — Auth-Protected Layout

- Clerk provider in root layout
- Protected route group: `(auth)/dashboard/` — all dashboard pages require sign-in
- Public route: `/` — landing page or redirect to dashboard if signed in
- Middleware: redirect unauthenticated users to Clerk sign-in

### 3.4 — Pages (in Core User Flow order)

**3.4.1 — Dashboard (`/dashboard`)**
- Case list: active cases at top, completed below, exported at bottom
- Each case card shows: case type, room, operator, nurse, status badge, created time
- "New Case" button → navigates to creation form
- Search/filter by case type, status, date

**3.4.2 — New Case (`/dashboard/cases/new`)**
- Form: case type (dropdown: diagnostic_cath, pci, ep_study, structural), room, operator name, nurse name
- Submit creates case → navigates to case timeline

**3.4.3 — Case View (`/dashboard/cases/[caseId]`)**

This is the **core view**. Split-panel layout:

**Left sidebar (persistent):**
- Case metadata header (type, room, operator, nurse)
- Navigation tabs: Timeline | Capture | Devices | Note | Export
- Unconfirmed count badge (red) on Timeline tab
- Case status indicator

**Main content area (switches by tab):**

**Timeline Tab (default):**
- Chronological list of all events, newest at bottom
- Each event card shows:
  - Event type icon + label
  - Timestamp
  - Source badge (manual=green, ocr=amber, asr=blue)
  - Confidence score (for ocr/asr)
  - Confirmation status: ✓ confirmed (green) or ⚠ unconfirmed (red)
  - Payload details (type-specific rendering)
- Tap unconfirmed event → opens confirmation modal:
  - Shows extracted values (editable)
  - "Confirm" button sets confirmed=true
  - "Edit & Confirm" saves edits then confirms
  - "Delete" removes event

**Capture Tab:**
- Three capture modes in a segmented control:
  1. **Voice (Push-to-Talk):** Large mic button. Press and hold = recording. Release = stop. Uses Web Speech API for transcription. Parsed into structured event (med_admin, access, or free_text). Added to timeline as `source: asr`, `confirmed: false`.
  2. **OCR Snapshot:** File upload button (image picker). Select image type: hemodynamics | vitals | device_label. Uploads to Convex storage. Runs OCR extraction (Convex action). Creates snapshot + event with `source: ocr`, `confirmed: false`.
  3. **Manual Entry:** Form with event type dropdown, timestamp (defaults to now), payload fields (dynamic based on event type). Created as `source: manual`, `confirmed: true`.

**Devices Tab:**
- List of all devices for the case
- Each device card: type, manufacturer, size, lot, expiration, confirmed status
- Add device manually or via OCR (device_label snapshot)
- Confirm/edit each device

**Note Tab:**
- "Generate Note" button
- Renders structured plaintext preview (read-only)
- Sections per PRD Note Generation Logic: Header, Timeout, Access & Sedation, Hemodynamics, Devices, Vitals, Complications, Disposition
- Empty sections are omitted
- Only uses confirmed events
- Warning banner if unconfirmed events exist: "X events are unconfirmed and will not be included"

**Export Tab:**
- Shows note preview
- "Export PDF" button
- If unconfirmed OCR/ASR fields exist → button disabled with red warning: "All OCR/ASR fields must be confirmed before export"
- If all confirmed → generates PDF → stores in Convex → shows download link
- Export history list below

**3.4.4 — Demo Mode Banner**
- When DEMO_MODE=true, persistent top banner across all pages:
  - Yellow/amber background
  - Text: "DEMO MODE — No real patient data"
  - "Wipe All Demo Data" button (with confirmation dialog)

### 3.5 — API Routes / Convex Actions

For OCR processing, create a Convex action:
- `processOcrSnapshot` — receives storageId + kind → extracts image → runs OCR (Tesseract.js or external API) → parses label-value pairs based on kind → stores results on snapshot → creates event

For ASR (MVP):
- Use browser Web Speech API (client-side only, no API route needed)
- Parse transcription client-side into structured event
- Send parsed event to `createEvent` mutation

For PDF generation, create a Convex action:
- `generatePdf` — calls assertNoUnconfirmed → builds plaintext note → converts to PDF (use a PDF library or HTML-to-PDF service) → stores in Convex file storage → creates export record

Wrap ALL Next.js API routes (if any beyond Convex) with security:
```typescript
import { withRateLimit } from '@/lib/withRateLimit'
import { withCsrf } from '@/lib/withCsrf'

// Standard endpoints
export const POST = withRateLimit(handler)

// Sensitive endpoints
export const POST = withRateLimit(withCsrf(handler))
```

### 3.6 — UI Implementation Details

**Color tokens (Tailwind):**
```
primary: #0F172A (slate-900 / dark navy)
accent: #14B8A6 (teal-500)
surface: white
confirmed: #22C55E (green-500)
unconfirmed: #EF4444 (red-500)
ocr-badge: #F59E0B (amber-500)
asr-badge: #3B82F6 (blue-500)
manual-badge: #22C55E (green-500)
demo-banner: #FDE68A (amber-200)
```

**iPad optimization:**
- Min touch target: 44px
- Optimized for 1024px+ landscape
- Split-panel layout: 280px sidebar + fluid main content
- Large buttons for gloved-hand interaction
- High contrast text for bright cath lab environment

**Clinical value display:**
- Hemodynamic pressures: monospace font, tabular layout
- Vitals: large numeric display with units
- Device details: structured card with labeled fields
- Timestamps: HH:MM:SS format (procedure-relative time)

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

### 4.3 — GitHub Secrets

Add to repo settings:
- `DOPPLER_TOKEN` — scoped read-only Doppler service token
- `SEMGREP_APP_TOKEN` — Semgrep account token

---

## PHASE 5 — QUALITY GATES

Before calling any feature done:

- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npm run lint` — passes
- [ ] All API routes use `withRateLimit` minimum
- [ ] All OCR/ASR data defaults to `confirmed: false`
- [ ] PDF export calls `assertNoUnconfirmed()` before generating
- [ ] Demo mode ON by default with banner visible
- [ ] Full audit trail on every create/update/confirm/delete
- [ ] No hardcoded secrets — Doppler only
- [ ] No `.env.local` in repo
- [ ] Push to staging → verify it deploys
- [ ] Test full Core User Flow end-to-end on staging

---

## PHASE 6 — SHIP

1. PR from `staging` → `main`
2. All CI checks pass
3. Verify preview deploy
4. Merge to main
5. Verify production deploy

---

## PHASE 7 — SESSION CLOSE

Run `/retrospective` to capture what was built, decisions made, and lessons learned.

---

## NON-NEGOTIABLE RULES

1. **Doppler only** — Never create `.env.local`. Never hardcode secrets.
2. **secure-vibe-coding-OS** — Always clone the template. Never `create-next-app`.
3. **Security wrappers** — Every API route uses `withRateLimit` minimum.
4. **Branch strategy** — Feature → staging → main. Never push directly to main.
5. **Build command** — Vercel uses `npx convex deploy --cmd 'npm run build'`.
6. **Clerk URL** — `NEXT_PUBLIC_CLERK_FRONTEND_API_URL` includes `https://`.
7. **Confirm-first** — All OCR/ASR data is unconfirmed by default. No exceptions.
8. **No hallucination** — System omits uncertain values rather than fabricating them.
9. **Audit everything** — Every data mutation writes to auditLog.
10. **Demo mode default** — DEMO_MODE=true on first deploy. Banner always visible.

Start with Phase 1 — read PRD.md, then proceed through all phases in order.
```
