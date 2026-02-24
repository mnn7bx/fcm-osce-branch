# OSCE Practice Expansion — Product Requirements Document

**Project:** FCM Companion
**Feature:** OSCE Clinical Skills Practice
**Version:** Draft v1
**Date:** February 22, 2026
**Status:** Draft — Communication checklist and PE manual received

---

## 1. Problem Statement

M1–M2 medical students face significant anxiety preparing for OSCEs — a 15-station clinical skills assessment where they must demonstrate history-taking, physical exam skills, clinical reasoning, and documentation. Currently, students have limited ways to practice the full OSCE workflow outside of scheduled standardized patient encounters.

The existing OSCE feature in FCM Companion is a single-shot text/voice input → AI evaluation. It doesn't simulate the multi-phase workflow students actually experience during an OSCE station.

## 2. Goal

Create a **mobile-first, low-anxiety simulation** of the full OSCE station workflow — everything except the live patient encounter itself. Students should be able to practice on their phone in short sessions, building confidence through repetition.

## 3. User Flow — Three Phases

### Phase 1: Door Prep (Pre-Encounter Planning)

**What happens in real life:** Student reads the door sign outside the exam room, then has ~2 minutes to plan their approach before entering.

**In-app simulation:**

1. Student selects a case from any source (scheduled FCM cases, practice library, or dedicated OSCE scenarios)
2. App displays the **door card**:
   - Chief complaint
   - Patient demographics (age, gender)
   - Vitals (HR, BP, RR, Temp, SpO2)
3. Student builds a **differential diagnosis** (3–5 diagnoses)
   - Uses the existing `DiagnosisInput` autocomplete component (retrieval-based, 3-char threshold)
   - Reorderable by drag (most likely → least likely)
4. **For each diagnosis**, student adds:
   - **3–5 targeted history questions** they would ask the patient to evaluate this diagnosis
     - Free-text input fields (retrieval practice, not recognition)
     - Example: For "Acute Pericarditis" → "Is the pain worse when lying down?", "Any recent viral illness?"
   - **Physical exam maneuvers** they would perform
     - Autocomplete from a PE maneuver vocabulary (retrieval-based, not a checklist)
     - Example: "Pericardial friction rub auscultation", "JVD assessment"
5. Student submits Door Prep → transitions to Phase 2

### Phase 2: SOAP Note (Post-Encounter Documentation)

**What happens in real life:** Student leaves the exam room and has ~10 minutes to write a SOAP note documenting their findings.

**In-app simulation:**

The app simulates the encounter by providing pre-written S and O sections based on the case data (`full_case_data` field), as if the student had just completed the patient interview and physical exam.

#### Step 2a: Review Provided S/O

App presents a condensed, realistic SOAP-style summary:

- **Subjective:** HPI narrative, pertinent positives/negatives from history, ROS highlights
- **Objective:** Vitals (restated), relevant PE findings, any lab/imaging results

This content is derived from the case's `full_case_data` (SP script, PE findings, labs).

#### Step 2b: Revise Differential

- Student sees their original differential from Door Prep
- Can **add or remove diagnoses** based on what they learned from S/O
- Reorder by likelihood given the new information

#### Step 2c: Assessment — Map Evidence to Diagnoses

For each diagnosis in their revised differential:

- Student maps supporting evidence from S/O to the diagnosis
  - UI approach: **Drag-and-drop or tap-to-assign** key findings from S/O into diagnosis buckets
  - Alternative: Dropdown/autocomplete populated with extracted findings from the S/O
  - Goal: retrieval + synthesis, not recognition
- Writes a brief assessment statement (~1–2 sentences) synthesizing why this diagnosis is supported or less likely

#### Step 2d: Plan — Diagnostic & Therapeutic

For each diagnosis:

- **Diagnostic plan**: What tests/studies would you order? (autocomplete from a diagnostic vocabulary — labs, imaging, procedures)
- **Therapeutic plan**: What initial treatment would you recommend? (autocomplete from a therapeutic vocabulary — medications, interventions, referrals)
- Both fields are retrieval-based autocomplete for efficiency

#### Step 2e: Submit Complete SOAP Note

### Phase 3: Feedback (Attending Evaluation)

**What happens in real life:** An attending reviews the student's performance using a rubric and provides verbal feedback.

**In-app simulation:**

Claude generates feedback in the voice of a **kind, encouraging attending physician** who evaluates:

1. **Differential quality**
   - Appropriateness of diagnoses for the presentation
   - Ordering (most likely → least likely) with rationale
   - VINDICATE coverage breadth
   - Can't-miss diagnoses included?

