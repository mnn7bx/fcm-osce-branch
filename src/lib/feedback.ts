import type { DiagnosisEntry, AnswerKeyEntry, FeedbackResult } from "@/types";

/**
 * Compute Levenshtein edit distance between two strings.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Fuzzy match: strings of length >= 5 with edit distance <= 2,
 * or normalized similarity > 0.85.
 */
function fuzzyMatch(a: string, b: string): boolean {
  const la = a.toLowerCase().trim();
  const lb = b.toLowerCase().trim();
  if (la === lb) return true;
  const maxLen = Math.max(la.length, lb.length);
  if (maxLen < 5) return false;
  const dist = levenshtein(la, lb);
  return dist <= 2 || (1 - dist / maxLen) > 0.85;
}

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

  // Collect all alias strings for fuzzy matching
  const allAliasStrings = Array.from(aliasMap.keys());

  // Match each student diagnosis
  const matched = new Set<string>(); // answer key diagnosis names that were matched
  const unmatched: string[] = [];
  const fuzzyMatched: { student: string; matched_to: string }[] = [];

  for (const sd of studentDiagnoses) {
    const key = normalize(sd.diagnosis);
    const match = aliasMap.get(key);
    if (match) {
      matched.add(match.diagnosis);
    } else {
      // Try fuzzy match against all alias strings
      let found = false;
      for (const alias of allAliasStrings) {
        if (fuzzyMatch(key, alias)) {
          const fuzzyEntry = aliasMap.get(alias)!;
          matched.add(fuzzyEntry.diagnosis);
          fuzzyMatched.push({ student: sd.diagnosis, matched_to: fuzzyEntry.diagnosis });
          found = true;
          break;
        }
      }
      if (!found) {
        unmatched.push(sd.diagnosis);
      }
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
    // Support new array field and legacy single-string field
    const cats = sd.vindicate_categories ?? (sd.vindicate_category ? [sd.vindicate_category] : []);
    for (const cat of cats) {
      coveredByStudent.add(cat);
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
    fuzzy_matched: fuzzyMatched.length > 0 ? fuzzyMatched : undefined,
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
- Diagnoses matched via close spelling: ${comparison.fuzzy_matched?.map((f) => `"${f.student}" → ${f.matched_to}`).join(", ") || "none"}
- Additional diagnoses they listed that weren't in the answer key: ${comparison.unmatched.join(", ") || "none"}

${modeInstruction}

Generate 3-5 categorized bullet points of supportive, educational feedback. Follow these rules strictly:
- NEVER be punitive, scored, or grading
- Use a warm, coach-like tone — like a supportive attending physician
- Do NOT mention scores, percentages, or grades
- Each bullet must start with one of these category prefixes: "Strength:", "Consider:", or "Can't-miss:"
- Start with at least one "Strength:" bullet acknowledging what the student did well
- Use "Consider:" for areas to explore further
- Use "Can't-miss:" ONLY if dangerous diagnoses were missed — briefly explain WHY they matter (1 sentence)
- End with a "Strength:" or "Consider:" bullet that offers encouragement
- Format each bullet as: "- Category: One sentence of feedback."
- Keep each bullet to 1-2 sentences maximum`;
}
