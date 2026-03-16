# Skill: mswlab-claude-code-starter

**Used in:** Claude.ai chat (generates a prompt for Claude Code)  
**Purpose:** Creates the exact prompt to paste into Claude Code that bridges the PRD to the build  
**When to use:** After PRD.md is complete and committed to the repo root  

---

## Overview

This skill is the handoff bridge. After the PRD is finished in Claude.ai, this skill generates a copy-paste prompt for Claude Code. Claude Code reads the prompt, reads the PRD.md, and begins executing the project setup and build in order.

---

## The Starter Prompt (Template)

The following is what gets generated (with project-specific values filled in):

---

```
You are starting a new MSWLab project. Read and follow these instructions exactly.

## Your Mission
Build the application described in PRD.md in this repository root.

## Step 1 — Read First
Before writing any code, read these files in order:
1. `PRD.md` (in this repo root) — this is what you're building
2. The `mswlab-project-setup` skill — this is how you set it up

## Step 2 — Project Setup
Follow the `mswlab-project-setup` skill Phase Checklist in order:

Phase 0: Confirm app name, domain, database choice from PRD.md
Phase 1: Clone secure-vibe-coding-OS, re-init git, create staging branch
Phase 2: Set up Doppler (doppler import → doppler setup → fill dev secrets)
Phase 3: Set up Clerk dev instance, JWT template, billing
Phase 4: Set up Convex, webhook
Phase 5: Connect Doppler → Vercel (3 syncs: dev/preview/prd)
Phase 6: Vercel deployment + override build command
Phase 7: DNS if domain is ready (can skip for now)
Phase 8: Verify locally with `doppler run -- npm run dev`

Do NOT create .env.local. Use `doppler run --` for everything.

## Step 3 — Build the App
Once setup is complete, build the Core User Flow from PRD.md.

Work in this order:
1. Database schema first (convex/schema.ts or db/schema.ts)
2. Core data queries/mutations
3. Auth-protected layout and routing
4. Pages in order of the Core User Flow
5. API routes (wrap ALL with withRateLimit minimum)
6. UI polish to match the PRD UI Direction

## Step 4 — Quality Gates
Before calling any feature done:
- [ ] TypeScript compiles with no errors (`npm run tsc --noEmit`)
- [ ] ESLint passes (`npm run lint`)
- [ ] All API routes use `withRateLimit` at minimum
- [ ] No hardcoded secrets anywhere (use Doppler)
- [ ] Push to staging branch and verify it deploys

## Step 5 — End of Session
Run `/retrospective` to capture what was built and what was learned.

## Non-Negotiables
- Never create .env.local — Doppler only
- Never commit secrets to git
- Never skip withRateLimit on API routes
- Never merge to main without testing staging first
- Build command in Vercel: `npx convex deploy --cmd 'npm run build'`
- CLERK_FRONTEND_API_URL includes https:// prefix

## Project Details (from PRD)
- App name: {APP_NAME}
- Domain: {DOMAIN}
- Database: {CONVEX or NEON}
- Primary user: {PRIMARY_USER}
- Core loop: {ONE_SENTENCE_SUMMARY}

Start with Phase 0 and confirm the project details before writing any code.
```

---

## How to Use

1. After PRD.md is committed to the repo root, ask Claude.ai to generate the starter prompt
2. Claude fills in the `{PLACEHOLDERS}` from the PRD content
3. Open Claude Code in your terminal: `claude` (in the project directory)
4. Paste the entire generated prompt as your first message
5. Claude Code reads the PRD and begins setup

---

## Why a Separate Handoff Prompt?

Claude Code starts fresh — it doesn't remember the conversation from Claude.ai. The starter prompt packages everything Claude Code needs to know into a single message:
- What to build (from PRD.md reference)
- How to build it (skill reference)
- What order to work in
- What's non-negotiable

Without this, Claude Code would need to be guided step by step through setup, creating risk of skipping phases or deviating from MSWLab standards.

---

[← Back to Overview](../README.md)
