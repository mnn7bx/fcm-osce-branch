/**
 * Common diagnoses for autocomplete in FCM differential builder.
 * Each entry has a canonical term and abbreviations/aliases for matching.
 */

interface DiagnosisLookupEntry {
  term: string;
  abbreviations: string[];
}

export const DIAGNOSIS_LOOKUP: DiagnosisLookupEntry[] = [
  // Cardiac / Vascular
  { term: "Acute Coronary Syndrome", abbreviations: ["ACS", "MI", "heart attack", "NSTEMI", "STEMI"] },
  { term: "Myocardial Infarction", abbreviations: ["MI", "heart attack", "STEMI", "NSTEMI"] },
  { term: "Unstable Angina", abbreviations: ["UA"] },
  { term: "Stable Angina", abbreviations: [] },
  { term: "Aortic Dissection", abbreviations: ["dissection"] },
  { term: "Pulmonary Embolism", abbreviations: ["PE"] },
  { term: "Deep Vein Thrombosis", abbreviations: ["DVT"] },
  { term: "Atrial Fibrillation", abbreviations: ["AFib", "AF"] },
  { term: "Heart Failure", abbreviations: ["CHF", "HF", "congestive"] },
  { term: "Acute Pericarditis", abbreviations: ["pericarditis", "viral pericarditis"] },
  { term: "Myocarditis", abbreviations: [] },
  { term: "Cardiac Tamponade", abbreviations: ["tamponade"] },
  { term: "Aortic Stenosis", abbreviations: ["AS"] },
  { term: "Hypertensive Emergency", abbreviations: ["HTN emergency"] },
  { term: "Stroke", abbreviations: ["CVA", "cerebrovascular accident"] },
  { term: "Transient Ischemic Attack", abbreviations: ["TIA"] },
  { term: "Peripheral Arterial Disease", abbreviations: ["PAD", "PVD"] },

  // Pulmonary
  { term: "Pneumonia", abbreviations: ["PNA", "CAP", "community acquired pneumonia"] },
  { term: "Pneumothorax", abbreviations: ["PTX", "collapsed lung"] },
  { term: "Tension Pneumothorax", abbreviations: ["tension PTX"] },
  { term: "Asthma Exacerbation", abbreviations: ["asthma"] },
  { term: "COPD Exacerbation", abbreviations: ["COPD", "AECOPD"] },
  { term: "Pleural Effusion", abbreviations: ["effusion"] },
  { term: "Pulmonary Edema", abbreviations: [] },

  // GI
  { term: "Appendicitis", abbreviations: ["appy"] },
  { term: "Acute Cholecystitis", abbreviations: ["cholecystitis", "gallbladder inflammation", "gallbladder infection"] },
  { term: "Cholelithiasis", abbreviations: ["gallstones"] },
  { term: "Choledocholithiasis with Cholangitis", abbreviations: ["cholangitis", "CBD stone", "common bile duct stone", "ascending cholangitis", "Charcot triad"] },
  { term: "Biliary Pancreatitis", abbreviations: ["gallstone pancreatitis"] },
  { term: "Pancreatitis", abbreviations: ["acute pancreatitis"] },
  { term: "Biliary Colic", abbreviations: ["gallstone pain"] },
  { term: "Small Bowel Obstruction", abbreviations: ["SBO", "bowel obstruction"] },
  { term: "Gastroesophageal Reflux Disease", abbreviations: ["GERD", "acid reflux", "reflux"] },
  { term: "Peptic Ulcer Disease", abbreviations: ["PUD", "ulcer", "gastric ulcer", "duodenal ulcer"] },
  { term: "Diverticulitis", abbreviations: [] },
  { term: "Inflammatory Bowel Disease", abbreviations: ["IBD", "Crohn's", "ulcerative colitis", "UC"] },
  { term: "GI Bleed", abbreviations: ["GIB", "upper GI bleed", "lower GI bleed", "UGIB", "LGIB"] },
  { term: "Gastritis", abbreviations: ["stomach inflammation"] },
  { term: "Mesenteric Ischemia", abbreviations: ["intestinal ischemia"] },
  { term: "Hepatitis", abbreviations: [] },
  { term: "Cirrhosis", abbreviations: [] },

  // Musculoskeletal
  { term: "Costochondritis", abbreviations: ["costo"] },
  { term: "Musculoskeletal Pain", abbreviations: ["MSK pain", "muscle strain"] },
  { term: "Rib Fracture", abbreviations: [] },
  { term: "Rib Contusion", abbreviations: ["chest wall injury", "chest wall contusion", "rib injury"] },
  { term: "Lumbar Disc Herniation", abbreviations: ["disc herniation", "herniated disc", "HNP", "sciatica", "radiculopathy", "L4-L5 herniation", "L5-S1 herniation", "slipped disc"] },
  { term: "Spinal Stenosis", abbreviations: [] },
  { term: "Cauda Equina Syndrome", abbreviations: ["cauda equina", "CES"] },
  { term: "Osteoarthritis", abbreviations: ["OA"] },
  { term: "Piriformis Syndrome", abbreviations: ["piriformis", "deep gluteal syndrome"] },
  { term: "Mechanical Low Back Pain", abbreviations: ["muscle strain", "lumbar strain", "back strain", "musculoskeletal back pain"] },
  { term: "Spondylolisthesis", abbreviations: ["vertebral slip", "spondy"] },
  { term: "Vertebral Compression Fracture", abbreviations: ["compression fracture", "VCF", "spinal fracture"] },
  { term: "Vertebral Osteomyelitis", abbreviations: ["discitis", "spinal osteomyelitis", "vertebral infection"] },
  { term: "Spinal Tumor/Metastasis", abbreviations: ["spinal tumor", "metastatic spine disease", "vertebral metastasis", "metastatic spinal lesion"] },

  // Neurologic
  { term: "Migraine", abbreviations: [] },
  { term: "Tension Headache", abbreviations: [] },
  { term: "Meningitis", abbreviations: [] },
  { term: "Subarachnoid Hemorrhage", abbreviations: ["SAH"] },
  { term: "Epidural Abscess", abbreviations: [] },
  { term: "Multiple Sclerosis", abbreviations: ["MS"] },

  // Renal / GU
  { term: "Urinary Tract Infection", abbreviations: ["UTI"] },
  { term: "Pyelonephritis", abbreviations: ["pyelo"] },
  { term: "Nephrolithiasis", abbreviations: ["kidney stone", "renal colic", "kidney stones"] },
  { term: "Acute Kidney Injury", abbreviations: ["AKI", "renal failure"] },
  { term: "Ectopic Pregnancy", abbreviations: ["ectopic"] },
  { term: "Ovarian Torsion", abbreviations: ["torsion"] },
  { term: "Testicular Torsion", abbreviations: [] },

  // Infectious
  { term: "Sepsis", abbreviations: [] },
  { term: "Endocarditis", abbreviations: ["IE", "infective endocarditis"] },
  { term: "Osteomyelitis", abbreviations: ["osteo"] },
  { term: "Cellulitis", abbreviations: [] },
  { term: "Abscess", abbreviations: [] },

  // Endocrine / Metabolic
  { term: "Diabetic Ketoacidosis", abbreviations: ["DKA"] },
  { term: "Hypoglycemia", abbreviations: ["low blood sugar"] },
  { term: "Thyrotoxicosis", abbreviations: ["thyroid storm", "hyperthyroid"] },
  { term: "Hypothyroidism", abbreviations: [] },
  { term: "Adrenal Insufficiency", abbreviations: ["adrenal crisis"] },

  // Psych / Other
  { term: "Anxiety / Panic Attack", abbreviations: ["panic", "anxiety", "panic attack"] },
  { term: "Anaphylaxis", abbreviations: [] },
  { term: "Drug Reaction", abbreviations: ["adverse drug reaction", "ADR"] },
  { term: "Herpes Zoster", abbreviations: ["shingles"] },
  { term: "Lung Cancer", abbreviations: [] },
  { term: "Lymphoma", abbreviations: [] },
];

