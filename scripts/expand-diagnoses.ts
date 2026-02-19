/**
 * Extract unique diagnoses from practice-cases.json and output new
 * DIAGNOSIS_LOOKUP entries to merge into diagnosis-lookup.ts.
 * Run: npx tsx scripts/expand-diagnoses.ts
 */

import * as fs from "fs";
import * as path from "path";

interface PracticeCase {
  correct_diagnosis: string;
}

const CASES_FILE = path.join(__dirname, "../src/data/practice-cases.json");

// Existing terms from diagnosis-lookup.ts (lowercased for dedup)
const EXISTING_TERMS = new Set([
  "acute coronary syndrome",
  "myocardial infarction",
  "unstable angina",
  "stable angina",
  "aortic dissection",
  "pulmonary embolism",
  "deep vein thrombosis",
  "atrial fibrillation",
  "heart failure",
  "acute pericarditis",
  "myocarditis",
  "cardiac tamponade",
  "aortic stenosis",
  "hypertensive emergency",
  "stroke",
  "transient ischemic attack",
  "peripheral arterial disease",
  "pneumonia",
  "pneumothorax",
  "tension pneumothorax",
  "asthma exacerbation",
  "copd exacerbation",
  "pleural effusion",
  "pulmonary edema",
  "appendicitis",
  "acute cholecystitis",
  "cholelithiasis",
  "choledocholithiasis with cholangitis",
  "biliary pancreatitis",
  "pancreatitis",
  "biliary colic",
  "small bowel obstruction",
  "gastroesophageal reflux disease",
  "peptic ulcer disease",
  "diverticulitis",
  "inflammatory bowel disease",
  "gi bleed",
  "gastritis",
  "mesenteric ischemia",
  "hepatitis",
  "cirrhosis",
  "costochondritis",
  "musculoskeletal pain",
  "rib fracture",
  "rib contusion",
  "lumbar disc herniation",
  "spinal stenosis",
  "cauda equina syndrome",
  "osteoarthritis",
  "piriformis syndrome",
  "mechanical low back pain",
  "spondylolisthesis",
  "vertebral compression fracture",
  "vertebral osteomyelitis",
  "spinal tumor/metastasis",
  "migraine",
  "tension headache",
  "meningitis",
  "subarachnoid hemorrhage",
  "epidural abscess",
  "multiple sclerosis",
  "urinary tract infection",
  "pyelonephritis",
  "nephrolithiasis",
  "acute kidney injury",
  "ectopic pregnancy",
  "ovarian torsion",
  "testicular torsion",
  "sepsis",
  "endocarditis",
  "osteomyelitis",
  "cellulitis",
  "abscess",
  "diabetic ketoacidosis",
  "hypoglycemia",
  "thyrotoxicosis",
  "hypothyroidism",
  "adrenal insufficiency",
  "anxiety / panic attack",
  "anaphylaxis",
  "drug reaction",
  "herpes zoster",
  "lung cancer",
  "lymphoma",
]);

if (!fs.existsSync(CASES_FILE)) {
  console.error(
    "practice-cases.json not found. Run process-agentclinic.ts first."
  );
  process.exit(1);
}

const cases: PracticeCase[] = JSON.parse(fs.readFileSync(CASES_FILE, "utf-8"));

// Collect unique diagnoses not already in lookup
const newDiagnoses = new Map<string, string>(); // lowered → original casing

for (const c of cases) {
  const diag = c.correct_diagnosis.trim();
  if (!diag || diag === "Unknown") continue;
  const lower = diag.toLowerCase();

  // Skip if already exists (exact or close match)
  if (EXISTING_TERMS.has(lower)) continue;

  // Skip single-word very generic terms
  if (diag.length < 3) continue;

  if (!newDiagnoses.has(lower)) {
    newDiagnoses.set(lower, diag);
  }
}

// Sort alphabetically
const sorted = Array.from(newDiagnoses.values()).sort((a, b) =>
  a.localeCompare(b)
);

console.log(`Found ${sorted.length} new diagnoses from ${cases.length} cases\n`);

// Output as TypeScript entries
console.log("  // === AgentClinic Diagnoses (auto-generated) ===");
for (const term of sorted) {
  console.log(`  { term: ${JSON.stringify(term)}, abbreviations: [] },`);
}

console.log(
  `\n// Copy the above into DIAGNOSIS_LOOKUP in src/data/diagnosis-lookup.ts`
);
console.log(`// Total new entries: ${sorted.length}`);
