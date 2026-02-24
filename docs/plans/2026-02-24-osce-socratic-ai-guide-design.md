# OSCE Socratic AI Guide — Design Document

**Date:** 2026-02-24
**Status:** Approved

---

## Overview

Add an opt-in AI chat assistant to each phase of the OSCE practice workflow. The assistant uses the Socratic method to guide clinical reasoning — never gives answers directly. Students initiate every interaction via a floating button.

---

## Design Principles

1. **Opt-in, not intrusive** — Student initiates every interaction. Never auto-pops.
2. **Socratic, never didactic** — AI asks guiding questions. Never lists diagnoses, specific PE maneuvers, or plan items.
3. **Phase-aware** — AI knows current phase, case info, and student's current entries.
4. **Brief exchanges** — 1-3 sentences per response, one question at a time.
5. **Low token cost** — ~800 tokens/exchange, ~$0.01-0.02/session.

---

## UX Pattern

### Responsive Layout

- **Desktop (md+):** Persistent right sidebar (`w-80`, sticky) visible alongside the OSCE form. No toggle needed — always present.
- **Mobile:** Floating `💡` FAB in bottom-right (above nav bar). Tapping opens a shadcn `Sheet` from the bottom (half-screen).

### Chat Panel Header

Shows current phase label and reminder: *"I'll ask questions to help you think — I won't give you the answers."*

### Conversation Starters

Tappable prompt chips shown when chat is empty, phase-specific:

| Phase | Chips |
|-------|-------|
| Door Prep | "Help me think about my differential" · "What questions should I be considering?" · "Am I missing any PE maneuvers?" |
| SOAP Note | "Help me connect findings to diagnoses" · "Is my differential ordering right?" · "What should I think about for my plan?" |
| Feedback | "Explain why I missed this" · "Help me understand this feedback" · "What should I study next?" |

---

## Architecture

### New Files

- `src/components/osce-chat-panel.tsx` — Responsive FAB + sidebar/sheet chat component
- `src/app/api/osce-chat/route.ts` — API route for Socratic AI responses

### Modified Files

- `src/app/(student)/osce/[sessionId]/door-prep/page.tsx` — Add two-column layout wrapper + `<OsceChatPanel>`
- `src/app/(student)/osce/[sessionId]/soap-note/page.tsx` — Same
- `src/app/(student)/osce/[sessionId]/feedback/page.tsx` — Same
- `src/types/osce.ts` — Add `chat_interactions_count?: number` to `OsceSession`

### Layout Integration Pattern

Each OSCE phase page wraps existing content:
```tsx
<div className="flex gap-4">
  <div className="flex-1 min-w-0">
    {/* existing page content — unchanged */}
  </div>
  <OsceChatPanel
    sessionId={sessionId}
    phase="door_prep"
    sessionContext={sessionContext}
  />
</div>
```

---

## `OsceChatPanel` Component

### Props

```typescript
interface OsceChatPanelProps {
  sessionId: string;
  phase: 'door_prep' | 'soap_note' | 'feedback';
  sessionContext: {
    chief_complaint?: string;
    patient_age?: number | null;
    patient_gender?: string | null;
    vitals?: Record<string, string>;
    current_entries: string;       // serialized summary of student's work
    feedback_result?: OSCEFeedbackResult | null; // feedback phase only
  };
}
```

### Internal State

- `messages: { role: 'user' | 'assistant'; content: string }[]`
- `input: string`
- `loading: boolean`
- `isOpen: boolean` (mobile sheet only)

### Behavior

- **Context trimming:** Last 6 messages sent to API. Older messages visible in UI but dropped from payload.
- **Auto-scroll:** `useEffect` scrolls to bottom on new messages.
- **Chip submit:** Clicking a prompt chip pre-fills and auto-submits the input.
- **Desktop:** Panel always visible. `isOpen` state unused on md+.
- **Mobile:** FAB shown, sheet toggles open/closed.

---

## API Route: `POST /api/osce-chat`

### Input

```typescript
{
  session_id: string;
  phase: 'door_prep' | 'soap_note' | 'feedback';
  message: string;
  conversation_history: { role: 'user' | 'assistant'; content: string }[];
}
```

### Process

1. Fetch session from `fcm_osce_sessions`
2. Resolve case data (chief complaint, vitals, demographics) — same logic as `osce-feedback` route; supports `scheduled`, `practice`, and `custom` case sources
3. Build phase-specific system prompt
4. Call `claude-sonnet-4-6`, `max_tokens: 150`
5. Fire-and-forget: increment `chat_interactions_count` on the session row
6. Return `{ response: string }`

### Output

```typescript
{ response: string }
```

### System Prompt Template

```
You are a kind, encouraging clinical teaching attending guiding an M1-M2
medical student through OSCE preparation. Use the Socratic method — ask
guiding questions, never give direct answers.

RULES:
- Never name diagnoses, specific maneuvers, or plan items directly
- Ask ONE question at a time
- 1-3 sentences max
- Reference the student's current work when possible
- Use VINDICATE as a scaffolding tool when appropriate
- Be warm, reduce anxiety, build confidence
- If asked to "just tell me", redirect with a narrower guiding question
- If asked off-topic, redirect back to their clinical reasoning

PHASE: {phase}
CASE: {chief_complaint}, {age}, {gender}, {vitals}
STUDENT'S WORK: {current_entries}
[feedback phase only] ANSWER KEY: {answer_key}
```

Note: The answer key is included **only** in the feedback phase system prompt. During Door Prep and SOAP Note, the AI has no access to correct answers — it guides purely from the case presentation and the student's entries.

### Context Serialization

Each page computes a `current_entries` string from in-memory state:

| Phase | Serialization |
|-------|---------------|
| Door Prep | `"Diagnoses: [X, Y]. Questions listed: [a, b]. PE maneuvers: [c, d]."` |
| SOAP Note | `"Revised diagnoses: [X, Y]. Subjective notes: '...'. Objective notes: '...'"` |
| Feedback | `"Strengths: [a]. Improvements: [b]. Missed diagnoses: [c]."` |

---

## Data Model

### Database

```sql
ALTER TABLE fcm_osce_sessions
ADD COLUMN IF NOT EXISTS chat_interactions_count integer DEFAULT 0;
```

### TypeScript

```typescript
// In OsceSession interface (src/types/osce.ts)
chat_interactions_count?: number;
```

### Analytics write (fire-and-forget in API route)

```typescript
supabase
  .from('fcm_osce_sessions')
  .update({ chat_interactions_count: rawCount + 1 })
  .eq('id', session_id);
// no await — don't block the response
```

Since Supabase JS v2 doesn't support SQL expressions in `.update()`, the API fetches the current count first, then increments it in the update.

---

## Token Budget

| Item | Tokens |
|------|--------|
| System prompt | ~200 |
| Last 6 conversation messages | ~300 |
| Student's current entries (serialized) | ~200 |
| AI response | ~100–150 |
| **Total per exchange** | **~800** |
| **Typical session (5–8 exchanges)** | **~$0.01–0.02** |

---

## What This Is NOT

- Not a chatbot that does the work for the student
- Not a free-form conversation about anything
- Not a reference tool ("what is pericarditis?")
- Not always required — fully opt-in

Off-topic or knowledge-recall questions are redirected:
> "That's a great question to look up after — for now, let's focus on your differential. Looking at your list, what categories might you be missing?"
