# PRD: Cath Lab Nurse Documentation Assistant
*MSWLab.ai — 2026-04-03*
*Status: Ready for Claude Code*

---

## One-Line Summary

A cath lab nurse can document an interventional cardiology case in real time on an iPad using voice capture, OCR snapshots, and manual entry — producing a confirmed, export-ready procedure note without post-case recall.

## Problem

Manual charting after a catheterization procedure is slow, error-prone, and relies on nurse recall. Nurses transcribe monitor readings by hand, device details are captured ad hoc, and billing suggestions require a separate manual review. Documentation takes 15+ minutes post-case and introduces errors that cascade into compliance and billing issues.

## Users

- **Primary:** Cath Lab Nurse — documents interventional cases in real time during procedures
- **Secondary:** Charge Nurse / Supervisor — reviews completed documentation for compliance
- **Tertiary:** Billing / Coding Staff — receives advisory CPT suggestions from confirmed clinical events

## Product Principles

1. **Confirm-first, never hallucinate** — Every OCR/ASR-derived value is `unconfirmed` by default. Exports are blocked until all extracted fields receive explicit nurse confirmation.
2. **Nurse stays in control** — No autonomous decisions. Push-to-talk only (no ambient mic). Billing output is advisory only.
3. **Safety over speed** — Missing or uncertain values remain blank rather than guessed. The system omits rather than fabricates.
4. **Demo-safe by default** — Demo mode ON by default. Auto-wipe, de-identified fixtures, no PHI persistence without explicit opt-in.

---

## Core User Flow (MVP)

1. **Nurse opens app on iPad** → signs in via Clerk → sees case list dashboard
2. **Creates a new case** → enters metadata (case type, room, operator, nurse name) → lands on case timeline
3. **Captures events during procedure** → push-to-talk voice (ASR), OCR camera snapshot of monitors/devices, or manual typed entry → each event appears on chronological timeline as `unconfirmed` (OCR/ASR) or `confirmed` (manual)
4. **Reviews & confirms** → taps each unconfirmed event → reviews extracted values → edits if needed → confirms → audit trail records change
5. **Exports** → generates structured procedure note from confirmed events only → exports as PDF (blocked if any unconfirmed fields remain)

## Phase 2 (NOT in MVP — build later)

- Advisory CPT billing suggestions from confirmed events
- Native iPad camera integration (MVP uses file picker for OCR)
- whisper.cpp on-device ASR (MVP uses server-side stub)
- OpenClaw multi-agent validation pipeline (EventNormalizer, TimelineCurator, NoteWriter)
- Direct EHR/Epic API integration for note submission
- Offline-first sync with conflict resolution
- Multi-hospital deployment
- Auto-rotation & advanced OCR image preprocessing

---

## Data Model

### cases
- `_id` — Convex ID
- `userId` — string (Clerk user ID, owner)
- `caseType` — string (`diagnostic_cath` | `pci` | `ep_study` | `structural`)
- `room` — string
- `operator` — string
- `nurseName` — string
- `status` — string (`active` | `completed` | `exported`)
- `demoMode` — boolean (default: true)
- `createdAt` — number (timestamp)
- `completedAt` — optional number

### events
- `_id` — Convex ID
- `caseId` — Id<"cases">
- `eventType` — string (`timeout` | `med_admin` | `access` | `sedation_check` | `hemodynamics_snapshot` | `vitals_snapshot` | `device_implant` | `complication` | `free_text`)
- `eventTime` — number (timestamp)
- `source` — string (`manual` | `ocr` | `asr`)
- `payload` — object (type-specific structured data as JSON)
- `confidence` — number (0.0–1.0)
- `confirmed` — boolean (default: false for ocr/asr, true for manual)
- `confirmedAt` — optional number
- `confirmedBy` — optional string

### snapshots
- `_id` — Convex ID
- `caseId` — Id<"cases">
- `kind` — string (`hemodynamics` | `vitals` | `device_label`)
- `storageId` — Id<"_storage"> (Convex file storage for uploaded image)
- `ocrRaw` — optional object (raw OCR output)
- `extractedData` — optional object (parsed label-value pairs)
- `confirmed` — boolean