2. **History questions** (from Door Prep)
   - Were questions targeted and discriminating?
   - Would they effectively narrow the differential?
   - Any critical questions missed?

3. **Physical exam selection** (from Door Prep)
   - Appropriate maneuvers for the differential?
   - Any key PE findings that should have been sought?

4. **SOAP note quality** (from Phase 2)
   - Evidence-to-diagnosis mapping accuracy
   - Assessment reasoning quality
   - Plan appropriateness (diagnostic + therapeutic)

5. **1–2 curated resources**
   - Links or references for further reading on the case topic
   - Could be textbook chapters, UpToDate articles, or teaching points

6. **Personal notes field**
   - Student can save takeaways for future review
   - Integrates with existing notes system

---

## 4. Data Model Changes

### New Tables

```sql
-- OSCE practice sessions (one per case attempt)
CREATE TABLE fcm_osce_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES fcm_users(id) NOT NULL,
  -- Polymorphic case reference: one of these will be set
  case_id UUID REFERENCES fcm_cases(id),           -- scheduled case
  practice_case_id TEXT,                             -- practice library case ID
  case_source TEXT NOT NULL CHECK (case_source IN ('scheduled', 'practice', 'custom')),
  -- Phase 1: Door Prep
  door_prep JSONB,              -- DoorPrepData (see below)
  door_prep_submitted_at TIMESTAMPTZ,
  -- Phase 2: SOAP Note
  soap_note JSONB,              -- SoapNoteData (see below)
  soap_submitted_at TIMESTAMPTZ,
  -- Phase 3: Feedback
  feedback JSONB,               -- OSCEFeedbackResult (see below)
  feedback_generated_at TIMESTAMPTZ,
  -- Metadata
  status TEXT NOT NULL DEFAULT 'door_prep'
    CHECK (status IN ('door_prep', 'soap_note', 'completed')),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_osce_sessions_user ON fcm_osce_sessions(user_id);
CREATE INDEX idx_osce_sessions_case ON fcm_osce_sessions(case_id);
```

### New TypeScript Types

```typescript
// Phase 1: Door Prep
interface DoorPrepData {
  diagnoses: DoorPrepDiagnosis[]
}

interface DoorPrepDiagnosis {
  diagnosis: string
  sort_order: number
  history_questions: string[]       // 3-5 free-text questions
  pe_maneuvers: string[]            // autocomplete selections
  confidence?: number               // 1-5
}

// Phase 2: SOAP Note
interface SoapNoteData {
  // Provided by app (read-only context)
  subjective_provided: string
  objective_provided: string
  // Student-authored
  revised_diagnoses: RevisedDiagnosis[]
}

interface RevisedDiagnosis {
  diagnosis: string
  sort_order: number
  supporting_evidence: string[]     // mapped findings from S/O
  assessment: string                // 1-2 sentence synthesis
  diagnostic_plan: string[]         // labs, imaging, procedures
  therapeutic_plan: string[]        // medications, interventions
}

// Phase 3: Feedback
interface OSCEFeedbackResult {
  // Rubric scores (future: map to actual OSCE rubric)
  differential_score: RubricScore
  history_questions_score: RubricScore
  pe_selection_score: RubricScore
  soap_quality_score: RubricScore
  // Narrative
  attending_narrative: string       // kind, educational prose
  strengths: string[]
  areas_for_improvement: string[]
  // Resources
  recommended_resources: ResourceLink[]
}

interface RubricScore {
  category: string
  rating: 'excellent' | 'good' | 'developing' | 'needs_work'
  comments: string
}

interface ResourceLink {
  title: string
  description: string
  url?: string                      // optional external link
  type: 'textbook' | 'article' | 'teaching_point'
}
```

### New Vocabulary Data Needed

```
src/data/
├── pe-maneuvers.json              # Physical exam maneuver vocabulary
│   (auscultation, palpation, percussion, inspection, special tests)
│   Format: { term, body_system, description, abbreviations }
├── diagnostic-tests.json          # Labs, imaging, procedures
│   Format: { term, category, abbreviations }
└── therapeutic-options.json       # Medications, interventions, referrals
    Format: { term, category, abbreviations }
```

---

## 5. New Routes

```
src/app/(student)/osce/
├── page.tsx                       # OSCE home — case picker (all sources)
├── [sessionId]/
│   ├── page.tsx                   # Redirects to current phase
│   ├── door-prep/page.tsx         # Phase 1: Door card + differential + questions + PE
│   ├── soap-note/page.tsx         # Phase 2: S/O review + revised dx + A&P
│   └── feedback/page.tsx          # Phase 3: Attending feedback + resources + notes
```

### New API Routes

