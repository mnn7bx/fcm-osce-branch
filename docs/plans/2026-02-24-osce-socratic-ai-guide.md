# OSCE Socratic AI Guide Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an opt-in Socratic AI chat assistant to all three OSCE phase pages (Door Prep, SOAP Note, Feedback), implemented as a right sidebar on desktop and a FAB + bottom sheet on mobile.

**Architecture:** A single `OsceChatPanel` component handles both responsive layouts using a shadcn Sheet for mobile and a sticky sidebar for desktop. A new `POST /api/osce-chat` route builds phase-aware system prompts and calls `claude-sonnet-4-6` with `max_tokens: 150`. Chat history is ephemeral (React state); interaction count is tracked on the session row.

**Tech Stack:** Next.js 16, TypeScript, Tailwind v4, shadcn/ui (Sheet), Anthropic SDK (`claude-sonnet-4-6`), Supabase

---

## Task 1: Add shadcn Sheet component

The mobile bottom sheet uses shadcn's Sheet component, which is not yet installed.

**Files:**
- Create: `src/components/ui/sheet.tsx` (via CLI)

**Step 1: Install the Sheet component**

```bash
npx shadcn@latest add sheet
```

Expected: Creates `src/components/ui/sheet.tsx`. If prompted about overwriting existing files, accept.

**Step 2: Verify the file exists**

```bash
ls src/components/ui/sheet.tsx
```

Expected: file listed

**Step 3: Commit**

```bash
git add src/components/ui/sheet.tsx
git commit -m "chore: add shadcn Sheet component"
```

---

## Task 2: Update `OsceSession` type

Add `chat_interactions_count` to the TypeScript interface.

**Files:**
- Modify: `src/types/osce.ts`

**Step 1: Open `src/types/osce.ts` and locate the `OsceSession` interface (line ~51)**

Find the closing fields of the interface — around `created_at` and `updated_at`.

**Step 2: Add the new optional field before the closing brace**

In the `OsceSession` interface, after `updated_at: string;`, add:

```typescript
  chat_interactions_count?: number;
```

The interface should end like:
```typescript
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  chat_interactions_count?: number;
}
```

**Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to `OsceSession`

**Step 4: Commit**

```bash
git add src/types/osce.ts
git commit -m "feat: add chat_interactions_count to OsceSession type"
```

---

## Task 3: Create `POST /api/osce-chat` route

This is the API endpoint the chat panel calls. It fetches session data, builds a phase-specific Socratic system prompt, calls Claude, and increments the interaction counter.

**Files:**
- Create: `src/app/api/osce-chat/route.ts`

**Step 1: Create the file**

Create `src/app/api/osce-chat/route.ts` with this complete implementation:

```typescript
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase";
import { PRACTICE_CASES } from "@/data/practice-cases";
import type { OsceSession, PracticeCase } from "@/types";

const anthropic = new Anthropic();

type Phase = "door_prep" | "soap_note" | "feedback";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function buildSystemPrompt(
  phase: Phase,
  chiefComplaint: string,
  demographics: string,
  vitals: string,
  currentEntries: string,
  answerKey?: string
): string {
  const phaseLabel =
    phase === "door_prep"
      ? "Door Prep"
      : phase === "soap_note"
        ? "SOAP Note"
        : "Feedback Review";

  return `You are a kind, encouraging clinical teaching attending guiding an M1-M2 medical student through OSCE preparation. Use the Socratic method — ask guiding questions, never give direct answers.

RULES:
- Never name diagnoses, specific PE maneuvers, or plan items directly
- Ask ONE question at a time
- Keep responses to 1-3 sentences maximum
- Reference what the student has already entered to make guidance specific
- Use the VINDICATE framework (Vascular, Infectious, Neoplastic, Degenerative, Iatrogenic, Congenital, Autoimmune/Allergic, Traumatic, Endocrine/Metabolic) as a scaffolding tool when appropriate
- Be warm and encouraging — reduce anxiety, build confidence
- If the student asks you to just tell them, gently redirect: "Let's work through this together — " followed by a narrower guiding question
- If the student asks an off-topic or knowledge-recall question, redirect: "Great question to look up after — for now, let's focus on your clinical reasoning. [narrower question]"

