-- FCM Companion Seed Data
-- Demo users, 3 sample cases, schedule, and default settings

-- ============================================
-- USERS (Demo Roster)
-- ============================================
INSERT INTO fcm_users (name, email, role, fcm_group, year_level) VALUES
  ('Demo Student', 'demo.student@virginia.edu', 'student', 'Group A', 'M1'),
  ('Alex Rivera', 'alex.rivera@virginia.edu', 'student', 'Group A', 'M1'),
  ('Jordan Kim', 'jordan.kim@virginia.edu', 'student', 'Group A', 'M1'),
  ('Sam Patel', 'sam.patel@virginia.edu', 'student', 'Group B', 'M1'),
  ('Taylor Chen', 'taylor.chen@virginia.edu', 'student', 'Group B', 'M1'),
  ('Dr. Sarah Mitchell', 'sarah.mitchell@virginia.edu', 'instructor', 'Group A', NULL),
  ('Dr. Andrew Parsons', 'andrew.parsons@virginia.edu', 'admin', NULL, NULL)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- CASES (3 Sample Cases)
-- ============================================

-- Case 1: Chest Pain
INSERT INTO fcm_cases (case_id, title, chief_complaint, patient_name, patient_age, patient_gender, vitals, body_system, difficulty, differential_answer_key, vindicate_categories, key_teaching_points, full_case_data, sort_order)
VALUES (
  'FCM-CV-001',
  'Chest Pain in a Young Athlete',
  '22-year-old male with chest pain',
  'Marcus Johnson',
  22,
  'Male',
  '{"temperature": "99.1°F", "heart_rate": "102 bpm", "blood_pressure": "142/88 mmHg", "respiratory_rate": "20/min", "o2_sat": "97% RA", "bmi": "25.9"}'::jsonb,
  'Cardiovascular',
  'Moderate',
  '[
    {"diagnosis": "Acute Pericarditis", "tier": "most_likely", "vindicate_category": "I", "is_common": true, "is_cant_miss": false, "aliases": ["pericarditis", "viral pericarditis"]},
    {"diagnosis": "Acute Coronary Syndrome", "tier": "most_likely", "vindicate_category": "V", "is_common": true, "is_cant_miss": true, "aliases": ["ACS", "MI", "heart attack", "STEMI", "NSTEMI", "unstable angina", "myocardial infarction"]},
    {"diagnosis": "Rib Contusion", "tier": "moderate", "vindicate_category": "T", "is_common": true, "is_cant_miss": false, "aliases": ["chest wall injury", "chest wall contusion", "rib injury", "musculoskeletal chest pain"]},
    {"diagnosis": "Myocarditis", "tier": "less_likely", "vindicate_category": "I", "is_common": false, "is_cant_miss": false, "aliases": ["viral myocarditis", "inflammation of heart muscle"]},
    {"diagnosis": "Pulmonary Embolism", "tier": "unlikely_important", "vindicate_category": "V", "is_common": false, "is_cant_miss": true, "aliases": ["PE", "blood clot", "pulmonary thromboembolism"]},
    {"diagnosis": "Pneumothorax", "tier": "less_likely", "vindicate_category": "T", "is_common": false, "is_cant_miss": true, "aliases": ["collapsed lung", "tension pneumothorax"]},
    {"diagnosis": "Costochondritis", "tier": "moderate", "vindicate_category": "I", "is_common": true, "is_cant_miss": false, "aliases": ["chest wall inflammation", "Tietze syndrome"]},
    {"diagnosis": "Aortic Dissection", "tier": "unlikely_important", "vindicate_category": "V", "is_common": false, "is_cant_miss": true, "aliases": ["dissection", "aortic tear"]},
    {"diagnosis": "GERD", "tier": "less_likely", "vindicate_category": "E", "is_common": true, "is_cant_miss": false, "aliases": ["acid reflux", "heartburn", "gastroesophageal reflux"]},
    {"diagnosis": "Anxiety/Panic Attack", "tier": "less_likely", "vindicate_category": "A", "is_common": true, "is_cant_miss": false, "aliases": ["panic disorder", "anxiety attack"]}
  ]'::jsonb,
  '["V", "I", "T", "E", "A"]'::jsonb,
  '[
    "Pericarditis vs ACS: Pleuritic quality, positional relief, and friction rub favor pericarditis",
    "Family history of premature CAD (father MI at 48, uncle sudden death at 35) warrants further workup",
    "Substance use screening: Ask about stimulants, energy drinks, and supplements — not just drugs",
    "Blunt chest trauma can cause traumatic pericarditis",
    "Patient anxiety about family cardiac history is a critical communication moment"
  ]'::jsonb,
  '{}'::jsonb,
  1
)
ON CONFLICT (case_id) DO NOTHING;