```
src/app/api/
├── osce-session/route.ts          # POST: Create session, GET: List sessions
├── osce-session/[id]/route.ts     # PATCH: Update session phases
├── osce-feedback/route.ts         # POST: Generate attending feedback via Claude
└── osce-soap-context/route.ts     # POST: Generate S/O content from case data
```

---

## 6. UI Design Principles

**Mobile-first, anxiety-reducing:**

- Clean, spacious layouts with generous whitespace
- Progress indicator showing Phase 1 → 2 → 3 (step dots, not a timer)
- No countdown timers (reducing anxiety, not simulating exam pressure)
- Warm, encouraging microcopy ("Nice work — let's see how the encounter went")
- Autosave on all phases (no lost work)
- Ability to pause and resume sessions

**Retrieval over recognition:**

- History questions: free-text input (no multiple choice)
- PE maneuvers: autocomplete that requires typing (3-char threshold, same as diagnosis input)
- Diagnostic/therapeutic plans: autocomplete, not dropdown menus
- Evidence mapping: student actively assigns findings, not presented with pre-mapped options

---

## 7. AI Integration

### SOAP Context Generation (Phase 2 transition)

When student submits Door Prep, the app needs to present realistic S/O findings. Two approaches:

**Option A: Pre-authored S/O** (preferred for scheduled cases)
- For cases with rich `full_case_data`, extract and format S/O directly
- Deterministic, consistent, no AI cost

**Option B: Claude-generated S/O** (fallback for practice cases)
- For practice cases with limited data, use Claude to generate a realistic S/O
- Based on: chief complaint, correct diagnosis, available case data
- Claude model: `claude-sonnet-4-6`, ~300 tokens

### Attending Feedback (Phase 3)

- Input: Door Prep data + SOAP Note data + case answer key
- Deterministic pre-processing: compare differential against answer key, check PE appropriateness
- Claude generates the attending narrative: warm, specific, educational
- Model: `claude-sonnet-4-6`, ~500 tokens
- Cached in `fcm_osce_sessions.feedback` (same pattern as existing feedback)

---

## 8. Case Source Integration

| Source | Door Card Data | S/O Generation | Answer Key |
|--------|---------------|----------------|------------|
| Scheduled FCM cases | `fcm_cases` table | `full_case_data` extraction | `differential_answer_key` |
| Practice library (324) | `practice-cases.json` | Claude-generated from available data | `correct_diagnosis` field |
| Dedicated OSCE scenarios | New data (future) | Pre-authored, comprehensive | Full answer key |

---

## 9. Communication Checklist Integration

Source: `communication-checklist.docx` (UVA FCM Patient-Centered Interviewing Checklist)

The checklist defines the full patient encounter communication flow. While the app simulates everything *except* the live encounter, the checklist informs Phase 1 history question evaluation and Phase 3 feedback rubric.

### Checklist Phases (for reference in AI evaluation prompts)

1. **Setting the Stage** — Greet, introduce, remove barriers, ensure comfort
2. **Chief Concern & Agenda** — Open-ended elicitation, additional concerns, prioritize
3. **Open Interview** — Open-ended story, nonverbal encouragement, echoing
4. **Focusing Skills** — Summarize, clarify, elicit emotional/personal context, respond empathetically
5. **HPI (7 Components)** — Onset, duration, quality, quantification, related symptoms, setting, transforming factors
6. **Transition** — Summarize HPI, set stage for directed questions
7. **PMH / PSH / Meds / Allergies / FH / SH** — Structured history
8. **ROS** — Genl, HEENT, Pulm, Cardiac, GI, GU, M/S, Neuro, Derm, Endo, Psych
9. **Ending Interview** — Transition to PE
10. **Ending Encounter** — Communicate assessment in lay terms, plan with choices, elicit agreement, review expectancies

### How This Maps to App Phases

| Checklist Phase | App Phase | Implementation |
|----------------|-----------|----------------|
| Chief Concern | Phase 1 (Door Prep) | Door card provides the CC; student generates differential |
| HPI (7 components) | Phase 1 (History Qs) | Student writes targeted questions; feedback evaluates coverage of 7 HPI components |
| ROS | Phase 2 (S/O provided) | App simulates ROS findings in Subjective |
| PE | Phase 1 (PE Maneuvers) + Phase 2 (Objective) | Student selects maneuvers; app provides findings |
| Assessment/Plan | Phase 2 (SOAP A&P) | Student writes differential with evidence + plans |
| Communication quality | Phase 3 (Feedback) | Attending evaluates whether questions were targeted, open→focused |

---

## 10. Physical Exam Maneuver Vocabulary

