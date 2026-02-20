import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { user_id, case_id, sentiment } = await request.json();

    if (!user_id || !case_id || !sentiment) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (!["confident", "uncertain", "lost"].includes(sentiment)) {
      return NextResponse.json({ error: "Invalid sentiment" }, { status: 400 });
    }

    const supabase = createServerClient();

    const { error } = await supabase
      .from("fcm_sentiments")
      .upsert(
        { user_id, case_id, sentiment },
        { onConflict: "user_id,case_id" }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save sentiment" }, { status: 500 });
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
      .from("fcm_sentiments")
      .select("sentiment")
      .eq("user_id", userId)
      .eq("case_id", caseId)
      .maybeSingle();

    return NextResponse.json({ sentiment: data?.sentiment || null });
  } catch {
    return NextResponse.json({ error: "Failed to fetch sentiment" }, { status: 500 });
  }
}
