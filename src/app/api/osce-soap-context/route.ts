import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase";
import { extractSoapContext, buildSoapContextPrompt } from "@/lib/osce-soap";
import { PRACTICE_CASES } from "@/data/practice-cases";
import type { PracticeCase } from "@/types";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { session_id } = await request.json();

    if (!session_id) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
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

    let chiefComplaint = "";
    let correctDiagnosis = "";
    let fullCaseData: Record<string, unknown> = {};

    // Resolve case data based on source
    if (session.case_source === "practice" && session.practice_case_id) {
      const pc = PRACTICE_CASES.find((c: PracticeCase) => c.id === session.practice_case_id);
      if (pc) {
        chiefComplaint = pc.chief_complaint;
        correctDiagnosis = pc.correct_diagnosis;
        fullCaseData = pc.full_case_data;
      }
    } else if (session.case_id) {
      const { data: caseData } = await supabase
        .from("fcm_cases")
        .select("*")
        .eq("id", session.case_id)
        .single();

      if (caseData) {
        chiefComplaint = caseData.chief_complaint;
        correctDiagnosis = caseData.differential_answer_key?.[0]?.diagnosis || "";
        fullCaseData = caseData.full_case_data || {};
      }
    }

    // Try deterministic extraction first
    const deterministicContext = extractSoapContext(fullCaseData);

    if (deterministicContext) {
      return NextResponse.json(deterministicContext);
    }

    // Fallback to Claude generation
    const prompt = buildSoapContextPrompt(chiefComplaint, correctDiagnosis, fullCaseData);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";

    try {
      const parsed = JSON.parse(responseText);
      // Claude returns arrays of bullet strings — join them with newlines
      const subjArr = parsed.subjective;
      const objArr = parsed.objective;
      const toStr = (v: unknown) => {
        if (Array.isArray(v)) return v.map((s) => `• ${String(s).replace(/^[•\-]\s*/, "")}`).join("\n");
        if (typeof v === "string") return v;
        return "• No data available";
      };
      return NextResponse.json({
        subjective: toStr(subjArr),
        objective: toStr(objArr),
      });
    } catch {
      // If JSON parsing fails, return a safe fallback
      return NextResponse.json({
        subjective: "• Unable to load subjective findings",
        objective: "• Unable to load objective findings",
      });
    }
  } catch (error) {
    console.error("OSCE SOAP context error:", error);
    return NextResponse.json(
      { error: "Failed to generate SOAP context" },
      { status: 500 }
    );
  }
}
