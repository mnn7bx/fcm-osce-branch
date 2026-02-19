import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: NextRequest) {
  try {
    const {
      diagnoses,
      correct_diagnosis,
      chief_complaint,
      patient_age,
      patient_gender,
    } = await request.json();

    if (!diagnoses || !correct_diagnosis) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if student included the correct diagnosis (case-insensitive)
    const studentDiagLower = (diagnoses as string[]).map((d: string) =>
      d.toLowerCase().trim()
    );
    const correctLower = correct_diagnosis.toLowerCase().trim();
    const student_got_it =
      studentDiagLower.includes(correctLower) ||
      studentDiagLower.some(
        (d: string) => correctLower.includes(d) || d.includes(correctLower)
      );

    const demographics = [
      patient_age && `${patient_age}-year-old`,
      patient_gender,
    ]
      .filter(Boolean)
      .join(" ");

    // Try AI feedback, fall back to static
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        narrative: student_got_it
          ? `You correctly identified ${correct_diagnosis}. Review the other diagnoses in your differential to understand what else could present similarly.`
          : `The correct diagnosis was ${correct_diagnosis}. Consider what clinical features would point toward this diagnosis and how it differs from your top choices.`,
        correct_diagnosis,
        student_got_it,
      });
    }

    const anthropic = new Anthropic({ apiKey });

    const prompt = `You are a supportive medical education AI assistant. A medical student just practiced building a differential diagnosis.

Case: ${demographics ? `${demographics} presenting with` : ""} ${chief_complaint}
Correct diagnosis: ${correct_diagnosis}
Student's differential: ${(diagnoses as string[]).join(", ")}
Student included correct answer: ${student_got_it ? "Yes" : "No"}

Generate 3-5 categorized bullet points of supportive feedback. Rules:
- Each bullet starts with "Strength:", "Consider:", or "Can't-miss:"
- Start with a "Strength:" acknowledging what they did well
- Use "Consider:" for areas to explore
- If they missed the correct diagnosis, explain briefly why it fits this presentation
- Keep each bullet to 1-2 sentences
- Be warm and encouraging — like a supportive attending
- Do NOT mention scores or grades
- Format: "- Category: Feedback sentence."`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });

    const narrative =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({
      narrative,
      correct_diagnosis,
      student_got_it,
    });
  } catch (error) {
    console.error("Practice feedback error:", error);
    return NextResponse.json(
      { error: "Failed to generate feedback" },
      { status: 500 }
    );
  }
}
