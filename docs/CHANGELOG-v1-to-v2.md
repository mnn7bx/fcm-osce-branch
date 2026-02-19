# FCM Companion — Development Log: v1 to v2.1

> **Project:** FCM Companion
> **Repository:** `uva-medical-design/fcm-companion`
> **Timeline:** February 18–19, 2026 (2 days)
> **Builder:** Matt Trowbridge + Claude Opus 4.6

---

## Inputs

### PRD Source
- **Document:** `2026-02-18-fcm-companion-prd-v1.md`
- **Authors:** HDS 2026 Student Team (Danielle, Derek, Matt N., Jocelyn, Kevin, Farah, Maddie) + Matt Trowbridge
- **Research base:** 2 journey mapping sessions, 1 guest speaker session (Brittany Sigler), 1 convergence workshop, 1 feature specification session — all during the Health Design Sprint at UVA SoM

### Core Problems Identified
1. **"The Spark is Dead"** — Students fill out VINDICATE worksheets as PDFs with no feedback or interactivity. They pad with implausible diagnoses to fill categories.
2. **"The Gap Erases Everything"** — Days pass between differential submission and FCM session. No re-engagement system exists.
3. **"The Re-entry is Cold"** — Students arrive at sessions unprepared with stale thinking.
4. **Coach Variability** — Different FCM coaches from different specialties emphasize different aspects, no standardized framework.

### Case Content
- 3 sample cases authored from scratch: chest pain (CV-001), abdominal pain (GI-001), back pain (MSK-001)
- Each with full answer keys including tiered differentials, VINDICATE categories, aliases, common/can't-miss flags, and key teaching points
- Real UVA cases available (`SMD 26 Cases and Note Templates.zip`, 17+ cases) but not yet integrated

### Technical Decisions Made Up Front
- **Next.js 16 + TypeScript + Tailwind v4** — consistent with HDS Workflow Tool stack
- **Supabase** — separate project from HDS Workflow Tool, `fcm_`-prefixed tables
- **No auth** — roster picker login via localStorage for speed of deployment
- **Mobile-first** — students use phones during FCM sessions
- **Anthropic SDK** — AI-generated narrative feedback on top of deterministic comparison

---

## v1 Build (Feb 18, evening)

### Commits
| Hash | Description |
|------|-------------|
| `3f2a336` | Initial Next.js scaffold |
| `299254d` | **feat: FCM Companion v1 — full 3-part system** |
| `518d6f2` | docs: Supabase setup guide + env example |

### What Shipped
**Student App (mobile-first):**
- Case list with schedule awareness (unlock/due dates per FCM group)
- Differential builder with VINDICATE single-select chips + autosave (500ms debounce)
- "Family Feud" feedback reveal — deterministic comparison first, then AI narrative via `claude-sonnet-4-5`
- Pre-session refresh view
- Notes with star/OSCE pearls/send-to-instructor
- Reference page (differential framework, VINDICATE, illness scripts)
- OSCE prep with text and voice modes (Web Speech API)

**Faculty Dashboard:**
- Case selector with submission stats
- Diagnosis frequency heat map
- VINDICATE coverage chart
- Student-flagged questions (anonymized)

