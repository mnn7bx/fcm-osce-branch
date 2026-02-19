"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { PRACTICE_CASES } from "@/data/practice-cases";
import { searchDiagnoses, type DiagnosisSearchResult } from "@/data/diagnosis-lookup";
import type { DiagnosisEntry } from "@/types";
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
  XCircle,
  Loader2,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

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

interface PracticeFeedback {
  narrative: string;
  correct_diagnosis: string;
  student_got_it: boolean;
}

export default function PracticeCasePage() {
  const { practiceId } = useParams<{ practiceId: string }>();
  const practiceCase = PRACTICE_CASES.find((c) => c.id === practiceId);

  const [diagnoses, setDiagnoses] = useState<DiagnosisEntry[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<DiagnosisSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<PracticeFeedback | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    if (!practiceId) return;
    const saved = localStorage.getItem(`practice-${practiceId}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.diagnoses) setDiagnoses(data.diagnoses);
        if (data.feedback) {
          setFeedback(data.feedback);
          setSubmitted(true);
        }
      } catch {
        // ignore
      }
    }
  }, [practiceId]);

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
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const alreadyExists = diagnoses.some(
        (d) => d.diagnosis.toLowerCase() === trimmed.toLowerCase()
      );
      if (alreadyExists) return;
      setDiagnoses((prev) => [
        ...prev,
        { diagnosis: trimmed, sort_order: prev.length },
      ]);
      setInputValue("");
      setSuggestions([]);
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    },
    [diagnoses]
  );

  const addDiagnosis = useCallback(() => {
    addDiagnosisWithName(inputValue);
  }, [inputValue, addDiagnosisWithName]);

  function removeDiagnosis(index: number) {
    setDiagnoses((prev) =>
      prev.filter((_, i) => i !== index).map((d, i) => ({ ...d, sort_order: i }))
    );
  }

  function moveUp(index: number) {
    if (index === 0) return;
    setDiagnoses((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next.map((d, i) => ({ ...d, sort_order: i }));
    });
  }

  function moveDown(index: number) {
    setDiagnoses((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next.map((d, i) => ({ ...d, sort_order: i }));
    });
  }

  function updateConfidence(index: number, confidence: number) {
    setDiagnoses((prev) =>
      prev.map((d, i) => (i === index ? { ...d, confidence } : d))
    );
  }

  function updateReasoning(index: number, reasoning: string) {
    setDiagnoses((prev) =>
      prev.map((d, i) => (i === index ? { ...d, reasoning } : d))
    );
  }

  async function handleSubmit() {
    if (!practiceCase || diagnoses.length === 0) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/practice-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnoses: diagnoses.map((d) => d.diagnosis),
          correct_diagnosis: practiceCase.correct_diagnosis,
          chief_complaint: practiceCase.chief_complaint,
          patient_age: practiceCase.patient_age,
          patient_gender: practiceCase.patient_gender,
        }),
      });
      const data = await res.json();
      setFeedback(data);
      setSubmitted(true);

      // Save to localStorage
      localStorage.setItem(
        `practice-${practiceId}`,
        JSON.stringify({ diagnoses, feedback: data })
      );
    } catch {
      // Fallback: just reveal the answer
      const got = diagnoses.some(
        (d) =>
          d.diagnosis.toLowerCase() ===
          practiceCase.correct_diagnosis.toLowerCase()
      );
      const fallback: PracticeFeedback = {
        narrative: got
          ? "You identified the correct diagnosis."
          : "The correct diagnosis was not in your differential.",
        correct_diagnosis: practiceCase.correct_diagnosis,
        student_got_it: got,
      };
      setFeedback(fallback);
      setSubmitted(true);
      localStorage.setItem(
        `practice-${practiceId}`,
        JSON.stringify({ diagnoses, feedback: fallback })
      );
    }

    setSubmitting(false);
  }

  function handleRetry() {
    setSubmitted(false);
    setFeedback(null);
    setDiagnoses([]);
    localStorage.removeItem(`practice-${practiceId}`);
  }

  if (!practiceCase) {
    return (
      <div className="p-4 space-y-4">
        <Link
          href="/practice"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Practice Library
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
        href="/practice"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Practice Library
      </Link>

      {/* Case header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-lg font-semibold leading-tight">
            {practiceCase.chief_complaint}
          </h1>
          {practiceCase.body_system && (
            <Badge variant="secondary" className="shrink-0">
              {practiceCase.body_system}
            </Badge>
          )}
        </div>
        {practiceCase.patient_age && practiceCase.patient_gender && (
          <p className="text-sm text-muted-foreground">
            {practiceCase.patient_age}yo {practiceCase.patient_gender}
          </p>
        )}
        <Badge variant="outline" className="text-xs">
          {practiceCase.difficulty} &middot; {practiceCase.source}
        </Badge>
      </div>

      {/* Feedback result */}
      {submitted && feedback && (
        <Card className={cn(
          "py-3",
          feedback.student_got_it
            ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
            : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
        )}>
          <CardContent className="px-4 py-0 space-y-3">
            <div className="flex items-center gap-2">
              {feedback.student_got_it ? (
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              )}
              <p className="text-sm font-medium">
                Correct Diagnosis: {feedback.correct_diagnosis}
              </p>
            </div>
            {renderFeedbackNarrative(feedback.narrative)}
            <Button variant="outline" size="sm" onClick={handleRetry}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Diagnosis input */}
      {!submitted && (
        <>
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
                  setTimeout(() => setShowSuggestions(false), 150);
                }}
                placeholder="Add a diagnosis..."
                className="h-11 text-base"
                autoComplete="off"
              />
              <Button
                onClick={addDiagnosis}
                disabled={!inputValue.trim()}
                size="lg"
                className="h-11 shrink-0"
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>

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

          {/* Guidance */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {diagnoses.length}{" "}
              {diagnoses.length === 1 ? "diagnosis" : "diagnoses"}
            </p>
            {diagnoses.length > 0 && diagnoses.length < 8 && (
              <p className="text-xs text-muted-foreground">
                Aim for 8–10 diagnoses for a thorough differential.
              </p>
            )}
          </div>
        </>
      )}

      {/* Diagnosis list */}
      {diagnoses.length > 0 && (
        <div className="space-y-2">
          {diagnoses.map((entry, index) => (
            <PracticeDiagnosisRow
              key={`${entry.diagnosis}-${entry.sort_order}`}
              entry={entry}
              index={index}
              total={diagnoses.length}
              disabled={submitted}
              onRemove={removeDiagnosis}
              onMoveUp={moveUp}
              onMoveDown={moveDown}
              onUpdateConfidence={updateConfidence}
              onUpdateReasoning={updateReasoning}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {diagnoses.length === 0 && !submitted && (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Start building your differential by adding diagnoses above.
          </p>
        </div>
      )}

      {/* Submit button */}
      {!submitted && diagnoses.length > 0 && (
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full h-12 text-base"
          size="lg"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Submit &amp; Reveal Answer
            </>
          )}
        </Button>
      )}
    </div>
  );
}

function renderFeedbackNarrative(text: string) {
  const lines = text.split("\n").filter((l) => l.trim());
  const isBulletFormat = lines.some((l) => l.trim().startsWith("- "));

  if (isBulletFormat) {
    const bullets = lines.filter((l) => l.trim().startsWith("- "));
    return (
      <ul className="space-y-1.5">
        {bullets.map((bullet, i) => {
          const content = bullet.replace(/^-\s*/, "");
          const prefixMatch = content.match(
            /^(Strength|Consider|Can't-miss):\s*/i
          );
          if (prefixMatch) {
            return (
              <li key={i} className="text-sm leading-relaxed">
                <span className="font-semibold">{prefixMatch[0]}</span>
                {content.slice(prefixMatch[0].length)}
              </li>
            );
          }
          return (
            <li key={i} className="text-sm leading-relaxed">
              {content}
            </li>
          );
        })}
      </ul>
    );
  }

  return <p className="text-sm leading-relaxed">{text}</p>;
}

function PracticeDiagnosisRow({
  entry,
  index,
  total,
  disabled,
  onRemove,
  onMoveUp,
  onMoveDown,
  onUpdateConfidence,
  onUpdateReasoning,
}: {
  entry: DiagnosisEntry;
  index: number;
  total: number;
  disabled: boolean;
  onRemove: (i: number) => void;
  onMoveUp: (i: number) => void;
  onMoveDown: (i: number) => void;
  onUpdateConfidence: (i: number, c: number) => void;
  onUpdateReasoning: (i: number, r: string) => void;
}) {
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
          {!disabled && (
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={() => onMoveUp(index)}
                disabled={index === 0}
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onMoveDown(index)}
                disabled={index === total - 1}
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onRemove(index)}
                className="p-1 text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
        {!disabled && (
          <ConfidenceRating
            value={entry.confidence}
            onChange={(val) => onUpdateConfidence(index, val)}
          />
        )}
        {!disabled && !showReasoning ? (
          <button
            type="button"
            onClick={() => setShowReasoning(true)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Why this diagnosis?
          </button>
        ) : (
          showReasoning &&
          !disabled && (
            <Textarea
              value={entry.reasoning || ""}
              onChange={(e) => onUpdateReasoning(index, e.target.value)}
              placeholder="What about this patient makes you consider this? (optional)"
              className="min-h-16 text-xs"
              rows={2}
            />
          )
        )}
      </CardContent>
    </Card>
  );
}
