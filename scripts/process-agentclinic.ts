/**
 * Process AgentClinic JSONL files into normalized PracticeCase JSON.
 * Run: npx tsx scripts/process-agentclinic.ts
 */

import * as fs from "fs";
import * as path from "path";

interface PracticeCase {
  id: string;
  source: string;
  title: string;
  chief_complaint: string;
  patient_age: number | null;
  patient_gender: string | null;
  vitals: Record<string, string>;
  body_system: string | null;
  difficulty: string;
  correct_diagnosis: string;
  full_case_data: Record<string, unknown>;
  has_structured_exam: boolean;
}

const DATA_DIR = path.join(
  process.env.HOME || "~",
  "Downloads/clinical-data-package/agentclinic"
);
const OUT_FILE = path.join(__dirname, "../src/data/practice-cases.json");

// Parse "35-year-old female" → { age: 35, gender: "female" }
function parseDemographics(demo: string): {
  age: number | null;
  gender: string | null;
} {
  const ageMatch = demo.match(/(\d+)-year-old/i);
  const genderMatch = demo.match(
    /\b(male|female|man|woman|boy|girl)\b/i
  );
  const age = ageMatch ? parseInt(ageMatch[1], 10) : null;
  let gender: string | null = null;
  if (genderMatch) {
    const g = genderMatch[1].toLowerCase();
    gender =
      g === "male" || g === "man" || g === "boy" ? "male" : "female";
  }
  return { age, gender };
}

// Infer body system from physical exam section keys
function inferBodySystem(
  examFindings: Record<string, unknown>
): string | null {
  const keys = Object.keys(examFindings)
    .filter((k) => k !== "Vital_Signs")
    .join(" ")
    .toLowerCase();

  if (keys.includes("neurolog")) return "Neurological";
  if (keys.includes("abdom") || keys.includes("gastro")) return "GI";
  if (keys.includes("cardio") || keys.includes("heart") || keys.includes("cardiac"))
    return "Cardiovascular";
  if (
    keys.includes("pulmon") ||
    keys.includes("respiratory") ||
    keys.includes("lung") ||
    keys.includes("chest")
  )
    return "Pulmonary";
  if (keys.includes("musculoskeletal") || keys.includes("orthop"))
    return "Musculoskeletal";
  if (keys.includes("dermat") || keys.includes("skin")) return "Dermatology";
  if (keys.includes("ophth") || keys.includes("eye")) return "Ophthalmology";
  if (keys.includes("ent") || keys.includes("ear") || keys.includes("throat"))
    return "ENT";
  if (keys.includes("renal") || keys.includes("urin") || keys.includes("genito"))
    return "Renal/GU";
  if (keys.includes("endocrin")) return "Endocrine";
  if (keys.includes("hematol")) return "Hematology";
  if (keys.includes("psych") || keys.includes("mental")) return "Psychiatry";

  return null;
}

// Extract vitals from OSCE format
function extractVitals(
  examFindings: Record<string, unknown>
): Record<string, string> {
  const vitals: Record<string, string> = {};
  const vitalSigns = examFindings?.Vital_Signs as
    | Record<string, string>
    | undefined;
  if (vitalSigns && typeof vitalSigns === "object") {
    for (const [key, val] of Object.entries(vitalSigns)) {
      if (typeof val === "string") {
        vitals[key.replace(/_/g, " ")] = val;
      }
    }
  }
  return vitals;
}

function processOSCE(
  filePath: string,
  sourcePrefix: string,
  sourceName: string
): PracticeCase[] {
  const lines = fs
    .readFileSync(filePath, "utf-8")
    .split("\n")
    .filter((l) => l.trim());
  const cases: PracticeCase[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = JSON.parse(lines[i]);
    const osce = raw.OSCE_Examination;
    if (!osce) continue;

    const patient = osce.Patient_Actor || {};
    const { age, gender } = parseDemographics(patient.Demographics || "");
    const examFindings =
      (osce.Physical_Examination_Findings as Record<string, unknown>) || {};

    const chiefComplaint =
      patient.Symptoms?.Primary_Symptom ||
      (patient.History || "").split(".")[0] ||
      "Unknown";

    const id = `${sourcePrefix}-${String(i + 1).padStart(3, "0")}`;

    cases.push({
      id,
      source: sourceName,
      title: `${chiefComplaint} — ${osce.Correct_Diagnosis}`,
      chief_complaint: chiefComplaint,
      patient_age: age,
      patient_gender: gender,
      vitals: extractVitals(examFindings),
      body_system: inferBodySystem(examFindings),
      difficulty: sourceName.includes("extended") ? "intermediate" : "standard",
      correct_diagnosis: osce.Correct_Diagnosis,
      full_case_data: raw,
      has_structured_exam: true,
    });
  }

  return cases;
}

