# OSCE Practice Expansion — Engineering Summary

**Branch:** `main`
**Date:** February 2026
**Reviewer:** Human code reviewer

---

## Overview

This document summarizes the engineering work completed to expand the FCM Companion app with a full **OSCE (Objective Structured Clinical Examination) practice simulation**. The feature replaces the previous single-shot OSCE page with a structured three-phase workflow: **Door Prep → SOAP Note → AI Feedback**, along with session persistence, read-only review, and study aids.

---

## What Was Built

### Phase A — Door Prep

Students review door information (chief complaint, patient demographics, vitals) and build an initial differential diagnosis before entering the room. For each diagnosis they record:

- Planned history questions (free text)
- Physical exam maneuvers (autocomplete from 117-entry vocabulary)
- Confidence rating (1–5)

**Key files:**

| File | Purpose |
|------|---------|
| `src/app/(student)/osce/page.tsx` | Home page — case picker, session history |
| `src/app/(student)/osce/[sessionId]/door-prep/page.tsx` | Door Prep phase UI |
| `src/components/door-prep-diagnosis-row.tsx` | Per-diagnosis card with questions + PE maneuvers |
| `src/components/autocomplete-input.tsx` | Generic scored autocomplete (injectable search fn) |
| `src/components/osce-progress.tsx` | Three-step progress indicator (Door Prep → SOAP → Feedback) |
| `src/data/pe-maneuvers.json` | 117 PE maneuver entries |
| `src/data/pe-lookup.ts` | Scored search: exact abbrev 3.0, starts-with 2.0, substring 1.0 |
| `src/lib/use-osce-autosave.ts` | 500ms debounce autosave hook (PATCH to session API) |
| `src/app/api/osce-session/route.ts` | POST (create session), GET (list all user sessions) |
| `src/app/api/osce-session/[id]/route.ts` | GET (fetch), PATCH (update phase data) |
| `supabase/migration-osce-sessions.sql` | Database migration |

---

### Phase B — SOAP Note

After the encounter, students revise their differential with post-encounter data. For each diagnosis they:

- Map supporting evidence from the Subjective/Objective findings
- Build a diagnostic plan (autocomplete from 120-entry vocabulary)
- Build a therapeutic plan (autocomplete from 120-entry vocabulary)

The Subjective and Objective findings are loaded from a precomputed static file (see §Performance below). Students can highlight text in yellow or bold it to annotate key findings.

**Key files:**

| File | Purpose |
|------|---------|
| `src/app/(student)/osce/[sessionId]/soap-note/page.tsx` | SOAP Note phase UI |
| `src/components/revised-diagnosis-row.tsx` | Per-diagnosis card with evidence + plans |
| `src/components/evidence-mapper.tsx` | Finding extraction + toggle selection |
| `src/components/highlightable-text.tsx` | Select-to-highlight/bold annotation component |
| `src/data/diagnostic-tests.json` | 120 diagnostic test entries |
| `src/data/therapeutic-options.json` | 120 therapeutic option entries |
| `src/data/osce-soap-contexts.json` | Precomputed S/O for all 204 OSCE practice cases |
| `src/lib/osce-soap.ts` | S/O extraction logic + Claude prompt builder |
| `src/app/api/osce-soap-context/route.ts` | S/O lookup (static) + Claude fallback for FCM cases |
| `scripts/generate-soap-contexts.ts` | Build script: extracts S/O from all 204 cases |

---

### Phase C — Feedback

AI-generated attending-style feedback displayed after SOAP note submission. Uses a two-step approach: deterministic comparison first, then Claude narrative.

**Rubric categories scored:** Differential Diagnosis, History Taking, Physical Exam Selection, Diagnostic Workup, Treatment Planning

**Rating scale:** `excellent` → `good` → `developing` → `needs_work`

**Feedback sections:** Performance rubric, Strengths, Areas to Improve, Don't Miss (critical missed diagnoses)

**Key files:**

| File | Purpose |
|------|---------|
| `src/app/(student)/osce/[sessionId]/feedback/page.tsx` | Feedback display page |
| `src/components/rubric-score-card.tsx` | Color-coded rating card (green/blue/amber/muted) |
| `src/lib/osce-feedback.ts` | `compareOscePerformance()` + `buildOsceFeedbackPrompt()` |
| `src/app/api/osce-feedback/route.ts` | Calls Claude, caches result in session row |

---

## Database

**New table:** `fcm_osce_sessions`

```sql
CREATE TABLE fcm_osce_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES fcm_users(id) NOT NULL,
  case_id               UUID REFERENCES fcm_cases(id),
  practice_case_id      TEXT,
  case_source           TEXT NOT NULL CHECK (case_source IN ('scheduled','practice','custom')),
  door_prep             JSONB,
  door_prep_submitted_at TIMESTAMPTZ,
  soap_note             JSONB,
  soap_submitted_at     TIMESTAMPTZ,
  feedback              JSONB,
  feedback_generated_at TIMESTAMPTZ,
  status                TEXT NOT NULL DEFAULT 'door_prep'
                          CHECK (status IN ('door_prep','soap_note','completed')),
  started_at            TIMESTAMPTZ DEFAULT now(),
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);
```

