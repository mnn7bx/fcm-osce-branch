import type { DiagnosisEntry, AnswerKeyEntry, FeedbackResult } from "@/types";

/**
 * Step 1: Deterministic comparison — match student diagnoses against answer key
 */
export function compareDifferential(
  studentDiagnoses: DiagnosisEntry[],
  answerKey: AnswerKeyEntry[]
): Omit<FeedbackResult, "ai_narrative"> {
  const normalize = (s: string) => s.toLowerCase().trim();

  // Build lookup: all possible names → answer key entry
  const aliasMap = new Map<string, AnswerKeyEntry>();
  for (const entry of answerKey) {
    aliasMap.set(normalize(entry.diagnosis), entry);
    for (const alias of entry.aliases) {
      aliasMap.set(normalize(alias), entry);
    }
  }

  // Match each student diagnosis
  const matched = new Set<string>(); // answer key diagnosis names that were matched
  const unmatched: string[] = [];

  for (const sd of studentDiagnoses) {
    const key = normalize(sd.diagnosis);
    const match = aliasMap.get(key);
    if (match) {
      matched.add(match.diagnosis);
    } else {
      unmatched.push(sd.diagnosis);
    }
  }

  // Build tiered differential from matched
  const tiered: FeedbackResult["tiered_differential"] = {
    most_likely: [],
    moderate: [],
    less_likely: [],
    unlikely_important: [],
  };

  for (const entry of answerKey) {
    if (matched.has(entry.diagnosis)) {
      tiered[entry.tier].push(entry.diagnosis);
    }
  }

  // Common + can't-miss analysis
  const commonEntries = answerKey.filter((e) => e.is_common);
  const cantMissEntries = answerKey.filter((e) => e.is_cant_miss);

  const common_hit = commonEntries
    .filter((e) => matched.has(e.diagnosis))
    .map((e) => e.diagnosis);
  const common_missed = commonEntries
    .filter((e) => !matched.has(e.diagnosis))
    .map((e) => e.diagnosis);
  const cant_miss_hit = cantMissEntries
    .filter((e) => matched.has(e.diagnosis))
    .map((e) => e.diagnosis);
  const cant_miss_missed = cantMissEntries
    .filter((e) => !matched.has(e.diagnosis))
    .map((e) => e.diagnosis);

  // VINDICATE coverage
  const allCategories = ["V", "I", "N", "D", "I2", "C", "A", "T", "E"];
  const coveredByStudent = new Set<string>();

  // From matched answer key entries
  for (const entry of answerKey) {
    if (matched.has(entry.diagnosis)) {
      coveredByStudent.add(entry.vindicate_category);
    }
  }

  // Also from student's own category tags (even if diagnosis didn't match)
  for (const sd of studentDiagnoses) {
    if (sd.vindicate_category) {
      coveredByStudent.add(sd.vindicate_category);
    }
  }

  const vindicate_coverage: Record<string, boolean> = {};
  for (const cat of allCategories) {
    vindicate_coverage[cat] = coveredByStudent.has(cat);
  }

  return {
    tiered_differential: tiered,
    common_hit,
    common_missed,
    cant_miss_hit,
    cant_miss_missed,
    vindicate_coverage,
    unmatched,
    feedback_mode: "combined",
  };
}

/**
 * Build the prompt for AI narrative generation
 */
export function buildFeedbackPrompt(
  comparison: Omit<FeedbackResult, "ai_narrative">,
  chiefComplaint: string,
  feedbackMode: string
): string {
  const coveredCount = Object.values(comparison.vindicate_coverage).filter(Boolean).length;
  const totalDiagnoses =
    comparison.common_hit.length +
    comparison.common_missed.length +
    comparison.cant_miss_hit.length +
    comparison.cant_miss_missed.length +
    comparison.unmatched.length;

  let modeInstruction = "";
  if (feedbackMode === "breadth") {
    modeInstruction =
      "Focus on the breadth of the student's differential — how many categories they covered and areas to explore.";
  } else if (feedbackMode === "cant_miss") {
    modeInstruction =
      "Focus on can't-miss diagnoses — dangerous conditions that must be considered regardless of likelihood.";
  } else {
    modeInstruction =
      "Cover both breadth (VINDICATE category coverage) and can't-miss diagnoses.";
  }

  return `You are a supportive medical education AI assistant. A medical student just submitted a differential diagnosis for the following case:

Chief Complaint: ${chiefComplaint}

Here are their results:
- They identified diagnoses across ${coveredCount} of 9 VINDICATE categories
- Common diagnoses they got: ${comparison.common_hit.join(", ") || "none"}
- Common diagnoses they missed: ${comparison.common_missed.join(", ") || "none"}
- Can't-miss diagnoses they got: ${comparison.cant_miss_hit.join(", ") || "none"}
- Can't-miss diagnoses they missed: ${comparison.cant_miss_missed.join(", ") || "none"}
- Additional diagnoses they listed that weren't in the answer key: ${comparison.unmatched.join(", ") || "none"}

${modeInstruction}

Generate 3-5 sentences of supportive, educational feedback. Follow these rules strictly:
- NEVER be punitive, scored, or grading
- Start by acknowledging what the student did well
- Suggest 1-2 specific areas to explore further
- If can't-miss diagnoses were missed, briefly explain WHY they matter clinically (1 sentence each)
- End with encouragement
- Use a warm, coach-like tone — like a supportive attending physician
- Do NOT use bullet points or numbered lists — write in flowing prose
- Do NOT mention scores, percentages, or grades`;
}
