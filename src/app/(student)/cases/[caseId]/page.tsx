"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import { useAutosave } from "@/lib/use-autosave";
import type { FcmCase, FcmSubmission, DiagnosisEntry } from "@/types";
import { VINDICATE_CATEGORIES } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

function formatVitals(vitals: Record<string, string>): string {
  return Object.entries(vitals)
    .map(([key, value]) => `${key}: ${value}`)
    .join(" | ");
}

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

interface VindicateSelectorProps {
  selected: string | undefined;
  onSelect: (key: string | undefined) => void;
}

function VindicateSelector({ selected, onSelect }: VindicateSelectorProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {VINDICATE_CATEGORIES.map((cat) => {
        const isSelected = selected === cat.key;
        return (
          <button
            key={cat.key}
            type="button"
            title={cat.label}
            onClick={() => onSelect(isSelected ? undefined : cat.key)}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded text-xs font-medium transition-colors",
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
  );
}

interface VindicateCoverageSummaryProps {
  diagnoses: DiagnosisEntry[];
}

function VindicateCoverageSummary({ diagnoses }: VindicateCoverageSummaryProps) {
  const coveredKeys = new Set(
    diagnoses
      .map((d) => d.vindicate_category)
      .filter((c): c is string => Boolean(c))
  );

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">
        VINDICATE Coverage
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {VINDICATE_CATEGORIES.map((cat) => {
          const isCovered = coveredKeys.has(cat.key);
          return (
            <Badge
              key={cat.key}
              variant={isCovered ? "default" : "outline"}
              className="text-xs"
            >
              {cat.key === "I2" ? "I" : cat.key} — {cat.label}
            </Badge>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {coveredKeys.size} of {VINDICATE_CATEGORIES.length} categories covered
      </p>
    </div>
  );
}

interface DiagnosisRowProps {
  entry: DiagnosisEntry;
  index: number;
  total: number;
  onUpdateCategory: (index: number, category: string | undefined) => void;
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

function DiagnosisRow({
  entry,
  index,
  total,
  onUpdateCategory,
  onRemove,
  onMoveUp,
  onMoveDown,
}: DiagnosisRowProps) {
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
        <VindicateSelector
          selected={entry.vindicate_category}
          onSelect={(key) => onUpdateCategory(index, key)}
        />
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
      const [caseResult, submissionResult] = await Promise.all([
        supabase.from("fcm_cases").select("*").eq("id", caseId).single(),
        supabase
          .from("fcm_submissions")
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

      setLoading(false);
    }

    fetchData();
  }, [user?.id, caseId]);

  const addDiagnosis = useCallback(
    function addDiagnosis() {
      const trimmed = inputValue.trim();
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
    },
    [inputValue, diagnoses]
  );

  function updateCategory(index: number, category: string | undefined): void {
    setDiagnoses((prev) =>
      prev.map((d, i) =>
        i === index ? { ...d, vindicate_category: category } : d
      )
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

    const newStatus = isSubmitted ? "resubmitted" : "submitted";

    const { error } = await supabase.from("fcm_submissions").upsert(
      {
        user_id: user.id,
        case_id: caseId,
        diagnoses,
        status: newStatus,
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

  function handleEnableEditing(): void {
    setSubmission((prev) => (prev ? { ...prev, status: "draft" } : prev));
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
            <div className="flex gap-2 mt-2">
              <Link href={`/cases/${caseId}/feedback`}>
                <Button variant="outline" size="sm">
                  View Feedback
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEnableEditing}
              >
                Edit &amp; Resubmit
              </Button>
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
        {caseData.vitals && Object.keys(caseData.vitals).length > 0 && (
          <p className="text-xs text-muted-foreground font-mono">
            {formatVitals(caseData.vitals)}
          </p>
        )}
      </div>

      {/* Diagnosis input */}
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addDiagnosis();
            }
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

      {/* Autosave status */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {diagnoses.length} {diagnoses.length === 1 ? "diagnosis" : "diagnoses"}
        </p>
        <SaveStatusIndicator status={saveStatus} />
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
              onUpdateCategory={updateCategory}
              onRemove={removeDiagnosis}
              onMoveUp={moveUp}
              onMoveDown={moveDown}
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

      {/* VINDICATE coverage summary */}
      {diagnoses.length > 0 && (
        <VindicateCoverageSummary diagnoses={diagnoses} />
      )}

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
