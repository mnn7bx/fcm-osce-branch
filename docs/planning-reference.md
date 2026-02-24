# FCM Companion — Planning Reference

> Comprehensive codebase reference for AI-assisted planning and implementation.

---

## Project Overview

**FCM Companion** is a mobile-first web app for UVA medical students to practice differential diagnosis during their Foundations of Clinical Medicine (FCM) course. Three components: Student App, Faculty Dashboard, Admin Panel.

- **Live:** https://fcm-companion.vercel.app
- **Version:** v5 (Feb 20 PM)
- **Deploy:** Vercel (auto-deploy from main)

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16, TypeScript, Tailwind v4 |
| UI | shadcn/ui (new-york style), Lucide icons, Radix primitives |
| Database | Supabase (project `zuksjgrkxyjpkatxeebg`, `fcm_` prefixed tables) |
| AI | Anthropic SDK (`claude-sonnet-4-6`, max 400-500 tokens) |
| PWA | Serwist service worker (production only, webpack mode) |
| Deploy | Vercel (auto-deploy from main) |

---

## Directory Structure

```
src/
├── app/
│   ├── page.tsx                          # Roster picker login
│   ├── layout.tsx                        # Root layout with UserProvider
│   ├── globals.css                       # Design system (Tailwind v4, CSS vars, teal accent)
│   ├── (student)/                        # Student route group
│   │   ├── layout.tsx                    # Mobile bottom nav + desktop sidebar
│   │   ├── cases/
│   │   │   ├── page.tsx                  # Cases dashboard (scheduled, timeline, refresh urgency)
│   │   │   └── [caseId]/
│   │   │       ├── page.tsx              # Case builder (diagnosis input, reorder, confidence, reasoning)
│   │   │       ├── feedback/page.tsx     # AI feedback (bullets + prose, expert differential, topic voting)
│   │   │       ├── refresh/page.tsx      # Full quiz (7+ cards)
│   │   │       └── quick-refresh/page.tsx # Quick quiz (3-4 cards, ~60s)
│   │   ├── practice/
│   │   │   ├── page.tsx                  # Practice library (324 cases, filter, search, pagination)
│   │   │   └── [practiceId]/page.tsx     # Practice case builder
│   │   ├── notes/page.tsx               # Student notes management
│   │   ├── osce/page.tsx                # OSCE practice (voice/text, Claude evaluation)
│   │   └── reference/page.tsx           # Resources page
│   ├── (faculty)/                        # Faculty route group
│   │   ├── layout.tsx                    # Faculty sidebar
│   │   ├── dashboard/page.tsx           # Case analytics dashboard
│   │   ├── present/page.tsx             # Projectable 4-slide presentation (15s auto-advance)
│   │   └── admin/page.tsx               # Case management (create/edit)
│   └── api/
│       ├── feedback/route.ts            # POST: Deterministic comparison + AI narrative
│       ├── practice-feedback/route.ts   # POST: Practice case feedback (no Supabase FK)
│       ├── submissions/route.ts         # POST: Upsert differential submission
│       ├── notes/route.ts               # POST: Upsert notes (starred, flagged)
│       ├── dashboard/route.ts           # GET: Faculty analytics for a case
│       ├── osce/route.ts                # POST: OSCE evaluation via Claude
│       ├── sentiments/route.ts          # POST/GET: Student confidence tracking
│       └── session-captures/route.ts    # POST/GET: Post-session takeaways
├── components/
│   ├── diagnosis-input.tsx              # Autocomplete (3-char threshold, scored matching)
│   ├── diagnosis-row.tsx                # Diagnosis card (reorder, confidence, reasoning)
│   ├── confidence-rating.tsx            # 1-5 circle picker
│   ├── feedback-narrative.tsx           # AI feedback renderer (bullet/prose)
│   ├── quiz-card-renderer.tsx           # Recall, T/F, MC card components
│   └── ui/                              # shadcn/ui: button, card, input, textarea, select, label, badge, dialog
├── lib/
│   ├── supabase.ts                      # Client + server Supabase initialization
│   ├── user-context.tsx                 # React context (localStorage-backed, no auth)
│   ├── feedback.ts                      # Deterministic comparison + AI prompt builder
│   ├── use-autosave.ts                  # 500ms debounce autosave hook
│   ├── case-timeline.ts                 # Refresh urgency computation
│   ├── quiz-cards.ts                    # Quiz card generation (full + quick modes)
│   └── utils.ts                         # cn() for Tailwind class merging
├── types/
│   ├── index.ts                         # All TypeScript interfaces
│   └── speech.d.ts                      # Web Speech API types
├── data/
│   ├── clinical-vocabulary.json         # 666 diagnoses (term, abbreviations, body_system, VINDICATE)
│   ├── practice-cases.json              # 324 cases from AgentClinic (919KB)
│   ├── practice-cases.ts                # Import wrapper
│   └── diagnosis-lookup.ts              # searchDiagnoses() with scored matching
└── sw.ts                                # Serwist service worker

scripts/
├── reset-test-data.ts                   # Clear submissions/notes/OSCE via RPC
├── process-agentclinic.ts               # Parse AgentClinic JSONL → practice-cases.json
├── expand-diagnoses.ts                  # Extract diagnoses from practice cases
├── generate-vocabulary.ts               # Regenerate clinical-vocabulary.json
├── build-vocabulary.ts                  # Claude API-powered vocabulary expansion
└── import-uva-cases.ts                  # Parse UVA case files → SQL INSERTs

supabase/
├── schema.sql                           # 10 tables, RLS, indexes
├── migration-v5.sql                     # fcm_sentiments + fcm_session_captures
├── seed.sql                             # Demo data (7 users, 3 cases)
├── seed-test-cases.sql                  # Additional test cases
├── reset-test-data.sql                  # RPC function
└── README.md                            # Setup guide

public/
├── manifest.json                        # PWA manifest (standalone, teal theme)
└── icons/                               # 192, 512, maskable-512
```