-- Case 2: Abdominal Pain
INSERT INTO fcm_cases (case_id, title, chief_complaint, patient_name, patient_age, patient_gender, vitals, body_system, difficulty, differential_answer_key, vindicate_categories, key_teaching_points, full_case_data, sort_order)
VALUES (
  'FCM-GI-001',
  'Acute Abdominal Pain After Eating',
  '42-year-old female with abdominal pain',
  'Gloria Billings',
  42,
  'Female',
  '{"temperature": "100.4°F", "heart_rate": "88 bpm", "blood_pressure": "138/82 mmHg", "respiratory_rate": "16/min", "o2_sat": "99% RA", "bmi": "37.2"}'::jsonb,
  'Gastrointestinal',
  'Moderate',
  '[
    {"diagnosis": "Acute Cholecystitis", "tier": "most_likely", "vindicate_category": "I", "is_common": true, "is_cant_miss": false, "aliases": ["cholecystitis", "gallbladder inflammation", "gallbladder infection"]},
    {"diagnosis": "Choledocholithiasis with Cholangitis", "tier": "most_likely", "vindicate_category": "I", "is_common": false, "is_cant_miss": true, "aliases": ["cholangitis", "CBD stone", "common bile duct stone", "ascending cholangitis", "Charcot triad"]},
    {"diagnosis": "Biliary Pancreatitis", "tier": "moderate", "vindicate_category": "I", "is_common": false, "is_cant_miss": true, "aliases": ["pancreatitis", "gallstone pancreatitis", "acute pancreatitis"]},
    {"diagnosis": "Peptic Ulcer Disease", "tier": "less_likely", "vindicate_category": "I", "is_common": true, "is_cant_miss": false, "aliases": ["PUD", "stomach ulcer", "gastric ulcer", "duodenal ulcer"]},
    {"diagnosis": "Hepatitis", "tier": "less_likely", "vindicate_category": "I", "is_common": false, "is_cant_miss": false, "aliases": ["liver inflammation", "viral hepatitis", "alcoholic hepatitis"]},
    {"diagnosis": "Biliary Colic", "tier": "moderate", "vindicate_category": "I", "is_common": true, "is_cant_miss": false, "aliases": ["gallstone pain", "cholelithiasis"]},
    {"diagnosis": "Appendicitis", "tier": "less_likely", "vindicate_category": "I", "is_common": true, "is_cant_miss": true, "aliases": ["acute appendicitis"]},
    {"diagnosis": "Gastritis", "tier": "less_likely", "vindicate_category": "I", "is_common": true, "is_cant_miss": false, "aliases": ["stomach inflammation"]},
    {"diagnosis": "Small Bowel Obstruction", "tier": "less_likely", "vindicate_category": "T", "is_common": false, "is_cant_miss": true, "aliases": ["SBO", "bowel obstruction"]},
    {"diagnosis": "Mesenteric Ischemia", "tier": "unlikely_important", "vindicate_category": "V", "is_common": false, "is_cant_miss": true, "aliases": ["intestinal ischemia", "dead bowel"]}
  ]'::jsonb,
  '["I", "V", "T"]'::jsonb,
  '[
    "The 4 Fs mnemonic (Female, Fat, Forty, Fertile) is reductive — discuss metabolic risk factors with sensitivity",
    "Charcot triad: RUQ pain + fever + jaundice = cholangitis until proven otherwise",
    "Murphy sign technique: RUQ palpation during deep inspiration — abrupt inspiratory arrest",
    "Distinguishing cholecystitis from biliary colic: pain duration >6 hours with fever = cholecystitis",
    "Obstructive pattern: elevated direct bilirubin + alk phos + GGT indicates biliary obstruction"
  ]'::jsonb,
  '{}'::jsonb,
  2
)
ON CONFLICT (case_id) DO NOTHING;

