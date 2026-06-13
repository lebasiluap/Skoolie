-- Sample questions for testing
-- Run this after schema.sql

insert into questions (
  professions, course, topic, subtopic, difficulty, question_type,
  question_text, options, correct_answer, explanation, distractor_explanations,
  region, source_reference, date_reviewed, high_yield
) values

-- Q1: ACE inhibitors (All professions, Ghana)
(
  array['pharmacy','medicine','nursing'],
  'Pharmacology', 'Cardiovascular Drugs', 'ACE Inhibitors',
  'medium', 'mcq',
  'A 45-year-old hypertensive patient with type 2 diabetes is started on an ACE inhibitor. Which side effect is MOST specific to this drug class?',
  '["A. Ankle oedema", "B. Dry persistent cough", "C. Hyperkalaemia", "D. Bradycardia"]',
  'B',
  'ACE inhibitors inhibit the enzyme that breaks down bradykinin, causing its accumulation. This leads to a dry, persistent cough in 15–20% of patients.',
  '{"A": "Ankle oedema is more characteristic of calcium channel blockers.", "C": "Hyperkalaemia can occur but is not the MOST specific effect.", "D": "Bradycardia is associated with beta-blockers, not ACE inhibitors."}',
  'universal', 'Ghana STG 2022', '2024-01-15', true
),

-- Q2: Metformin in CKD (Pharmacy/Medicine, Ghana)
(
  array['pharmacy','medicine'],
  'Pharmacology', 'Diabetes Management', 'Biguanides',
  'medium', 'case_study',
  'A 32-year-old male with newly diagnosed type 2 diabetes and CKD stage 3 is prescribed metformin 500mg BD. What is the most important concern?',
  '["A. Risk of hypoglycaemia", "B. Lactic acidosis due to reduced renal clearance", "C. GI side effects are too severe", "D. Metformin is contraindicated in all diabetics"]',
  'B',
  'Metformin is renally cleared. In CKD stage 3 (eGFR 30–59), accumulation increases the risk of lactic acidosis. Per Ghana STG, metformin should be used with caution and dose-reduced; it is contraindicated if eGFR < 30.',
  '{"A": "Metformin does not cause hypoglycaemia as it does not stimulate insulin secretion.", "C": "GI effects are common but not the primary safety concern here.", "D": "Metformin is first-line for T2DM; renal impairment requires dose adjustment, not blanket contraindication."}',
  'ghana', 'Ghana STG 2022, Section 4.2', '2024-01-20', true
),

-- Q3: Beta-lactam mechanism (All professions)
(
  array['pharmacy','medicine','nursing','general'],
  'Pharmacology', 'Antibiotics', 'Beta-lactams',
  'easy', 'flashcard',
  'What is the mechanism of action of beta-lactam antibiotics?',
  '["A. Inhibit DNA gyrase", "B. Inhibit cell wall synthesis by binding PBPs", "C. Inhibit protein synthesis at the 30S ribosome", "D. Disrupt cell membrane integrity"]',
  'B',
  'Beta-lactams (penicillins, cephalosporins, carbapenems) bind penicillin-binding proteins (PBPs), inhibiting the cross-linking of peptidoglycan in the bacterial cell wall, leading to osmotic lysis.',
  '{"A": "DNA gyrase is the target of fluoroquinolones.", "C": "30S inhibitors include aminoglycosides and tetracyclines.", "D": "Cell membrane disruption is the mechanism of polymyxins."}',
  'universal', null, '2024-02-01', true
),

-- Q4: HIV treatment (Ghana-specific)
(
  array['pharmacy','medicine'],
  'Infectious Disease', 'HIV/AIDS Management', 'Antiretrovirals',
  'hard', 'mcq',
  'According to the Ghana AIDS Commission treatment guidelines, what is the preferred first-line ART regimen for a newly diagnosed HIV-positive adult?',
  '["A. Zidovudine + Lamivudine + Efavirenz", "B. Tenofovir + Lamivudine + Dolutegravir", "C. Abacavir + Lamivudine + Lopinavir/ritonavir", "D. Tenofovir + Emtricitabine + Nevirapine"]',
  'B',
  'Ghana follows WHO 2019 guidelines recommending TLD (Tenofovir + Lamivudine + Dolutegravir) as the preferred first-line regimen due to its high efficacy, tolerability, and high genetic barrier to resistance.',
  '{"A": "Zidovudine-based regimens are now second-line due to toxicity.", "C": "PI-based regimens are reserved for second-line or specific indications.", "D": "Nevirapine has a lower resistance barrier and more side effects than dolutegravir."}',
  'ghana', 'Ghana AIDS Commission ART Guidelines 2023', '2024-03-10', true
),

-- Q5: Blood pressure targets (Nursing)
(
  array['nursing','medicine'],
  'Clinical Medicine', 'Hypertension', 'Management Targets',
  'easy', 'mcq',
  'What is the target blood pressure for a hypertensive patient without diabetes or CKD, according to standard treatment guidelines?',
  '["A. < 150/90 mmHg", "B. < 140/90 mmHg", "C. < 130/80 mmHg", "D. < 120/80 mmHg"]',
  'B',
  'For uncomplicated hypertension, the standard target is < 140/90 mmHg. A lower target of < 130/80 mmHg is recommended for high-risk patients (diabetes, CKD, cardiovascular disease).',
  '{"A": "< 150/90 mmHg was a former target for older patients; current guidelines recommend < 140/90 for most adults.", "C": "< 130/80 is recommended for high-risk groups, not uncomplicated hypertension.", "D": "< 120/80 is the optimal normal range, not a treatment target for hypertensives."}',
  'universal', 'JNC 8 / Ghana STG 2022', '2024-02-15', false
);