CURRENT PHASE: ${phaseLabel}
CASE: ${chiefComplaint}${demographics ? ` | ${demographics}` : ""}${vitals ? ` | Vitals: ${vitals}` : ""}
STUDENT'S CURRENT WORK: ${currentEntries || "Nothing entered yet."}${answerKey ? `\nANSWER KEY (for reflection guidance only): ${answerKey}` : ""}`;
}

export async function POST(request: NextRequest) {
  try {
    const { session_id, phase, message, conversation_history } =
      (await request.json()) as {
        session_id: string;
        phase: Phase;
        message: string;
        conversation_history: ChatMessage[];
      };

    if (!session_id || !phase || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Fetch session
    const { data: session, error: sessError } = await supabase
      .from("fcm_osce_sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (sessError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const sess = session as OsceSession;

    // Resolve case info
    let chiefComplaint = "";
    let demographics = "";
    let vitals = "";
    let answerKey = "";

    if (sess.case_source === "practice" && sess.practice_case_id) {
      const pc = PRACTICE_CASES.find(
        (c: PracticeCase) => c.id === sess.practice_case_id
      );
      if (pc) {
        chiefComplaint = pc.chief_complaint;
        demographics = [
          pc.patient_age ? `${pc.patient_age}yo` : "",
          pc.patient_gender ?? "",
        ]
          .filter(Boolean)
          .join(" ");
        vitals = pc.vitals
          ? Object.entries(pc.vitals)
              .map(([k, v]) => `${k}: ${v}`)
              .join(", ")
          : "";
        if (phase === "feedback") {
          answerKey = pc.correct_diagnosis;
        }
      }
    } else if (sess.case_id) {
      const { data: caseData } = await supabase
        .from("fcm_cases")
        .select(
          "chief_complaint, patient_age, patient_gender, vitals, differential_answer_key"
        )
        .eq("id", sess.case_id)
        .single();

      if (caseData) {
        chiefComplaint = caseData.chief_complaint;
        demographics = [
          caseData.patient_age ? `${caseData.patient_age}yo` : "",
          caseData.patient_gender ?? "",
        ]
          .filter(Boolean)
          .join(" ");
        vitals = caseData.vitals
          ? Object.entries(caseData.vitals as Record<string, string>)
              .map(([k, v]) => `${k}: ${v}`)
              .join(", ")
          : "";
        if (phase === "feedback" && caseData.differential_answer_key) {
          answerKey = (
            caseData.differential_answer_key as { diagnosis: string }[]
          )
            .map((d) => d.diagnosis)
            .join(", ");
        }
      }
    }

    // Build system prompt
    // current_entries is passed in the message payload via conversation_history context;
    // extract it from the request body
    const body = await request.text().catch(() => "{}");
    // We already parsed above — pull current_entries from the parsed object
    // Re-parse since we consumed the body stream above... use the already-parsed values
    // Note: current_entries is an optional extra field clients can send
    const currentEntries =
      (
        JSON.parse(
          (
            await new Response(request.body).text().catch(() => "{}")
          )
        ) as { current_entries?: string }
      ).current_entries ?? "";

    const systemPrompt = buildSystemPrompt(
      phase,
      chiefComplaint,
      demographics,
      vitals,
      currentEntries,
      answerKey || undefined
    );

    // Trim to last 6 messages for context window efficiency
    const trimmedHistory = conversation_history.slice(-6);

    // Call Claude
    const claudeResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 150,
      system: systemPrompt,
      messages: [
        ...trimmedHistory.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: message },
      ],
    });

    const responseText =
      claudeResponse.content[0].type === "text"
        ? claudeResponse.content[0].text
        : "";

    // Fire-and-forget: increment interaction count
    const currentCount = sess.chat_interactions_count ?? 0;
    supabase
      .from("fcm_osce_sessions")
      .update({ chat_interactions_count: currentCount + 1 })
      .eq("id", session_id)
      .then(() => {})
      .catch(() => {});

    return NextResponse.json({ response: responseText });
  } catch (error) {
    console.error("OSCE chat error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
```

**⚠️ Note on `current_entries`:** The implementation above has a bug — the request body stream is already consumed by the first `request.json()` call. Fix this by including `current_entries` in the initial parsed object instead:

Replace the top of the POST handler with:

```typescript
const { session_id, phase, message, conversation_history, current_entries } =
  (await request.json()) as {
    session_id: string;
    phase: Phase;
    message: string;
    conversation_history: ChatMessage[];
    current_entries?: string;
  };
```

And remove the broken `body`/`currentEntries` re-parse block. Use `current_entries ?? ""` directly.

Here is the **correct, final version** of the route:

```typescript
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase";
import { PRACTICE_CASES } from "@/data/practice-cases";
import type { OsceSession, PracticeCase } from "@/types";

const anthropic = new Anthropic();

type Phase = "door_prep" | "soap_note" | "feedback";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function buildSystemPrompt(
  phase: Phase,
  chiefComplaint: string,
  demographics: string,
  vitals: string,
  currentEntries: string,
  answerKey?: string
): string {
  const phaseLabel =
    phase === "door_prep"
      ? "Door Prep"
      : phase === "soap_note"
        ? "SOAP Note"
        : "Feedback Review";

  return `You are a kind, encouraging clinical teaching attending guiding an M1-M2 medical student through OSCE preparation. Use the Socratic method — ask guiding questions, never give direct answers.

RULES:
- Never name diagnoses, specific PE maneuvers, or plan items directly
- Ask ONE question at a time
- Keep responses to 1-3 sentences maximum
- Reference what the student has already entered to make guidance specific
- Use VINDICATE (Vascular, Infectious, Neoplastic, Degenerative, Iatrogenic, Congenital, Autoimmune/Allergic, Traumatic, Endocrine/Metabolic) as a scaffolding tool when appropriate
- Be warm and encouraging — reduce anxiety, build confidence
- If the student asks you to just tell them, gently redirect: "Let's work through this together — " followed by a narrower guiding question
- If the student asks an off-topic question, redirect: "Great question to look up after — for now, let's focus on your clinical reasoning. [narrower question]"

CURRENT PHASE: ${phaseLabel}
CASE: ${chiefComplaint}${demographics ? ` | ${demographics}` : ""}${vitals ? ` | Vitals: ${vitals}` : ""}
STUDENT'S CURRENT WORK: ${currentEntries || "Nothing entered yet."}${answerKey ? `\nANSWER KEY (for reflection guidance only): ${answerKey}` : ""}`;
}

export async function POST(request: NextRequest) {
  try {
    const { session_id, phase, message, conversation_history, current_entries } =
      (await request.json()) as {
        session_id: string;
        phase: Phase;
        message: string;
        conversation_history: ChatMessage[];
        current_entries?: string;
      };

    if (!session_id || !phase || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: session, error: sessError } = await supabase
      .from("fcm_osce_sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (sessError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const sess = session as OsceSession;

    let chiefComplaint = "";
    let demographics = "";
    let vitals = "";
    let answerKey = "";

    if (sess.case_source === "practice" && sess.practice_case_id) {
      const pc = PRACTICE_CASES.find(
        (c: PracticeCase) => c.id === sess.practice_case_id
      );
      if (pc) {
        chiefComplaint = pc.chief_complaint;
        demographics = [
          pc.patient_age ? `${pc.patient_age}yo` : "",
          pc.patient_gender ?? "",
        ]
          .filter(Boolean)
          .join(" ");
        vitals = pc.vitals
          ? Object.entries(pc.vitals)
              .map(([k, v]) => `${k}: ${v}`)
              .join(", ")
          : "";
        if (phase === "feedback") {
          answerKey = pc.correct_diagnosis;
        }
      }
    } else if (sess.case_id) {
      const { data: caseData } = await supabase
        .from("fcm_cases")
        .select(
          "chief_complaint, patient_age, patient_gender, vitals, differential_answer_key"
        )
        .eq("id", sess.case_id)
        .single();

      if (caseData) {
        chiefComplaint = caseData.chief_complaint;
        demographics = [
          caseData.patient_age ? `${caseData.patient_age}yo` : "",
          caseData.patient_gender ?? "",
        ]
          .filter(Boolean)
          .join(" ");
        vitals = caseData.vitals
          ? Object.entries(caseData.vitals as Record<string, string>)
              .map(([k, v]) => `${k}: ${v}`)
              .join(", ")
          : "";
        if (phase === "feedback" && caseData.differential_answer_key) {
          answerKey = (
            caseData.differential_answer_key as { diagnosis: string }[]
          )
            .map((d) => d.diagnosis)
            .join(", ");
        }
      }
    }

    const systemPrompt = buildSystemPrompt(
      phase,
      chiefComplaint,
      demographics,
      vitals,
      current_entries ?? "",
      answerKey || undefined
    );

    const trimmedHistory = conversation_history.slice(-6);

    const claudeResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 150,
      system: systemPrompt,
      messages: [
        ...trimmedHistory.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: message },
      ],
    });

    const responseText =
      claudeResponse.content[0].type === "text"
        ? claudeResponse.content[0].text
        : "";

    // Fire-and-forget: increment interaction count
    const currentCount = sess.chat_interactions_count ?? 0;
    supabase
      .from("fcm_osce_sessions")
      .update({ chat_interactions_count: currentCount + 1 })
      .eq("id", session_id)
      .then(() => {})
      .catch(() => {});

    return NextResponse.json({ response: responseText });
  } catch (error) {
    console.error("OSCE chat error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors in `osce-chat/route.ts`

**Step 3: Commit**

```bash
git add src/app/api/osce-chat/route.ts
git commit -m "feat: add POST /api/osce-chat Socratic AI route"
```

---

## Task 4: Create `OsceChatPanel` component

This is the main UI component: a sticky right sidebar on desktop (`md+`) and a floating lightbulb FAB + bottom Sheet on mobile.

**Files:**
- Create: `src/components/osce-chat-panel.tsx`

**Context about the project layout:**
- Tailwind v4 is used — standard responsive prefixes (`md:`) work as expected
- shadcn `Sheet` is now installed at `src/components/ui/sheet.tsx`
- Lucide icons are available
- The project uses `className` with Tailwind utility classes throughout
- No test framework exists — verify by running `npm run build` after implementation

**Step 1: Create the component file**

Create `src/components/osce-chat-panel.tsx`:

```typescript
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Lightbulb, Send, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { OSCEFeedbackResult } from "@/types";

export type ChatPhase = "door_prep" | "soap_note" | "feedback";

export interface OsceChatSessionContext {
  chief_complaint?: string;
  patient_age?: number | null;
  patient_gender?: string | null;
  vitals?: Record<string, string>;
  current_entries: string;
  feedback_result?: OSCEFeedbackResult | null;
}

interface OsceChatPanelProps {
  sessionId: string;
  phase: ChatPhase;
  sessionContext: OsceChatSessionContext;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const PHASE_LABELS: Record<ChatPhase, string> = {
  door_prep: "Door Prep Guide",
  soap_note: "SOAP Note Guide",
  feedback: "Review Guide",
};

const PROMPT_CHIPS: Record<ChatPhase, string[]> = {
  door_prep: [
    "Help me think about my differential",
    "What questions should I be considering?",
    "Am I missing any PE maneuvers?",
  ],
  soap_note: [
    "Help me connect findings to diagnoses",
    "Is my differential ordering right?",
    "What should I think about for my plan?",
  ],
  feedback: [
    "Explain why I missed a diagnosis",
    "Help me understand this feedback",
    "What should I study next?",
  ],
};

function ChatContent({
  phase,
  messages,
  input,
  loading,
  onSend,
  onChipClick,
  onInputChange,
}: {
  phase: ChatPhase;
  messages: Message[];
  input: string;
  loading: boolean;
  onSend: () => void;
  onChipClick: (chip: string) => void;
  onInputChange: (v: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="flex flex-col h-full">
      {/* Subtitle */}
      <p className="text-[11px] text-muted-foreground px-3 pb-2 border-b">
        I&apos;ll ask questions to help you think — I won&apos;t give you the
        answers.
      </p>

      {/* Message area */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center py-2">
              Not sure where to start? Try one of these:
            </p>
            <div className="flex flex-col gap-2">
              {PROMPT_CHIPS[phase].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => onChipClick(chip)}
                  className="text-left text-xs px-3 py-2 rounded-full border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t p-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="Ask a question..."
          disabled={loading}
          className="flex-1 text-sm rounded-full border px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        />
        <Button
          size="icon"
          onClick={onSend}
          disabled={loading || !input.trim()}
          className="rounded-full h-8 w-8 shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function OsceChatPanel({
  sessionId,
  phase,
  sessionContext,
}: OsceChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMessage: Message = { role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/osce-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            phase,
            message: trimmed,
            conversation_history: messages,
            current_entries: sessionContext.current_entries,
          }),
        });

        if (res.ok) {
          const { response } = await res.json();
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: response },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "Sorry, I couldn't connect right now. Please try again.",
            },
          ]);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, I couldn't connect right now. Please try again.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [sessionId, phase, messages, sessionContext.current_entries, loading]
  );

  const handleChipClick = useCallback(
    (chip: string) => {
      sendMessage(chip);
    },
    [sendMessage]
  );

  return (
    <>
      {/* ── Desktop sidebar (md+) ── */}
      <aside className="hidden md:flex flex-col w-80 shrink-0 self-start sticky top-4 h-[calc(100vh-6rem)] rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-3 pt-3 pb-2">
          <Lightbulb className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium">{PHASE_LABELS[phase]}</span>
        </div>
        <ChatContent
          phase={phase}
          messages={messages}
          input={input}
          loading={loading}
          onSend={() => sendMessage(input)}
          onChipClick={handleChipClick}
          onInputChange={setInput}
        />
      </aside>

      {/* ── Mobile FAB (< md) ── */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed bottom-20 right-4 z-40 flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground shadow-lg px-4 py-2.5 text-sm font-medium"
        aria-label="Open AI guide"
      >
        <Lightbulb className="h-4 w-4" />
        <span>Need a nudge?</span>
      </button>

      {/* ── Mobile bottom Sheet (< md) ── */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="bottom"
          className="h-[60vh] flex flex-col p-0 rounded-t-xl"
        >
          <SheetHeader className="px-3 pt-3 pb-0">
            <SheetTitle className="flex items-center gap-2 text-sm">
              <Lightbulb className="h-4 w-4 text-primary" />
              {PHASE_LABELS[phase]}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0">
            <ChatContent
              phase={phase}
              messages={messages}
              input={input}
              loading={loading}
              onSend={() => sendMessage(input)}
              onChipClick={handleChipClick}
              onInputChange={setInput}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors in `osce-chat-panel.tsx`

**Step 3: Commit**

```bash
git add src/components/osce-chat-panel.tsx
git commit -m "feat: add OsceChatPanel component (Socratic AI guide)"
```

---

## Task 5: Integrate `OsceChatPanel` into Door Prep page

Wrap the existing page content in a two-column flex layout and pass the context prop.

**Files:**
- Modify: `src/app/(student)/osce/[sessionId]/door-prep/page.tsx`

**Step 1: Add the import**

At the top of `door-prep/page.tsx`, add to the existing imports:

```typescript
import { OsceChatPanel } from "@/components/osce-chat-panel";
import type { OsceChatSessionContext } from "@/components/osce-chat-panel";
```

**Step 2: Build `sessionContext` from existing state**

Just before the `return (` statement in the `DoorPrepPage` component (around line 161), add:

```typescript
const sessionContext: OsceChatSessionContext = {
  chief_complaint: caseInfo?.chief_complaint,
  patient_age: caseInfo?.patient_age,
  patient_gender: caseInfo?.patient_gender,
  vitals: caseInfo?.vitals,
  current_entries: diagnoses.length > 0
    ? `Diagnoses: ${diagnoses.map((d) => d.diagnosis).join(", ")}. ` +
      `History questions: ${diagnoses.flatMap((d) => d.history_questions.filter((q) => q.trim())).join("; ") || "none"}. ` +
      `PE maneuvers: ${diagnoses.flatMap((d) => d.pe_maneuvers).join(", ") || "none"}.`
    : "No diagnoses entered yet.",
};
```

**Step 3: Wrap the return JSX**

The current return is:
```tsx
return (
  <div className="p-4 space-y-4 max-w-2xl mx-auto">
    ...existing content...
  </div>
);
```

Change it to:
```tsx
return (
  <div className="flex gap-4 p-4 max-w-5xl mx-auto">
    <div className="flex-1 min-w-0 space-y-4">
      <OsceProgress currentPhase="door_prep" sessionId={sessionId} sessionCompleted={readOnly} />
      {/* ...rest of existing content (everything except the outer div)... */}
    </div>
    <OsceChatPanel
      sessionId={sessionId}
      phase="door_prep"
      sessionContext={sessionContext}
    />
  </div>
);
```

Important: move all existing JSX children into the inner `<div className="flex-1 min-w-0 space-y-4">`. The `<OsceProgress>` that was previously the first child stays as the first child of the inner div.

**Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/app/\(student\)/osce/\[sessionId\]/door-prep/page.tsx
git commit -m "feat: integrate OsceChatPanel into Door Prep page"
```

---

## Task 6: Integrate `OsceChatPanel` into SOAP Note page

**Files:**
- Modify: `src/app/(student)/osce/[sessionId]/soap-note/page.tsx`

**Step 1: Add the import**

```typescript
import { OsceChatPanel } from "@/components/osce-chat-panel";
import type { OsceChatSessionContext } from "@/components/osce-chat-panel";
```

**Step 2: Find where `soapContext` and `diagnoses` (the `RevisedDiagnosis[]` state) are available**

The soap-note page already has `soapContext` (the S/O text) and `diagnoses` (array of `RevisedDiagnosis`) in state. Just before the `return (` at line ~450, add:

```typescript
const sessionContext: OsceChatSessionContext = {
  current_entries: diagnoses.length > 0
    ? `Revised diagnoses: ${diagnoses.map((d) => d.diagnosis).join(", ")}. ` +
      `Subjective review: ${soapContext?.subjective?.slice(0, 200) ?? "not yet reviewed"}. ` +
      `Objective review: ${soapContext?.objective?.slice(0, 200) ?? "not yet reviewed"}.`
    : "No revised diagnoses entered yet.",
};
```

**Step 3: Wrap the return JSX**

The current root return div is:
```tsx
<div className="p-4 space-y-4 max-w-6xl mx-auto">
```

Change to:
```tsx
<div className="flex gap-4 p-4 max-w-7xl mx-auto">
  <div className="flex-1 min-w-0 space-y-4">
    {/* all existing children go here */}
  </div>
  <OsceChatPanel
    sessionId={sessionId}
    phase="soap_note"
    sessionContext={sessionContext}
  />
</div>
```

**Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/app/\(student\)/osce/\[sessionId\]/soap-note/page.tsx
git commit -m "feat: integrate OsceChatPanel into SOAP Note page"
```

---

## Task 7: Integrate `OsceChatPanel` into Feedback page

**Files:**
- Modify: `src/app/(student)/osce/[sessionId]/feedback/page.tsx`

**Step 1: Add the import**

```typescript
import { OsceChatPanel } from "@/components/osce-chat-panel";
import type { OsceChatSessionContext } from "@/components/osce-chat-panel";
```

**Step 2: Build `sessionContext` from `feedback` and `session` state**

The feedback page has `feedback` (type `OSCEFeedbackResult | null`) and `session` (type `OsceSession | null`) in state. Just before the main `return (` (the one at line ~208), add:

```typescript
const sessionContext: OsceChatSessionContext = {
  current_entries: feedback
    ? `Strengths: ${feedback.strengths.join("; ")}. ` +
      `Improvements: ${feedback.improvements.join("; ")}. ` +
      (feedback.cant_miss?.length
        ? `Missed can't-miss diagnoses: ${feedback.cant_miss.join(", ")}.`
        : "")
    : "Feedback not yet loaded.",
  feedback_result: feedback,
};
```

**Step 3: Wrap the return JSX**

The current root return div is:
```tsx
<div className="p-4 space-y-4 max-w-2xl mx-auto">
```

Change to:
```tsx
<div className="flex gap-4 p-4 max-w-5xl mx-auto">
  <div className="flex-1 min-w-0 space-y-4">
    {/* all existing children go here */}
  </div>
  <OsceChatPanel
    sessionId={sessionId}
    phase="feedback"
    sessionContext={sessionContext}
  />
</div>
```

**Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/app/\(student\)/osce/\[sessionId\]/feedback/page.tsx
git commit -m "feat: integrate OsceChatPanel into Feedback page"
```

---

## Task 8: Add `chat_interactions_count` column to Supabase

The analytics counter requires this column on `fcm_osce_sessions`.

**Step 1: Run the migration in Supabase SQL editor**

Open the Supabase dashboard for project `zuksjgrkxyjpkatxeebg`, navigate to SQL Editor, and run:

```sql
ALTER TABLE fcm_osce_sessions
ADD COLUMN IF NOT EXISTS chat_interactions_count integer DEFAULT 0;
```

Expected: "Success. No rows affected."

**Step 2: Verify the column exists**

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'fcm_osce_sessions'
AND column_name = 'chat_interactions_count';
```

Expected: one row returned with `integer` type and `0` default.

**Step 3: Commit a note (no code change needed — type was already updated in Task 2)**

```bash
git commit --allow-empty -m "chore: applied chat_interactions_count migration to Supabase"
```

---

## Task 9: Verify full build and smoke test

**Step 1: Run a production build to catch any remaining issues**

```bash
npm run build
```

Expected: build completes without TypeScript or import errors. (Serwist/PWA warnings are expected and okay.)

**Step 2: Start dev server and smoke test**

```bash
npm run dev
```

Open an OSCE session in the browser. Verify:

1. **Door Prep page:**
   - Desktop: right sidebar with lightbulb icon and "Door Prep Guide" title appears
   - Mobile (resize to < 768px): sidebar is hidden, FAB "Need a nudge?" button appears above nav
   - Tap/click opens chat with 3 prompt chips
   - Click a chip → message appears → AI responds with a guiding question (not an answer)
   - Type a message and press Enter or click send button → works

2. **SOAP Note page:** same verification

3. **Feedback page:** same verification, but with feedback-specific chips

4. **Analytics:** After a chat exchange, check Supabase `fcm_osce_sessions` — `chat_interactions_count` should increment

**Step 3: Final commit if any small fixes were needed**

```bash
git add -A
git commit -m "fix: post-integration cleanup"
```

---

## Summary of Files Changed

| File | Action |
|------|--------|
| `src/components/ui/sheet.tsx` | Created (shadcn install) |
| `src/components/osce-chat-panel.tsx` | Created |
| `src/app/api/osce-chat/route.ts` | Created |
| `src/types/osce.ts` | Modified — added `chat_interactions_count` |
| `src/app/(student)/osce/[sessionId]/door-prep/page.tsx` | Modified — layout + panel |
| `src/app/(student)/osce/[sessionId]/soap-note/page.tsx` | Modified — layout + panel |
| `src/app/(student)/osce/[sessionId]/feedback/page.tsx` | Modified — layout + panel |
| Supabase `fcm_osce_sessions` | Migration — `chat_interactions_count integer DEFAULT 0` |
