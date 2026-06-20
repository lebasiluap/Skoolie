# Skoolie — Medicine Question Bank: Curriculum Map

**Purpose:** Self-reference template for generating medicine questions. Every section describes what to generate, how deep to go, how to tag it, and any Ghana-specific notes.

**Profession tag:** `['medicine']` on all questions unless noted.
**Region tag:** `'GH'` for Ghana-specific content; `null` for universal.
**Question types:** MCQ + Flashcard throughout; Case Studies at the end of each system.

---

## How Medicine Differs from Pharmacy (Critical Reference)

| Category | Pharmacy version | Medicine version |
|---|---|---|
| Anatomy & Physiology | Functional overview — enough to understand drug targets | Full clinical anatomy, histology, embryology, detailed physiology including pressure-volume loops, spirometry curves, hormone axes |
| Pathology | Surface-level — why does disease X alter drug Y? | Deep — morphological changes, histopathological findings, staging systems, lab correlates, molecular basis |
| Pharmacology | Deep mechanism, PK/PD, dose calculations, interactions | Rational prescribing — which drug, when, why, contraindications, monitoring, special populations |
| Clinicals | Drug selection & monitoring for a given disease | History → Examination → Investigations → Differential → Diagnosis → Management → Complications |
| Case Studies | Pharmacotherapy-centred cases | Multi-system clinical vignettes: diagnosis-first, management includes drug AND non-drug choices |

---

## Categories Used in Medicine

| Category label (in DB) | What it covers |
|---|---|
| `Anatomy & Physiology` | Gross anatomy, histology, embryology, clinical anatomy, detailed physiology |
| `Pathology` | Disease mechanisms, morphological/histopathological changes, staging, classification, lab findings |
| `Pharmacology` | Rational prescribing, drug choice rationale, adverse effects, contraindications, monitoring, prescribing in special populations |
| `Clinicals` | Clinical reasoning: history, examination, investigations, differentials, diagnosis, management, complications, prognosis |
| `Case Studies` | Complex OSCE/clinical vignette cases (multi-step, multi-system where applicable) |
| `Clinical Skills` | Interpretation-based: ECG, CXR, spirometry, ABG, lab panels, peripheral blood films, imaging; also procedural knowledge |
| `Biochemistry` | Metabolic pathways, enzymes, molecular biology, inborn errors, lab values and their clinical significance |
| `Public Health` | Epidemiology, biostatistics, screening, prevention, community medicine, disease burden in Ghana |
| `Medical Ethics` | Consent, confidentiality, capacity, end of life, GMC/GMA standards, research ethics |
| `Psychiatry` | Mental state examination, psychiatric diagnosis, classification (ICD-11), management of psychiatric conditions |

---

## Part 1 — Body System Topics

All 17 systems below follow the same 5-category structure:
`Anatomy & Physiology → Pathology → Pharmacology → Clinicals → Case Studies`

Plus `Clinical Skills` where interpretation is prominent (Cardiovascular, Respiratory, Haematology).

---

### 1. Cardiovascular System

**Anatomy & Physiology subtopics (~12):**
- Cardiac anatomy: chambers, valves, layers, blood supply (coronary arteries), conduction system (SA node → Bundle of His → Purkinje)
- Cardiac histology: myocardial cell structure, intercalated discs, gap junctions; difference from smooth and skeletal muscle
- Cardiac embryology: heart tube formation, septation defects basis (ASD, VSD, PDA, ToF)
- Cardiac cycle: systole/diastole, heart sounds (S1–S4 basis), murmur timing
- Haemodynamics: cardiac output, stroke volume, preload, afterload, Frank-Starling law, pressure-volume loops
- ECG physiology: origin of P, QRS, T waves; normal intervals; axis calculation
- Blood pressure regulation: baroreceptor reflex, RAAS, ADH, ANP/BNP
- Vascular anatomy: aorta and branches, coronary circulation, lymphatic drainage of the heart
- Microcirculation: capillary exchange, Starling forces, oedema formation
- Peripheral vascular anatomy: venous drainage of lower limb, sites of DVT
- Autonomic control of the heart: sympathetic vs parasympathetic effects
- Fetal circulation and changes at birth

