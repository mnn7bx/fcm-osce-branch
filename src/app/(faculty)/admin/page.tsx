"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import type { FcmCase, FcmSettings } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  CheckCircle,
  Settings,
  BookOpen,
} from "lucide-react";

export default function AdminPage() {
  const { user } = useUser();
  const [cases, setCases] = useState<FcmCase[]>([]);
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"settings" | "cases">("settings");

  useEffect(() => {
    async function fetchData() {
      const [casesRes, settingsRes] = await Promise.all([
        supabase.from("fcm_cases").select("*").order("sort_order"),
        supabase.from("fcm_settings").select("*"),
      ]);

      if (casesRes.data) setCases(casesRes.data);
      if (settingsRes.data) {
        const map: Record<string, unknown> = {};
        for (const s of settingsRes.data) {
          map[s.key] = s.value;
        }
        setSettings(map);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  async function saveSetting(key: string, value: unknown) {
    setSaving(true);
    await supabase
      .from("fcm_settings")
      .upsert(
        {
          key,
          value: JSON.stringify(value),
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function toggleCaseActive(caseItem: FcmCase) {
    await supabase
      .from("fcm_cases")
      .update({ is_active: !caseItem.is_active })
      .eq("id", caseItem.id);

    setCases((prev) =>
      prev.map((c) =>
        c.id === caseItem.id ? { ...c, is_active: !c.is_active } : c
      )
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Admin access required.
        </p>
      </div>
    );
  }

  const feedbackMode = (settings.feedback_mode as string) || "combined";
  const defaultFramework =
    (settings.default_framework as string) || "vindicate";
  const semester = (settings.semester as string) || "2026-Spring";

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold">Admin Panel</h1>
        <p className="text-sm text-muted-foreground mt-1">
          System settings and case library management
        </p>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-2">
        <Button
          variant={tab === "settings" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("settings")}
        >
          <Settings className="h-4 w-4 mr-1" />
          Settings
        </Button>
        <Button
          variant={tab === "cases" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("cases")}
        >
          <BookOpen className="h-4 w-4 mr-1" />
          Case Library ({cases.length})
        </Button>
      </div>

      {saved && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" />
          Saved
        </div>
      )}

      {tab === "settings" && (
        <div className="space-y-4">
          {/* Feedback Mode */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Feedback Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                Controls what students see after submitting their differential
              </p>
              <Select
                value={feedbackMode}
                onValueChange={(v) => saveSetting("feedback_mode", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breadth">
                    Breadth — Focus on VINDICATE coverage
                  </SelectItem>
                  <SelectItem value="cant_miss">
                    Can&apos;t-Miss — Focus on dangerous diagnoses
                  </SelectItem>
                  <SelectItem value="combined">
                    Combined — Both breadth and can&apos;t-miss (recommended)
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Default Framework */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Default Framework</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={defaultFramework}
                onValueChange={(v) => saveSetting("default_framework", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vindicate">VINDICATE</SelectItem>
                  <SelectItem value="anatomic">Head-to-Toe Anatomic</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Semester */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Semester</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={semester}
                onChange={(e) => saveSetting("semester", e.target.value)}
                placeholder="e.g., 2026-Spring"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "cases" && (
        <div className="space-y-3">
          {cases.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px]">
                        {c.case_id}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {c.difficulty}
                      </Badge>
                      {!c.is_active && (
                        <Badge variant="secondary" className="text-[10px]">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium">{c.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.chief_complaint}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{c.body_system}</span>
                      <span>
                        {c.differential_answer_key?.length || 0} diagnoses in
                        key
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleCaseActive(c)}
                  >
                    {c.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
