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

  // === AgentClinic Diagnoses (auto-generated from 324 practice cases) ===
  { term: "Acalculous cholecystitis", abbreviations: [] },
  { term: "Actinic Keratosis", abbreviations: ["AK"] },
  { term: "Actinomycosis", abbreviations: [] },
  { term: "Acute Hepatitis B", abbreviations: ["HBV"] },
  { term: "Acute interstitial nephritis", abbreviations: ["AIN"] },
  { term: "Acute lymphoblastic leukemia", abbreviations: ["ALL"] },
  { term: "Acute Mesenteric Ischemia", abbreviations: ["AMI"] },
  { term: "Acute myelogenous leukemia", abbreviations: ["AML"] },
  { term: "Adenomatous polyp", abbreviations: [] },
  { term: "Adhesive capsulitis", abbreviations: ["frozen shoulder"] },
  { term: "Akathisia", abbreviations: [] },
  { term: "Aortic valve stenosis", abbreviations: [] },
  { term: "Apical lung tumor", abbreviations: ["Pancoast tumor"] },
  { term: "Arrhythmogenic right ventricular cardiomyopathy", abbreviations: ["ARVC"] },
  { term: "Asthma", abbreviations: [] },
  { term: "Atrial Myxoma", abbreviations: [] },
  { term: "Atrial Septal Defect", abbreviations: ["ASD"] },
  { term: "Autosomal dominant polycystic kidney disease", abbreviations: ["ADPKD"] },
  { term: "Bartter's syndrome", abbreviations: [] },
  { term: "Benign paroxysmal positional vertigo", abbreviations: ["BPPV"] },
  { term: "Biliary atresia", abbreviations: [] },
  { term: "Boerhaave syndrome", abbreviations: ["esophageal rupture"] },
  { term: "Borderline personality disorder", abbreviations: ["BPD"] },
  { term: "Bowen's Disease", abbreviations: [] },
  { term: "Brief Psychotic Disorder", abbreviations: [] },
  { term: "Bronchiectasis", abbreviations: [] },
  { term: "Bullous pemphigoid", abbreviations: [] },
  { term: "C. difficile colitis", abbreviations: ["C. diff", "CDI"] },
  { term: "Cardiac Contusion", abbreviations: [] },
  { term: "Cecal volvulus", abbreviations: [] },
  { term: "Central retinal artery occlusion", abbreviations: ["CRAO"] },
  { term: "Chickenpox", abbreviations: ["varicella"] },
  { term: "Chronic eosinophilic pneumonia", abbreviations: [] },
  { term: "Chronic Granulomatous Disease", abbreviations: ["CGD"] },
  { term: "Chronic kidney failure", abbreviations: ["CKD", "chronic kidney disease"] },
  { term: "Chronic lymphocytic leukemia", abbreviations: ["CLL"] },
  { term: "Chronic obstructive pulmonary disease", abbreviations: ["COPD"] },
  { term: "Chronic Venous Insufficiency", abbreviations: ["CVI"] },
  { term: "Coarctation of the aorta", abbreviations: [] },
  { term: "Cold agglutinin syndrome", abbreviations: [] },
  { term: "Complex partial seizure", abbreviations: ["focal seizure"] },
  { term: "Constrictive Pericarditis", abbreviations: [] },
  { term: "Crohn's disease", abbreviations: [] },
  { term: "Cryoglobulinemic vasculitis", abbreviations: [] },
  { term: "Cryptococcal infection", abbreviations: ["cryptococcosis"] },
  { term: "Cystic echinococcosis", abbreviations: ["hydatid cyst"] },
  { term: "Cytomegalovirus retinitis", abbreviations: ["CMV retinitis"] },
  { term: "De Quervain tenosynovitis", abbreviations: [] },
  { term: "Dermatofibroma", abbreviations: [] },
  { term: "Dermatomyositis", abbreviations: [] },
  { term: "Diffuse cutaneous systemic sclerosis", abbreviations: ["scleroderma"] },
  { term: "Diffuse large B-cell lymphoma", abbreviations: ["DLBCL"] },
  { term: "Disc herniation", abbreviations: ["herniated disc"] },
  { term: "Disseminated Gonococcal Infection", abbreviations: ["DGI"] },
  { term: "Drug reaction with eosinophilia and systemic symptoms", abbreviations: ["DRESS syndrome"] },
  { term: "Dumping Syndrome", abbreviations: [] },
  { term: "Duodenal atresia", abbreviations: [] },
  { term: "Eczematous dermatitis", abbreviations: ["eczema"] },
  { term: "Encapsulating peritoneal sclerosis", abbreviations: [] },
  { term: "Endometritis", abbreviations: [] },
  { term: "Eosinophilic fasciitis", abbreviations: [] },
  { term: "Epidermoid cyst", abbreviations: [] },
  { term: "Eruptive xanthomas", abbreviations: [] },
  { term: "Erythema ab igne", abbreviations: [] },
  { term: "Erythema Infectiosum", abbreviations: ["fifth disease"] },
  { term: "Essential thrombocythemia", abbreviations: ["ET"] },
  { term: "Ewing sarcoma", abbreviations: [] },
  { term: "Exogenous ochronosis", abbreviations: [] },
  { term: "Factitious disorder", abbreviations: ["Munchausen"] },
  { term: "Fibroadenoma", abbreviations: [] },
  { term: "Frontotemporal Dementia", abbreviations: ["FTD"] },
  { term: "Fulminant hepatic failure", abbreviations: [] },
  { term: "Gastrointestinal amyloidosis", abbreviations: [] },
  { term: "Gaucher's disease", abbreviations: [] },
  { term: "Giant-cell arteritis", abbreviations: ["GCA", "temporal arteritis"] },
  { term: "Glossopharyngeal Neuralgia", abbreviations: [] },
  { term: "Granulosa cell tumor", abbreviations: [] },
  { term: "Hemolytic uremic syndrome", abbreviations: ["HUS"] },
  { term: "Hemophilia", abbreviations: [] },
  { term: "Hemorrhoids", abbreviations: [] },
  { term: "Hirschsprung disease", abbreviations: [] },
  { term: "Histoplasmosis", abbreviations: [] },
  { term: "Huntington disease", abbreviations: ["HD"] },
  { term: "Hypertrophic Cardiomyopathy", abbreviations: ["HCM", "HOCM"] },
  { term: "Interstitial cystitis", abbreviations: ["IC"] },
  { term: "Intravascular lymphoma", abbreviations: [] },
  { term: "Intraventricular Hemorrhage", abbreviations: ["IVH"] },
  { term: "Irritable Bowel Syndrome", abbreviations: ["IBS"] },
  { term: "Kaposi's sarcoma", abbreviations: ["KS"] },
  { term: "Keratoacanthoma", abbreviations: [] },
  { term: "Keratoconus", abbreviations: [] },
  { term: "Labyrinthitis", abbreviations: [] },
  { term: "Lambert-Eaton syndrome", abbreviations: ["LEMS"] },
  { term: "Langerhans-cell histiocytosis", abbreviations: ["LCH"] },
  { term: "Laryngeal candidiasis", abbreviations: [] },
  { term: "Lepromatous Leprosy", abbreviations: [] },
  { term: "Leptospirosis", abbreviations: [] },
  { term: "Lichen Sclerosus", abbreviations: [] },
  { term: "Listeriosis", abbreviations: [] },
  { term: "Livedo reticularis", abbreviations: [] },
  { term: "Major depressive disorder", abbreviations: ["MDD", "depression"] },
  { term: "Malignant melanoma", abbreviations: ["melanoma"] },
  { term: "Medullary Sponge Kidney", abbreviations: [] },
  { term: "Meigs syndrome", abbreviations: [] },
  { term: "Membranous nephropathy", abbreviations: [] },
  { term: "Minimal Change Disease", abbreviations: ["MCD"] },
  { term: "Molluscum contagiosum", abbreviations: [] },
  { term: "Multiple endocrine neoplasia type 1", abbreviations: ["MEN1"] },
  { term: "Multiple system atrophy", abbreviations: ["MSA"] },
  { term: "Myasthenia gravis", abbreviations: ["MG"] },
  { term: "Necrobiosis lipoidica", abbreviations: [] },
  { term: "Neuroleptic malignant syndrome", abbreviations: ["NMS"] },
  { term: "Nocardiosis", abbreviations: [] },
  { term: "Oppositional Defiant Disorder", abbreviations: ["ODD"] },
  { term: "Pancreatic adenocarcinoma", abbreviations: ["pancreatic cancer"] },
  { term: "Papillary carcinoma of the thyroid", abbreviations: ["papillary thyroid cancer"] },
  { term: "Parkinson disease", abbreviations: ["PD", "Parkinson's"] },
  { term: "Paroxysmal Atrial Fibrillation", abbreviations: ["PAF"] },
  { term: "Pellagra", abbreviations: [] },
  { term: "Pelvic inflammatory disease", abbreviations: ["PID"] },
  { term: "Pemphigus vulgaris", abbreviations: [] },
  { term: "Phyllodes tumor", abbreviations: [] },
  { term: "Plummer-Vinson syndrome", abbreviations: [] },
  { term: "Polymyositis", abbreviations: [] },
  { term: "Porphyria cutanea tarda", abbreviations: ["PCT"] },
  { term: "Posterior reversible encephalopathy syndrome", abbreviations: ["PRES"] },
  { term: "Posttraumatic stress disorder", abbreviations: ["PTSD"] },
  { term: "Primary sclerosing cholangitis", abbreviations: ["PSC"] },
  { term: "Progressive multifocal leukoencephalopathy", abbreviations: ["PML"] },
  { term: "Psoriatic arthritis", abbreviations: ["PsA"] },
  { term: "Pulmonary Sarcoidosis", abbreviations: ["sarcoidosis"] },
  { term: "Pyoderma gangrenosum", abbreviations: [] },
  { term: "Pyogenic granuloma", abbreviations: [] },
  { term: "Reactive Arthritis", abbreviations: ["Reiter's syndrome"] },
  { term: "Respiratory Distress Syndrome", abbreviations: ["RDS", "ARDS"] },
  { term: "Retinoblastoma", abbreviations: [] },
  { term: "Retropharyngeal abscess", abbreviations: [] },
  { term: "Roseola infantum", abbreviations: ["HHV-6"] },
  { term: "Ruptured ovarian cyst", abbreviations: [] },
  { term: "Schizoaffective disorder", abbreviations: [] },
  { term: "Schizophrenia", abbreviations: [] },
  { term: "Seborrheic dermatitis", abbreviations: [] },
  { term: "Seborrheic keratosis", abbreviations: ["SK"] },
  { term: "Silicosis", abbreviations: [] },
  { term: "Situational syncope", abbreviations: [] },
  { term: "Slipped capital femoral epiphysis", abbreviations: ["SCFE"] },
  { term: "Somatization disorder", abbreviations: [] },
  { term: "Squamous cell carcinoma", abbreviations: ["SCC"] },
  { term: "Stevens-Johnson syndrome", abbreviations: ["SJS"] },
  { term: "Syphilis", abbreviations: [] },
  { term: "Syringomyelia", abbreviations: [] },
  { term: "Systemic lupus erythematosus", abbreviations: ["SLE", "lupus"] },
  { term: "Takotsubo cardiomyopathy", abbreviations: ["broken heart syndrome"] },
  { term: "Tay-Sachs disease", abbreviations: [] },
  { term: "Temporomandibular joint dysfunction", abbreviations: ["TMJ", "TMD"] },
  { term: "Tetralogy of Fallot", abbreviations: ["TOF"] },
  { term: "Thrombotic Thrombocytopenic Purpura", abbreviations: ["TTP"] },
  { term: "Tinea cruris", abbreviations: ["jock itch"] },
  { term: "Tuberculosis", abbreviations: ["TB"] },
  { term: "Valley fever", abbreviations: ["coccidioidomycosis"] },
  { term: "Varicella", abbreviations: [] },
  { term: "Vasovagal syncope", abbreviations: [] },
  { term: "Vitamin B12 deficiency", abbreviations: ["B12 deficiency"] },
  { term: "Vitiligo", abbreviations: [] },
  { term: "Waldenstrom macroglobulinemia", abbreviations: [] },
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
