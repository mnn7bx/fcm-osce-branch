"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import { useAutosave } from "@/lib/use-autosave";
import type { FcmCase, FcmSubmission, FcmNote, DiagnosisEntry } from "@/types";
import { VINDICATE_CATEGORIES } from "@/types";
import { searchDiagnoses, type DiagnosisSearchResult } from "@/data/diagnosis-lookup";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  Send,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Cloud,
  CloudOff,
  AlertCircle,
  StickyNote,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

function SaveStatusIndicator({ status }: { status: string }) {
  if (status === "saving") {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Saving...
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
        <Cloud className="h-3 w-3" />
        Saved
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-1 text-xs text-destructive">
        <CloudOff className="h-3 w-3" />
        Save failed
      </span>
    );
  }
  return null;
}

function getCategories(d: DiagnosisEntry): string[] {
  if (d.vindicate_categories && d.vindicate_categories.length > 0) {
    return d.vindicate_categories;
  }
  if (d.vindicate_category) return [d.vindicate_category];
  return [];
}

function BulkVindicateSection({
  diagnoses,
  onToggleCategory,
}: {
  diagnoses: DiagnosisEntry[];
  onToggleCategory: (index: number, key: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const coveredKeys = new Set(diagnoses.flatMap(getCategories));

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <div>
            <h3 className="text-sm font-medium">
              Categorize with VINDICATE{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {coveredKeys.size} of {VINDICATE_CATEGORIES.length} categories covered
            </p>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </button>

        {expanded && (
          <div className="space-y-3 pt-2 border-t">
            {diagnoses.map((entry, index) => (
              <div key={`${entry.diagnosis}-${index}`} className="space-y-1">
                <p className="text-xs font-medium truncate">
                  {index + 1}. {entry.diagnosis}
                </p>
                <div className="flex flex-wrap gap-1">
                  {VINDICATE_CATEGORIES.map((cat) => {
                    const isSelected = getCategories(entry).includes(cat.key);
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        title={cat.label}
                        onClick={() => onToggleCategory(index, cat.key)}
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded text-xs font-medium transition-colors",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        )}
                      >
                        {cat.key === "I2" ? "I" : cat.key}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ConfidenceRating({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (val: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground mr-1">Confidence:</span>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors",
            value === n
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

interface DiagnosisRowProps {
  entry: DiagnosisEntry;
  index: number;
  total: number;
  onToggleCategory: (index: number, key: string) => void;
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onUpdateReasoning: (index: number, reasoning: string) => void;
  onUpdateConfidence: (index: number, confidence: number) => void;
}

function DiagnosisRow({
  entry,
  index,
  total,
  onToggleCategory,
  onRemove,
  onMoveUp,
  onMoveDown,
  onUpdateReasoning,
  onUpdateConfidence,
}: DiagnosisRowProps) {
  const [showReasoning, setShowReasoning] = useState(Boolean(entry.reasoning));

  return (
    <Card className="py-3">
      <CardContent className="px-4 py-0 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-xs text-muted-foreground font-medium shrink-0">
              {index + 1}.
            </span>
            <span className="text-sm font-medium truncate">
              {entry.diagnosis}
            </span>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onMoveUp(index)}
              disabled={index === 0}
              aria-label="Move up"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onMoveDown(index)}
              disabled={index === total - 1}
              aria-label="Move down"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onRemove(index)}
              aria-label="Remove diagnosis"
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <ConfidenceRating
          value={entry.confidence}
          onChange={(val) => onUpdateConfidence(index, val)}
        />
        {!showReasoning ? (
          <button
            type="button"
            onClick={() => setShowReasoning(true)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Why this diagnosis?
          </button>
        ) : (
          <Textarea
            value={entry.reasoning || ""}
            onChange={(e) => onUpdateReasoning(index, e.target.value)}
            placeholder="What about this patient makes you consider this? (optional)"
            className="min-h-16 text-xs"
            rows={2}
          />
        )}
      </CardContent>
    </Card>
  );
}

export default function CaseDifferentialPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const { user } = useUser();
  const router = useRouter();

  const [caseData, setCaseData] = useState<FcmCase | null>(null);
  const [submission, setSubmission] = useState<FcmSubmission | null>(null);
  const [diagnoses, setDiagnoses] = useState<DiagnosisEntry[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<DiagnosisSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [noteContent, setNoteContent] = useState("");
  const [questionContent, setQuestionContent] = useState("");
  const [questionSent, setQuestionSent] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [sendingQuestion, setSendingQuestion] = useState(false);
  const noteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isSubmitted =
    submission?.status === "submitted" ||
    submission?.status === "resubmitted";

  const { saveStatus } = useAutosave(
    user?.id ?? "",
    caseId,
    diagnoses,
    !isSubmitted && Boolean(user?.id) && !loading
  );

  useEffect(() => {
    if (!user?.id || !caseId) return;

    async function fetchData() {
      const [caseResult, submissionResult, noteResult] = await Promise.all([
        supabase.from("fcm_cases").select("*").eq("id", caseId).single(),
        supabase
          .from("fcm_submissions")
          .select("*")
          .eq("user_id", user!.id)
          .eq("case_id", caseId)
          .maybeSingle(),
        supabase
          .from("fcm_notes")
          .select("*")
          .eq("user_id", user!.id)
          .eq("case_id", caseId)
          .maybeSingle(),
      ]);

      if (caseResult.data) {
        setCaseData(caseResult.data as FcmCase);
      }

      if (submissionResult.data) {
        const sub = submissionResult.data as FcmSubmission;
        setSubmission(sub);
        setDiagnoses(sub.diagnoses ?? []);
      }

      if (noteResult.data) {
        const note = noteResult.data as FcmNote;
        setNoteContent(note.content || "");
        if (note.is_sent_to_instructor) setQuestionSent(true);
      }

      setLoading(false);
    }

    fetchData();
  }, [user?.id, caseId]);

  function handleInputChange(value: string) {
    setInputValue(value);
    if (value.trim().length >= 2) {
      const results = searchDiagnoses(value);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setHighlightedIndex(-1);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }

  const addDiagnosisWithName = useCallback(
    function addDiagnosisWithName(name: string) {
      const trimmed = name.trim();
      if (!trimmed) return;

      const alreadyExists = diagnoses.some(
        (d) => d.diagnosis.toLowerCase() === trimmed.toLowerCase()
      );
      if (alreadyExists) return;

      setDiagnoses((prev) => [
        ...prev,
        {
          diagnosis: trimmed,
          sort_order: prev.length,
        },
      ]);
      setInputValue("");
      setSuggestions([]);
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    },
    [diagnoses]
  );

  const addDiagnosis = useCallback(
    function addDiagnosis() {
      addDiagnosisWithName(inputValue);
    },
    [inputValue, addDiagnosisWithName]
  );

  function toggleCategory(index: number, key: string): void {
    setDiagnoses((prev) =>
      prev.map((d, i) => {
        if (i !== index) return d;
        const current = getCategories(d);
        const next = current.includes(key)
          ? current.filter((k) => k !== key)
          : [...current, key];
        return { ...d, vindicate_categories: next, vindicate_category: undefined };
      })
    );
  }

  function removeDiagnosis(index: number): void {
    setDiagnoses((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((d, i) => ({ ...d, sort_order: i }))
    );
  }

  function moveUp(index: number): void {
    if (index === 0) return;
    setDiagnoses((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next.map((d, i) => ({ ...d, sort_order: i }));
    });
  }

  function updateReasoning(index: number, reasoning: string): void {
    setDiagnoses((prev) =>
      prev.map((d, i) => (i === index ? { ...d, reasoning } : d))
    );
  }

  function updateConfidence(index: number, confidence: number): void {
    setDiagnoses((prev) =>
      prev.map((d, i) => (i === index ? { ...d, confidence } : d))
    );
  }

  function moveDown(index: number): void {
    setDiagnoses((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next.map((d, i) => ({ ...d, sort_order: i }));
    });
  }

  async function handleSubmit(): Promise<void> {
    if (!user?.id || diagnoses.length === 0) return;

    setSubmitting(true);

    const { error } = await supabase.from("fcm_submissions").upsert(
      {
        user_id: user.id,
        case_id: caseId,
        diagnoses,
        status: "submitted" as const,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,case_id" }
    );

    setSubmitting(false);

    if (!error) {
      router.push(`/cases/${caseId}/feedback`);
    }
  }

  function handleNoteChange(value: string) {
    setNoteContent(value);
    if (noteTimerRef.current) clearTimeout(noteTimerRef.current);
    noteTimerRef.current = setTimeout(async () => {
      setSavingNote(true);
      await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user?.id, case_id: caseId, content: value }),
      });
      setSavingNote(false);
    }, 1000);
  }

  async function handleSendQuestion() {
    if (!questionContent.trim() || !user?.id) return;
    setSendingQuestion(true);
    // Save question as note content + mark as sent to instructor
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        case_id: caseId,
        content: noteContent + (noteContent ? "\n\n---\nQuestion: " : "Question: ") + questionContent,
        is_sent_to_instructor: true,
      }),
    });
    setQuestionSent(true);
    setSendingQuestion(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="p-4 space-y-4">
        <Link
          href="/cases"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to cases
        </Link>
        <div className="flex items-center justify-center p-8">
          <div className="text-center space-y-2">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Case not found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-8">
      {/* Back navigation */}
      <Link
        href="/cases"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to cases
      </Link>

      {/* Submitted banner */}
      {isSubmitted && (
        <Card className="border-green-200 bg-green-50 py-3 dark:border-green-800 dark:bg-green-950/30">
          <CardContent className="px-4 py-0">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
              <p className="text-sm text-green-800 dark:text-green-200 flex-1">
                You&apos;ve submitted this case.
              </p>
            </div>
            <div className="mt-2 flex gap-2">
              <Link href={`/cases/${caseId}/feedback`}>
                <Button variant="outline" size="sm">
                  View Feedback
                </Button>
              </Link>
              <Link href={`/cases/${caseId}/refresh`}>
                <Button variant="outline" size="sm">
                  Quick Quiz
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Case header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-lg font-semibold leading-tight">
            {caseData.chief_complaint}
          </h1>
          {caseData.body_system && (
            <Badge variant="secondary" className="shrink-0">
              {caseData.body_system}
            </Badge>
          )}
        </div>
        {caseData.patient_age && caseData.patient_gender && (
          <p className="text-sm text-muted-foreground">
            {caseData.patient_age}yo {caseData.patient_gender}
          </p>
        )}
      </div>

      {/* Diagnosis input with autocomplete */}
      <div className="relative">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && showSuggestions) {
                e.preventDefault();
                setHighlightedIndex((prev) =>
                  prev < suggestions.length - 1 ? prev + 1 : 0
                );
              } else if (e.key === "ArrowUp" && showSuggestions) {
                e.preventDefault();
                setHighlightedIndex((prev) =>
                  prev > 0 ? prev - 1 : suggestions.length - 1
                );
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (highlightedIndex >= 0 && showSuggestions) {
                  addDiagnosisWithName(suggestions[highlightedIndex].term);
                } else {
                  addDiagnosis();
                }
              } else if (e.key === "Escape") {
                setShowSuggestions(false);
              }
            }}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            onBlur={() => {
              // Delay to allow click on suggestion
              setTimeout(() => setShowSuggestions(false), 150);
            }}
            placeholder="Add a diagnosis..."
            className="h-11 text-base"
            disabled={isSubmitted}
            autoComplete="off"
          />
          <Button
            onClick={addDiagnosis}
            disabled={!inputValue.trim() || isSubmitted}
            size="lg"
            className="h-11 shrink-0"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>

        {/* Autocomplete dropdown */}
        {showSuggestions && (
          <div
            ref={suggestionsRef}
            className="absolute left-0 right-12 top-full z-10 mt-1 rounded-md border bg-popover shadow-md"
          >
            {suggestions.map((s, i) => (
              <button
                key={s.term}
                type="button"
                className={cn(
                  "w-full px-3 py-2 text-left text-sm hover:bg-accent",
                  i === highlightedIndex && "bg-accent"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  addDiagnosisWithName(s.term);
                }}
              >
                {s.term}
                {s.matchedAbbrev && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ({s.matchedAbbrev})
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Autosave status + guidance */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {diagnoses.length} {diagnoses.length === 1 ? "diagnosis" : "diagnoses"}
          </p>
          <SaveStatusIndicator status={saveStatus} />
        </div>
        {diagnoses.length > 0 && diagnoses.length < 8 && (
          <p className="text-xs text-muted-foreground">
            Aim for 8–10 diagnoses across 4+ VINDICATE categories for a thorough differential.
          </p>
        )}
      </div>

      {/* Diagnosis list */}
      {diagnoses.length > 0 && (
        <div className="space-y-2">
          {diagnoses.map((entry, index) => (
            <DiagnosisRow
              key={`${entry.diagnosis}-${entry.sort_order}`}
              entry={entry}
              index={index}
              total={diagnoses.length}
              onToggleCategory={toggleCategory}
              onRemove={removeDiagnosis}
              onMoveUp={moveUp}
              onMoveDown={moveDown}
              onUpdateReasoning={updateReasoning}
              onUpdateConfidence={updateConfidence}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {diagnoses.length === 0 && !isSubmitted && (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Start building your differential by adding diagnoses above.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Consider the VINDICATE framework to ensure broad coverage.
          </p>
        </div>
      )}

      {/* VINDICATE bulk categorization */}
      {diagnoses.length > 0 && (
        <BulkVindicateSection
          diagnoses={diagnoses}
          onToggleCategory={toggleCategory}
        />
      )}

      {/* Inline Notes */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-sm font-medium">
                <StickyNote className="h-4 w-4" />
                Notes
              </label>
              {savingNote && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </span>
              )}
            </div>
            <Textarea
              value={noteContent}
              onChange={(e) => handleNoteChange(e.target.value)}
              placeholder="Jot down observations, reasoning, or things to remember..."
              className="min-h-20 text-sm"
            />
          </div>

          <div className="border-t pt-4 space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-medium">
              <MessageSquare className="h-4 w-4" />
              Question for Instructor
            </label>
            {questionSent ? (
              <div className="flex items-center gap-2 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                <p className="text-sm text-green-800 dark:text-green-200">
                  Question sent to your instructor
                </p>
              </div>
            ) : (
              <div className="flex gap-2">
                <Textarea
                  value={questionContent}
                  onChange={(e) => setQuestionContent(e.target.value)}
                  placeholder="Type a question..."
                  className="min-h-10 text-sm"
                  rows={1}
                />
                <Button
                  onClick={handleSendQuestion}
                  disabled={!questionContent.trim() || sendingQuestion}
                  size="sm"
                  className="shrink-0 self-end"
                >
                  {sendingQuestion ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submit button */}
      {!isSubmitted && diagnoses.length > 0 && (
        <Button
          onClick={handleSubmit}
          disabled={submitting || diagnoses.length === 0}
          className="w-full h-12 text-base"
          size="lg"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Submit for Feedback
            </>
          )}
        </Button>
      )}
    </div>
  );
}