### devices
- `_id` — Convex ID
- `caseId` — Id<"cases">
- `deviceType` — string (`stent` | `balloon` | `wire` | `catheter` | `closure`)
- `manufacturer` — string
- `size` — string
- `lotNumber` — string
- `expiration` — optional string
- `confirmed` — boolean

### exports
- `_id` — Convex ID
- `caseId` — Id<"cases">
- `kind` — string (`plaintext` | `pdf`)
- `contentText` — string (plaintext note)
- `storageId` — optional Id<"_storage"> (PDF in Convex file storage)
- `createdAt` — number
- `createdBy` — string

### auditLog
- `_id` — Convex ID
- `caseId` — Id<"cases">
- `actor` — string (Clerk user ID)
- `action` — string (`create` | `update` | `confirm` | `delete` | `export` | `wipe`)
- `targetType` — string (`event` | `snapshot` | `device` | `case` | `export`)
- `targetId` — string
- `beforeSnapshot` — optional object
- `afterSnapshot` — optional object
- `timestamp` — number

---

## Allowed Event Types

| Event Type | Description | Typical Source |
|---|---|---|
| `timeout` | Pre-procedure safety timeout | manual |
| `med_admin` | Medication administration | asr / manual |
| `access` | Vascular access creation | asr / manual |
| `sedation_check` | Sedation assessment | manual |
| `hemodynamics_snapshot` | Pressure readings (AO, LV, RA, RV, PA, PCWP) | ocr |
| `vitals_snapshot` | Monitor vitals (HR, BP, SpO2, RR, EtCO2) | ocr |
| `device_implant` | Stent/device placement details | ocr |
| `complication` | Adverse events | manual |
| `free_text` | Manual or transcribed notes | asr / manual |

---

## UI Direction

