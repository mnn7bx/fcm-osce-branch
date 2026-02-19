import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, case_id, content, is_starred, is_sent_to_instructor } =
      body;

    if (!user_id || !case_id) {
      return NextResponse.json(
        { error: "Missing user_id or case_id" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const updateData: Record<string, unknown> = {
      user_id,
      case_id,
      updated_at: new Date().toISOString(),
    };

    if (content !== undefined) updateData.content = content;
    if (is_starred !== undefined) updateData.is_starred = is_starred;
    if (is_sent_to_instructor !== undefined)
      updateData.is_sent_to_instructor = is_sent_to_instructor;

    const { data, error } = await supabase
      .from("fcm_notes")
      .upsert(updateData, { onConflict: "user_id,case_id" })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ note: data });
  } catch (error) {
    console.error("Notes error:", error);
    return NextResponse.json(
      { error: "Failed to save note" },
      { status: 500 }
    );
  }
}