export interface DiagnosisSearchResult {
  term: string;
  matchedAbbrev?: string;
}

/**
 * Search diagnoses by term or abbreviation (case-insensitive substring match).
 * Returns up to `limit` results with optional matched abbreviation.
 */
export function searchDiagnoses(query: string, limit = 8): DiagnosisSearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const results: { term: string; matchedAbbrev?: string; score: number }[] = [];

  for (const entry of DIAGNOSIS_LOOKUP) {
    const termLower = entry.term.toLowerCase();

    // Exact abbreviation match gets highest priority
    const exactAbbrev = entry.abbreviations.find((a) => a.toLowerCase() === q);
    if (exactAbbrev) {
      results.push({ term: entry.term, matchedAbbrev: exactAbbrev, score: 3 });
      continue;
    }

    // Term starts with query
    if (termLower.startsWith(q)) {
      results.push({ term: entry.term, score: 2 });
      continue;
    }

    // Abbreviation starts with query
    const startsAbbrev = entry.abbreviations.find((a) => a.toLowerCase().startsWith(q));
    if (startsAbbrev) {
      results.push({ term: entry.term, matchedAbbrev: startsAbbrev, score: 1.5 });
      continue;
    }

    // Substring match on term
    if (termLower.includes(q)) {
      results.push({ term: entry.term, score: 1 });
      continue;
    }

    // Substring match on abbreviation
    const subAbbrev = entry.abbreviations.find((a) => a.toLowerCase().includes(q));
    if (subAbbrev) {
      results.push({ term: entry.term, matchedAbbrev: subAbbrev, score: 0.5 });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => ({ term: r.term, matchedAbbrev: r.matchedAbbrev }));
}
