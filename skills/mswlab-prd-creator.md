# Skill: mswlab-prd-creator

**Used in:** Claude.ai chat  
**Purpose:** Guides a structured conversation from raw idea to a finalized `PRD.md` file  
**Estimated time:** 15–30 minutes of back-and-forth  

---

## Overview

This skill turns a vague app idea into a structured Product Requirements Document (PRD) through a 7-stage conversation. The PRD it produces is specifically formatted for Claude Code to read and execute — it's the contract between the design conversation and the build phase.

Supporting skills it draws on:
- `idea-validator` — honest assessment of feasibility and scope
- `launch-planner` — MVP scoping and what to cut
- `design-guide` — UI/UX decisions and visual direction

---

## The 7 Stages

### Stage 1 — The One-Sentence Pitch

Claude asks: *"Describe the app in one sentence: who uses it and what's the one thing they do in it."*

This is the north star. Everything else must serve this sentence.

**Good answers:**
- "A cardiologist can view risk scores for all SNF patients in one dashboard"
- "A front desk coordinator can schedule prior auth requests without calling the insurer"

**Answers that need refinement:**
- "It does scheduling and billing and messaging" → too many things, pick one
- "Doctors can use it" → which doctors, for what?

Claude will push back until the pitch is crisp before moving forward.

---

### Stage 2 — Validate the Idea

Claude runs an honest feasibility assessment:
- Does this already exist (Epic, Salesforce Health Cloud, etc.)?
- What's the unfair advantage for MSWLab specifically?
- Is this internal tooling or external-facing?
- Is there a real user ready to test on day one?

If the idea has serious problems, Claude surfaces them and offers to refocus scope. This is intentionally direct — better to know now than after 40 hours of Claude Code.

---

### Stage 3 — Core User Flow (MVP only)

Claude asks: *"Walk me through what the user does from the moment they open the app to the moment they've accomplished the core task."*

The result is a numbered step-by-step flow. Then it applies MVP constraints:
- Maximum 1-week build in Claude Code
- One core loop only — everything else is Phase 2
- If the flow has more than 5 steps, something gets cut

Each step is evaluated: required for core loop, or nice-to-have? Everything non-essential moves to a "Phase 2" list.

---

### Stage 4 — Data Model

Claude asks: *"What are the main 'things' this app tracks? What does each thing have?"*

For a Convex app, this becomes the schema. For Neon, these become tables.

**Example output:**
```
Patient: name, MRN, facility, risk_score, last_visit
Facility: name, address, assigned_provider
Alert: patient_id, type, severity, created_at, resolved
```

If there are more than 4-5 entities for an MVP, Claude pushes back. Over-engineering at the data model stage is the most common cause of scope creep.

---

### Stage 5 — UI Direction

Claude uses the `design-guide` skill to establish:
- Color palette: dark navy (ProviderLoop style) / clean white / other
- Primary accent color
- Dense data-heavy vs spacious card layout
- Mobile required or desktop-first?
- 2-3 adjectives that capture the target feel

These adjectives and choices go directly into the PRD and Claude Code uses them to make all visual decisions.

---

### Stage 6 — Tech Stack Confirmation

The stack is standardized. Claude confirms any deviations:

| Layer | Default | Override? |
|---|---|---|
| Framework | Next.js 15 + App Router | Rarely |
| Auth | Clerk | Only if truly no auth needed |
| Database | Convex | Neon+Drizzle for complex SQL |
| Deployment | Vercel | Never |
| Secrets | Doppler | Never |
| Base template | secure-vibe-coding-OS | Never |

---

### Stage 7 — Write the PRD.md

Claude generates the complete `PRD.md` using this exact template:

---

## PRD.md Template

```markdown
# PRD: {App Name}
*MSWLab.ai — {date}*
*Status: Ready for Claude Code*

---

## One-Line Summary
{The one-sentence pitch}

## Problem
{2-3 sentences on what pain this solves and for whom}

## Users
- **Primary:** {role}
- **Secondary:** {role if applicable}

## Core User Flow (MVP)
1. {Step 1}
2. {Step 2}
3. {Step 3}

## Phase 2 (not in MVP)
- {Feature cut from MVP}
- {Feature cut from MVP}

---

## Data Model

### {Entity 1}
- `id` — string
- `{field}` — {type}
- `created_at` — timestamp

---

## UI Direction
- **Feel:** {2-3 adjectives}
- **Color palette:** {primary + accent}
- **Layout:** {card-based / table-heavy / dashboard}
- **Mobile:** {required / desktop-first}
- **Reference:** {any app with the right feel}

---

## Tech Stack
- **Framework:** Next.js 15 + App Router + TypeScript
- **Auth:** Clerk
- **Database:** Convex
- **Deployment:** Vercel (main + staging branches)
- **Secrets:** Doppler (dev + prd configs)
- **Base:** secure-vibe-coding-OS template
- **Security:** CSRF protection, rate limiting, input validation (built in)

---

## Key Pages / Routes
- `/` — {description}
- `/dashboard` — {description}

---

## Success Criteria (MVP done when...)
- [ ] {User can do X}
- [ ] {User can do Y}
- [ ] Deploys to staging.{domain}.com without errors

---

## Out of Scope
- {Anything explicitly NOT in MVP}

---

## Claude Code Instructions
1. Clone `https://github.com/harperaa/secure-vibe-coding-OS.git` as the base
2. Follow `mswlab-project-setup` skill phases in order
3. Use Doppler for all secrets — no `.env.local`
4. Implement the Core User Flow above as the acceptance test
5. Match the UI Direction section for all visual decisions
6. Use `withRateLimit` on all API routes minimum
7. Run `/retrospective` at end of each session
```

---

## Quality Checklist Before Handoff

- [ ] One-sentence summary is crisp — no "and also"
- [ ] MVP core flow has ≤5 steps
- [ ] Data model has ≤5 entities
- [ ] UI direction has specific adjectives and colors
- [ ] Tech stack deviations (if any) explicitly noted
- [ ] Success criteria are testable
- [ ] Phase 2 section captures everything cut
- [ ] "Claude Code Instructions" section present

---

[← Back to Overview](../README.md)
