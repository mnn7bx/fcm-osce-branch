"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import type { FcmCase, FcmSchedule, FcmSubmission } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, FileEdit, ArrowRight } from "lucide-react";

interface CaseWithSchedule {
  schedule: FcmSchedule;
  case_data: FcmCase;
  submission: FcmSubmission | null;
}

function getStatusBadge(submission: FcmSubmission | null) {
  if (!submission) return { label: "New", variant: "outline" as const, icon: Clock };
  if (submission.status === "submitted" || submission.status === "resubmitted")
    return { label: "Submitted", variant: "default" as const, icon: CheckCircle };
  return { label: "In Progress", variant: "secondary" as const, icon: FileEdit };
}

export default function CasesPage() {
  const { user } = useUser();
  const router = useRouter();
  const [cases, setCases] = useState<CaseWithSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchCases() {
      // Get schedule for user's group
      const { data: schedules } = await supabase
        .from("fcm_schedule")
        .select("*, fcm_cases(*)")
        .or(`fcm_group.eq.${user!.fcm_group},fcm_group.is.null`)
        .order("unlock_date", { ascending: true });

      // Get user's submissions
      const { data: submissions } = await supabase
        .from("fcm_submissions")
        .select("*")
        .eq("user_id", user!.id);

      if (schedules) {
        const caseList: CaseWithSchedule[] = schedules.map((s) => ({
          schedule: s,
          case_data: s.fcm_cases,
          submission:
            submissions?.find(
              (sub: FcmSubmission) => sub.case_id === s.case_id
            ) || null,
        }));
        setCases(caseList);
      }

      setLoading(false);
    }

    fetchCases();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Loading cases...</p>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const currentCases = cases.filter((c) => c.schedule.unlock_date <= today);
  const upcomingCases = cases.filter((c) => c.schedule.unlock_date > today);

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Your Cases</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Build your differential, get feedback, and prepare for FCM
        </p>
      </div>

      {currentCases.length === 0 && upcomingCases.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No cases assigned yet. Check back soon.
          </CardContent>
        </Card>
      )}

      {/* Current Cases */}
      {currentCases.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Current
          </h2>
          {currentCases.map((c) => {
            const status = getStatusBadge(c.submission);
            const StatusIcon = status.icon;
            return (
              <Card
                key={c.schedule.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => router.push(`/cases/${c.case_data.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardDescription className="text-xs">
                        {c.schedule.week_label}
                      </CardDescription>
                      <CardTitle className="text-base mt-1">
                        {c.case_data.chief_complaint}
                      </CardTitle>
                    </div>
                    <Badge variant={status.variant} className="ml-2 shrink-0">
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {status.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{c.case_data.body_system}</span>
                      <span>Due {new Date(c.schedule.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upcoming Cases */}
      {upcomingCases.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Upcoming
          </h2>
          {upcomingCases.map((c) => (
            <Card key={c.schedule.id} className="opacity-60">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">
                  {c.schedule.week_label} — Unlocks{" "}
                  {new Date(c.schedule.unlock_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </CardDescription>
                <CardTitle className="text-base mt-1">
                  {c.case_data.chief_complaint}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xs text-muted-foreground">
                  {c.case_data.body_system}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
