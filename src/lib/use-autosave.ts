"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { DiagnosisEntry } from "@/types";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export function useAutosave(
  userId: string,
  caseId: string,
  diagnoses: DiagnosisEntry[],
  enabled: boolean = true
) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");

  const save = useCallback(
    async (data: DiagnosisEntry[]) => {
      setSaveStatus("saving");
      const { error } = await supabase.from("fcm_submissions").upsert(
        {
          user_id: userId,
          case_id: caseId,
          diagnoses: data,
          status: "draft",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,case_id" }
      );
      setSaveStatus(error ? "error" : "saved");
    },
    [userId, caseId]
  );

  useEffect(() => {
    if (!enabled || !userId || !caseId) return;
    const serialized = JSON.stringify(diagnoses);
    if (serialized === lastSavedRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      lastSavedRef.current = serialized;
      save(diagnoses);
    }, 500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [diagnoses, enabled, save, userId, caseId]);

  return { saveStatus };
}