Source: `fcm-physical-exam-manual.pdf` (UVA FCM PE Framework, 35 pages, 117 numbered maneuvers)

### Body System Coverage

| System | IDs | Count | Key Maneuvers |
|--------|-----|-------|---------------|
| Initiation / Vitals | 1–10 | 10 | Hand washing, pulse, respiration, BP, general appearance |
| Head & Neck | 11–20 | 10 | Lymph node palpation (8 groups), trachea, thyroid |
| Eyes | 21–25 | 5 | Inspection, visual fields, pupils, EOM, ophthalmoscopy |
| Ears/Nose/Throat | 26–32 | 7 | Otoscopy, Weber, Rinne, nares, mouth/throat |
| Cardiovascular | 33–39 | 7 | JVP, carotid, precordial, cardiac auscultation (4 areas), peripheral pulses |
| Pulmonary | 40–44 | 5 | Chest inspection, auscultation, egophony, fremitus, percussion |
| Abdominal | 45–53 | 9 | Inspection, bowel sounds, vascular auscultation, palpation, Murphy, McBurney, liver, spleen, aorta |
| Neurological | 54–84 | 31 | Orientation, CN I–XII, motor/sensory, reflexes, coordination, gait |
| MSK — Back | 85–89 | 5 | Spine inspection/palpation, ROM, straight leg, FABER |
| MSK — Shoulder | 90–96 | 7 | Inspection, palpation, ROM, Hawkins, Neer, empty can, infraspinatus |
| MSK — Elbow/Wrist/Hand | 97–102 | 6 | Inspection, palpation, ROM |
| MSK — Hip/Knee | 103–114 | 12 | Inspection, palpation, ROM, instability tests, drawer |
| MSK — Ankle/Foot | 115–117 | 3 | Inspection, palpation, ROM |

### Vocabulary Data Format (`src/data/pe-maneuvers.json`)

```json
{
  "id": 38,
  "term": "Cardiac auscultation",
  "abbreviations": ["heart sounds", "heart auscultation", "S1", "S2", "murmur"],
  "body_system": "Cardiovascular",
  "category": "auscultation",
  "description": "Diaphragm at 4 areas (aortic, pulmonic, tricuspid, mitral); bell at PMI for S3/S4"
}
```

Uses same autocomplete search pattern as `clinical-vocabulary.json` — 3-char threshold, scored matching (exact abbreviation > starts-with > substring).

---

## 11. Open Questions / Remaining Items

1. **Evidence mapping UI** — Exact interaction pattern TBD. Options: tap-to-assign (simpler on mobile but space-constrained), type-to-search extracted findings, or hybrid. *User feedback in progress.*
2. **Rubric alignment** — Does the actual OSCE rubric exist in a shareable format? Would allow feedback to mirror real evaluation criteria.
3. **Session history** — Should students see a history of past OSCE practice sessions with scores/trends?
4. **Timed mode (optional)** — Some students may want to practice under time pressure. Offer as opt-in toggle, not default.
5. **Communication checklist visibility** — Should the app display the checklist phases as a reference during Door Prep, or just use it behind the scenes for feedback?

---

## 12. Implementation Phases

### Phase A: Foundation (MVP)
- OSCE case picker (all three sources)
- Door Prep page (differential + questions + PE autocomplete)
- PE maneuver vocabulary (117 maneuvers from FCM manual)
- Session persistence (autosave)

### Phase B: SOAP Note
- S/O context generation (extraction for scheduled, Claude for practice)
- Revised differential UI
- Assessment writing (evidence → diagnosis mapping)
- Plan input (diagnostic + therapeutic autocomplete)

### Phase C: Feedback
- Attending feedback via Claude (informed by communication checklist + PE manual)
- Rubric-based scoring display
- Resource recommendations
- Notes integration

### Phase D: Polish
- Session history and progress tracking
- Diagnostic/therapeutic vocabulary expansion
- Communication checklist reference UI
- Optional timed mode

---

## 13. Relationship to Existing Features

| Existing Feature | Reuse in OSCE |
|-----------------|---------------|
| `DiagnosisInput` component | Door Prep differential building |
| `DiagnosisRow` component | Extend for questions + PE fields |
| `searchDiagnoses()` | Same autocomplete for differential |
| `clinical-vocabulary.json` | Same 666-diagnosis vocabulary |
| `useAutosave` hook | Adapt for OSCE session persistence |
| `FeedbackNarrative` component | Display attending feedback |
| Notes system | Post-feedback personal notes |
| `compareDifferential()` | Reuse for feedback pre-processing |

---

*Communication checklist and PE manual received and integrated. Ready for user feedback on PRD before implementation.*