**Admin Panel:**
- Feedback mode toggle (breadth / can't-miss / combined)
- Framework selector, semester settings
- Case library management

**Infrastructure:**
- 7 Supabase tables (`fcm_users`, `fcm_cases`, `fcm_schedule`, `fcm_submissions`, `fcm_notes`, `fcm_settings`, `fcm_osce_responses`)
- 3 seed cases with full answer keys
- 8 real students + 2 faculty seeded
- Schedule for Groups A/B

### Issues Encountered & Resolved

**Issue: Supabase client crashes during Vercel build**
- **Problem:** `createClient()` called at module level with env vars that aren't available during static build
- **Resolution:** 3 iterative fixes (`3be11df`, `2ed14de`, `067d59a`) — settled on placeholder URL fallback when env vars are missing at build time
- **Lesson:** Next.js 16 static generation runs server code without runtime env vars

---

## v2 Build (Feb 19, morning)

### Plan
Structured as 4 sprints based on testing the v1 app with real student interactions:

1. **Sprint 1 — Critical fixes:** AI feedback error handling, VINDICATE multi-select (was single-select), dashboard percentage calculation fix
2. **Sprint 2 — Autocomplete + notes:** Diagnosis autocomplete combobox (~70 entries with abbreviations), inline notes with debounce save, question-for-instructor flow
3. **Sprint 3 — UI polish:** Rename Reference→Resources, case list visual hierarchy improvements
4. **Sprint 4 — Navigation:** Bigger nav icons, explicit logout label

### Commits
| Hash | Description |
|------|-------------|
| `4950da5` | docs: system architecture with mermaid diagrams |
| `910ddb6` | **feat: v2 — student walkthrough feedback (9 improvements)** |

### Key Decisions

**VINDICATE multi-select (was single-select)**
- **Rationale:** Many diagnoses span multiple VINDICATE categories (e.g., pericarditis can be Infectious AND Autoimmune). Single-select forced artificial choices.
- **Implementation:** New `vindicate_categories: string[]` field with backward compat for old `vindicate_category: string` field. Both read paths preserved.

**Diagnosis autocomplete**
- **Rationale:** Students were typing free-text diagnoses with inconsistent naming, causing silent match failures against answer keys.
- **Implementation:** ~70 entries with canonical terms + abbreviation aliases, priority-scored search (exact abbrev > starts-with > substring).
- **Triggered at 1+ characters** (changed in v2.1).

**Inline notes (moved from separate page)**
- **Rationale:** Students didn't navigate to a separate Notes page during case work. Inline placement keeps notes in context.
- **Implementation:** Debounced autosave (1s) to `/api/notes`, with "send to instructor" as a separate action.

---

## v2.1 Build (Feb 19, midday)

### Plan — Pedagogical Upgrade
A literature review before the Dr. Lounsbury demo revealed several gaps in v2's autocomplete and feedback design. Evidence-based improvements applied:

| Gap | Research Source | Fix |
|-----|---------------|-----|
| Autocomplete triggers too early (1 char) — undermines recall | Sam et al., 2020 (VSAQ research): free-text recall > recognition | Delay to 2+ characters |
| No abbreviation teaching moment | IMO principle: bridge vernacular to formal terminology | Show matched abbreviation in dropdown |
| Silent match failures (e.g., "Pulmonary Embolus" vs "Pulmonary Embolism") | — | Fuzzy matching via Levenshtein (edit distance ≤ 2 or >85% similarity) |
| No illness script scaffolding | Schmidt-Boshuizen (2007): M1s need explicit analytical reasoning practice | Collapsible "Why this diagnosis?" reasoning field |
| Feedback reveals everything at once | Olson et al. (2021) Diagnosis Learning Cycle: show performance before answers | Two-phase reveal: counts first, expert differential on click |
| Autocomplete missing case-relevant terms | Seed data answer keys had diagnoses not in lookup | Added ~15 entries from case answer keys |

### Commits
| Hash | Description |
|------|-------------|
| `5a2ec4d` | **feat: v2.1 — pedagogical upgrade** |
| `dfd5783` | fix: update model ID (first attempt — wrong date suffix) |
| `a6958da` | fix: correct model ID to `claude-sonnet-4-6` |
| `073991e` | chore: add dotenv devDependency |
| `da6309e` | docs: update CLAUDE.md model reference |

### Files Changed (v2.1 pedagogical upgrade)
| File | Changes |
|------|---------|
| `src/app/(student)/cases/[caseId]/page.tsx` | Autocomplete delay (2+ chars), dropdown abbreviation display, reasoning field in DiagnosisRow |
| `src/data/diagnosis-lookup.ts` | New `DiagnosisSearchResult` return type, ~15 added diagnoses from case answer keys |
| `src/lib/feedback.ts` | Inline Levenshtein + `fuzzyMatch()` helper, fuzzy fallback in `compareDifferential()` |
| `src/types/index.ts` | Added `fuzzy_matched?: { student: string; matched_to: string }[]` to `FeedbackResult` |
| `src/app/(student)/cases/[caseId]/feedback/page.tsx` | Two-phase reveal with `showExpert` state toggle, summary counts, fuzzy match display |

### Diagnoses Added to Lookup
From CV-001: Acute Pericarditis, Rib Contusion
From GI-001: Acute Cholecystitis (renamed from Cholecystitis), Choledocholithiasis with Cholangitis, Biliary Pancreatitis, Biliary Colic, Gastritis
From MSK-001: Piriformis Syndrome, Mechanical Low Back Pain, Spondylolisthesis, Vertebral Osteomyelitis, Spinal Tumor/Metastasis
Updated: Lumbar Disc Herniation (added radiculopathy/sciatica aliases), Mesenteric Ischemia (added alias)

### Issues Encountered & Resolved

**Issue: Anthropic API returning 404 after v2.1 deploy**
- **Symptom:** "Failed to generate feedback" on submit
- **Root cause:** Model ID `claude-sonnet-4-5-20250514` no longer exists in the Anthropic API
- **First fix attempt:** Changed to `claude-sonnet-4-6-20250725` — still 404 (date suffix was wrong)
- **Resolution:** Queried `/v1/models` endpoint to find valid IDs. Correct ID is `claude-sonnet-4-6` (no date suffix). Applied to both `/api/feedback` and `/api/osce` routes.
- **Lesson:** Always verify model IDs against the API's model list. Anthropic model IDs don't always follow the `name-YYYYMMDD` pattern — some use bare names.

---

## Architecture Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth | None (localStorage roster picker) | Speed to deploy for 10-person pilot; real auth planned for v3 |
| Database | Supabase with `fcm_` prefix | Familiar stack, separate project from HDS Workflow Tool |
| AI model | `claude-sonnet-4-6` | Fast enough for feedback generation, good prose quality |
| Feedback design | Deterministic comparison first, AI narrative on top | Ensures reproducible scoring; AI adds pedagogical color |
| Autocomplete | Custom search with abbreviation awareness | No external dependency; medical abbreviation matching is domain-specific |
| Fuzzy matching | Inline Levenshtein (~15 lines) | No new dependencies; simple and sufficient for spelling variants |
| Two-phase feedback | Client-side toggle (no server change) | Same data, different presentation; promotes self-assessment before answer reveal |
| VINDICATE storage | Array field with backward compat | Avoids migration; reads both old `string` and new `string[]` formats |

---

## What's Next (Not Yet Built)
- Real UVA case integration (17+ cases from `SMD 26 Cases and Note Templates.zip`)
- Automatic "quote smoother" for student quotes
- Authentication (Supabase Auth or UVA SSO)
- Spaced repetition / re-engagement between sessions
- Faculty coach view with per-student reasoning visibility
- Voice-to-differential (speech input for OSCE prep)
