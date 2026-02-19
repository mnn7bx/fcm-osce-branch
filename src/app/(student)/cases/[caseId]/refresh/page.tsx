"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import type { FcmCase, FcmSubmission, FcmNote, FeedbackResult } from "@/types";
import { VINDICATE_CATEGORIES } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Star,
  Loader2,
} from "lucide-react";

export default function RefreshPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const { user } = useUser();
  const router = useRouter();
  const [caseData, setCaseData] = useState<FcmCase | null>(null);
  const [submission, setSubmission] = useState<FcmSubmission | null>(null);
  const [note, setNote] = useState<FcmNote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchAll() {
      const [caseRes, subRes, noteRes] = await Promise.all([
        supabase.from("fcm_cases").select("*").eq("id", caseId).single(),
        supabase
          .from("fcm_submissions")
          .select("*")
          .eq("user_id", user!.id)
          .eq("case_id", caseId)
          .single(),
        supabase
          .from("fcm_notes")
          .select("*")
          .eq("user_id", user!.id)
          .eq("case_id", caseId)
          .single(),
      ]);

      if (caseRes.data) setCaseData(caseRes.data);
      if (subRes.data) setSubmission(subRes.data);
      if (noteRes.data) setNote(noteRes.data);
      setLoading(false);
    }

    fetchAll();
  }, [user, caseId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  const feedback = submission?.feedback as FeedbackResult | null;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push(`/cases/${caseId}`)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="text-lg font-semibold">Pre-Session Refresh</h1>
        {caseData && (
          <p className="text-sm text-muted-foreground mt-0.5">
            {caseData.chief_complaint}
          </p>
        )}
      </div>

      {!submission && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            You haven&apos;t submitted a differential for this case yet.
          </CardContent>
        </Card>
      )}

      {/* Your submitted diagnoses */}
      {submission && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Your Differential</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {submission.diagnoses.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-xs text-muted-foreground w-4">
                    {i + 1}.
                  </span>
                  <span>{d.diagnosis}</span>
                  {d.vindicate_category && (
                    <Badge variant="outline" className="text-[10px] px-1">
                      {d.vindicate_category}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key feedback highlights */}
      {feedback && (
        <>
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Feedback Highlights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Can't-miss status */}
              <div className="space-y-1">
                {feedback.cant_miss_hit.map((d) => (
                  <div key={d} className="flex items-center gap-1.5 text-xs">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
                    <span>{d}</span>
                  </div>
                ))}
                {feedback.cant_miss_missed.map((d) => (
                  <div
                    key={d}
                    className="flex items-center gap-1.5 text-xs text-amber-700"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>Missed: {d}</span>
                  </div>
                ))}
              </div>

              {/* VINDICATE quick coverage */}
              <div className="flex flex-wrap gap-1.5">
                {VINDICATE_CATEGORIES.map((cat) => (
                  <span
                    key={cat.key}
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded text-[10px] font-medium",
                      feedback.vindicate_coverage[cat.key]
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {cat.key === "I2" ? "I" : cat.key}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Notes */}
      {note && note.content && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              Your Notes
              {note.is_starred && (
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{note.content}</p>
          </CardContent>
        </Card>
      )}

      {/* AI narrative summary */}
      {feedback?.ai_narrative && (
        <Card className="bg-accent/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground italic leading-relaxed">
              {feedback.ai_narrative}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