---

## API Routes — Detailed Signatures

### POST /api/feedback
**Purpose:** Generate feedback for scheduled case submissions.
**Input:** `{ user_id: UUID, case_id: UUID }`
**Process:**
1. Fetch submission + case + settings from Supabase
2. `compareDifferential()` — match student diagnoses against answer key (fuzzy matching: Levenshtein distance ≤2 for terms ≥5 chars, or similarity >0.85)
3. `buildFeedbackPrompt()` — structured prompt with VINDICATE coverage
4. Claude Sonnet 4.6 (max 500 tokens) → categorized bullets (Strength/Consider/Can't-miss)
5. Update submission with feedback JSON + timestamp
**Output:** `{ feedback: FeedbackResult }`
**Errors:** 503 (no API key), 400 (missing params), 404 (not found)

### POST /api/practice-feedback
**Purpose:** Feedback for practice cases (no Supabase FK dependency).
**Input:** `{ diagnoses: string[], correct_diagnosis: string, chief_complaint: string, patient_age?: number, patient_gender?: string }`
**Process:** Check if student included correct diagnosis (case-insensitive substring) → Claude narrative (max 400 tokens, 3-5 bullets)
**Output:** `{ narrative: string, correct_diagnosis: string, student_got_it: boolean }`

### POST /api/submissions
**Purpose:** Upsert student differential submission.
**Input:** `{ user_id: UUID, case_id: UUID, diagnoses: DiagnosisEntry[], status: "draft"|"submitted"|"resubmitted" }`
**Logic:** Upsert on `(user_id, case_id)`. Sets `submitted_at` when status="submitted".
**Output:** `{ submission: FcmSubmission }`

### POST /api/notes
**Purpose:** Upsert student notes.
**Input:** `{ user_id: UUID, case_id: UUID, content?: string, is_starred?: boolean, is_sent_to_instructor?: boolean }`
**Special:** `[TOPIC VOTE]` prefix + `is_sent_to_instructor: true` = topic vote
**Output:** `{ note: FcmNote }`

### GET /api/dashboard?case_id={id}
**Purpose:** Faculty analytics for a single case.
**Returns:**
- `submission_count`, `total_students`
- `diagnosis_frequency` — sorted by student count
- `vindicate_coverage` — per-category student counts
- `cant_miss_rate` — % hitting can't-miss diagnoses
- `cant_miss_details` — per-diagnosis hit rates
- `vindicate_gaps` — categories at 0%
- `diagnosis_by_tier` — most_likely/moderate/less_likely/unlikely_important
- `sentiment_summary` — {confident, uncertain, lost}
- `suggested_focus` — heuristic teaching opportunities
- `session_captures` — anonymized takeaways
- `flagged_questions` — instructor-flagged notes
- `topic_votes` — aggregated votes

### POST /api/osce
**Purpose:** Evaluate OSCE responses with Claude.
**Input:** `{ user_id: UUID, case_id: UUID, response_content: string, response_type: "text"|"voice" }`
**Output:** `{ evaluation: string, response: OsceResponse }`

### POST/GET /api/sentiments
**POST Input:** `{ user_id: UUID, case_id: UUID, sentiment: "confident"|"uncertain"|"lost" }`
**GET Query:** `?user_id={id}&case_id={id}`

### POST/GET /api/session-captures
**POST Input:** `{ user_id: UUID, case_id: UUID, takeaway: string }`
**GET Query:** `?user_id={id}&case_id={id}`

---

## TypeScript Types (`src/types/index.ts`)

```typescript
type UserRole = "student" | "instructor" | "admin"

interface FcmUser {
  id: string; name: string; email: string | null
  role: UserRole; fcm_group: string | null; year_level: string
  created_at: string
}

interface DiagnosisEntry {
  diagnosis: string
  vindicate_categories?: string[]
  vindicate_category?: string          // deprecated
  reasoning?: string
  confidence?: number                  // 1-5
  sort_order: number
}

interface AnswerKeyEntry {
  diagnosis: string
  tier: "most_likely" | "moderate" | "less_likely" | "unlikely_important"
  vindicate_category: string
  is_common: boolean; is_cant_miss: boolean
  aliases: string[]; likelihood?: string
}

interface PracticeCase {
  id: string; source: string; title: string
  chief_complaint: string
  patient_age: number | null; patient_gender: string | null
  vitals: Record<string, string>
  body_system: string | null; difficulty: string
  correct_diagnosis: string
  full_case_data: Record<string, unknown>
  has_structured_exam: boolean
}

interface FcmCase {
  id: string; case_id: string; title: string
  chief_complaint: string
  patient_name: string | null; patient_age: number | null; patient_gender: string | null
  vitals: Record<string, string>
  body_system: string | null; difficulty: string
  differential_answer_key: AnswerKeyEntry[]
  vindicate_categories: string[]; key_teaching_points: string[]
  full_case_data: Record<string, unknown>
  is_active: boolean; sort_order: number
  created_at: string; updated_at: string
}

interface FcmSchedule {
  id: string; case_id: string; fcm_group: string | null
  week_label: string; unlock_date: string; due_date: string
  session_date: string; semester: string
}

interface FcmSubmission {
  id: string; user_id: string; case_id: string
  diagnoses: DiagnosisEntry[]
  status: "draft" | "submitted" | "resubmitted"
  submitted_at: string | null
  feedback: FeedbackResult | null; feedback_generated_at: string | null
  created_at: string; updated_at: string
}

interface FeedbackResult {
  tiered_differential: {
    most_likely: string[]; moderate: string[]
    less_likely: string[]; unlikely_important: string[]
  }
  common_hit: string[]; common_missed: string[]
  cant_miss_hit: string[]; cant_miss_missed: string[]
  vindicate_coverage: Record<string, boolean>
  diagnosis_categories?: Record<string, string>
  unmatched: string[]
  fuzzy_matched?: { student: string; matched_to: string }[]
  ai_narrative: string; feedback_mode: string
}

interface FcmNote {
  id: string; user_id: string; case_id: string
  content: string; is_starred: boolean; is_sent_to_instructor: boolean
  created_at: string; updated_at: string
}

interface FcmSettings {
  id: string; key: string; value: unknown
  updated_by: string | null; updated_at: string
}

interface OsceResponse {
  id: string; user_id: string; case_id: string
  response_type: "text" | "voice"; response_content: string | null
  duration_seconds: number | null; evaluation: Record<string, unknown>
  created_at: string
}

interface FcmQuizScore {
  id: string; user_id: string; case_id: string
  score: number; total: number; quiz_mode: "full" | "quick"
  completed_at: string
}

// VINDICATE categories
const VINDICATE_CATEGORIES = [
  { key: "V", label: "Vascular" },
  { key: "I", label: "Infectious" },
  { key: "N", label: "Neoplastic" },
  { key: "D", label: "Degenerative" },
  { key: "I2", label: "Iatrogenic/Intoxication" },
  { key: "C", label: "Congenital" },
  { key: "A", label: "Autoimmune/Allergic" },
  { key: "T", label: "Traumatic" },
  { key: "E", label: "Endocrine/Metabolic" },
]
type VindicateKey = typeof VINDICATE_CATEGORIES[number]["key"]
```

---

## Database Schema (Supabase)

### Tables

| Table | Key Columns | Constraints |
|-------|------------|-------------|
| `fcm_users` | id, name, email, role, fcm_group, year_level | email UNIQUE |
| `fcm_cases` | id, case_id, title, chief_complaint, differential_answer_key (JSONB), vindicate_categories (JSONB), key_teaching_points (JSONB), full_case_data (JSONB) | case_id UNIQUE |
| `fcm_schedule` | id, case_id (FK), fcm_group, week_label, unlock_date, due_date, session_date, semester | UNIQUE(case_id, fcm_group, semester) |
| `fcm_submissions` | id, user_id (FK), case_id (FK), diagnoses (JSONB), status, feedback (JSONB) | UNIQUE(user_id, case_id) |
| `fcm_notes` | id, user_id (FK), case_id (FK), content, is_starred, is_sent_to_instructor | UNIQUE(user_id, case_id) |
| `fcm_settings` | id, key, value (JSONB), updated_by (FK) | key UNIQUE |
| `fcm_osce_responses` | id, user_id (FK), case_id (FK), response_type, response_content, evaluation (JSONB) | — |
| `fcm_quiz_scores` | id, user_id (FK), case_id (FK), score, total, quiz_mode | INDEX(user_id, case_id) |
| `fcm_sentiments` | id, user_id (FK), case_id (FK), sentiment | UNIQUE(user_id, case_id), CHECK(sentiment IN confident/uncertain/lost) |
| `fcm_session_captures` | id, user_id (FK), case_id (FK), takeaway | UNIQUE(user_id, case_id) |

**RLS:** All tables have permissive "Allow all" policies (prototype stage).

---

## Shared Components — Props

### DiagnosisInput
```typescript
{ onAdd: (name: string) => void, existingDiagnoses: string[], disabled?: boolean }
```
- Autocomplete dropdown at ≥3 chars, keyboard navigation, debounced search, prevents duplicates

### DiagnosisRow
```typescript
{
  entry: DiagnosisEntry, index: number, total: number, disabled?: boolean,
  onRemove, onMoveUp, onMoveDown, onUpdateConfidence, onUpdateReasoning
}
```

### ConfidenceRating
```typescript
{ value: number | undefined, onChange: (val: number) => void }
```

### FeedbackNarrative
```typescript
{ text: string }
```
- Auto-detects bullet format → color-coded categories (Strength=green, Consider=blue, Can't-miss=amber)

### QuizCardRenderer
- **RecallCard:** question → "Tap to reveal" → answer
- **TrueFalseCard:** statement → True/False buttons → feedback
- **MultipleChoiceCard:** question → A/B/C/D → explanation

---

## Library Exports

### `src/lib/feedback.ts`
```typescript
export function compareDifferential(studentDiagnoses: DiagnosisEntry[], answerKey: AnswerKeyEntry[]): Omit<FeedbackResult, "ai_narrative">
export function buildFeedbackPrompt(comparison: ..., chiefComplaint: string, feedbackMode: string): string
```

### `src/lib/use-autosave.ts`
```typescript
export type SaveStatus = "idle" | "saving" | "saved" | "error"
export function useAutosave(userId: string, caseId: string, diagnoses: DiagnosisEntry[], enabled?: boolean): { saveStatus: SaveStatus }
```

### `src/lib/case-timeline.ts`
```typescript
type RefreshUrgency = "none" | "calm" | "nudge" | "attention"
export function computeTimeline(sessionDate: string, submittedAt: string | null, quizScores: FcmQuizScore[]): CaseTimeline
export function formatSessionCountdown(daysUntilSession: number): string
```

### `src/lib/quiz-cards.ts`
```typescript
export function generateCards(caseData: FcmCase, submission: FcmSubmission, feedback: FeedbackResult): QuizCard[]     // 7+ cards
export function generateQuickCards(caseData: FcmCase, submission: FcmSubmission, feedback: FeedbackResult): QuizCard[] // 3-4 cards
```

### `src/lib/user-context.tsx`
```typescript
export function UserProvider({ children }): JSX.Element
export function useUser(): { user: FcmUser | null, setUser: (user: FcmUser | null) => void }
```

### `src/data/diagnosis-lookup.ts`
```typescript
export const DIAGNOSIS_LOOKUP: DiagnosisLookupEntry[]
export function searchDiagnoses(query: string, limit?: number): DiagnosisSearchResult[]
```
Scoring: exact abbreviation (3.0), term starts with (2.0), abbr starts with (1.5), term substring (1.0), abbr substring (0.5)

---

## Key Architectural Patterns

1. **No Auth** — User context via localStorage (`fcm-user` key), roster picker login
2. **Autosave** — 500ms debounce via `useAutosave` hook → Supabase upsert on `(user_id, case_id)`
3. **Two-Phase Feedback** — Deterministic comparison (instant, structured) → Claude AI narrative (educational, warm)
4. **Responsive Layout** — Mobile bottom nav + desktop sidebar at `md` breakpoint; sidebar `h-dvh sticky top-0`
5. **Practice Cases** — Static JSON (324 cases), no Supabase FK, localStorage for mode toggle
6. **VINDICATE Framework** — 9 categories (V-I-N-D-I-C-A-T-E, "I2" for Iatrogenic), auto-mapped in feedback
7. **Fuzzy Matching** — Levenshtein distance (≤2 for terms ≥5 chars, or similarity >0.85)
8. **Topic Voting** — Notes with `[TOPIC VOTE]` prefix + `is_sent_to_instructor: true`
9. **PWA** — Serwist service worker (production only), installable manifest, standalone display
10. **Quiz Generation** — Full (7+ cards) and Quick (3-4 cards) modes from submission + feedback data

---

## Dependencies

### Runtime
| Package | Version | Purpose |
|---------|---------|---------|
| next | 16.1.6 | Framework |
| react / react-dom | 19.2.3 | UI |
| @supabase/supabase-js | ^2.97.0 | Database |
| @anthropic-ai/sdk | ^0.77.0 | Claude API |
| @serwist/next + serwist | ^9.5.6 | PWA |
| radix-ui | ^1.4.3 | UI primitives |
| lucide-react | ^0.574.0 | Icons |
| class-variance-authority | ^0.7.1 | Component variants |
| clsx + tailwind-merge | latest | Class merging |
| tw-animate-css | ^1.4.0 | Animations |

### Dev
| Package | Version | Purpose |
|---------|---------|---------|
| tailwindcss | ^4 | Styling |
| @tailwindcss/postcss | ^4 | PostCSS plugin |
| typescript | ^5 | Type safety |
| eslint + eslint-config-next | ^9 / 16.1.6 | Linting |
| dotenv | ^17.3.1 | Env vars in scripts |

---

## Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase anon key (client-side)
ANTHROPIC_API_KEY=               # Claude API key (server-side only)

# Optional (scripts only)
SUPABASE_SERVICE_ROLE_KEY=       # Admin access for reset/seed scripts
```

---

## Commands

```bash
npm run dev              # Start dev server (turbopack, port 3000)
npm run build            # Production build (webpack for Serwist PWA)
npm run start            # Production server
npm run lint             # ESLint
npm run db:reset         # Reset test data via Supabase RPC
npm run data:process     # Regenerate practice-cases.json from AgentClinic JSONL
npm run data:diagnoses   # Extract diagnoses from practice cases
npx tsx scripts/generate-vocabulary.ts   # Regenerate clinical-vocabulary.json
npx tsx scripts/build-vocabulary.ts      # Claude API vocabulary expansion
npx tsx scripts/import-uva-cases.ts <dir> # Parse UVA cases → SQL INSERTs
```

---

## Configuration

### tsconfig.json
- Target: ES2017, Module: esnext, Strict mode
- Path alias: `@/*` → `./src/*`

### next.config.ts
- Serwist PWA wrapping in production only (webpack mode)
- Turbopack used in dev (Serwist incompatible)

### components.json (shadcn/ui)
- Style: new-york, RSC: true, Base color: neutral, CSS variables: true

### globals.css
- Tailwind v4 imports, tw-animate-css
- Monochrome + medical teal accent (#0d9488)
- Light/dark mode CSS variables

---

## Version History

| Version | Date | Highlights |
|---------|------|-----------|
| v1 | Feb 18 | Full 3-part system (Student, Faculty, Admin) |
| v2.1 | Feb 19 AM | Pedagogical upgrade (autocomplete delay, fuzzy matching, reasoning, two-phase feedback) |
| v3 | Feb 19 PM | Clinical data (324 cases, 256 diagnoses), UX redesign, Practice Library, Refresh Quiz |
| v3.1 | Feb 19 late | Time-aware dashboard, Quick Refresh, quiz persistence |
| v4 | Feb 20 AM | M1 focus (3-char threshold, hide OSCE, "Try a Case", topic voting, 666 vocab, dual-mode practice, admin UI, shared components) |
| v5 | Feb 20 PM | Session dashboard (4-slide presenter), quiz quality, auto-VINDICATE, expert differential, sentiments, feedback rotation, post-session capture, PWA |

---

## Commit Style

```
type: description
```
Types: `feat:`, `fix:`, `chore:`, `docs:`