**Pathology subtopics (~12):**
- Ischaemic heart disease: stable angina, ACS (STEMI, NSTEMI, UA) — pathophysiology, morphology, biomarkers (troponin, CK-MB)
- Heart failure: systolic vs diastolic, left vs right, causes, pathophysiology of compensation, NYHA classification
- Valvular heart disease: aortic stenosis/regurgitation, mitral stenosis/regurgitation (rheumatic vs degenerative), investigations
- Cardiomyopathies: dilated, hypertrophic, restrictive — causes, histology, presentation
- Infective endocarditis: organisms (Strep viridans, Staph aureus, HACEK), Duke criteria, vegetations, complications
- Cardiac arrhythmias: AF, flutter, SVT, VT, VF, heart blocks (1st, 2nd Mobitz I/II, 3rd degree) — mechanisms, ECG appearance
- Hypertension: essential vs secondary, end-organ damage (LVH, retinopathy, nephropathy, cerebrovascular)
- Pericardial disease: acute pericarditis (ECG findings), pericardial effusion, tamponade (Beck's triad), constrictive pericarditis
- Aortic disease: aneurysm (abdominal vs thoracic), dissection (Stanford A/B, DeBakey), risk factors
- Peripheral vascular disease: atherosclerosis staging (Fontaine), critical limb ischaemia, ABI
- Congenital heart disease: acyanotic (ASD, VSD, PDA, coarctation) vs cyanotic (ToF, TGA, truncus) — presentations, complications
- Rheumatic fever and rheumatic heart disease (HIGH PRIORITY in Ghana — common)

**Ghana-specific Pathology notes:**
- Rheumatic heart disease is prevalent; mitral stenosis common in young adults
- Hypertensive heart disease is a leading cause of heart failure
- Peripartum cardiomyopathy — higher incidence in West Africa
- HIV-associated cardiomyopathy

**Pharmacology subtopics (~8):**
- Antihypertensives: first-line choices, stepwise approach, compelling indications (ACE-i in CKD/DM, beta-blockers in HF/post-MI, CCBs in Afro-Caribbean patients — Ghana context)
- Heart failure prescribing: GDMT (ACE-i/ARB, beta-blocker, MRA, SGLT2-i) — what to start, when, why
- ACS management: antiplatelets (aspirin, clopidogrel), anticoagulants (LMWH, UFH), nitrates, beta-blockers
- Antiarrhythmics: rate vs rhythm control, AF management, digoxin use
- Anticoagulation: warfarin vs NOAC — indications, monitoring, reversal
- Lipid-lowering: statins — which, when, monitoring; clinical trials basis (benefit of statins post-MI)
- Diuretics in heart failure: loop vs thiazide vs MRA — when to use each
- Prescribing in renal impairment (cardiovascular drugs): dose adjustment principles

**Clinicals subtopics (~12):**
- Chest pain history: SOCRATES, differential diagnosis (MI, PE, aortic dissection, pneumothorax, pericarditis, oesophageal)
- ECG interpretation: reading an ECG systematically; recognising STEMI, NSTEMI, AF, heart block, VT
- ACS management pathway: MONA, reperfusion strategy (PCI vs thrombolysis — Ghana context: when is PCI available?)
- Heart failure: clinical features (JVP, bibasal creps, ankle oedema), investigations (BNP, echo), Framingham criteria
- Hypertension management: when to investigate for secondary causes, stepwise drug management, hypertensive emergencies
- Valve disease examination: murmur characterisation — position, radiation, timing, manoeuvres
- Arrhythmia management: when to cardiovert, rate control in AF, anticoagulation decision (CHA₂DS₂-VASc)
- Infective endocarditis: clinical presentation, blood cultures, echo findings, antimicrobial choice
- Peripheral vascular disease: history (claudication distance), ABI, management (conservative, surgical)
- Pericarditis and tamponade: diagnosis, pericardiocentesis indications
- Congenital heart disease in the adult: common presentations reaching adulthood in Ghana (uncorrected VSD, ASD)
- Cardiac emergencies: VF/pulseless VT (BLS/ALS algorithm), tamponade, acute severe MR

**Clinical Skills subtopics:**
- ECG interpretation (all common patterns)
- CXR in cardiac disease: cardiomegaly, pulmonary oedema, effusion, prosthetic valves
- Echo interpretation: basic — EF, valvular findings, wall motion abnormalities

**Case Studies:** 50 cases across the subtopics above.

---

### 2. Respiratory System

**Anatomy & Physiology subtopics (~10):**
- Lung anatomy: lobes, fissures, bronchopulmonary segments (surgical relevance)
- Histology of the respiratory tract: pseudostratified columnar → cuboidal → type I/II pneumocytes; goblet cells, Clara cells
- Respiratory embryology: lung bud development, surfactant development timeline (relevant to prematurity)
- Mechanics of breathing: compliance, resistance, work of breathing
- Gas exchange: V/Q matching, shunt, dead space, A-a gradient
- Pulmonary function tests: spirometry (FEV1/FVC, obstructive vs restrictive patterns), flow-volume loops, TLC, DLCO
- Arterial blood gas interpretation: acidosis/alkalosis, compensation, oxygenation indices
- Control of respiration: central (medulla), peripheral chemoreceptors, effect of CO2 vs O2
- Pleural anatomy and physiology: pressure, pneumothorax mechanics
- Pulmonary circulation: normal pressures, HPV, causes of pulmonary hypertension

**Ghana-specific A&P note:** Spirometry availability limited in Ghana — peak flow used as surrogate. Questions should reflect this.

**Pathology subtopics (~12):**
- Asthma: airway inflammation, remodelling, classification (BTS/GINA steps), triggers, status asthmaticus
- COPD: emphysema vs chronic bronchitis — pathological distinction, GOLD staging, FEV1/FVC < 0.7
- Community-acquired pneumonia: pathogens (Strep pneumoniae most common, Legionella, Mycoplasma, viruses), lobar vs bronchopneumonia histology, CURB-65
- Tuberculosis (HIGH PRIORITY in Ghana): primary vs post-primary, Ghon complex, miliary TB, complications, HIV-TB co-infection
- Pleural disease: effusion (transudates vs exudates — Light's criteria), empyema, pneumothorax (spontaneous vs tension), haemothorax
- Pulmonary embolism: Virchow's triad, Well's score, DVT connection, massive vs sub-massive
- Lung cancer: types (SCLC vs NSCLC — adenocarcinoma, SCC, large cell), staging, paraneoplastic syndromes
- Pulmonary hypertension: WHO classification, cor pulmonale
- Interstitial lung disease: UIP/IPF, hypersensitivity pneumonitis, sarcoidosis, asbestosis, silicosis
- Bronchiectasis: causes (post-TB, CF, immotile cilia), cylindrical vs saccular, management
- Respiratory failure: type 1 vs type 2, causes, interpretation
- COVID-19 and viral pneumonitis (contemporary relevance)

**Ghana-specific Pathology notes:**
- TB is endemic — detailed TB questions essential; multidrug-resistant TB (MDR-TB)
- Sickle cell disease and respiratory complications (acute chest syndrome)
- Schistosomiasis and pulmonary hypertension
- Asthma diagnosis via peak flow (not spirometry) in resource-limited settings

**Pharmacology subtopics (~7):**
- Asthma prescribing: BTS stepwise approach; SABA, LABA, ICS, LTRA — when to step up/down
- COPD prescribing: LAMA, LABA, ICS combinations; when to prescribe each
- CAP antibiotics: empirical choice in Ghana (amoxicillin, doxycycline, azithromycin), severe CAP (co-amoxiclav + macrolide), IV to oral switch
- TB treatment: first-line (HRZE/HR), second-line, MDR-TB drugs, drug interactions (rifampicin enzyme inducer)
- PE/DVT anticoagulation: LMWH, warfarin, NOACs — dose, duration, reversal
- Pulmonary hypertension drugs: phosphodiesterase inhibitors, prostanoids, endothelin antagonists (prescribing level)
- Oxygen therapy: when to use, target saturations (94-98% vs 88-92% in COPD)

**Clinicals subtopics (~10):**
- Breathlessness history: acute vs chronic, SOCRATES, differential by onset and character
- CXR interpretation: consolidation, effusion, pneumothorax, mass, interstitial patterns, TB (apical shadowing, cavitation)
- Spirometry/peak flow interpretation in clinical decisions
- ABG interpretation: systematic approach (pH → pCO2 → HCO3 → compensation → oxygenation)
- Asthma acute management: severity assessment (mild/moderate/severe/life-threatening), BTS protocol
- COPD exacerbation management: controlled oxygen, bronchodilators, steroids, antibiotics, NIV
- Pneumonia management: CURB-65, antibiotic choice, escalation criteria, when to ICU
- TB diagnosis and management in Ghana: sputum AFB, GeneXpert, CXR findings, starting DOTS
- Pleural effusion workup: sampling, Light's criteria, causes of each type
- PE workup: Well's score, D-dimer, CTPA, management pathway
- Lung cancer presentation: haemoptysis, weight loss, paraneoplastic features, investigation
- Respiratory failure management: NIV indications, intubation criteria

**Clinical Skills subtopics:**
- CXR interpretation (systematic approach: all patterns)
- ABG interpretation (full worked cases)
- Spirometry pattern recognition

**Case Studies:** 50 cases.

---

### 3. Central Nervous System / Neurology

**Anatomy & Physiology subtopics (~12):**
- Neuroanatomy: cerebral lobes (functions), limbic system, basal ganglia (circuit), cerebellum (function, connections), brainstem (cranial nerve nuclei)
- Cranial nerves: all 12 — nuclei, course, function, examination, lesion effects
- Sensory and motor pathways: dorsal column–medial lemniscal vs spinothalamic; upper vs lower motor neuron lesion distinctions
- Neurological examination: cranial nerves, motor (tone, power MRC scale, reflexes, coordination), sensory (dermatomes, sensory modalities), gait
- CSF: production (choroid plexus), circulation, normal composition, lumbar puncture interpretation
- Blood-brain barrier: structure, clinical relevance (drug entry, infections)
- Cerebrovascular anatomy: Circle of Willis, territory of MCA, ACA, PCA, PICA, AICA; clinical stroke syndromes
- Peripheral nervous system: brachial plexus, common nerve injuries and their clinical effects
- Neuromuscular junction: mechanism (ACh), diseases affecting it (MG, Lambert-Eaton, botulism)
- Autonomic nervous system: sympathetic vs parasympathetic anatomy, clinical disorders
- Neurophysiology: action potential, synaptic transmission, myelination (saltatory conduction), demyelination effects
- Sleep physiology, EEG basics, seizure physiology

**Pathology subtopics (~12):**
- Stroke: ischaemic (thrombotic vs embolic) vs haemorrhagic (intracerebral vs subarachnoid); FAST, NIHSS, imaging
- Meningitis: bacterial (organisms by age group — neonatal, child, adult) vs viral vs TB vs fungal; CSF findings for each
- Encephalitis: HSV (most common viral), autoimmune (anti-NMDAR), clinical features
- Space-occupying lesions: primary brain tumours (glioblastoma, meningioma, acoustic neuroma) vs metastases; features of raised ICP
- Epilepsy: classification (focal vs generalised), common causes, EEG correlates, status epilepticus
- Multiple sclerosis: demyelination, McDonald criteria, relapsing-remitting vs progressive, MRI lesions
- Parkinson's disease: basal ganglia dopamine depletion, Lewy bodies, features (TRAP), medication
- Peripheral neuropathy: classification (sensorimotor, motor, sensory), causes (DM most common, alcohol, B12, GBS, leprosy — Ghana)
- Guillain-Barré syndrome: ascending weakness, albuminocytologic dissociation, autonomic instability
- Motor neuron disease: types (ALS, PBP, PMA), UMN+LMN signs, prognosis
- Headache disorders: migraine (with/without aura), tension-type, cluster, thunderclap (SAH until proven otherwise), raised ICP headache features
- Dementia: Alzheimer's (amyloid plaques, neurofibrillary tangles), vascular, Lewy body, frontotemporal — distinguishing features

**Ghana-specific Pathology notes:**
- Cerebral malaria: major cause of encephalopathy, especially in children
- Cryptococcal meningitis: common in HIV+ patients; India ink stain
- TB meningitis: prevalent; CSF lymphocytosis, high protein, low glucose
- Neurocysticercosis: cause of seizures in Ghana; CT shows ring-enhancing lesions with calcification
- Sickle cell disease: stroke in children
- Leprosy: peripheral neuropathy, thickened nerves — examination finding

**Pharmacology subtopics (~7):**
- Acute stroke management: thrombolysis (tPA) — indications, contraindications, time window; antiplatelet in ischaemic stroke
- Anticonvulsants: first-line per seizure type (valproate, carbamazepine, lamotrigine, levetiracetam), status epilepticus protocol
- Meningitis empirical antibiotics: ceftriaxone ± dexamethasone; add ampicillin for listeria risk; TB meningitis HRZE
- Parkinson's disease pharmacology: levodopa/carbidopa, dopamine agonists, MAO-B inhibitors — when to start each
- MS disease-modifying therapy: interferon-beta, natalizumab, ocrelizumab (prescribing rationale, not mechanism depth)
- Analgesia in headache: triptans (migraine), oxygen (cluster headache), migraine prophylaxis
- Raised ICP management: mannitol, positioning, dexamethasone (vasogenic oedema only)

**Clinicals subtopics (~10):**
- Neurological history: onset, progression, positive and negative symptoms, systems review
- Neurological examination technique and interpretation: UMN vs LMN, sensory level, cerebellar signs
- Stroke pathway: FAST, imaging (CT vs MRI timing), thrombolysis decision, secondary prevention
- Meningitis: clinical diagnosis (fever, meningism, rash — petechiae in meningococcal), immediate management (don't delay antibiotics for LP), LP interpretation
- Seizure management: first aid, status epilepticus protocol, investigation of new onset seizure
- Cranial nerve lesion localisation: which nerve, which level, what caused it
- Headache red flags: thunderclap (SAH), new onset >50 (GCA, SOL), positional, progressive
- Peripheral neuropathy assessment: history of DM/alcohol/B12, nerve conduction study interpretation
- Raised intracranial pressure: Cushing's triad, papilloedema, management, LP contraindications
- Common neurological emergencies: status epilepticus, SAH, bacterial meningitis, stroke with mass effect
- Cerebral malaria: clinical features, management (IV artesunate), complications in Ghana context
- Weak patient: differentiating UMN (stroke, MS, MND) vs LMN (GBS, neuropathy) vs NMJ (MG) vs muscle (myopathy)

**Clinical Skills subtopics:**
- CT head interpretation: blood (bright on CT), ischaemia, shift, hydrocephalus
- LP CSF interpretation: bacterial vs viral vs TB vs cryptococcal
- EEG basics: seizure patterns

**Case Studies:** 50 cases.

---

### 4. Endocrinology

**Anatomy & Physiology subtopics (~10):**
- Hypothalamic-pituitary axis: feedback loops for all major axes (HP-thyroid, HP-adrenal, HP-gonadal, GH, prolactin, ADH, oxytocin)
- Thyroid anatomy, histology, embryology (thyroglossal duct cyst), hormone synthesis (iodination, coupling), T3 vs T4 physiology
- Adrenal gland: zones of cortex (glomerulosa/aldosterone, fasciculata/cortisol, reticularis/androgens), medulla (catecholamines), blood supply
- Pancreas: islets of Langerhans (alpha/beta/delta), insulin secretion physiology, glucagon action, incretin effect
- Parathyroid: PTH action on bone/kidney/gut, vitamin D metabolism (25-OH → 1,25-OH), calcium homeostasis
- Growth hormone axis: GHRH → GH → IGF-1, actions, feedback, assessment (IGF-1 levels, glucose suppression test)
- Reproductive hormones overview: GnRH → LH/FSH → testosterone/oestrogen/progesterone
- Adipose tissue as endocrine organ: leptin, adiponectin, metabolic syndrome basis
- Osmoregulation: ADH secretion and action, aquaporins, SIADH vs DI physiology
- Chronobiology: cortisol diurnal variation, melatonin

**Pathology subtopics (~12):**
- Diabetes mellitus type 1: autoimmune destruction, C-peptide, DKA pathophysiology and diagnosis (pH < 7.3, ketones, glucose)
- Diabetes mellitus type 2: insulin resistance → beta-cell failure, metabolic syndrome, complications (micro/macrovascular)
- Diabetic emergencies: DKA vs HHS (osmolality, onset, pH differences) — management protocols
- Diabetic complications: retinopathy, nephropathy (Kimmelstiel-Wilson), neuropathy, PVD, autonomic neuropathy
- Hypothyroidism: Hashimoto's (anti-TPO, anti-TG antibodies), myxoedema coma, subclinical hypothyroidism
- Hyperthyroidism: Graves' (TRAb, pretibial myxoedema, exophthalmos), toxic nodular goitre, thyroid storm
- Thyroid nodules and cancer: investigation (USS, FNAC, TFTs), differentiated vs medullary vs anaplastic
- Adrenal insufficiency: primary (Addison's — pigmentation, Na↓/K↑, TBC cause in Ghana) vs secondary; Addisonian crisis
- Cushing's syndrome: endogenous (pituitary/adrenal/ectopic) vs exogenous; investigations (overnight dexamethasone suppression, UFC)
- Conn's syndrome / Primary hyperaldosteronism: resistant hypertension, hypokalaemia, ratio test
- Phaeochromocytoma: paroxysmal hypertension, 3 Ps (pain, palpitations, perspiration), urinary catecholamines
- Disorders of calcium: hypercalcaemia (causes: PTH/malignancy commonest), hypoparathyroidism, osteomalacia vs osteoporosis
- Pituitary tumours: prolactinoma (most common), acromegaly, Cushing's disease, hypopituitarism

**Ghana-specific Pathology notes:**
- DM type 2 rising rapidly in Ghana (urbanisation); often presents late with complications
- Addison's disease — TB remains a common cause (vs autoimmune in Western countries)
- Malnutrition-related diabetes (MRDM/FCPD) — seen in West Africa, different from T1/T2
- Hyperthyroidism from iodine excess (iodised salt introduction)

**Pharmacology subtopics (~8):**
- Insulin prescribing: types (rapid, short, intermediate, long), regimens, sliding scale, sick-day rules, hypoglycaemia management
- Oral antidiabetics: metformin (first-line, lactic acidosis risk, renal), sulfonylureas (hypoglycaemia risk), SGLT2-i, GLP-1 agonists, DPP4-i — when to add each
- DKA protocol: IV fluid, insulin infusion, potassium, monitoring, transition to subcutaneous
- Thyroid disease prescribing: levothyroxine (dosing, titration), carbimazole vs propylthiouracil (thyroid storm, pregnancy), radioiodine indications
- Steroid replacement: hydrocortisone (physiological replacement), sick day rules, steroid card
- Bisphosphonates: alendronate indications, contraindications (oesophageal), monitoring (DEXA)
- Hypercalcaemia management: IV fluids, zoledronic acid, steroids (sarcoid/vitamin D toxicity)
- Prescribing in diabetes with comorbidities: ACE-i/ARB in diabetic nephropathy, statin in DM

**Clinicals subtopics (~10):**
- DM in Ghana: presentation, complications screening (feet, eyes, renal, CVD), NICE/WHO targets, patient education
- DKA management: diagnosis (VBG/capillary ketones), fluid/insulin protocol, pitfalls (K+ correction, cerebral oedema in children)
- Thyroid examination: inspection, palpation from behind, percussion, auscultation, lymph nodes, exophthalmos assessment
- Thyroid disease management decisions: when to use medical vs radioiodine vs surgery
- Adrenal insufficiency: crisis recognition, IM hydrocortisone, investigation (short synacthen test)
- Hypercalcaemia workup: PTH-mediated vs non-PTH-mediated, malignancy screen
- Pituitary tumour: headache + visual field defect (bitemporal hemianopia) → investigation pathway
- Metabolic syndrome diagnosis and management in Ghana
- Hypoglycaemia: causes, clinical features, immediate management, prevention
- Diabetes complications clinic approach: foot examination (Ipswich touch test, monofilament), fundoscopy, microalbuminuria, statin initiation

**Case Studies:** 50 cases.

---

### 5. Gastroenterology & Hepatology

**Anatomy & Physiology subtopics (~10):**
- GI tract histology: mucosa layers (epithelium, lamina propria, muscularis mucosae), enteric nervous system, villus/crypt structure
- Oesophagus: anatomy, lower oesophageal sphincter physiology, swallowing mechanism (3 phases)
- Stomach: gastric acid secretion (parietal cells — H+/K+ ATPase, G cells — gastrin), pepsin, intrinsic factor
- Small intestine: surface area amplification (plicae, villi, microvilli), nutrient absorption by region (Fe in duodenum, B12/bile salts in terminal ileum), SIBO
- Large intestine: water absorption, gut flora, haustra, innervation
- Liver anatomy and histology: lobular vs acinar architecture, zones (1=periportal/oxygenated, 3=pericentral/most susceptible to toxins), sinusoids, Kupffer cells
- Liver functions: metabolism (first-pass), protein synthesis (albumin, clotting factors), bile production, bilirubin metabolism (conjugated vs unconjugated)
- Portal circulation: anatomy, portosystemic anastomoses (oesophageal varices, caput medusae, haemorrhoids)
- Biliary system: bile production, enterohepatic circulation, gallstone formation (types: cholesterol vs pigment)
- Pancreatic physiology: exocrine (acini — digestive enzymes, HCO3) and endocrine (islets)

**Pathology subtopics (~12):**
- GORD: mechanisms, complications (Barrett's oesophagus — risk of adenocarcinoma, histology)
- Peptic ulcer disease: H. pylori role (CLO test, urea breath test), NSAIDs, gastric vs duodenal differences, complications (perforation, haemorrhage, stenosis)
- Inflammatory bowel disease: Crohn's (transmural, skip lesions, cobblestone, fistulae) vs UC (mucosal, continuous, pseudopolyps, toxic megacolon) — histological distinction
- Colorectal cancer: adenoma-carcinoma sequence, FAP/HNPCC genetics, Duke's/TNM staging, screening
- Liver disease spectrum: steatosis → steatohepatitis → fibrosis → cirrhosis → HCC; causes (alcohol, NAFLD, viral, autoimmune)
- Viral hepatitis: A, B, C, D, E — transmission, serology interpretation (HBsAg, anti-HBc, HBeAg, anti-HBs), chronicity, treatment
- Cirrhosis and portal hypertension: complications (varices, ascites, hepatic encephalopathy, SBP, HRS, HCC)
- Liver failure: acute (causes: paracetamol, viral) vs acute-on-chronic; King's College criteria, encephalopathy grading
- Jaundice: pre-hepatic vs hepatic vs post-hepatic — investigation pathway, LFT interpretation
- Pancreatitis: acute (Ranson/Glasgow criteria, causes — gallstone and alcohol in Ghana) vs chronic (causes, complications — pseudocyst, malabsorption)
- GI malignancies: oesophageal (SCC vs adenocarcinoma), gastric cancer (H. pylori association, Virchow's node), pancreatic cancer (CA19-9, double duct sign)
- GI bleeding: upper (haematemesis/melaena) vs lower (PR bleeding); causes of each, Rockford score, management

**Ghana-specific Pathology notes:**
- Hepatitis B is endemic in Ghana (HBsAg carrier rate ~12%); hepatitis B vaccination, HCC surveillance
- Schistosomiasis (S. mansoni): causes periportal fibrosis, portal hypertension — especially in younger patients
- Typhoid fever: ileal Peyer's patches, rose spots, complications (perforation, haemorrhage)
- Cholera (Vibrio cholerae): rice-water stools, oral rehydration therapy
- Amoebiasis (Entamoeba histolytica): amoebic liver abscess vs colitis, anchovy sauce pus

**Pharmacology subtopics (~6):**
- GI prescribing: PPI (omeprazole) indications, H2 blockers, antacids — correct use and timing
- H. pylori eradication: triple therapy (PPI + amoxicillin + clarithromycin) vs quadruple; test of cure
- IBD prescribing: 5-ASAs, corticosteroids (induction), azathioprine (maintenance), biologics (anti-TNF)
- Hepatitis B treatment: tenofovir/entecavir — when to treat, monitoring HBV DNA, HBeAg seroconversion
- Cirrhosis prescribing: propranolol (variceal prophylaxis), spironolactone/furosemide (ascites), lactulose/rifaximin (HE), rifaximin
- Paracetamol overdose: N-acetylcysteine protocol, nomogram, Rumack-Matthew

**Clinicals subtopics (~10):**
- Abdominal examination: inspection, palpation (organomegaly), percussion (ascites — shifting dullness, fluid thrill), auscultation, hernias, rectal exam
- Jaundice workup: clinical features by type, LFT pattern, imaging, biopsy
- Liver disease clinical features: spider naevi, palmar erythema, leukonychia, Dupuytren's, gynaecomastia, caput medusae
- Acute abdomen: differential by location (RIF — appendicitis, epigastric — pancreatitis/PUD/MI, RUQ — cholecystitis), investigation, surgical referral criteria
- Variceal bleeding: immediate management (airway, Terlipressin, octreotide, antibiotics, banding vs sclerotherapy)
- Ascites management: diagnostic tap (SAAG), treatment (salt restriction, diuretics, paracentesis), SBP management
- GI bleeding: Rockford score, resuscitation, endoscopy timing, transfusion threshold
- IBD flare management: severity assessment (Truelove-Witts for UC), IV steroids, escalation to surgery
- Hepatitis B in Ghana: screening, interpretation of results, who to treat, vaccination of contacts
- Schistosomiasis and portal hypertension in a young Ghanaian patient: diagnosis, praziquantel treatment

**Case Studies:** 50 cases.

---

### 6. Renal & Nephrology

**Anatomy & Physiology subtopics (~10):**
- Kidney anatomy: cortex vs medulla, nephron types (cortical vs juxtamedullary), blood supply (afferent/efferent arterioles)
- Nephron histology: PCT (brush border, mitochondria-rich), loop of Henle (thin/thick limbs), DCT, collecting duct — transport functions of each segment
- GFR physiology: Starling forces across glomerular capillary, autoregulation (myogenic + tubuloglomerular feedback)
- Tubular transport: glucose threshold (splay), amino acid reabsorption, urea recycling, uric acid handling
- Countercurrent mechanism: how the medullary gradient is established (multiplier + exchanger) → urine concentration
- Acid-base physiology: renal contribution — bicarbonate reabsorption (PCT), new bicarbonate generation, H+ secretion, NH4+ excretion
- RAAS and potassium regulation: aldosterone action on principal cells (Na+/K+ exchange), hyperaldosteronism effects
- Erythropoietin: production site (peritubular cells), stimulus (hypoxia), clinical use
- Vitamin D activation: 1-alpha hydroxylase in kidney, clinical relevance in CKD (renal osteodystrophy)
- Renal regulation of blood pressure: long-term BP control via sodium balance vs short-term (RAAS)

**Pathology subtopics (~12):**
- AKI: KDIGO classification, pre-renal (FENa < 1%) vs intrinsic vs post-renal; causes in Ghana (malaria, dehydration, nephrotoxins, obstructive)
- CKD: stages (eGFR), causes (DM, hypertension most common), CKD-MBD (renal osteodystrophy)
- Glomerulonephritis: nephritic (haematuria, HT, proteinuria < 3.5g, oliguria) vs nephrotic (proteinuria > 3.5g, oedema, hypoalbuminaemia, hyperlipidaemia) syndrome distinction; common causes of each
- Nephrotic syndrome: minimal change disease (children), FSGS, membranous GN (anti-PLA2R), diabetic nephropathy
- Nephritic syndrome: IgA nephropathy (post-URTI haematuria), post-streptococcal GN (Africa — common), RPGN, anti-GBM (Goodpasture's)
- Malaria nephropathy: quartan malaria (P. malariae) nephrotic syndrome — important in Ghana
- Urinary tract infections: cystitis vs pyelonephritis, organisms (E. coli most common), recurrent UTI workup, complicated vs uncomplicated
- Renal calculi: types (calcium oxalate most common, uric acid, struvite), presentation (loin-to-groin pain), imaging (CT KUB), medical expulsion therapy
- Renal tubular acidosis: types 1, 2, 4 — urine pH, anion gap, causes
- Hypertensive nephropathy: arteriolosclerosis, benign vs malignant hypertension effects on kidney
- Renal cell carcinoma: clear cell most common, VHL gene, paraneoplastic syndromes
- Dialysis and transplant: indications for RRT (AEIOU), types of dialysis (HD vs PD — PD may be more accessible in Ghana)

**Ghana-specific Pathology notes:**
- Malaria is a common cause of AKI (haemoglobinuria in severe malaria, blackwater fever)
- Post-streptococcal GN common in children (group A Strep throat/skin infection)
- Herbal medicine nephrotoxicity (aristolochic acid)
- Sickle cell nephropathy
- HIV-associated nephropathy (HIVAN)

**Pharmacology subtopics (~6):**
- AKI prescribing: stop nephrotoxins (NSAIDs, ACE-i, aminoglycosides), fluid resuscitation, hyperkalaemia management (calcium gluconate, insulin/dextrose, salbutamol, dialysis)
- CKD prescribing: dose adjustment principles, drug avoidance (NSAIDs, metformin eGFR < 30), ACE-i/ARB use and monitoring
- Hyperkalaemia emergency: stepwise management protocol
- UTI antibiotics: empirical choice in Ghana (nitrofurantoin, trimethoprim, co-amoxiclav — resistance patterns)
- Renal stone prescribing: analgesia (NSAIDs if no contraindication), tamsulosin (alpha blocker for distal stones), prevention
- EPO and iron in CKD anaemia: when to start, targets, monitoring

**Clinicals subtopics (~10):**
- Fluid status assessment: JVP, skin turgor, mucous membranes, daily weight, urine output; over vs under-fill
- AKI workup: dipstick, eGFR trend, ultrasound (obstruction?), cause identification, Management
- Oedema assessment: unilateral vs bilateral, pitting vs non-pitting, causes (cardiac, hepatic, renal, venous)
- Electrolyte abnormalities: hypo/hypernatraemia (serum osmolality, urine osmolality), hypo/hyperkalaemia (ECG changes), calcium and magnesium
- Acid-base interpretation: systematic approach with clinical cases
- Nephrotic syndrome workup in Ghana: which glomerulonephritides are common (malaria, PSGN, HIV), biopsy
- Hypertension and renal disease: which came first? Investigation (RAAS, RUS)
- Renal failure and renal replacement: when to start dialysis, PD vs HD in Ghanaian setting
- Urological emergency overlap: obstructive uropathy from BPH, calculi — when to refer urology
- Malaria AKI: clinical scenario management, haemoglobinuria

**Case Studies:** 50 cases.

---

### 7. Haematology

**Anatomy & Physiology subtopics (~8):**
- Haematopoiesis: sites by age (embryo → fetal liver → bone marrow), cell lines, growth factors (EPO, G-CSF, thrombopoietin)
- Erythropoiesis: stages, haemoglobin structure (alpha/beta chains, HbA vs HbA2 vs HbF), oxygen-haemoglobin dissociation curve and factors affecting it
- Iron metabolism: absorption (duodenum, Fe2+ preferred), transport (transferrin), storage (ferritin), daily requirement
- Haemostasis: primary (platelet plug — VWF, GP IIb/IIIa) vs secondary (coagulation cascade — intrinsic/extrinsic/common pathway); fibrinolysis
- Coagulation tests: PT (extrinsic, factor VII sensitive), APTT (intrinsic), TT (thrombin), D-dimer, fibrinogen
- Bone marrow: structure, cellularity (30-70% normal), appearances in different diseases (hypercellular/hypocellular)
- Blood group systems: ABO (antigens on RBCs, antibodies naturally occurring), Rh (D antigen, haemolytic disease of newborn)
- Peripheral blood film: how to read — RBC morphology (target cells, sickle cells, shistocytes, tear drops), WBC differentials, platelet assessment

**Pathology subtopics (~12):**
- Iron deficiency anaemia: causes, microcytic/hypochromic film, ferritin vs iron vs TIBC pattern, treatment
- Megaloblastic anaemia: B12 (pernicious anaemia, diet) vs folate deficiency — hypersegmented neutrophils, macrocytosis, subacute combined degeneration (B12)
- Haemolytic anaemia: classification (intrinsic — hereditary spherocytosis, G6PD, sickle cell vs extrinsic — autoimmune, TTP, malaria)
- Sickle cell disease (HIGH PRIORITY — Ghana): HbSS, HbSC, HbS-beta-thal; sickling crisis types (vaso-occlusive, splenic sequestration, aplastic, acute chest, stroke)
- G6PD deficiency (prevalent in Ghana): X-linked, haemolytic crisis triggers (primaquine, dapsone, favism, infection)
- Thalassaemia: alpha vs beta (deletions vs mutations), severity spectrum (trait → intermedia → major)
- Leukaemias: AML vs ALL (age distribution, morphology, cytogenetics), CML (BCR-ABL, Philadelphia chromosome), CLL (smudge cells, Rai staging)
- Lymphomas: Hodgkin's (Reed-Sternberg cells, EBV association, B symptoms, Ann Arbor staging) vs NHL subtypes (Burkitt's — EBV, endemic in Africa; DLBCL; follicular)
- Multiple myeloma: CRAB criteria (Ca, Renal, Anaemia, Bones), M-protein on electrophoresis, Bence-Jones proteins
- Coagulopathies: haemophilia A/B (factor VIII/IX), von Willebrand disease, DIC (causes, D-dimer, treatment), ITP
- VTE: DVT (Well's score, compression ultrasound) and PE (Well's score, CTPA, anticoagulation duration)
- Bone marrow failure: aplastic anaemia, MDS, infiltration (leukaemia, myeloma, myelofibrosis — teardrop cells)

**Ghana-specific notes:**
- Sickle cell disease: very high prevalence in Ghana; comprehensive management questions (hydroxyurea, transfusion, vaso-occlusive crisis, pregnancy with SCD, newborn screening)
- G6PD deficiency: before giving antimalarials/sulfonamides/dapsone, screen for G6PD; G6PD testing in Ghana
- Burkitt's lymphoma: endemic type (jaw in children), EBV, translocation t(8;14)
- Malaria-induced haemolysis, thrombocytopenia, anaemia

**Pharmacology subtopics (~6):**
- Anaemia treatment: iron (oral vs IV, side effects, food interactions), B12 (IM cyanocobalamin), folate — indication differences
- Anticoagulation: heparin (UFH vs LMWH — monitoring, reversal with protamine), warfarin (INR targets, interactions), NOACs (dose, indication, reversal with idarucizumab/andexanet)
- Haemophilia: factor VIII/IX replacement, DDAVP in mild haemophilia A
- SCD management pharmacology: hydroxyurea (mechanism, monitoring), penicillin prophylaxis, folic acid, transfusion (simple vs exchange)
- Chemotherapy principles in haematological malignancies: induction vs consolidation vs maintenance; specific regimens at prescribing level (CHOP for NHL, imatinib for CML)
- Antiplatelet therapy: aspirin, clopidogrel, GPIIb/IIIa inhibitors — clinical indications

**Clinicals subtopics (~10):**
- Anaemia workup: history (diet, blood loss, family history), peripheral blood film, reticulocyte count, investigation algorithm
- Sickle cell crisis management in Ghana: analgesia (WHO ladder, opioids for severe), oxygen, hydration, exchange transfusion indications, hydroxyurea counselling
- Lymphadenopathy examination: size, consistency, tenderness, sites (local vs generalised), investigation pathway (biopsy criteria)
- Bleeding patient assessment: pattern (platelet — mucosal, petechiae vs coagulation factor — haemarthroses, deep haematoma), PT/APTT, cause
- DIC diagnosis and management: trigger identification, FFP/cryoprecipitate/platelet support, treat underlying cause
- Blood transfusion: indications (Hb threshold), group and crossmatch vs O-negative, complications (TRALI, TACO, transfusion reactions), consent
- Bone marrow biopsy: indications, site, what you're looking for
- DVT/PE workup: clinical probability, imaging, anticoagulation pathway
- Malaria-related haematological complications: severe anaemia, thrombocytopenia, blackwater fever
- Lymphoma staging: B symptoms history, Ann Arbor staging, CT-PET interpretation, treatment decision

**Case Studies:** 50 cases.

---

### 8. Musculoskeletal & Rheumatology

*(Structure same as pharmacy but clinical reasoning-focused, includes imaging interpretation)*

**Anatomy & Physiology:** Joint anatomy (hyaline cartilage, synovium, capsule), bone anatomy (periosteum, cortical/cancellous, Haversian system), skeletal muscle histology, bone remodelling (osteoblast vs osteoclast, RANKL/OPG pathway), calcium/phosphate homeostasis in bone

**Pathology:** OA (focal cartilage loss, subchondral sclerosis, osteophytes), RA (synovitis — pannus, joint erosion; extra-articular manifestations), gout (monosodium urate crystals — negatively birefringent, tophus), pseudogout (CPPD), SLE (anti-dsDNA, anti-Smith, complement consumption, lupus nephritis — WHO class), AS (HLA-B27, bamboo spine, sacroiliitis), psoriatic arthritis (nail changes, DIP joints), septic arthritis (Staph aureus most common, joint aspiration Gram stain), osteoporosis (DEXA T-score < -2.5, fragility fracture), Paget's disease, bone tumours (osteosarcoma, Ewing's, metastases — common sites)

**Ghana-specific:** Septic arthritis in sickle cell disease (Salmonella — unusual organism), reactive arthritis post-enteric infection or STI (Reiter's syndrome)

**Pharmacology:** Gout: colchicine/NSAIDs (acute), allopurinol/febuxostat (prophylaxis — don't start during acute); RA DMARDs (methotrexate first-line, mechanism, monitoring LFTs/FBC, teratogenicity); biologic DMARDs (anti-TNF — screen for TB before starting); corticosteroids (intra-articular, systemic — tapering); bisphosphonates and vitamin D/calcium for osteoporosis

**Clinicals:** Joint examination (GALS screen, then regional), X-ray interpretation in MSK (OA — LOSS: Loss of joint space, Osteophytes, Subchondral sclerosis, Subchondral cysts; RA — erosions, periarticular osteopenia, symmetrical), inflammatory vs mechanical joint pain history, septic arthritis as emergency (admit, IV antibiotics, aspiration, washout), SLE flare assessment, fragility fracture secondary prevention

**Case Studies:** 50 cases.

---

### 9. Infectious Diseases

*(This is especially important for Ghana — regional infections are a major focus)*

**Anatomy & Physiology:** Immune response to infection (innate vs adaptive, fever physiology, sepsis cascade, complement activation, SIRS criteria)

**Pathology subtopics:**
- Malaria (HIGH PRIORITY): P. falciparum vs P. vivax vs P. malariae vs P. ovale — life cycle, clinical differences, severe malaria criteria (WHO), complications (cerebral malaria, blackwater fever, severe anaemia, hypoglycaemia)
- Typhoid fever: S. typhi (Vi antigen, Widal test limitations), rose spots, Faget sign, complications (ileal perforation, haemorrhage)
- Cholera: V. cholerae, rice water stools, mechanism (cAMP), ORT composition, management
- Tuberculosis (full detail): LTBI vs active, primary vs post-primary, miliary, extrapulmonary (lymph node most common, CNS, bone — Pott's spine, genitourinary, pericardial), diagnosis (Mantoux, IGRA, GeneXpert/MTB-RIF, AFB smear), HIV-TB co-infection, IRIS
- HIV/AIDS: transmission, CD4 count and AIDS-defining conditions by CD4 level, WHO staging, ART regimens (first-line, second-line — Ghanaian guidelines), OIs (PCP, cryptococcal meningitis, CMV retinitis, toxoplasma, MAC)
- STIs: gonorrhoea (urethral discharge, Gram-negative diplococci), syphilis (primary/secondary/tertiary/congenital — VDRL vs TPHA), chlamydia, genital herpes, chancroid — especially relevant in Ghana
- Viral haemorrhagic fevers: Ebola, Lassa fever — clinical features, infection control principles (Ghana has had outbreaks near borders)
- Helminthic infections: schistosomiasis (S. haematobium — haematuria, S. mansoni — portal hypertension), soil-transmitted helminths (ascariasis, hookworm — anaemia), filariasis (lymphoedema), onchocerciasis (river blindness)
- Protozoal infections: amoebiasis (liver abscess), giardia, toxoplasmosis (immunocompromised)
- Bacterial: meningococcal disease, typhus (Rickettsia), leptospirosis (Weil's disease — jaundice + AKI + conjunctival suffusion)
- Antibiotic resistance: MRSA, ESBL-producing organisms, MDR-TB — infection control, de-escalation principles

**Ghana-specific:** This entire topic has heavy Ghana emphasis. Tag region: 'GH' for endemic disease questions; universal for general sepsis/HIV management

**Pharmacology:** Antimalarials (artemisinin-based combination therapy — ACT: artesunate-amodiaquine in Ghana; IV artesunate for severe malaria; chloroquine resistance); ART (TDF/3TC/DTG first line in Ghana national guidelines); TB drugs (HRZE); antifungals (fluconazole for cryptococcal, amphotericin B); metronidazole (amoebiasis, giardia, anaerobes); ivermectin/albendazole (helminths); praziquantel (schistosomiasis); antimicrobial stewardship principles

**Clinicals subtopics (~12):**
- Fever in Ghana: systematic approach — malaria RDT/film FIRST, then full septic screen (cultures, CXR, UA), travel history, tick/mosquito exposure
- Severe malaria management: IV artesunate (vs quinine — artesunate superior), monitoring glucose, parasitaemia, haematocrit, exchange transfusion threshold
- HIV testing, staging, and ART initiation in Ghana: Universal Test and Treat, WHO staging, what to start (Ghanaian national protocol)
- Management of OIs in HIV: PCP (co-trimoxazole), cryptococcal meningitis (amphotericin B + fluconazole), toxoplasma (pyrimethamine + sulfadiazine), CMV retinitis (ganciclovir)
- TB diagnosis in a Ghanaian patient: who to test (contacts, immunocompromised, suggestive CXR), GeneXpert, starting DOTS, notifiable disease
- Cholera management: ORT volumes, when to use IV (Ringer's lactate), antibiotic (doxycycline — shortens duration)
- Meningitis in Ghana: organisms by age group, empirical antibiotics, dexamethasone role, LP interpretation
- Sepsis protocol: SEPSIS-6, blood cultures before antibiotics (but don't delay > 1 hour), source control
- STI management in Ghana: syndromic approach (urethral discharge — ciprofloxacin + doxycycline for dual therapy), partner notification
- Infection control: standard precautions, PPE for VHF, isolation categories
- Schistosomiasis in a Ghanaian patient: chronic haematuria (S. haematobium), portal hypertension in a young adult (S. mansoni), praziquantel treatment
- Antimicrobial stewardship: appropriate prescribing, when NOT to give antibiotics (viral infections), de-escalation

**Case Studies:** 50 cases.

---

### 10. Reproductive System & Obstetrics / Gynaecology

**Anatomy & Physiology:** Reproductive anatomy (uterus — zones, cervix, ovary histology — follicular development, corpus luteum), menstrual cycle (FSH/LH/oestrogen/progesterone phases), fertilisation and implantation, fetal development timeline, placenta (structure, transfer, endocrine function — hCG/HPL/oestrogen/progesterone), parturition (prostaglandins, oxytocin, cervical ripening), lactation (prolactin, oxytocin, let-down reflex)

**Pathology:** Hypertensive disorders of pregnancy (pre-eclampsia — proteinuria + HT after 20 weeks, eclampsia, HELLP — haemolysis/elevated liver enzymes/low platelets), obstetric haemorrhage (PPH — uterine atony most common, abruption vs praevia), ectopic pregnancy (risk factors, clinical features, β-hCG, laparoscopy), miscarriage (types — threatened/inevitable/complete/incomplete/missed, management), GDM, cervical cancer (HPV 16/18, CIN → SCC, Pap smear screening), endometriosis (chocolate cysts, dysmenorrhoea), PCOS (Rotterdam criteria, LH:FSH ratio, insulin resistance, management), fibroids (leiomyoma — most common benign tumour of uterus in Black women), ovarian cancer (CA-125, serous cystadenocarcinoma most common, staging, BRCA), STIs and pelvic inflammatory disease, menopause (FSH/LH rise, HRT)

**Ghana-specific:** Maternal mortality (PPH leading cause in Ghana — active management of third stage; early referral), obstetric fistula (VVF — prolonged obstructed labour), unsafe abortion complications (septic abortion — Clostridium, air in uterus on imaging), malaria in pregnancy (intermittent preventive treatment — IPTp with SP), sickle cell disease and pregnancy, teenage pregnancy rate

**Pharmacology:** Oxytocics (oxytocin, ergometrine — PPH prevention and treatment), magnesium sulphate (eclampsia — loading dose, maintenance, monitoring reflexes/urine output/respiratory rate), antihypertensives in pregnancy (labetalol, hydralazine, methyldopa — AVOID ACE-i, ARBs, thiazides), tocolytics (nifedipine, atosiban), antenatal corticosteroids (betamethasone for fetal lung maturity < 34 weeks), COCP vs POCP vs DMPA vs IUD contraception indications, IPTp-SP (Ghana protocol)

**Clinicals subtopics (~10):**
- Antenatal care in Ghana: schedule, investigations (booking bloods — FBC, blood group, syphilis VDRL, HIV, malaria screen, HBsAg, glucose, USS dating), GP-referred vs hospital-based
- Pre-eclampsia management: blood pressure targets, magnesium sulphate protocol, when to deliver
- PPH management: HAEMOSTASIS (Help, Assess/Airway, Establish IV access, Massage uterus/Medications, O2, Shift to theatre, Tamponade/balloon, Interventional radiology, Surgery)
- Ectopic pregnancy: diagnosis (USS + β-hCG), medical (methotrexate criteria) vs surgical management
- Obstetric emergencies: shoulder dystocia (McRoberts, suprapubic pressure), cord prolapse (call for help, elevate presenting part, CS), eclampsia (ABCDE, MgSO4)
- Cervical cancer in Ghana: screening programme, colposcopy indications, treatment
- GDM: GCT/OGTT thresholds, dietary management, insulin initiation, delivery planning
- Gynaecological examination: speculum, bimanual, cervical smear technique
- PCOS management: metformin, clomiphene (ovulation induction), OCP for menstrual regulation
- Menopause: vasomotor symptoms, bone protection, HRT indications and contraindications (breast cancer risk)

**Case Studies:** 50 cases.

---

### 11. Dermatology

*(Adapted for Ghana — skin conditions in darker skin tones, tropical dermatoses)*

**Anatomy & Physiology:** Skin layers (epidermis — keratinocytes, melanocytes, Langerhans, Merkel cells; dermis — papillary vs reticular; hypodermis), skin appendages, melanin synthesis and distribution, wound healing (haemostasis → inflammation → proliferation → remodelling), immunological role of skin (innate barrier)

**Pathology:** Dermatological lesion terminology (macule, papule, plaque, vesicle, bulla, pustule, nodule, wheal, ulcer, scale, crust, lichenification, excoriation), eczema/atopic dermatitis (IgE, Th2, filaggrin mutations), psoriasis (Auspitz sign, Koebner, plaques on extensor surfaces, HLA-Cw6), acne vulgaris (comedonal vs inflammatory vs nodulocystic, C. acnes), skin infections (impetigo — Staph/Strep, cellulitis, erysipelas, necrotising fasciitis — surgical emergency; folliculitis; tinea species; candidiasis; viral — HSV, VZV, molluscum, warts), tropical dermatoses (scabies — burrows in web spaces; yaws — Treponema pallidum pertenue; leprosy — hypopigmented anaesthetic patches, nerve thickening; onchocerciasis — lichenified skin, leopard skin), melanoma (ABCDE criteria, Clark/Breslow staging — in darker skin often subungual or palmoplantar), keloid vs hypertrophic scar (much more common in African patients), hyperpigmentation disorders (melasma, post-inflammatory — important in darker skin), pressure ulcers (stages, prevention, dressing)

**Ghana-specific:** Tinea capitis very common in children; keloid formation; tropical ulcers; Buruli ulcer (Mycobacterium ulcerans — painless undermining ulcer, WHO programme in Ghana); yaws; leprosy in northern Ghana; hypopigmentation vs vitiligo (important differential in dark skin)

**Pharmacology:** Emollients and topical steroids (strength classification, appropriate use by site — face vs body, risk of skin atrophy in dark skin), topical retinoids (acne), antibiotics (topical fusidic acid, systemic flucloxacillin/co-amoxiclav for cellulitis), antifungals (terbinafine, griseofulvin for tinea capitis), ivermectin/permethrin (scabies), biologics in psoriasis (adalimumab, secukinumab — prescribing level), dapsone (leprosy MDT, G6PD check first)

**Clinicals:** Systematic skin examination (exposed vs covered areas, mucosal membranes, nails, scalp), differentiate inflammatory vs infective vs malignant lesion, cellulitis management and red flags for necrotising fasciitis, management of common conditions in Ghanaian skin (keloid — intralesional steroids, surgical risk), leprosy diagnosis and MDT, Buruli ulcer — wound care and rifampicin + clarithromycin

**Case Studies:** 50 cases.

---

### 12. Immunology & Allergy

**Anatomy & Physiology:** Primary lymphoid organs (bone marrow — B cells, thymus — T cells), secondary (lymph nodes, spleen, MALT), innate immunity (physical barriers, complement, NK cells, macrophages, neutrophils, TLRs, cytokines — IL-1/TNF/IL-6 in acute phase), adaptive immunity (T cell subsets — Th1/Th2/Th17/Treg/CTL; B cell activation, germinal centre, affinity maturation, class switching, plasma cells, memory B cells), MHC class I (CD8) vs class II (CD4) restriction, hypersensitivity types (Gell and Coombs: I-IgE, II-cytotoxic, III-immune complex, IV-delayed), complement system (classical/lectin/alternative, MAC formation, deficiency consequences), tolerance mechanisms (central — clonal deletion, peripheral — anergy/Tregs)

**Pathology:** Primary immunodeficiencies (X-linked agammaglobulinaemia — Bruton's, CVID, DiGeorge/SCID — presentation age, recurrent organisms), secondary immunodeficiency (HIV as main example, steroids, malnutrition — very relevant in Ghana), anaphylaxis (IgE-mediated, mast cell, clinical features, epinephrine), allergic rhinitis/asthma (type I HSS), SLE and other autoimmune (type III HSS), contact dermatitis/tuberculin test (type IV), transplant rejection (hyperacute/acute/chronic — mechanisms), autoimmune diseases overview (organ-specific vs systemic — antibodies: ANA, anti-dsDNA, ANCA, anti-CCP, anti-mitochondrial etc.), immunosuppression in transplant/malignancy and infection risk

**Ghana-specific:** Malnutrition-related immunodeficiency; kwashiorkor/marasmus effects on immunity; HIV as common secondary ID; post-measles immunosuppression

**Pharmacology:** Antihistamines (H1 blockers — sedating vs non-sedating), adrenaline auto-injector (indications, technique), immunosuppressants (steroids, azathioprine, mycophenolate, tacrolimus/ciclosporin — mechanism at prescribing level, monitoring), biologics overview (anti-TNF, anti-IL agents — mode and clinical use), vaccines — schedules for Ghana (EPI programme: BCG, Hep B, OPV, Penta, PCV, Rota, MenA, measles/rubella/yellow fever, typhoid)

**Clinicals:** Anaphylaxis management (IM adrenaline, position, IV fluids, hydrocortisone, antihistamine, observe 6h, EpiPen prescription), recurrent infections — immunodeficiency workup (FBC with differential, Ig levels, CD4 count, complement levels, HIV test), allergy testing (skin prick, RAST), immunodeficiency patient counselling (live vaccine avoidance), managing intercurrent infection in immunosuppressed patient

**Case Studies:** 50 cases.

---

### 13–17: Surgery, Urology, Ophthalmology, ENT, Paediatrics

Each follows the 5-category structure. Key emphasis areas for medicine:

**Surgery:** Surgical anatomy (inguinal canal, femoral triangle, thyroid blood supply, appendix — McBurney's point), surgical pathology (tumour staging TNM, wound healing, surgical site infection), perioperative prescribing (thromboprophylaxis, antibiotic prophylaxis, analgesia — WHO ladder, anti-emetics), Clinicals (acute abdomen assessment, surgical emergencies — appendicitis/cholecystitis/perforated viscus/small bowel obstruction/AAA, post-operative complications). **Ghana notes:** Limited surgical capacity; appendicitis presenting late; typhoid ileal perforation common.

**Urology:** Renal anatomy applied (nephrectomy planes), urological pathology (BPH — LUTS, PSA, urodynamics; prostate cancer — Gleason, bone metastases; bladder cancer — transitional cell vs SCC in schistosomiasis context; testicular cancer — teratoma vs seminoma; kidney cancer — RCC), Clinicals (urological emergencies: testicular torsion — 6h window, priapism — SCD in Ghana, acute urinary retention — catheterisation, haematuria workup). **Ghana note:** Bladder SCC from S. haematobium.

**Ophthalmology:** Eye anatomy (layers, aqueous humour circulation), ophthalmic pathology (glaucoma — open vs closed angle, IOP, optic disc cupping; cataract — risk factors, nuclear vs cortical; diabetic retinopathy — background/preproliferative/proliferative, treatment; age-related macular degeneration; retinal detachment; uveitis; corneal ulcer), Clinicals (visual acuity testing, Snellen chart, pupil reactions, fundoscopy findings, red eye differential). **Ghana notes:** Onchocerciasis (river blindness); vitamin A deficiency (xerophthalmia, Bitot's spots); high prevalence of glaucoma in West Africa (normal tension).

**ENT:** ENT anatomy, common ENT pathology (otitis media — acute vs chronic suppurative in children Ghana; otitis externa; tonsillitis — complications abscess/rheumatic fever; sinusitis; epistaxis — Kiesselbach plexus; hearing loss — conductive vs sensorineural; vertigo — BPPV, Meniere's, labyrinthitis), Clinicals (Rinne/Weber tuning fork tests, otoscopy findings, hearing loss assessment, ENT emergencies — Ludwig's angina, peritonsillar abscess). **Ghana notes:** Chronic suppurative otitis media very common in children; mastoiditis complication.

**Paediatrics:** Child development milestones (motor, language, social — by age), neonatal assessment (APGAR, newborn examination — DDH, red reflex, testes), growth charts and failure to thrive, common paediatric conditions (febrile convulsions, RSV bronchiolitis, croup vs epiglottitis, gastroenteritis — ORT in Ghana, meningitis, malaria — severe malaria in children WHO criteria, malnutrition — kwashiorkor vs marasmus, measles and complications), paediatric pharmacology (weight-based dosing, off-label use, vaccines — EPI Ghana schedule), safeguarding/child protection, adolescent medicine. **Ghana notes:** Malaria is leading cause of childhood death; sickle cell screening at birth; severe acute malnutrition (SAM) management; neonatal sepsis causes (GBS, E. coli, Staph in Ghana setting).

---

## Part 2 — Standalone Medicine Topics

*(Subjects that don't fit a single body system)*

---

### 18. Anatomy

**Category:** `Anatomy & Physiology`

**Subtopics:**
- Gross anatomy: upper limb (brachial plexus, compartments, nerve injuries — wrist drop/claw hand/ape hand), lower limb (femoral triangle, sciatic nerve, compartments, common fibular nerve injury — foot drop), head and neck (facial nerve course and branches, structures passing through parotid, triangles of neck, thyroid relations), thorax (mediastinum — contents, superior vs inferior), abdomen (layers of abdominal wall, inguinal canal — contents/walls, retroperitoneum)
- Neuroanatomy: brainstem anatomy and cranial nerve nuclei, internal capsule (blood supply, clinical strokes here), cerebellum (flocculonodular, vermis, hemispheres), spinal cord cross-section (tracts, laminae), ventricular system
- Histology: epithelium types and locations, gland types (exocrine: serous/mucous, endocrine), connective tissue (collagen types by location — type I bone/tendon, type II cartilage, type III reticular organs), muscle types (cardiac/skeletal/smooth — ultrastructure), nerve histology (myelinated vs unmyelinated, Schwann cells vs oligodendrocytes), skin histology, common organs (liver, kidney, lung — histological features)
- Embryology: fertilisation and early development, gastrulation (three germ layers — what each forms), neural tube development and defects (spina bifida, anencephaly — folate), heart development (septation, common defects), gut rotation and malrotation, renal development (pronephros → mesonephros → metanephros), common congenital anomalies by system

**Tags:** `['medicine']`, `region: null` (all universal)

---

### 19. Biochemistry & Medical Genetics

**Category:** `Biochemistry`

**Subtopics:**
- Carbohydrate metabolism: glycolysis, TCA cycle, oxidative phosphorylation, glycogen metabolism (glycogen storage diseases — Pompe, Von Gierke), gluconeogenesis, pentose phosphate pathway (relevance to G6PD)
- Lipid metabolism: fatty acid synthesis vs beta-oxidation, ketone bodies (DKA), lipoprotein metabolism (LDL, HDL, VLDL — clinical relevance, familial hypercholesterolaemia)
- Protein/amino acid metabolism: transamination, urea cycle and disorders (ornithine transcarbamylase deficiency), inborn errors (PKU, alkaptonuria, homocystinuria, maple syrup urine disease)
- Nucleotide metabolism: purine synthesis and salvage (Lesch-Nyhan), pyrimidine synthesis, folate/B12 in nucleotide synthesis
- Enzyme kinetics: Michaelis-Menten, Km/Vmax, competitive vs non-competitive inhibition (clinical drug examples)
- Vitamins and minerals: fat-soluble (A, D, E, K — deficiency and toxicity) and water-soluble (B1-B12, C — specific deficiency syndromes: Wernicke's, pellagra, scurvy, beriberi), mineral deficiencies (iron, zinc, iodine — endemic goitre in Ghana)
- Genetics: modes of inheritance (autosomal dominant/recessive, X-linked, mitochondrial), Hardy-Weinberg, common genetic diseases in Ghana (sickle cell — most important, G6PD deficiency, thalassaemia), chromosomal abnormalities (Down's/Edwards'/Patau's — trisomies; Turner's/Klinefelter's), DNA repair disorders (xeroderma pigmentosum), oncogenes and tumour suppressor genes, cancer genetics (BRCA, RB, p53), genetic testing principles (PCR, FISH, array CGH, next-gen sequencing), genetic counselling principles
- Biochemical laboratory interpretation: LFTs (AST/ALT elevation patterns, ALP — cholestatic vs bone), renal biochemistry (urea, creatinine, eGFR, electrolytes), thyroid function tests, ABG (see Respiratory), tumour markers (PSA, CA-125, CEA, AFP — when to use each), coagulation studies

**Ghana-specific:** Sickle cell genetics (carrier frequency ~20-25% in Ghana), G6PD genetics, newborn screening programme, genetic counselling for high-risk couples

**Tags:** `['medicine']`, `region: null` (mostly universal); specific Ghana genetics questions `region: 'GH'`

---

### 20. Psychiatry

**Category:** `Psychiatry`

**Subtopics:**
- Mental State Examination (MSE): appearance/behaviour, speech, mood/affect, thought (form/content — delusions, obsessions, overvalued ideas), perception (hallucinations by type — auditory/visual/tactile/olfactory/command), cognition (orientation, memory, attention), insight and judgement
- Schizophrenia spectrum: ICD-11 criteria, positive vs negative symptoms, first-rank symptoms (Schneiderian), investigations (exclusion), antipsychotics (typical — haloperidol, chlorpromazine; atypical — olanzapine, clozapine — agranulocytosis monitoring), depot injections
- Mood disorders: major depressive disorder (ICD-11, PHQ-9, biological/psychological/social model), bipolar disorder (manic episode criteria, mixed features, lithium — serum levels, toxicity, renal monitoring, thyroid effects), antidepressants (SSRI first-line, TCAs — overdose, MAOIs — interactions with tyramine/serotonin)
- Anxiety disorders: GAD, panic disorder (hyperventilation syndrome), social anxiety, specific phobia, PTSD (flashbacks, avoidance, hyperarousal), OCD (ego-dystonic, YBOCS) — CBT and SSRI treatments
- Psychotic disorders: substance-induced psychosis (cannabis — schizophreniform), delirium (acute vs chronic cognitive impairment, PINCH ME causes, Confusion Assessment Method), dementia
- Substance use disorders: alcohol (AUDIT score, CAGE, Wernicke-Korsakoff — thiamine, delirium tremens — chlordiazepoxide protocol), opioid dependence (withdrawal features, methadone/buprenorphine), cannabis (increasingly relevant in Ghana after partial decriminalisation)
- Personality disorders: cluster A/B/C characteristics; EUPD (BPD) — dialectical behaviour therapy
- Perinatal mental health: postnatal depression vs baby blues vs puerperal psychosis
- Child and adolescent psychiatry: ADHD, autism spectrum disorder, conduct disorder, school refusal
- Forensic psychiatry: mental health law basics, capacity assessment, McNaughton rules (Ghana criminal law context)
- Suicide and self-harm: risk assessment (Columbia protocol, static vs dynamic risk factors), safe prescribing (avoiding large TCA supplies), crisis intervention

**Ghana-specific:** Spiritual/traditional explanations for mental illness in Ghana (implications for help-seeking and treatment adherence); mental health gap (few psychiatrists nationally); Mental Health Act 2012 (Ghana); faith healing centres and collaboration; stigma reduction; cannabis use patterns; alcohol use (akpeteshie)

**Tags:** `['medicine']`; Ghana-specific questions `region: 'GH'`

---

### 21. Emergency Medicine & Critical Care

**Category:** `Clinicals`

**Subtopics:**
- ABCDE assessment: systematic primary survey, reversing causes (4Hs and 4Ts)
- BLS/ALS: CPR technique, shockable (VF/pVT) vs non-shockable (asystole/PEA), drug doses (adrenaline 1mg IV every 3-5 min, amiodarone 300mg), post-resuscitation care
- Shock: classification (hypovolaemic, distributive — septic/anaphylactic/neurogenic, cardiogenic, obstructive), recognition, resuscitation (crystalloid vs colloid, vasopressors)
- Trauma: primary and secondary survey (ATLS), haemorrhage control (tourniquet, wound packing), pelvic fracture, tension pneumothorax (needle decompression), haemothorax, cardiac tamponade
- Major emergencies: status epilepticus, severe asthma/anaphylaxis, hypertensive emergency (labetalol, nitroprusside), stroke hyperacute, DKA, hyperkalaemia, acute coronary syndrome
- Toxicology: approach to the poisoned patient (RRSIDEAD mnemonic), specific antidotes (N-acetylcysteine/paracetamol, naloxone/opioids, flumazenil/benzodiazepines, atropine/organophosphates), overdose of common medications (digoxin, tricyclics — sodium bicarbonate)
- Critical care: indications for ICU (organ support), ventilation basics (IPPV vs NIV, CPAP), sedation and analgesia in ICU, sepsis-6 bundle, organ donation

**Ghana-specific:** Resource-limited emergency care (Ghana has limited ICU capacity nationally — triage principles); snake envenomation (polyvalent antivenom, Ghana Viper Research Centre); drowning (Volta Lake, coastal); burns management (common domestic burns in Ghana — kerosene stove); road traffic accidents (high burden); malaria as emergency

**Tags:** `['medicine']`; Ghana-specific emergencies `region: 'GH'`

---

### 22. Public Health & Epidemiology

**Category:** `Public Health`

**Subtopics:**
- Epidemiological study types: cohort, case-control, cross-sectional, RCT, systematic review/meta-analysis — strengths, weaknesses, when to use, bias types (selection, information, confounding)
- Statistical measures: incidence vs prevalence, relative risk vs odds ratio, NNT, sensitivity vs specificity, PPV/NPV (calculations), confidence intervals, p-value interpretation
- Disease burden in Ghana: top causes of mortality and morbidity (malaria, respiratory infections, DM, hypertension, HIV/AIDS, maternal/neonatal causes, road traffic injuries — GHS data)
- Health systems: Ghana health system structure (Ministry of Health vs GHS vs NHIA), National Health Insurance Scheme (NHIS) — coverage, limitations, essential medicines list, Community Health Planning and Services (CHPS) compounds
- Screening: principles (Wilson-Jungner criteria), cervical cancer screening (VIA in Ghana), hypertension/DM screening, HIV testing (opt-out in Ghana), newborn hearing screening
- Preventive medicine: immunisation programme (EPI Ghana — full schedule), WASH (water, sanitation, hygiene), nutrition programmes (IYCF, school feeding), vector control (insecticide-treated nets, indoor residual spraying for malaria), non-communicable disease prevention
- Communicable disease control: surveillance (notifiable diseases in Ghana — list), outbreak investigation (epidemic curve, attack rate, case definition), contact tracing, ring vaccination
- Maternal and child health: antenatal care coverage, skilled birth attendance, facility delivery rates, postnatal care, growth monitoring, PMTCT programme in Ghana
- Global health: SDGs and health goals, Universal Health Coverage, WHO essential medicines concept, DALYs vs QALYs

**Ghana-specific:** Almost entirely Ghana-specific. Tag many questions `region: 'GH'`. Universal questions (study design, statistical measures, screening principles) tag `region: null`

**Tags:** `['medicine']`; mostly `region: 'GH'`

---

### 23. Medical Ethics & Law (including Professionalism)

**Category:** `Medical Ethics`

**Subtopics:**
- Four pillars of bioethics: autonomy (patient's right to decide), beneficence (do good), non-maleficence (do no harm), justice (fair resource allocation)
- Informed consent: elements (information, voluntariness, capacity), who can consent (adults with capacity, Gillick competence in children, parental responsibility, next-of-kin — note Ghana law differs from UK)
- Mental capacity assessment: principles (assume capacity, support, unwise decisions, best interests), capacity assessment steps (understand, retain, weigh, communicate)
- Confidentiality: duty to maintain, exceptions (public interest, child protection, notifiable diseases, court orders), sharing with relatives, third-party information, GDPR/data protection
- Medical negligence: Bolam test (standard of care), causation, documentation importance
- End of life: advance directives/living wills, DNR orders (AND/DNACPR), palliative care principles, distinction from euthanasia, breaking bad news (SPIKES protocol)
- Research ethics: Declaration of Helsinki, Helsinki principles, Belmont report, equipoise, IRB/ethics committee, placebo use, vulnerable populations
- Professionalism: GMC/Ghana Medical and Dental Council standards, duty of candour, apology law, raising concerns about colleagues (whistleblowing), social media and professionalism
- Justice and resource allocation: triage principles, cost-effectiveness, NICE/rationing, equity in healthcare (rural-urban divide in Ghana)
- Child protection: safeguarding, mandatory reporting, signs of abuse (fractures in unusual sites, burns, neglect)
- Ghana-specific ethical issues: traditional healers and informed consent, family-based decision-making (vs individual autonomy), herbal medicine disclosure, payment before treatment (NHIS limitations)

**Tags:** `['medicine']`; universal principles `region: null`; Ghana law/context questions `region: 'GH'`

---

## Summary: Database Tagging Schema

| Field | Value |
|---|---|
| `professions` | `['medicine']` on all medicine questions |
| `category` | One of: Anatomy & Physiology / Pathology / Pharmacology / Clinicals / Case Studies / Clinical Skills / Biochemistry / Public Health / Medical Ethics / Psychiatry |
| `topic` | Body system (e.g. "Cardiovascular System") or standalone subject ("Anatomy", "Public Health", "Psychiatry", "Medical Ethics", "Biochemistry & Genetics", "Emergency Medicine") |
| `subtopic` | Specific disease/condition/concept within the topic |
| `region` | `'GH'` for Ghana-specific content; `null` for universal |
| `question_type` | `'mcq'` or `'flashcard'` (case studies → `case_studies` table) |
| `difficulty` | `'easy'` / `'medium'` / `'hard'` (calibrated to MBChB Year 3–5 level) |
| `high_yield` | `true` if directly relevant to final MB exams, common clinical presentations, or Ghana-high-burden diseases |

## Question Volume per System (target)

| Topic | A&P/Biochem | Pathology | Pharmacology | Clinicals | Cases |
|---|---|---|---|---|---|
| Each of 17 body systems | 150 MCQ + 150 FC | 600 MCQ + 120 FC | 100 MCQ + 50 FC | 600 MCQ + 120 FC | 50 |
| Anatomy (standalone) | 200 MCQ + 100 FC | — | — | — | — |
| Biochemistry & Genetics | 200 MCQ + 100 FC | — | — | — | — |
| Psychiatry | — | 150 MCQ + 60 FC | 60 MCQ + 30 FC | 200 MCQ + 60 FC | 30 |
| Emergency Medicine | — | — | — | 200 MCQ + 60 FC | 30 |
| Public Health | — | — | — | 200 MCQ + 60 FC | — |
| Medical Ethics | — | — | — | 150 MCQ | — |

*Flashcard format for medicine: question = clinical concept / finding; answer = explanation + clinical significance (not just a one-liner)*

---

## Key Principles When Generating Medicine Questions

1. **USMLE-style MCQ format for Clinicals**: lead with a clinical vignette (age, sex, presenting complaint, key examination/lab finding), then ask "What is the most likely diagnosis?" / "What is the next best step?" / "What is the most appropriate management?" Never ask "What is the mechanism of X?" in a Clinicals question — that belongs in Pathology.

2. **Distractor quality**: All 4 wrong answers must be plausible. A student who has read the material should pick the right answer by reasoning, not by elimination of absurd options.

3. **Ghana-first framing for clinical scenarios**: Use Ghanaian names (Kwame, Abena, Ama, Kofi), Ghanaian healthcare settings (Korle Bu, Komfo Anokye, district hospital, CHPS compound), Ghanaian epidemiology (malaria before leptospirosis, TB before sarcoidosis in differential). Tag `region: 'GH'`.

4. **Correct_answer field**: Full answer text (not just option label). Explanation field: why the right answer is right AND why the main distractor is wrong.

5. **Difficulty calibration**:
   - Easy = a Year 3 student who has attended lectures can answer
   - Medium = requires integration of knowledge (pathophysiology explains the clinical feature)
   - Hard = nuanced management decisions, unusual presentation, investigation interpretation

6. **Do not overlap with pharmacy questions**: Medicine questions ask "why does the patient have this finding?" and "what do you do next as the doctor?" — not "which drug regimen?" or "what counselling points does the pharmacist give?"