All session data (door prep differential, SOAP note, AI feedback) is stored as JSONB. Permissive RLS policy matches existing tables. Indexes on `user_id` and `case_id`.

---

## Session History & Review

All completed sessions are persisted and viewable. The OSCE home page shows:

- **Continue Session** — in-progress sessions with resume links
- **Past Sessions** — completed sessions with rubric dot summary, date, first strength; shows 5 most recent with "Show all N sessions" toggle
- **Your Cases** — FCM scheduled cases the student has submitted
- **Practice Library** — all OSCE-format practice cases

### Read-Only Review

Completed sessions can be reviewed in full. The progress bar at the top (Door Prep → SOAP Note → Feedback) is **clickable** — tapping any step navigates to that phase's read-only view. The active step is highlighted with a ring; all other completed steps show as filled.

In read-only mode:
- A "Viewing submitted ... — read only" banner replaces the instructions
- Diagnosis rows start **collapsed**, showing a compact summary (e.g. "3 questions · 2 PE maneuvers")
- Tapping a row **expands** it to show all submitted answers as read-only text/badges
- Add/edit/remove controls are hidden
- Autosave is disabled

---

## Performance

**Root cause fix:** All 204 OSCE practice cases store data under `full_case_data.OSCE_Examination`, but the original extractor looked at the top level. This caused every S/O load to fail and fall through to Claude (which was also timing out).

**Fix:** `scripts/generate-soap-contexts.ts` runs at build time, extracts S/O from all 204 cases deterministically, and writes `src/data/osce-soap-contexts.json`. The API route does a direct JSON key lookup — **no network call, no Claude, instant response** for all practice cases. Claude fallback is preserved for scheduled FCM cases (which have empty `full_case_data`).

To regenerate after adding new cases:
```bash
npm run data:soap
```

---

## UX Details

| Feature | Detail |
|---------|--------|
| Door card | Sticks to top while scrolling; shows patient name, age, gender independently (not requiring both) |
| Demographics | Patient name shown for scheduled FCM cases; age/gender shown even if only one is available |
| S/O load failure | Inline error with Retry button; SOAP note still fully submittable |
| Text annotation | Select text in S/O sections → floating toolbar → highlight (yellow) or bold; section labels auto-bolded |
| Progress bar | Updates to reflect actual phase being viewed during review; all connector lines filled for completed sessions |

---

## Files Changed

### New Files (30)

```
supabase/migration-osce-sessions.sql
src/types/osce.ts
src/data/pe-maneuvers.json
src/data/pe-lookup.ts
src/data/diagnostic-tests.json
src/data/diagnostic-test-lookup.ts
src/data/therapeutic-options.json
src/data/therapeutic-lookup.ts
src/data/osce-soap-contexts.json
src/components/autocomplete-input.tsx
src/components/osce-progress.tsx
src/components/door-prep-diagnosis-row.tsx
src/components/revised-diagnosis-row.tsx
src/components/evidence-mapper.tsx
src/components/rubric-score-card.tsx
src/components/highlightable-text.tsx
src/lib/use-osce-autosave.ts
src/lib/osce-soap.ts
src/lib/osce-feedback.ts
src/app/(student)/osce/page.tsx            ← replaced
src/app/(student)/osce/[sessionId]/page.tsx
src/app/(student)/osce/[sessionId]/door-prep/page.tsx
src/app/(student)/osce/[sessionId]/soap-note/page.tsx
src/app/(student)/osce/[sessionId]/feedback/page.tsx
src/app/api/osce-session/route.ts
src/app/api/osce-session/[id]/route.ts
src/app/api/osce-feedback/route.ts
src/app/api/osce-soap-context/route.ts
scripts/generate-soap-contexts.ts
```

### Modified Files (3)

```
src/types/index.ts          — re-exports from osce.ts
src/app/(student)/layout.tsx — OSCE added to nav
supabase/schema.sql          — fcm_osce_sessions table definition
```

---

## How to Verify

1. Navigate to `/osce` — case picker loads with Practice Library and any scheduled cases
2. Start a practice case — session created in `fcm_osce_sessions`, navigates to Door Prep
3. Door Prep: demographics visible and sticky; add diagnoses with history questions + PE maneuvers; autosave on changes; submit advances to SOAP Note
4. SOAP Note: S/O loads instantly from static file; highlight text; map evidence; add diagnostic/therapeutic plans; submit advances to Feedback
5. Feedback: rubric scores, strengths, improvements, don't-miss items displayed
6. Return to `/osce` — completed session appears in Past Sessions with rubric dots
7. Tap a past session → Feedback page; tap "Door Prep" or "SOAP Note" in progress bar → read-only review; tap diagnoses to expand/collapse submitted answers
8. Check `fcm_osce_sessions` table in Supabase — all data persisted correctly

---

*Generated by Claude Sonnet 4.6 — FCM Companion OSCE Expansion*