- **Feel:** clinical, dense, trustworthy — like a purpose-built medical instrument, not a consumer app
- **Color palette:** dark navy (#0F172A) primary + teal (#14B8A6) accent + white surface cards. Red (#EF4444) for unconfirmed/alert states. Green (#22C55E) for confirmed states.
- **Layout:** split-panel dashboard — sidebar navigation (case list / timeline / capture / note / export) + main content area with chronological timeline as the core view
- **Mobile:** iPad-first (1024px+ optimized). Touch-friendly tap targets (min 44px). Must work in landscape orientation primarily.
- **Typography:** monospace or semi-mono for clinical values (pressures, vitals). System font for UI chrome.
- **Reference:** Epic flowsheet density meets modern card-based dashboard. Think "clinical data table with confirmation chips."

---

## Tech Stack

- **Framework:** Next.js 15 + App Router + TypeScript
- **Auth:** Clerk (nurse login, role-based access for charge nurses)
- **Database:** Convex (real-time timeline updates, reactive UI for live case documentation)
- **Deployment:** Vercel (main + staging branches)
- **Secrets:** Doppler (dev + prd configs)
- **Base:** secure-vibe-coding-OS template
- **Security:** CSRF protection, rate limiting, input validation (built in)
- **File Storage:** Convex file storage (OCR snapshot images, PDF exports)
- **OCR:** Server-side Convex action calling Tesseract.js or external OCR API
- **ASR:** Web Speech API (browser push-to-talk) for MVP; whisper.cpp integration in Phase 2

---

## Key Pages / Routes

- `/` — Landing / redirect to dashboard if authenticated
- `/dashboard` — Case list (active, completed, exported) with search/filter
- `/dashboard/cases/new` — New case creation form (case type, room, operator, nurse)
- `/dashboard/cases/[caseId]` — **Core view:** split-panel with sidebar nav
  - `/dashboard/cases/[caseId]/timeline` — Chronological event timeline (default tab)
  - `/dashboard/cases/[caseId]/capture` — Event capture panel (voice, OCR upload, manual entry)
  - `/dashboard/cases/[caseId]/devices` — Device tracking list
  - `/dashboard/cases/[caseId]/note` — Generated procedure note preview
  - `/dashboard/cases/[caseId]/export` — PDF export (blocked if unconfirmed fields)
- `/dashboard/security` — Admin security monitoring dashboard (built into template)

---

## Note Generation Logic

The note builder consumes **confirmed events only**, ordered by `eventTime`:

**Sections:**
1. **Header** — Case type, room, operator, nurse, date/time
2. **Timeout** — Pre-procedure safety verification
3. **Access & Sedation** — Vascular access sites, sedation checks, medications
4. **Hemodynamics** — Pressure readings (AO, LV, RA, RV, PA, PCWP) from confirmed snapshots
5. **Devices** — All confirmed implanted devices with manufacturer, size, lot, expiration
6. **Vitals** — Confirmed vitals snapshots over time
7. **Complications** — Any adverse events (or "None documented")
8. **Disposition** — Case completion status

**Missing-section policy:** Omit empty sections entirely (do not show "Not documented" placeholders).

**Output format:** Epic/EHR-compatible structured plaintext.

---

## Demo Mode

- **Default: ON** (`DEMO_MODE` environment variable in Doppler, default `true`)
- Auto-wipe cases after configurable interval (default 24h)
- De-identified sample fixtures loaded on first run
- One-button wipe: mutation to purge all case data for a demo case
- When demo mode is on, a persistent banner shows at top: "DEMO MODE — No real patient data"

---

## Success Criteria (MVP is done when...)

- [ ] Nurse can create a case and see it on the dashboard
- [ ] Nurse can add events via manual entry and they appear on the timeline
- [ ] Nurse can upload an image and see OCR-extracted values as unconfirmed events
- [ ] Nurse can push-to-talk and see ASR-transcribed events on timeline
- [ ] Nurse can review, edit, and confirm each unconfirmed event
- [ ] Confirmed events generate a structured plaintext procedure note
- [ ] PDF export is blocked if any OCR/ASR fields remain unconfirmed
- [ ] PDF export succeeds when all fields are confirmed
- [ ] Full audit trail logs every create/update/confirm/delete action
- [ ] Demo mode is ON by default with auto-wipe and banner
- [ ] Auth works — Clerk sign up, sign in, protected routes
- [ ] Deploys to staging without errors
- [ ] No `.env.local` in repo

---

## Out of Scope

- Diagnostic waveform interpretation or analysis
- Autonomous billing/coding decisions (advisory only, Phase 2)
- Always-on ambient listening or continuous microphone
- Multi-hospital deployment or cloud hosting beyond Vercel
- Offline-first sync with conflict resolution
- Direct EHR/Epic API integration
- Native iPad app (this is an iPad-optimized web app)
- HIPAA encryption at rest (MVP assumes demo/dev environment)

---

## Security & Compliance

| Constraint | Implementation |
|---|---|
| No hallucinated values | OCR/ASR fields `unconfirmed` by default; exports require 100% confirmation |
| Demo data isolation | Demo mode ON by default; auto-wipe; persistent banner |
| Audit trail | Full before/after JSONB logging on all event modifications via `auditLog` table |
| No ambient mic | Push-to-talk manual button only; no always-on audio path |
| Advisory-only billing | Phase 2 only; mandatory disclaimer; confidence scores |
| Auth required | Clerk authentication on all routes; no anonymous access |
| API security | All API routes wrapped with `withRateLimit`; sensitive routes with `withCsrf` |
| Secrets management | Doppler only — no `.env.local`, no hardcoded keys |

---

## Claude Code Instructions

1. Clone `https://github.com/harperaa/secure-vibe-coding-OS.git` as the base
2. Follow `mswlab-project-setup` skill phases in order
3. Use Doppler for all secrets — no `.env.local`
4. Implement the Core User Flow above as the acceptance test
5. Match the UI Direction section for all visual decisions
6. Use `withRateLimit` on all API routes minimum
7. Convex schema must match the Data Model section exactly
8. All OCR/ASR-derived data must default to `confirmed: false`
9. PDF export must call `assertNoUnconfirmed()` before generating
10. Demo mode must be ON by default with visible banner
11. Run `/retrospective` at end of each session
