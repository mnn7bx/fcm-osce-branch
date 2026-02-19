# FCM Companion — System Architecture

**Version:** v1.0
**Date:** February 18, 2026
**Live URL:** https://fcm-companion.vercel.app
**Repo:** [uva-medical-design/fcm-companion](https://github.com/uva-medical-design/fcm-companion)

---

## High-Level System Overview

```mermaid
graph TB
    subgraph Clients["Client Layer"]
        SA["Student App<br/>(Mobile-first PWA)"]
        FD["Faculty Dashboard<br/>(Desktop)"]
        AP["Admin Panel<br/>(Desktop)"]
    end

    subgraph Vercel["Vercel (Next.js 16)"]
        SSR["SSR / Static Pages"]
        API["API Routes<br/>(Serverless Functions)"]
    end

    subgraph External["External Services"]
        SB["Supabase<br/>(PostgreSQL + RLS)"]
        AI["Anthropic API<br/>(claude-sonnet-4-5)"]
    end

    SA -->|HTTPS| SSR
    FD -->|HTTPS| SSR
    AP -->|HTTPS| SSR

    SA -->|Direct queries<br/>(anon key)| SB
    FD -->|Direct queries<br/>(anon key)| SB
    AP -->|Direct queries<br/>(anon key)| SB

    SA -->|POST| API
    FD -->|GET| API

    API -->|Service role key| SB
    API -->|Generate feedback<br/>& OSCE eval| AI
```

---

## Technology Stack

```mermaid
graph LR
    subgraph Frontend
        Next["Next.js 16"]
        React["React 19"]
        TW["Tailwind v4"]
        Shadcn["shadcn/ui"]
        Lucide["Lucide Icons"]
        Radix["Radix UI"]
    end

    subgraph Backend
        APIRoutes["Next.js API Routes<br/>(Serverless)"]
        Anthropic["Anthropic SDK"]
        SupaJS["supabase-js v2"]
    end

    subgraph Infrastructure
        Vercel["Vercel<br/>(Hosting + Edge)"]
        Supabase["Supabase<br/>(Postgres + RLS)"]
        GitHub["GitHub<br/>(Source)"]
    end

    Next --> React
    Next --> TW
    Next --> Shadcn
    Shadcn --> Radix
    Shadcn --> Lucide

    APIRoutes --> Anthropic
    APIRoutes --> SupaJS

    Next --> Vercel
    SupaJS --> Supabase
    GitHub --> Vercel
```

---

## Route Architecture

```mermaid
graph TD
    Root["/ — Login<br/>(Roster Picker)"]

    subgraph StudentRoutes["(student) Route Group — Mobile Shell"]
        Cases["/cases<br/>Case List"]
        CaseDetail["/cases/[caseId]<br/>Differential Builder"]
        Feedback["/cases/[caseId]/feedback<br/>Family Feud Reveal"]
        Refresh["/cases/[caseId]/refresh<br/>Pre-Session Refresh"]
        Notes["/notes<br/>All Notes + OSCE Pearls"]
        Reference["/reference<br/>Learning Resources"]
        OSCE["/osce<br/>OSCE Practice"]
    end

    subgraph FacultyRoutes["(faculty) Route Group — Desktop Sidebar"]
        Dashboard["/dashboard<br/>Instructor Session View"]
        Admin["/admin<br/>Settings + Case Library"]
    end

    subgraph APIRoutes["API Routes (Serverless)"]
        APIFeedback["POST /api/feedback"]
        APINotes["POST /api/notes"]
        APIOSCE["POST /api/osce"]
        APIDashboard["GET /api/dashboard"]
        APISubmissions["POST /api/submissions"]
    end

    Root -->|Student| Cases
    Root -->|Instructor/Admin| Dashboard

    Cases --> CaseDetail
    CaseDetail -->|Submit| Feedback
    CaseDetail --> Refresh
    Feedback -.->|Edit| CaseDetail

    CaseDetail -.->|Autosave 500ms| APISubmissions

    Feedback -->|Generate| APIFeedback
    Notes -->|Save| APINotes
    OSCE -->|Evaluate| APIOSCE
    Dashboard -->|Fetch aggregates| APIDashboard

    APIFeedback -->|claude-sonnet-4-5| AI["Anthropic API"]
    APIOSCE -->|claude-sonnet-4-5| AI
```

---

## Database Schema (Entity Relationship)

```mermaid
erDiagram
    fcm_users {
        uuid id PK
        text name
        text email UK
        text role "student | instructor | admin"
        text fcm_group "Group A | Group B"
        text year_level "M1"
        timestamptz created_at
    }

    fcm_cases {
        uuid id PK
        text case_id UK "FCM-CV-001"
        text title
        text chief_complaint
        text patient_name
        int patient_age
        text patient_gender
        jsonb vitals
        text body_system
        text difficulty "Easy | Moderate | Hard"
        jsonb differential_answer_key "AnswerKeyEntry[]"
        jsonb vindicate_categories
        jsonb key_teaching_points
        jsonb full_case_data "SP script, PE, labs"
        bool is_active
        int sort_order
        timestamptz created_at
        timestamptz updated_at
    }

    fcm_schedule {
        uuid id PK
        uuid case_id FK
        text fcm_group
        text week_label
        date unlock_date
        date due_date
        date session_date
        text semester "2026-Spring"
    }

    fcm_submissions {
        uuid id PK
        uuid user_id FK
        uuid case_id FK
        jsonb diagnoses "DiagnosisEntry[]"
        text status "draft | submitted | resubmitted"
        timestamptz submitted_at
        jsonb feedback "FeedbackResult (cached)"
        timestamptz feedback_generated_at
        timestamptz created_at
        timestamptz updated_at
    }

    fcm_notes {
        uuid id PK
        uuid user_id FK
        uuid case_id FK
        text content
        bool is_starred "OSCE pearl"
        bool is_sent_to_instructor
        timestamptz created_at
        timestamptz updated_at
    }

    fcm_settings {
        uuid id PK
        text key UK "feedback_mode | default_framework | semester"
        jsonb value
        uuid updated_by FK
        timestamptz updated_at
    }

    fcm_osce_responses {
        uuid id PK
        uuid user_id FK
        uuid case_id FK
        text response_type "text | voice"
        text response_content
        int duration_seconds
        jsonb evaluation
        timestamptz created_at
    }

    fcm_users ||--o{ fcm_submissions : submits
    fcm_users ||--o{ fcm_notes : writes
    fcm_users ||--o{ fcm_osce_responses : practices
    fcm_users ||--o{ fcm_settings : "updated_by"
    fcm_cases ||--o{ fcm_schedule : "scheduled in"
    fcm_cases ||--o{ fcm_submissions : "submitted for"
    fcm_cases ||--o{ fcm_notes : "notes on"
    fcm_cases ||--o{ fcm_osce_responses : "practiced on"
```

---

## AI Feedback Pipeline ("Family Feud Reveal")

```mermaid
flowchart LR
    subgraph Input
        SD["Student Diagnoses<br/>(DiagnosisEntry[])"]
        AK["Answer Key<br/>(AnswerKeyEntry[])"]
        FM["Feedback Mode<br/>(admin setting)"]
    end

    subgraph Step1["Step 1: Deterministic Comparison"]
        direction TB
        Normalize["Normalize to lowercase"]
        Match["Match against aliases"]
        Tier["Sort into tiers:<br/>most_likely | moderate<br/>less_likely | unlikely_important"]
        Common["Compute common<br/>hit / missed"]
        CantMiss["Compute can't-miss<br/>hit / missed"]
        VIND["Compute VINDICATE<br/>coverage (9 categories)"]
    end

    subgraph Step2["Step 2: AI Narrative"]
        Prompt["Build prompt with<br/>comparison results +<br/>chief complaint +<br/>feedback mode"]
        Claude["claude-sonnet-4-5<br/>(500 tokens max)"]
        Narrative["3-5 sentence<br/>supportive narrative"]
    end

    subgraph Output["Cached FeedbackResult"]
        Cache["Stored in<br/>fcm_submissions.feedback<br/>(JSONB)"]
    end

    SD --> Normalize
    AK --> Normalize
    Normalize --> Match --> Tier
    Match --> Common
    Match --> CantMiss
    Match --> VIND
    FM --> Prompt
    Tier --> Prompt
    Common --> Prompt
    CantMiss --> Prompt
    VIND --> Prompt
    Prompt --> Claude --> Narrative
    Narrative --> Cache
    Tier --> Cache
    Common --> Cache
    CantMiss --> Cache
    VIND --> Cache
```

### Answer Key Entry Structure

```json
{
  "diagnosis": "Acute Coronary Syndrome",
  "tier": "most_likely",
  "vindicate_category": "V",
  "is_common": true,
  "is_cant_miss": true,
  "aliases": ["ACS", "MI", "heart attack", "STEMI", "NSTEMI"],
  "likelihood": "High"
}
```

### Feedback Modes (Admin-Controlled)

| Mode | Focus | AI Prompt Emphasis |
|------|-------|-------------------|
| `breadth` | VINDICATE coverage | Categories explored vs. missed |
| `cant_miss` | Dangerous diagnoses | Can't-miss diagnoses found vs. missed |
| `combined` | Both (default) | Full picture |

---

## Student Journey — Complete Data Flow

```mermaid
sequenceDiagram
    participant S as Student (Browser)
    participant SB as Supabase
    participant API as Next.js API
    participant AI as Anthropic

    Note over S: Login
    S->>SB: SELECT * FROM fcm_users
    SB-->>S: User list
    S->>S: Store selected user in localStorage

    Note over S: View Cases
    S->>SB: SELECT fcm_schedule JOIN fcm_cases<br/>WHERE fcm_group = user.group
    S->>SB: SELECT fcm_submissions<br/>WHERE user_id = user.id
    SB-->>S: Schedule + submissions

    Note over S: Build Differential
    S->>SB: SELECT fcm_cases WHERE id = caseId
    S->>SB: SELECT fcm_submissions WHERE user+case
    SB-->>S: Case data + prior draft

    loop Every 500ms (if changed)
        S->>SB: UPSERT fcm_submissions<br/>(status: draft)
    end

    Note over S: Submit
    S->>SB: UPSERT fcm_submissions<br/>(status: submitted)
    S->>S: Navigate to /feedback

    Note over S: View Feedback
    S->>SB: SELECT submission (check cached feedback)

    alt No cached feedback
        S->>API: POST /api/feedback
        API->>SB: SELECT submission + case + settings
        API->>API: compareDifferential() [deterministic]
        API->>API: buildFeedbackPrompt()
        API->>AI: messages.create (claude-sonnet-4-5)
        AI-->>API: AI narrative (3-5 sentences)
        API->>SB: UPDATE submission.feedback
        API-->>S: FeedbackResult
    else Has cached feedback
        S->>S: Display cached FeedbackResult
    end

    Note over S: OSCE Practice
    S->>S: Record voice (Web Speech API)<br/>or type response
    S->>API: POST /api/osce
    API->>SB: SELECT case + prior submission
    API->>AI: Evaluate presentation
    AI-->>API: Evaluation text
    API->>SB: INSERT fcm_osce_responses
    API-->>S: Evaluation
```

---

## Instructor Dashboard — Data Aggregation

```mermaid
flowchart TD
    subgraph DataSources["Supabase Queries"]
        Subs["fcm_submissions<br/>WHERE case_id = X<br/>AND status IN (submitted, resubmitted)"]
        Users["fcm_users<br/>COUNT WHERE role = student"]
        Notes["fcm_notes<br/>WHERE is_sent_to_instructor = true"]
    end

    subgraph Computation["Server-Side Aggregation"]
        DiagFreq["Diagnosis Frequency<br/>(count per lowercase diagnosis)"]
        VindCov["VINDICATE Coverage<br/>(% of students per category)"]
        CMRate["Can't-Miss Rate<br/>(avg hit / (hit + missed))"]
        Questions["Flagged Questions<br/>(anonymized note content)"]
    end

    subgraph Display["Dashboard UI"]
        StatCards["Summary Cards<br/>Submissions | Diagnoses | CM Rate | Questions"]
        BarChart["Diagnosis Frequency<br/>Bar Chart (top 15)"]
        CovGrid["VINDICATE Coverage<br/>Grid (9 cells, %)"]
        QList["Flagged Questions<br/>List"]
    end

    Subs --> DiagFreq
    Subs --> VindCov
    Subs --> CMRate
    Users --> StatCards
    Notes --> Questions

    DiagFreq --> BarChart
    VindCov --> CovGrid
    CMRate --> StatCards
    Questions --> QList
```

---

## VINDICATE Framework

```mermaid
graph LR
    V["V<br/>Vascular"]
    I["I<br/>Infectious"]
    N["N<br/>Neoplastic"]
    D["D<br/>Degenerative"]
    I2["I<br/>Iatrogenic /<br/>Intoxication"]
    C["C<br/>Congenital"]
    A["A<br/>Autoimmune /<br/>Allergic"]
    T["T<br/>Traumatic"]
    E["E<br/>Endocrine /<br/>Metabolic"]

    V --- I --- N --- D --- I2 --- C --- A --- T --- E

    style V fill:#0d9488,color:white
    style I fill:#0d9488,color:white
    style N fill:#0d9488,color:white
    style D fill:#0d9488,color:white
    style I2 fill:#0d9488,color:white
    style C fill:#0d9488,color:white
    style A fill:#0d9488,color:white
    style T fill:#0d9488,color:white
    style E fill:#0d9488,color:white
```

Internal key mapping: `V, I, N, D, I2, C, A, T, E` — the second `I` uses key `"I2"` internally but renders as `"I"` in the UI.

---

## State Management Architecture

```mermaid
graph TD
    subgraph Global["Global State"]
        LS["localStorage<br/>(fcm-user key)"]
        UC["UserContext<br/>(React Context)"]
    end

    subgraph PageState["Per-Page State (useState)"]
        CaseState["Cases: cases[], loading"]
        DiffState["Differential: diagnoses[],<br/>submission, caseData"]
        FeedState["Feedback: feedback,<br/>generating"]
        NoteState["Notes: notes[], editingNote,<br/>editContent"]
        OSCEState["OSCE: selectedCase, mode,<br/>voiceText, evaluation"]
        DashState["Dashboard: data,<br/>selectedCaseId"]
        AdminState["Admin: settings{},<br/>cases[], tab"]
    end

    subgraph Persistence["Persistence Layer"]
        Autosave["useAutosave Hook<br/>(500ms debounce)"]
        NoteDebounce["Note Save<br/>(1000ms debounce)"]
        DirectWrite["Direct Supabase<br/>Writes"]
        APIWrite["API Route<br/>Writes"]
    end

    LS <-->|mount/update| UC
    UC -->|useUser()| PageState

    DiffState --> Autosave
    NoteState --> NoteDebounce
    AdminState --> DirectWrite
    FeedState --> APIWrite
    OSCEState --> APIWrite

    Autosave -->|UPSERT| SB["Supabase"]
    NoteDebounce -->|POST /api/notes| SB
    DirectWrite --> SB
    APIWrite --> SB
```

---

## Security Model (v1 — Prototype)

```mermaid
graph TD
    subgraph Current["v1: No Auth (Prototype)"]
        Roster["Roster Picker<br/>(localStorage identity)"]
        Anon["Anon Key<br/>(browser → Supabase)"]
        Service["Service Role Key<br/>(API routes → Supabase)"]
        RLS["RLS: USING (true)<br/>(all operations allowed)"]
    end

    subgraph Future["Future: Proper Auth"]
        Auth["Supabase Auth<br/>(magic link / SSO)"]
        JWT["JWT Session<br/>(per-user RLS)"]
        RLSF["RLS: auth.uid() =<br/>user_id"]
        Middleware["Next.js Middleware<br/>(route protection)"]
    end

    Roster -->|No verification| Anon
    Anon --> RLS

    Auth -->|Verified identity| JWT
    JWT --> RLSF
    Auth --> Middleware

    Current -.->|"Upgrade path"| Future

    style Current fill:#fef3c7,stroke:#f59e0b
    style Future fill:#d1fae5,stroke:#10b981
```

### Current Limitations
- Any user can impersonate any other user via localStorage
- Anon key exposed in client — any browser can read/write all tables
- Admin operations (settings, case management) protected only by client-side role check
- No rate limiting on AI API calls

---

## Deployment Architecture

```mermaid
graph LR
    subgraph Dev["Development"]
        Local["localhost:3000<br/>(npm run dev)"]
        EnvLocal[".env.local"]
    end

    subgraph CI["Source Control"]
        GH["GitHub<br/>uva-medical-design/<br/>fcm-companion"]
    end

    subgraph Prod["Production"]
        VCL["Vercel<br/>fcm-companion.vercel.app"]
        VEnv["Vercel Env Vars<br/>(4 secrets)"]
    end

    subgraph Services["Services"]
        SB["Supabase<br/>zuksjgrkxyjpkatxeebg"]
        ANT["Anthropic API"]
    end

    Local --> GH
    GH -->|git push| VCL
    EnvLocal --> Local
    VEnv --> VCL

    Local --> SB
    Local --> ANT
    VCL --> SB
    VCL --> ANT
```

### Environment Variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Browser-safe API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Elevated access for API routes |
| `ANTHROPIC_API_KEY` | Server only | AI feedback + OSCE evaluation |

---

## Sample Case Data Structure

```mermaid
graph TD
    subgraph Case["FCM-CV-001: Chest Pain in Young Athlete"]
        CC["Chief Complaint:<br/>22yo male with chest pain"]
        Vitals["HR: 92 | BP: 128/78<br/>RR: 18 | Temp: 100.8F<br/>SpO2: 98%"]
    end

    subgraph AnswerKey["Differential Answer Key (10 diagnoses)"]
        ML["Most Likely"]
        MOD["Moderate"]
        LL["Less Likely"]
        UI["Unlikely but Important"]
    end

    subgraph MostLikely[""]
        P["Acute Pericarditis<br/>common, I category"]
        ACS["ACS ⚠️<br/>common, can't-miss, V"]
    end

    subgraph Moderate[""]
        RC["Rib Contusion<br/>common, T"]
        Cost["Costochondritis<br/>common, D"]
        Pneu["Pneumonia<br/>common, I"]
    end

    subgraph LessLikely[""]
        Myo["Myocarditis<br/>I category"]
        Pnx["Pneumothorax<br/>T category"]
    end

    subgraph UnlikelyImportant[""]
        PE["Pulmonary Embolism ⚠️<br/>can't-miss, V"]
        AD["Aortic Dissection ⚠️<br/>can't-miss, V"]
        GERD["GERD<br/>D category"]
    end

    Case --> AnswerKey
    ML --> MostLikely
    MOD --> Moderate
    LL --> LessLikely
    UI --> UnlikelyImportant
```

---

## UI Component Hierarchy

```mermaid
graph TD
    subgraph RootLayout["Root Layout"]
        UserProvider["UserProvider<br/>(React Context)"]
    end

    subgraph StudentShell["Student Layout (mobile)"]
        SHeader["Sticky Header<br/>(FCM + user + logout)"]
        SMain["Main Content<br/>(pb-20 for nav)"]
        SNav["Fixed Bottom Nav<br/>(Cases | Notes | Reference | OSCE)"]
    end

    subgraph FacultyShell["Faculty Layout (desktop)"]
        FSidebar["Sidebar<br/>(Dashboard | Admin)"]
        FMain["Main Content"]
    end

    subgraph SharedUI["shadcn/ui Components"]
        Button
        Card
        Badge
        Select
        Dialog
        Input
        Textarea
        Label
    end

    subgraph CustomUI["Custom Components"]
        VSelector["VindicateSelector<br/>(9 category toggles)"]
        VCoverage["VindicateCoverage<br/>(summary badges)"]
        DiagRow["DiagnosisRow<br/>(reorder + delete + VINDICATE)"]
        SaveInd["SaveStatusIndicator<br/>(autosave status icon)"]
        Accordion["Accordion<br/>(reference page)"]
    end

    RootLayout --> StudentShell
    RootLayout --> FacultyShell
    StudentShell --> SharedUI
    FacultyShell --> SharedUI
    StudentShell --> CustomUI
```

---

## Future Features & Roadmap

```mermaid
timeline
    title FCM Companion Roadmap

    section v1.0 (Current — Feb 2026)
        Differential Builder with VINDICATE : Autosave + submit
        AI Feedback (Family Feud Reveal) : Deterministic + AI narrative
        Notes with OSCE Pearls : Star + send to instructor
        OSCE Practice (text + voice) : Web Speech API + AI eval
        Faculty Dashboard : Heat map + VINDICATE coverage
        Admin Panel : Settings + case library

    section v1.1 (Near-term)
        Parse 17+ real UVA case library : From SMD 26 .docx files
        Proper authentication : Supabase Auth (magic link or UVA SSO)
        Row-level security : Per-user data isolation
        Dark mode toggle : Currently respects system preference only

    section v2.0 (Mid-term)
        Case editor UI : Full CRUD for cases in admin panel
        Schedule management UI : Drag-and-drop case scheduling
        Batch case import : Upload CSV/JSON of cases
        Student progress tracking : Longitudinal view across all cases
        Comparative analytics : Cross-cohort performance data

    section v3.0 (Long-term)
        Voice AI agent : Real-time SP simulation
        Spaced repetition : Adaptive review scheduling
        Peer comparison : Anonymous cohort benchmarking
        LMS integration : Canvas grade passback
        Multi-institution : Whitelabel for other med schools
```

### Detailed Future Feature Notes

#### Near-Term (v1.1)

| Feature | Description | Complexity |
|---------|-------------|------------|
| **Real case library** | Parse 17+ cases from `~/Downloads/SMD 26 Cases and Note Templates/`. Each contains full SP script, PE findings, labs, and answer key. Populate `full_case_data` JSONB for richer OSCE simulation. | Medium |
| **Supabase Auth** | Replace roster picker with magic-link or UVA NetBadge SSO. Map `auth.uid()` to `fcm_users.id`. | Medium |
| **Row-level security** | Replace `USING (true)` with proper policies: students see only own submissions/notes, instructors see their group, admins see all. | Low |
| **Dark mode toggle** | App currently has full dark mode CSS but no manual toggle — only system preference. Add toggle in settings or header. | Low |
| **Push notifications** | "Case unlocked" and "Session tomorrow" reminders via Web Push API. | Medium |
| **Improved alias matching** | Fuzzy matching (Levenshtein distance) for diagnosis comparison instead of exact + alias matching. | Low |

#### Mid-Term (v2.0)

| Feature | Description | Complexity |
|---------|-------------|------------|
| **Case editor** | Rich form in admin panel: edit chief complaint, vitals, answer key entries (add/remove diagnoses, set tiers, manage aliases), teaching points. | High |
| **Schedule management** | Visual calendar or drag-and-drop interface for assigning cases to weeks and groups. | Medium |
| **Batch import** | Upload a CSV or JSON file of cases + answer keys. Validate format, preview, then bulk insert. | Medium |
| **Student progress** | Longitudinal view showing VINDICATE coverage improvement, can't-miss hit rate trend, cases completed. Chart.js or Recharts. | Medium |
| **Submission versioning** | Track edit history of differential submissions. Show diff between draft → submitted → resubmitted. | Medium |
| **Feedback regeneration** | Allow students to regenerate AI feedback after editing. Currently feedback is cached and never updated. | Low |
| **Export / reporting** | CSV export of all submissions, diagnoses, and feedback for research analysis. | Low |

#### Long-Term (v3.0)

| Feature | Description | Complexity |
|---------|-------------|------------|
| **Voice AI SP agent** | Real-time conversational simulation using Anthropic streaming. Student interviews a simulated patient, asks questions, receives responses based on `full_case_data`. | Very High |
| **Spaced repetition** | Adaptive review scheduling (SM-2 algorithm) for OSCE prep. Surfaces cases the student is weakest on. | Medium |
| **Peer comparison** | Anonymous benchmarking: "You covered 7/9 VINDICATE categories — the class average is 5.2." No individual identification. | Medium |
| **Illness script builder** | Structured template for building personal illness scripts per diagnosis. Links to specific cases where the diagnosis appeared. | Medium |
| **LMS integration** | Canvas LTI integration for single sign-on and optional grade passback (participation-based, not scored). | High |
| **Multi-institution** | White-label deployment for other medical schools. Configurable branding, case libraries, and frameworks (VINDICATE vs. anatomic vs. custom). | High |
| **Offline mode** | Service worker for offline access to cases, notes, and reference material. Sync when back online. | High |
| **Quote smoother** | Automatic cleanup of student quotes for journey mapping exercises — remove fillers while preserving key clinical language. (From HDS course tooling backlog.) | Medium |

---

## Data Volume Estimates

| Entity | Current (v1) | Expected (Full Semester) |
|--------|-------------|------------------------|
| Users | 10 (8 students + 2 faculty) | 50-100 per cohort |
| Cases | 3 sample | 17-25 per semester |
| Schedule entries | 6 (3 cases x 2 groups) | 50-75 |
| Submissions | 0 (fresh deploy) | 200-500 per semester |
| Notes | 0 | 100-300 |
| OSCE responses | 0 | 200-500 |
| Settings | 4 | 10-15 |

---

## Key Architectural Decisions

| Decision | Choice | Rationale | Revisit When |
|----------|--------|-----------|--------------|
| No auth | Roster picker + localStorage | Speed of prototype; FCM has no sensitive data | Before real clinical data |
| Client-side Supabase writes | Anon key direct from browser | Simpler, fewer API routes | Implementing proper auth |
| Feedback caching | Store in submission JSONB | Avoid redundant AI calls ($) | Feedback regeneration needed |
| Deterministic + AI hybrid | Compare first, narrate second | Consistent core + warm framing | Never — this is the right pattern |
| Shared Supabase instance | `fcm_` prefix tables | Reuse infrastructure | Instance limits or security needs |
| VINDICATE as default | 9 categories with I2 key | Course standard, student familiarity | Multi-institution (configurable) |
| Web Speech API | Browser-native, no cost | Good enough for prototype | Production voice features |
| Vercel deployment | Zero-config Next.js hosting | Fast, free tier sufficient | High traffic or custom domain |
