import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, case_id, diagnoses, status } = body;

    if (!user_id || !case_id) {
      return NextResponse.json(
        { error: "Missing user_id or case_id" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("fcm_submissions")
      .upsert(
        {
          user_id,
          case_id,
          diagnoses: diagnoses || [],
          status: status || "draft",
          submitted_at: status === "submitted" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,case_id" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ submission: data });
  } catch (error) {
    console.error("Submission error:", error);
    return NextResponse.json(
      { error: "Failed to save submission" },
      { status: 500 }
    );
  }
}
