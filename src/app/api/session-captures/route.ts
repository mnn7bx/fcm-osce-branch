import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { user_id, case_id, takeaway } = await request.json();

    if (!user_id || !case_id || !takeaway) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const supabase = createServerClient();

    const { error } = await supabase
      .from("fcm_session_captures")
      .upsert(
        { user_id, case_id, takeaway },
        { onConflict: "user_id,case_id" }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save takeaway" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const caseId = searchParams.get("case_id");

    if (!userId || !caseId) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data } = await supabase
      .from("fcm_session_captures")
      .select("takeaway")
      .eq("user_id", userId)
      .eq("case_id", caseId)
      .maybeSingle();

    return NextResponse.json({ takeaway: data?.takeaway || null });
  } catch {
    return NextResponse.json({ error: "Failed to fetch takeaway" }, { status: 500 });
  }
}
