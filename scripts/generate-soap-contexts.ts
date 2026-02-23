/**
 * Precomputes Subjective & Objective text for all OSCE practice cases.
 * Output: src/data/osce-soap-contexts.json  (keyed by practice case id)
 *
 * Run: npx tsx scripts/generate-soap-contexts.ts
 */

import { writeFileSync } from "fs";
import { join } from "path";
import cases from "../src/data/practice-cases.json" assert { type: "json" };

interface SoapContext {
  subjective: string;
  objective: string;
}

function flattenValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return (value as unknown[])
      .map((v) => flattenValue(v))
      .filter(Boolean)
      .join(", ");
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v != null && String(v).trim())
      .map(([k, v]) => `${k.replace(/_/g, " ")}: ${flattenValue(v)}`)
      .join(" | ");
  }
  return "";
}

function toBullets(label: string, value: unknown): string[] {
  if (!value) return [];

  if (typeof value === "string" && value.trim()) {
    const parts = value
      .split(/[;\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2);
    if (parts.length > 1) return parts.map((p) => `• ${p}`);
    return [`• ${label}: ${value.trim()}`];
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v != null && String(v).trim())
      .map(([k, v]) => `• ${k.replace(/_/g, " ")}: ${flattenValue(v)}`);
  }

  if (Array.isArray(value)) {
    return (value as unknown[])
      .map((v) => flattenValue(v))
      .filter(Boolean)
      .map((s) => `• ${s}`);
  }

  return [];
}

function extractContext(fullCaseData: Record<string, unknown>): SoapContext | null {
  // Data lives under OSCE_Examination
  const exam = (fullCaseData.OSCE_Examination as Record<string, unknown>) || fullCaseData;

  const patientActor = exam.Patient_Actor as Record<string, unknown> | undefined;
  const physicalExam = exam.Physical_Examination_Findings as Record<string, unknown> | undefined;
  const testResults = exam.Test_Results as Record<string, unknown> | undefined;

  if (!patientActor && !physicalExam) return null;

  const subjectiveBullets: string[] = [];

  if (patientActor) {
    const fields = [
      { key: "Demographics", label: "Patient" },
      { key: "History", label: "HPI" },
      { key: "Symptoms", label: "Symptoms" },
      { key: "Past_Medical_History", label: "PMH" },
      { key: "PMH", label: "PMH" },
      { key: "Medications", label: "Medications" },
      { key: "Allergies", label: "Allergies" },
      { key: "Social_History", label: "Social Hx" },
      { key: "Family_History", label: "Family Hx" },
      { key: "Review_of_Systems", label: "ROS" },
      { key: "ROS", label: "ROS" },
    ];

    for (const { key, label } of fields) {
      const value = patientActor[key];
      if (!value) continue;
      subjectiveBullets.push(...toBullets(label, value));
    }
  }

  const objectiveBullets: string[] = [];

  if (physicalExam) {
    for (const [k, v] of Object.entries(physicalExam)) {
      if (!v) continue;
      const label = k.replace(/_/g, " ");
      const flat = flattenValue(v);
      if (flat) objectiveBullets.push(`• ${label}: ${flat}`);
    }
  }

  if (testResults) {
    for (const [k, v] of Object.entries(testResults)) {
      if (!v) continue;
      const label = k.replace(/_/g, " ");
      const flat = flattenValue(v);
      if (flat) objectiveBullets.push(`• ${label}: ${flat}`);
    }
  }

  if (subjectiveBullets.length === 0 && objectiveBullets.length === 0) return null;

  return {
    subjective: subjectiveBullets.join("\n") || "• No subjective data available",
    objective: objectiveBullets.join("\n") || "• No objective data available",
  };
}

const osceCases = (cases as unknown as Array<{ id: string; has_structured_exam?: boolean; full_case_data: Record<string, unknown> }>)
  .filter((c) => c.has_structured_exam);

const output: Record<string, SoapContext> = {};
let success = 0;
let failed = 0;

for (const c of osceCases) {
  const ctx = extractContext(c.full_case_data);
  if (ctx) {
    output[c.id] = ctx;
    success++;
  } else {
    console.warn(`No S/O extracted for case: ${c.id}`);
    failed++;
  }
}

const outPath = join(process.cwd(), "src/data/osce-soap-contexts.json");
writeFileSync(outPath, JSON.stringify(output, null, 2));

console.log(`\nDone: ${success} cases written, ${failed} failed`);
console.log(`Output: ${outPath}`);