function processNEJM(
  filePath: string,
  sourcePrefix: string,
  sourceName: string
): PracticeCase[] {
  const lines = fs
    .readFileSync(filePath, "utf-8")
    .split("\n")
    .filter((l) => l.trim());
  const cases: PracticeCase[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = JSON.parse(lines[i]);

    // Extract correct answer
    const correctAnswer =
      raw.answers?.find((a: { correct: boolean; text: string }) => a.correct)
        ?.text || "Unknown";

    // Extract demographics from question text
    const questionText: string = raw.question || "";
    const { age, gender } = parseDemographics(questionText);

    // Chief complaint: first sentence of question
    const firstSentence = questionText.split(/\.\s/)[0] || questionText;
    const chiefComplaint =
      firstSentence.length > 120
        ? firstSentence.substring(0, 117) + "..."
        : firstSentence;

    // Infer body system from type field (nejm_extended only) or question
    let bodySystem: string | null = null;
    if (raw.type && Array.isArray(raw.type)) {
      const typeStr = raw.type.join(" ").toLowerCase();
      if (typeStr.includes("dermatol")) bodySystem = "Dermatology";
      else if (typeStr.includes("cardio")) bodySystem = "Cardiovascular";
      else if (typeStr.includes("neuro")) bodySystem = "Neurological";
      else if (typeStr.includes("pulmon") || typeStr.includes("lung"))
        bodySystem = "Pulmonary";
      else if (typeStr.includes("gi") || typeStr.includes("gastro"))
        bodySystem = "GI";
      else if (typeStr.includes("ophth")) bodySystem = "Ophthalmology";
      else if (typeStr.includes("ent")) bodySystem = "ENT";
      else if (typeStr.includes("hematol")) bodySystem = "Hematology";
      else if (typeStr.includes("ortho") || typeStr.includes("musculoskel"))
        bodySystem = "Musculoskeletal";
      else if (typeStr.includes("endocrin")) bodySystem = "Endocrine";
      else if (typeStr.includes("infectious") || typeStr.includes("infect"))
        bodySystem = "Infectious Disease";
      else if (typeStr.includes("renal") || typeStr.includes("nephro"))
        bodySystem = "Renal/GU";
      else if (typeStr.includes("rheumatol")) bodySystem = "Rheumatology";
    }

    const id = `${sourcePrefix}-${String(i + 1).padStart(3, "0")}`;

    cases.push({
      id,
      source: sourceName,
      title: `${correctAnswer}`,
      chief_complaint: chiefComplaint,
      patient_age: age,
      patient_gender: gender,
      vitals: {},
      body_system: bodySystem,
      difficulty: "advanced",
      correct_diagnosis: correctAnswer,
      full_case_data: raw,
      has_structured_exam: false,
    });
  }

  return cases;
}

// Main
const files: {
  file: string;
  prefix: string;
  source: string;
  type: "osce" | "nejm";
}[] = [
  {
    file: "agentclinic_medqa.jsonl",
    prefix: "ac-medqa",
    source: "medqa",
    type: "osce",
  },
  {
    file: "agentclinic_medqa_extended.jsonl",
    prefix: "ac-medqa-ext",
    source: "medqa-extended",
    type: "osce",
  },
  {
    file: "agentclinic_nejm.jsonl",
    prefix: "ac-nejm",
    source: "nejm",
    type: "nejm",
  },
  {
    file: "agentclinic_nejm_extended.jsonl",
    prefix: "ac-nejm-ext",
    source: "nejm-extended",
    type: "nejm",
  },
];

let allCases: PracticeCase[] = [];

for (const { file, prefix, source, type } of files) {
  const filePath = path.join(DATA_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`Warning: ${file} not found, skipping`);
    continue;
  }

  const cases =
    type === "osce"
      ? processOSCE(filePath, prefix, source)
      : processNEJM(filePath, prefix, source);

  console.log(`${file}: ${cases.length} cases`);
  allCases = allCases.concat(cases);
}

// Deduplicate by correct_diagnosis + chief_complaint combo
const seen = new Set<string>();
const deduped: PracticeCase[] = [];
for (const c of allCases) {
  const key = `${c.correct_diagnosis.toLowerCase()}|${c.chief_complaint.toLowerCase()}`;
  if (seen.has(key)) continue;
  seen.add(key);
  deduped.push(c);
}

console.log(`\nTotal: ${allCases.length} raw, ${deduped.length} after dedup`);

// Ensure output directory exists
fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(deduped, null, 2));
console.log(`Written to ${OUT_FILE}`);
