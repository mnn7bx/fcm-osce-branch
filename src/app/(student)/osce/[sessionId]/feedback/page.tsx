"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import type { OsceSession, OSCEFeedbackResult } from "@/types";
import { OsceProgress } from "@/components/osce-progress";
import { RubricScoreCard } from "@/components/rubric-score-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Stethoscope,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  AlertCircle,
} from "lucide-react";

export default function OsceFeedbackPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [feedback, setFeedback] = useState<OSCEFeedbackResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const sessRes = await fetch(`/api/osce-session/${sessionId}`);
        if (!sessRes.ok) { router.push("/osce"); return; }
        const { session }: { session: OsceSession } = await sessRes.json();

        if (session.status === "door_prep") { router.replace(`/osce/${sessionId}/door-prep`); return; }
        if (session.status === "soap_note") { router.replace(`/osce/${sessionId}/soap-note`); return; }

        if (session.feedback) {
          setFeedback(session.feedback as OSCEFeedbackResult);
          setLoading(false);
          return;
        }

        const fbRes = await fetch("/api/osce-feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        });

        if (fbRes.ok) {
          const { feedback: fb } = await fbRes.json();
          setFeedback(fb);
        } else {
          setError("Failed to generate feedback. Please try again.");
        }
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Generating feedback...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <OsceProgress currentPhase="completed" />
        <Card className="border-destructive/30">
          <CardContent className="p-6 text-center space-y-3">
            <AlertCircle className="h-6 w-6 text-destructive mx-auto" />
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <OsceProgress currentPhase="completed" />

      <div className="flex items-center gap-2">
        <Stethoscope className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">OSCE Feedback</h1>
      </div>

      {feedback && (
        <>
          {/* Rubric */}
          {feedback.rubric_scores.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Performance
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {feedback.rubric_scores.map((score, i) => (
                  <RubricScoreCard key={i} score={score} />
                ))}
              </div>
            </section>
          )}

          {/* Strengths */}
          {feedback.strengths.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Strengths
              </h2>
              <Card className="border-green-200 dark:border-green-900">
                <CardContent className="p-4 space-y-2">
                  {feedback.strengths.map((s, i) => (
                    <div key={i} className="flex gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                      <span>{s}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
          )}

          {/* Areas to Improve */}
          {feedback.improvements.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Areas to Improve
              </h2>
              <Card className="border-blue-200 dark:border-blue-900">
                <CardContent className="p-4 space-y-2">
                  {feedback.improvements.map((s, i) => (
                    <div key={i} className="flex gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>{s}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
          )}

          {/* Can't Miss */}
          {feedback.cant_miss && feedback.cant_miss.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Don&apos;t Miss
              </h2>
              <Card className="border-amber-200 dark:border-amber-900">
                <CardContent className="p-4 space-y-2">
                  {feedback.cant_miss.map((s, i) => (
                    <div key={i} className="flex gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{s}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
          )}
        </>
      )}

      <Button
        variant="outline"
        onClick={() => router.push("/osce")}
        className="w-full"
        size="lg"
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        Practice Another Case
      </Button>
    </div>
  );
}