-- Case 3: Back Pain
INSERT INTO fcm_cases (case_id, title, chief_complaint, patient_name, patient_age, patient_gender, vitals, body_system, difficulty, differential_answer_key, vindicate_categories, key_teaching_points, full_case_data, sort_order)
VALUES (
  'FCM-MSK-001',
  'Acute Low Back Pain with Radiating Symptoms',
  '47-year-old female with back pain',
  'Nancy Owens',
  47,
  'Female',
  '{"temperature": "98.6°F", "heart_rate": "78 bpm", "blood_pressure": "132/84 mmHg", "respiratory_rate": "14/min", "o2_sat": "99% RA", "bmi": "27.4"}'::jsonb,
  'Musculoskeletal',
  'Moderate',
  '[
    {"diagnosis": "Lumbar Disc Herniation with L5 Radiculopathy", "tier": "most_likely", "vindicate_category": "D", "is_common": true, "is_cant_miss": false, "aliases": ["disc herniation", "herniated disc", "slipped disc", "L4-L5 herniation", "L5-S1 herniation", "sciatica", "radiculopathy"]},
    {"diagnosis": "Lumbar Spinal Stenosis", "tier": "less_likely", "vindicate_category": "D", "is_common": true, "is_cant_miss": false, "aliases": ["spinal stenosis", "neurogenic claudication", "central stenosis"]},
    {"diagnosis": "Piriformis Syndrome", "tier": "less_likely", "vindicate_category": "T", "is_common": false, "is_cant_miss": false, "aliases": ["piriformis", "deep gluteal syndrome"]},
    {"diagnosis": "Cauda Equina Syndrome", "tier": "unlikely_important", "vindicate_category": "D", "is_common": false, "is_cant_miss": true, "aliases": ["cauda equina", "CES"]},
    {"diagnosis": "Vertebral Fracture", "tier": "less_likely", "vindicate_category": "T", "is_common": false, "is_cant_miss": true, "aliases": ["compression fracture", "spinal fracture", "vertebral compression fracture"]},
    {"diagnosis": "Mechanical Low Back Pain", "tier": "moderate", "vindicate_category": "T", "is_common": true, "is_cant_miss": false, "aliases": ["muscle strain", "lumbar strain", "back strain", "musculoskeletal back pain"]},
    {"diagnosis": "Spondylolisthesis", "tier": "less_likely", "vindicate_category": "D", "is_common": false, "is_cant_miss": false, "aliases": ["vertebral slip", "spondy"]},
    {"diagnosis": "Epidural Abscess", "tier": "unlikely_important", "vindicate_category": "I", "is_common": false, "is_cant_miss": true, "aliases": ["spinal abscess", "spinal infection"]},
    {"diagnosis": "Spinal Tumor/Metastasis", "tier": "unlikely_important", "vindicate_category": "N", "is_common": false, "is_cant_miss": true, "aliases": ["spinal tumor", "metastatic spine disease", "vertebral metastasis"]}
  ]'::jsonb,
  '["D", "T", "I", "N"]'::jsonb,
  '[
    "Red flag screening is essential in every back pain encounter (cauda equina, cancer, infection, fracture)",
    "Progressive motor deficit changes management — foot drop warrants urgent MRI",
    "SLR test: positive when reproducing radiating leg pain at 30-70°, not just back pain",
    "Crossed SLR (raising unaffected leg reproduces symptoms) is highly specific for disc herniation",
    "Dermatome mapping: L5 = lateral calf, dorsum of foot, great toe dorsiflexion weakness"
  ]'::jsonb,
  '{}'::jsonb,
  3
)
ON CONFLICT (case_id) DO NOTHING;

-- ============================================
-- SCHEDULE (assign cases to weeks)
-- ============================================
INSERT INTO fcm_schedule (case_id, fcm_group, week_label, unlock_date, due_date, session_date, semester)
SELECT c.id, 'Group A', 'Week 7 — FCM 1B', '2026-02-16', '2026-02-19', '2026-02-19', '2026-Spring'
FROM fcm_cases c WHERE c.case_id = 'FCM-CV-001'
ON CONFLICT DO NOTHING;

INSERT INTO fcm_schedule (case_id, fcm_group, week_label, unlock_date, due_date, session_date, semester)
SELECT c.id, 'Group A', 'Week 8 — FCM 1B', '2026-02-23', '2026-02-26', '2026-02-26', '2026-Spring'
FROM fcm_cases c WHERE c.case_id = 'FCM-GI-001'
ON CONFLICT DO NOTHING;

INSERT INTO fcm_schedule (case_id, fcm_group, week_label, unlock_date, due_date, session_date, semester)
SELECT c.id, 'Group A', 'Week 9 — FCM 1B', '2026-03-02', '2026-03-05', '2026-03-05', '2026-Spring'
FROM fcm_cases c WHERE c.case_id = 'FCM-MSK-001'
ON CONFLICT DO NOTHING;

-- Group B gets the same cases, offset by a day
INSERT INTO fcm_schedule (case_id, fcm_group, week_label, unlock_date, due_date, session_date, semester)
SELECT c.id, 'Group B', 'Week 7 — FCM 1B', '2026-02-16', '2026-02-20', '2026-02-20', '2026-Spring'
FROM fcm_cases c WHERE c.case_id = 'FCM-CV-001'
ON CONFLICT DO NOTHING;

INSERT INTO fcm_schedule (case_id, fcm_group, week_label, unlock_date, due_date, session_date, semester)
SELECT c.id, 'Group B', 'Week 8 — FCM 1B', '2026-02-23', '2026-02-27', '2026-02-27', '2026-Spring'
FROM fcm_cases c WHERE c.case_id = 'FCM-GI-001'
ON CONFLICT DO NOTHING;

INSERT INTO fcm_schedule (case_id, fcm_group, week_label, unlock_date, due_date, session_date, semester)
SELECT c.id, 'Group B', 'Week 9 — FCM 1B', '2026-03-02', '2026-03-06', '2026-03-06', '2026-Spring'
FROM fcm_cases c WHERE c.case_id = 'FCM-MSK-001'
ON CONFLICT DO NOTHING;

-- ============================================
-- DEFAULT SETTINGS
-- ============================================
INSERT INTO fcm_settings (key, value) VALUES
  ('feedback_mode', '"combined"'),
  ('default_framework', '"vindicate"'),
  ('semester', '"2026-Spring"'),
  ('osce_dates', '["2026-04-17", "2026-04-21"]')
ON CONFLICT (key) DO NOTHING;
