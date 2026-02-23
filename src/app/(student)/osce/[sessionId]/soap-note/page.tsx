"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useUser } from "@/lib/user-context";
import { useOsceAutosave } from "@/lib/use-osce-autosave";
import type {
  OsceSession,
  DoorPrepData,
  RevisedDiagnosis,
  SoapNoteData,
  SoapContext,
} from "@/types";
import { OsceProgress } from "@/components/osce-progress";
import { DiagnosisInput } from "@/components/diagnosis-input";
import { RevisedDiagnosisRow } from "@/components/revised-diagnosis-row";
import { extractFindings } from "@/components/evidence-mapper";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

export default function SoapNotePage() {
  const { user } = useUser();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<OsceSession | null>(null);
  const [soapContext, setSoapContext] = useState<SoapContext | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [contextError, setContextError] = useState(false);
  const [diagnoses, setDiagnoses] = useState<RevisedDiagnosis[]>([]);
  const [showSO, setShowSO] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const soapData: SoapNoteData = {
    subjective_review: "",
    objective_review: "",
    diagnoses,
  };
  const { saveStatus } = useOsceAutosave(
    sessionId,
    "soap_note",
    soapData,
    diagnoses.length > 0
  );

  // Extract findings from S/O for evidence mapper
  const findings = useMemo(() => {
    if (!soapContext) return [];
    return extractFindings(soapContext.subjective, soapContext.objective);
  }, [soapContext]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/osce-session/${sessionId}`);
        if (!res.ok) {
          router.push("/osce");
          return;
        }
        const data = await res.json();
        const sess: OsceSession = data.session;
        setSession(sess);

        // Redirect if not in soap_note phase
        if (sess.status === "door_prep") {
          router.replace(`/osce/${sessionId}/door-prep`);
          return;
        }
        if (sess.status === "completed") {
          router.replace(`/osce/${sessionId}/feedback`);
          return;
        }

        // Restore saved SOAP data or initialize from door prep
        if (sess.soap_note) {
          const saved = sess.soap_note as SoapNoteData;
          if (saved.diagnoses?.length > 0) {
            setDiagnoses(saved.diagnoses);
          }
        } else if (sess.door_prep) {
          // Initialize from door prep diagnoses
          const doorPrep = sess.door_prep as DoorPrepData;
          if (doorPrep.diagnoses?.length > 0) {
            setDiagnoses(
              doorPrep.diagnoses.map((d, i) => ({
                diagnosis: d.diagnosis,
                evidence: [],
                assessment: "",
                diagnostic_plan: [],
                therapeutic_plan: [],
                sort_order: i,
              }))
            );
          }
        }

        setLoading(false);

        // Fetch S/O context
        fetchSoapContext();
      } catch {
        router.push("/osce");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [sessionId, router]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchSoapContext() {
    setContextLoading(true);
    setContextError(false);
    try {
      const ctxRes = await fetch("/api/osce-soap-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (ctxRes.ok) {
        const ctx = await ctxRes.json();
        setSoapContext(ctx);
      } else {
        setContextError(true);
      }
    } catch {
      setContextError(true);
    } finally {
      setContextLoading(false);
    }
  }

  const addDiagnosis = useCallback((name: string) => {
    setDiagnoses((prev) => [
      ...prev,
      {
        diagnosis: name,
        evidence: [],
        assessment: "",
        diagnostic_plan: [],
        therapeutic_plan: [],
        sort_order: prev.length,
      },
    ]);
  }, []);

  function removeDiagnosis(i: number) {
    setDiagnoses((prev) => prev.filter((_, idx) => idx !== i));
  }

  function moveDiagnosis(i: number, direction: "up" | "down") {
    setDiagnoses((prev) => {
      const arr = [...prev];
      const j = direction === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= arr.length) return prev;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr.map((d, idx) => ({ ...d, sort_order: idx }));
    });
  }

  function updateDiagnosis(i: number, updated: RevisedDiagnosis) {
    setDiagnoses((prev) => prev.map((d, idx) => (idx === i ? updated : d)));
  }

  async function handleSubmit() {
    if (diagnoses.length === 0 || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/osce-session/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soap_note: { subjective_review: "", objective_review: "", diagnoses },
          soap_submitted_at: new Date().toISOString(),
          status: "completed",
        }),
      });

      if (res.ok) {
        router.push(`/osce/${sessionId}/feedback`);
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <OsceProgress currentPhase="soap_note" />

      {/* Transition message */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardContent className="p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            You&apos;ve completed the patient encounter. Review the findings
            below, then revise your differential with supporting evidence and
            management plans.
          </p>
        </CardContent>
      </Card>

      {/* S/O Review Card */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <button
            type="button"
            onClick={() => setShowSO(!showSO)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                Subjective & Objective
              </span>
            </div>
            {showSO ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {showSO && (
            <div className="space-y-3 pt-2">
              {contextLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading findings...
                </div>
              ) : contextError ? (
                <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Unable to load subjective findings.
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchSoapContext}
                    className="shrink-0 text-xs"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Retry
                  </Button>
                </div>
              ) : soapContext ? (
                <>
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                      Subjective
                    </h4>
                    <p className="text-sm whitespace-pre-line">
                      {soapContext.subjective}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                      Objective
                    </h4>
                    <p className="text-sm whitespace-pre-line">
                      {soapContext.objective}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No S/O data available for this case.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <p className="text-sm text-muted-foreground">
        Revise your differential based on the encounter. For each diagnosis, map
        supporting evidence, write an assessment, and plan diagnostic workup and
        treatment.
      </p>

      {/* Add diagnosis */}
      <DiagnosisInput
        onAdd={addDiagnosis}
        existingDiagnoses={diagnoses.map((d) => d.diagnosis)}
      />

      {/* Revised diagnosis rows */}
      <div className="space-y-3">
        {diagnoses.map((d, i) => (
          <RevisedDiagnosisRow
            key={`${d.diagnosis}-${i}`}
            diagnosis={d}
            index={i}
            total={diagnoses.length}
            findings={findings}
            onRemove={removeDiagnosis}
            onMoveUp={(idx) => moveDiagnosis(idx, "up")}
            onMoveDown={(idx) => moveDiagnosis(idx, "down")}
            onUpdate={updateDiagnosis}
          />
        ))}
      </div>

      {/* Save status */}
      {saveStatus !== "idle" && (
        <p className="text-xs text-muted-foreground text-center">
          {saveStatus === "saving" && "Saving..."}
          {saveStatus === "saved" && "Saved"}
          {saveStatus === "error" && "Save failed"}
        </p>
      )}

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={diagnoses.length === 0 || submitting}
        className="w-full"
        size="lg"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Submitting...
          </>
        ) : (
          <>
            Submit for Feedback
            <ArrowRight className="h-4 w-4 ml-2" />
          </>
        )}
      </Button>
    </div>
  );
}
