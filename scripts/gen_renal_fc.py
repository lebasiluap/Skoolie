#!/usr/bin/env python3
"""Generate 100 Renal System Pharmacology Flashcards."""

fc_rows = []

YL = "'{year1,year2,year3,year4,year5,year6,practitioner}'"
SRC = "Lippincott Illustrated Reviews Pharmacology 7th Ed"
PROF = '\'{"medicine"}\''
COURSE = 'Medicine'
TOPIC = 'Renal System'
CAT = 'Pharmacology'

def fc(subtopic, difficulty, front, back, explanation, high_yield):
    b = back.replace("'", "''")
    f = front.replace("'", "''")
    ex = explanation.replace("'", "''")
    st = subtopic.replace("'", "''")
    hy = 'true' if high_yield else 'false'
    opts_json = f'["{b}"]'
    return (f"INSERT INTO questions (professions, course, topic, category, subtopic, difficulty, question_type, "
            f"question_text, options, correct_answer, explanation, region, high_yield, year_level, source_reference) VALUES\n"
            f"({PROF},'{COURSE}','{TOPIC}','{CAT}','{st}','{difficulty}','flashcard','{f}','{opts_json}',"
            f"'A','{ex}','universal',{hy},{YL},'{SRC}');")

# ─── SUBTOPIC 1: Loop Diuretics ───────────────────────────────────────────────
S1 = "Loop Diuretics"
fc_rows.append(fc(S1,"easy",
    "What transporter does furosemide inhibit, and where is it located?",
    "Na+/K+/2Cl- cotransporter (NKCC2) in the thick ascending limb of the loop of Henle",
    "NKCC2 in the thick ascending limb reabsorbs 25-30% of filtered NaCl. Loop diuretics block this, producing the greatest diuretic effect of any class.",
    True))

fc_rows.append(fc(S1,"easy",
    "What is the most common electrolyte adverse effect of loop diuretics?",
    "Hypokalemia — excess Na+ delivery to the collecting duct drives K+ secretion via Na+/K+ exchange",
    "Hypokalemia is the most frequent adverse effect. Management: KCl supplementation, dietary K+, or addition of a K+-sparing diuretic.",
    True))

fc_rows.append(fc(S1,"medium",
    "How do loop diuretics affect urinary calcium, and what is the clinical use?",
    "Loop diuretics INCREASE urinary Ca2+ excretion (hypercalciuria) — useful for treating hypercalcemia of malignancy (with IV saline)",
    "Loop diuretics block paracellular Ca2+ reabsorption in the ascending loop. Opposite of thiazides, which DECREASE Ca2+ excretion.",
    True))

fc_rows.append(fc(S1,"medium",
    "Why does furosemide have unpredictable oral bioavailability, and which loop diuretic is preferred for reliable oral dosing?",
    "Furosemide bioavailability ranges 10-90%. Torsemide or bumetanide preferred — 80-100% reliable oral bioavailability",
    "Variable furosemide absorption makes oral dosing less predictable. Torsemide also has longer duration of action, potentially improving adherence.",
    True))

fc_rows.append(fc(S1,"medium",
    "What is the mechanism of ototoxicity with loop diuretics, and which drug in the class carries the highest risk?",
    "Inhibition of NKCC1 in the stria vascularis disrupts the endocochlear potential. Ethacrynic acid carries the highest ototoxicity risk.",
    "Ototoxicity risk increases with rapid IV infusion, high doses, and concurrent aminoglycoside use. Ethacrynic acid is the only non-sulfonamide loop diuretic, used for sulfonamide allergy.",
    True))

fc_rows.append(fc(S1,"hard",
    "Describe the dose-response curve of loop diuretics and the clinical implication.",
    "Sigmoidal (S-shaped) curve: threshold → steep rise → ceiling. Clinicians adjust FREQUENCY (not dose beyond ceiling) to modulate daily diuresis.",
    "Below the threshold, no diuresis occurs. Above the ceiling, more drug produces no more diuresis — only toxicity. Adjust dosing intervals, not max dose.",
    True))

fc_rows.append(fc(S1,"easy",
    "Loop diuretics are the drugs of CHOICE for which 3 acute clinical situations?",
    "1. Acute pulmonary edema; 2. Hypercalcemia (with saline); 3. Hyperkalemia (adjunct therapy)",
    "For acute pulmonary edema, IV furosemide provides rapid venodilation (before diuresis) and then potent fluid removal. For hypercalcemia, promotes Ca2+ excretion.",
    True))

fc_rows.append(fc(S1,"medium",
    "What is the mechanism of furosemide venodilation, and when does it occur?",
    "Prior to diuretic effect, furosemide stimulates renal prostaglandin synthesis, causing venodilation and reduction in left ventricular filling pressure",
    "This pre-diuretic venodilation (within minutes of IV administration) is why furosemide rapidly relieves dyspnea in acute pulmonary edema before significant urine output occurs.",
    True))

fc_rows.append(fc(S1,"hard",
    "Why do NSAIDs blunt the effect of loop diuretics?",
    "NSAIDs inhibit renal prostaglandin synthesis; prostaglandins are required for loop diuretic tubular secretion stimulation and vasodilatory action",
    "This is a clinically significant pharmacodynamic interaction. Patients with heart failure or edema on furosemide plus NSAIDs often have inadequate diuresis.",
    True))

fc_rows.append(fc(S1,"medium",
    "Which loop diuretic is used when a patient has a sulfonamide allergy, and why?",
    "Ethacrynic acid — it is the only loop diuretic that is NOT a sulfonamide derivative",
    "Although furosemide, bumetanide, and torsemide are sulfonamide derivatives, they do not typically cross-react with sulfonamide antimicrobial allergy. Ethacrynic acid is the clear choice when a true allergic reaction to sulfonamides is documented.",
    True))

# ─── SUBTOPIC 2: Thiazide Diuretics ──────────────────────────────────────────
S2 = "Thiazide Diuretics"
fc_rows.append(fc(S2,"easy",
    "Where do thiazide diuretics act, and which transporter do they inhibit?",
    "Distal convoluted tubule — inhibit Na+/Cl- cotransporter (NCC), reducing 5-10% of filtered NaCl reabsorption",
    "Thiazides must be secreted into the proximal tubule lumen to reach the NCC in the DCT. They are ''low-ceiling'' diuretics with limited maximum efficacy.",
    True))

fc_rows.append(fc(S2,"medium",
    "State the key metabolic adverse effects of thiazide diuretics (the '5 Hs').",
    "Hypokalemia, Hyponatremia, Hyperuricemia, Hyperglycemia, Hyperlipidemia (and Hypercalcemia)",
    "Hypokalemia is most common. Hyperuricemia via competition with urate in organic acid secretory system. Hyperglycemia from impaired insulin secretion related to hypokalemia.",
    True))

fc_rows.append(fc(S2,"easy",
    "How do thiazides affect urinary calcium, and what is the clinical use?",
    "Thiazides DECREASE urinary Ca2+ excretion (promote DCT Ca2+ reabsorption) — used for idiopathic hypercalciuria and calcium oxalate nephrolithiasis",
    "This is the opposite of loop diuretics. Thiazides increase Ca2+ reabsorption in the DCT, useful for preventing recurrent Ca2+ stones and treating hypercalciuria.",
    True))

fc_rows.append(fc(S2,"medium",
    "Why does hydrochlorothiazide become ineffective as a diuretic when GFR falls below 30 mL/min/1.73m2?",
    "Thiazides require proximal tubule secretion to reach the NCC in the DCT. In advanced CKD, reduced tubular secretion means insufficient drug reaches its site of action.",
    "Loop diuretics remain effective at low GFR. Thiazides are switched to loop diuretics in advanced CKD for fluid management, though thiazides may retain some antihypertensive effects via vascular mechanisms.",
    True))

fc_rows.append(fc(S2,"hard",
    "Explain the paradoxical mechanism by which thiazides reduce urine volume in nephrogenic diabetes insipidus.",
    "Thiazide-induced mild volume depletion → increased proximal tubule Na+ and H2O reabsorption → less fluid delivery to the ADH-unresponsive distal segments → paradoxical reduction in urine output",
    "A classic pharmacology paradox: a diuretic reducing urine volume. The principle is proximal tubule compensation for mild hypovolemia, not a direct anti-diuretic effect.",
    True))

fc_rows.append(fc(S2,"medium",
    "How does indapamide differ from hydrochlorothiazide in its pharmacokinetics?",
    "Indapamide undergoes hepatic metabolism and is excreted in both bile and urine; most thiazides are excreted unchanged in the urine",
    "This makes indapamide somewhat safer in mild-moderate CKD compared to HCTZ (which depends entirely on renal excretion). Indapamide also has vasodilatory properties independent of its diuretic effect.",
    True))

fc_rows.append(fc(S2,"easy",
    "Why are thiazides used for hypertension in patients with recurrent kidney stones?",
    "Thiazides reduce urinary Ca2+ excretion by increasing DCT Ca2+ reabsorption — directly reducing stone-forming Ca2+ in the urine while also treating hypertension",
    "This double benefit (antihypertensive + antiurolithic) makes thiazides a preferred antihypertensive in patients with Ca2+-containing kidney stones and hypertension.",
    True))

fc_rows.append(fc(S2,"hard",
    "What is chlorthalidone''s pharmacokinetic advantage over HCTZ, and does current evidence support one over the other?",
    "Chlorthalidone has a half-life of 50-60 hours (vs 10-15 hours for HCTZ), providing 24-hour BP control; ~2x more potent. However, current guidelines do NOT preferentially recommend one over the other.",
    "Chlorthalidone''s prolonged duration is theoretically beneficial for consistent blood pressure control. Some clinicians prefer it for this reason, but head-to-head outcome data are lacking.",
    False))

fc_rows.append(fc(S2,"medium",
    "Can thiazides be used safely in patients with sulfonamide antibiotic allergy?",
    "Yes — despite being sulfonamide derivatives, thiazides do NOT generally cause cross-hypersensitivity in patients with sulfonamide antimicrobial allergy due to structural differences in the sulfonamide group",
    "The sulfonamide group in thiazides differs structurally from that in antimicrobials like sulfamethoxazole. Clinically meaningful cross-reactivity is rare, and thiazides are generally safe to use.",
    True))

fc_rows.append(fc(S2,"easy",
    "What is the first-line thiazide indication beyond hypertension?",
    "Edematous states (mild heart failure, cirrhosis, nephrotic syndrome) as an adjunct; also idiopathic hypercalciuria, calcium nephrolithiasis, and nephrogenic DI",
    "Thiazides reduce extracellular volume and are useful in mild edema. For severe edema/heart failure, loop diuretics are preferred. The two classes can be combined for diuretic resistance.",
    True))

# ─── SUBTOPIC 3: Potassium-Sparing Diuretics ─────────────────────────────────
S3 = "Potassium-Sparing Diuretics"
fc_rows.append(fc(S3,"easy",
    "Distinguish the mechanisms of spironolactone vs amiloride as potassium-sparing diuretics.",
    "Spironolactone: aldosterone receptor antagonist (prevents Na+-retaining protein synthesis). Amiloride: directly blocks ENaC (epithelial Na+ channels) — independent of aldosterone",
    "Both act in the collecting duct/tubule principal cells, both retain K+ and excrete Na+. Key distinction: spironolactone requires aldosterone to be present to have effect; amiloride works regardless.",
    True))

fc_rows.append(fc(S3,"easy",
    "What is the primary safety concern with potassium-sparing diuretics, and when are they contraindicated?",
    "Hyperkalemia — avoid in severe renal dysfunction (eGFR <30 mL/min) and with concomitant ACE inhibitors or ARBs without close monitoring",
    "Impaired renal K+ excretion + reduced aldosterone (via RAAS blockade) = compounding K+ retention. Life-threatening hyperkalemia can occur rapidly in CKD patients.",
    True))

fc_rows.append(fc(S3,"medium",
    "How does eplerenone differ from spironolactone in its receptor selectivity and adverse effect profile?",
    "Eplerenone is more selective for mineralocorticoid receptors — does NOT bind progesterone or androgen receptors → less gynecomastia, breast tenderness, menstrual irregularity vs spironolactone",
    "Spironolactone''s antiandrogenic effects cause gynecomastia in men and menstrual irregularities in women. Eplerenone is preferred when these effects are problematic, though it is more expensive.",
    True))

fc_rows.append(fc(S3,"medium",
    "Why does spironolactone provide mortality benefit in heart failure beyond simple diuresis?",
    "Aldosterone causes cardiac fibrosis and ventricular remodeling — spironolactone blocks non-renal aldosterone receptors in the heart, preventing pathological remodeling and improving survival in HFrEF",
    "RALES trial showed 30% mortality reduction with low-dose spironolactone in HFrEF. EPHESUS trial showed similar benefit with eplerenone in post-MI ventricular dysfunction.",
    True))

fc_rows.append(fc(S3,"easy",
    "What is the maximum percentage of filtered sodium that can be affected by potassium-sparing diuretics, and why?",
    "Only 1-2% of filtered Na+ can be affected — because ENaC reabsorbs only 1-2% of filtered Na+ in the collecting duct",
    "This limits the maximum diuretic efficacy of K+-sparing drugs, making them weak diuretics. They are most valuable for their K+-retaining properties and non-diuretic (cardiac, hormonal) benefits.",
    True))

fc_rows.append(fc(S3,"hard",
    "Trimethoprim can cause hyperkalemia — explain the mechanism and relevance to drug interactions.",
    "Trimethoprim blocks ENaC in the collecting duct (like amiloride), reducing Na+ reabsorption and K+ secretion. Combined with other K+-sparing drugs or ACE inhibitors, hyperkalemia risk is additive.",
    "This trimethoprim-ENaC interaction is particularly dangerous in HIV patients (frequent trimethoprim use) with CKD on RAAS blockade. Potassium monitoring is essential when combining these agents.",
    True))

fc_rows.append(fc(S3,"medium",
    "In primary hyperaldosteronism (Conn syndrome), why is spironolactone a uniquely appropriate antihypertensive?",
    "Excess aldosterone drives Na+ retention and K+ wasting. Spironolactone directly antagonizes the aldosterone receptor, reversing both hypertension and hypokalemia simultaneously",
    "Spironolactone is both diagnostic (if BP and K+ normalize) and therapeutic in Conn syndrome. It is also used pre-operatively before adrenalectomy.",
    True))

fc_rows.append(fc(S3,"easy",
    "What fixed-dose combination combines HCTZ with triamterene, and what is its therapeutic rationale?",
    "Dyazide / Maxzide (HCTZ + triamterene) — HCTZ causes hypokalemia; triamterene retains K+; combined effect: diuresis with minimized K+ changes",
    "Combining a thiazide (or loop diuretic) that wastes K+ with a K+-sparing diuretic produces diuresis while maintaining K+ balance. This reduces need for K+ supplementation.",
    True))

fc_rows.append(fc(S3,"hard",
    "What is the difference between the onset of action of spironolactone vs amiloride/triamterene, and why?",
    "Spironolactone has a slow onset (2-4 days) because it must block aldosterone receptor-mediated protein synthesis; amiloride/triamterene have faster onset as direct ENaC blockers",
    "Spironolactone''s mechanism involves preventing aldosterone-stimulated gene expression and protein synthesis — a genomic mechanism with inherent delay. Direct ENaC blockade by amiloride is non-genomic and faster.",
    False))

fc_rows.append(fc(S3,"medium",
    "Spironolactone is used in polycystic ovary syndrome (PCOS). What pharmacological property enables this use?",
    "Spironolactone blocks androgen receptors in addition to aldosterone receptors — its antiandrogenic effect reduces hirsutism, acne, and androgenic alopecia in PCOS",
    "The same property that causes gynecomastia in men (anti-androgenic) is therapeutically useful in PCOS women. Spironolactone is used at 50-200 mg/day for androgen-dependent features of PCOS.",
    True))

# ─── SUBTOPIC 4: Osmotic Diuretics & CAIs ────────────────────────────────────
S4 = "Osmotic Diuretics and Carbonic Anhydrase Inhibitors"
fc_rows.append(fc(S4,"easy",
    "What is the mechanism of action of mannitol as an osmotic diuretic?",
    "Mannitol is freely filtered but not reabsorbed — retains water in the tubular lumen osmotically, increasing urine flow. Also draws water from intracellular compartments.",
    "The non-reabsorbable solute creates an osmotic gradient that obligates water to remain in the tubular lumen, carrying it to the urine. This also reduces intracellular volume, useful for cerebral edema.",
    True))

fc_rows.append(fc(S4,"easy",
    "State the primary clinical indications for mannitol.",
    "1. Cerebral edema / elevated ICP (head trauma, stroke); 2. Prophylaxis of acute renal failure in surgery/rhabdomyolysis; 3. Reduction of intraocular pressure",
    "For cerebral edema: draws fluid from brain parenchyma into vasculature. For AKI prophylaxis: maintains tubular flow, preventing cast precipitation. Must be given IV only.",
    True))

fc_rows.append(fc(S4,"medium",
    "Why is mannitol contraindicated in heart failure and pulmonary edema?",
    "Mannitol initially expands intravascular volume (by drawing intracellular fluid into circulation) — this volume expansion can precipitate acute pulmonary edema in patients with impaired cardiac function",
    "Mannitol''s initial action is to increase plasma volume before diuresis begins. In a patient who cannot handle increased preload, this can be catastrophic.",
    True))

fc_rows.append(fc(S4,"medium",
    "What acid-base disturbance does acetazolamide cause, and what is the therapeutic implication for its diuretic use?",
    "Hyperchloremic metabolic acidosis from urinary HCO3- wasting — limits long-term diuretic utility as the acidosis reduces acetazolamide''s own efficacy (self-limiting)",
    "As HCO3- is wasted, less remains in the filtrate for carbonic anhydrase to act on. The self-limiting nature of metabolic acidosis caps acetazolamide''s diuretic duration of action.",
    True))

fc_rows.append(fc(S4,"easy",
    "List 4 clinical uses of acetazolamide beyond diuresis.",
    "1. Open-angle glaucoma (↓ aqueous humor); 2. Altitude sickness prophylaxis/treatment; 3. Idiopathic intracranial hypertension; 4. Alkalinize urine (salicylate/phenobarbital overdose)",
    "Acetazolamide''s effects stem from carbonic anhydrase inhibition in multiple tissues: ciliary body (glaucoma), choroid plexus (ICP), and proximal tubule (urine alkalinization for drug elimination enhancement).",
    True))

fc_rows.append(fc(S4,"hard",
    "Why does acetazolamide help with altitude sickness, and what is the dosing strategy?",
    "Acetazolamide induces metabolic acidosis → stimulates ventilation via peripheral chemoreceptors → increased arterial PO2 at altitude. Typically started 24-48h BEFORE ascent.",
    "The carbonate in expired CO2 decreases; the metabolic acidosis partially compensates for the respiratory alkalosis of altitude, normalizing the ventilatory drive and improving oxygenation.",
    True))

fc_rows.append(fc(S4,"medium",
    "What distinguishes osmotic diuretics from other diuretic classes regarding their site of action in the nephron?",
    "Osmotic diuretics act primarily in the proximal convoluted tubule AND descending loop of Henle (water-permeable segments). Other diuretics act on specific later nephron segments.",
    "The descending limb is permeable to water but not solutes. Mannitol in the tubule retains water here by osmosis. In the proximal tubule, it reduces Na+ and water reabsorption.",
    False))

fc_rows.append(fc(S4,"easy",
    "What is the clinical danger of excessive mannitol administration?",
    "Hyperosmolarity (serum osmolality >320 mOsm/kg) → risk of AKI from renal tubular toxicity and paradoxical cerebral edema from rebound when hyperosmolarity is corrected",
    "Monitor serum Na+ and osmolality. An osmolal gap >10-20 mOsm/kg indicates significant mannitol accumulation. Stop if osmolality exceeds safe thresholds.",
    True))

fc_rows.append(fc(S4,"medium",
    "Acetazolamide is used in contraction alkalosis in heart failure. What is the mechanism?",
    "Inhibiting carbonic anhydrase → proximal tubule cannot reabsorb HCO3- → HCO3- wasting in urine → correction of metabolic alkalosis without requiring Na+/Cl- replacement",
    "Loop diuretics create Cl--depletion alkalosis that cannot self-correct without Cl- repletion. Acetazolamide bypasses this by directly eliminating excess HCO3- renally — useful when salt loading (for Cl- repletion) would worsen heart failure.",
    True))

fc_rows.append(fc(S4,"hard",
    "Why is carbonic anhydrase inhibition in the eye useful for treating glaucoma?",
    "Carbonic anhydrase in the ciliary body epithelium secretes HCO3- into aqueous humor (driving Na+ and water). Inhibiting CA reduces aqueous humor production, lowering IOP.",
    "Topical CAIs (dorzolamide, brinzolamide) are preferred for chronic glaucoma (fewer systemic side effects). Acetazolamide is used systemically for acute angle-closure glaucoma crisis.",
    True))

# ─── SUBTOPIC 5: ACE Inhibitors & ARBs in Renal Disease ─────────────────────
S5 = "ACE Inhibitors and ARBs in Renal Disease"
fc_rows.append(fc(S5,"easy",
    "How do ACE inhibitors reduce intraglomerular pressure in diabetic nephropathy?",
    "Angiotensin II preferentially constricts the efferent arteriole. ACE inhibitors reduce angiotensin II → efferent dilation → reduced glomerular capillary pressure → reduced proteinuria and hyperfiltration",
    "This hemodynamic renoprotection is independent of blood pressure lowering. ACE inhibitors are first-line in diabetic nephropathy even if blood pressure is normal.",
    True))

fc_rows.append(fc(S5,"medium",
    "Why is a 25-30% rise in serum creatinine acceptable (and even expected) after starting an ACE inhibitor in CKD?",
    "The rise reflects the intended reduction in glomerular capillary pressure (efferent dilation reduces filtration pressure). This is the mechanism of renoprotection — not nephrotoxicity.",
    "A >30% rise in creatinine or rise beyond 2 weeks suggests a different problem: bilateral renal artery stenosis, severe volume depletion, or concurrent NSAID use. The 25-30% rise should stabilize.",
    True))

fc_rows.append(fc(S5,"easy",
    "What is the mechanism of ACE inhibitor-induced cough, and what is the management?",
    "ACE inhibition prevents bradykinin degradation → bradykinin accumulates → stimulates cough receptors in the airways. Management: switch to an ARB (which does not inhibit ACE/bradykinin degradation)",
    "Occurs in 10-15% of patients (up to 40% in Asian populations). The cough is dry, persistent, and nocturnal. It resolves within 1-4 weeks of stopping the ACE inhibitor.",
    True))

fc_rows.append(fc(S5,"medium",
    "State the absolute contraindications to ACE inhibitors and ARBs.",
    "1. Pregnancy (fetopathy — renal tubular dysgenesis, oligohydramnios); 2. Bilateral renal artery stenosis; 3. History of angioedema from ACE inhibitors (for ACEi); 4. Hyperkalemia",
    "Pregnancy is a Category X/D contraindication — RAAS blockade causes fetal renal malformation. Bilateral RAS: blockade of compensatory efferent vasoconstriction precipitates acute renal failure.",
    True))

fc_rows.append(fc(S5,"hard",
    "Explain the mechanism of ACE inhibitor-induced angioedema and how it differs from allergic angioedema.",
    "Bradykinin accumulation increases vascular permeability → subcutaneous/submucosal edema. NOT IgE-mediated (no urticaria). Does not respond well to antihistamines; responds to icatibant (bradykinin B2 antagonist) or C1-esterase inhibitor",
    "Can occur at any time during therapy, even years after starting. Involves lips, tongue, throat, and larynx — life-threatening if airway involved. ARBs carry a small (~0.1-0.3%) cross-reactivity risk for angioedema.",
    True))

fc_rows.append(fc(S5,"medium",
    "Why is dual RAAS blockade (ACE inhibitor + ARB) no longer recommended?",
    "ONTARGET trial: dual blockade increased hypotension, hyperkalemia, and AKI without additional cardiovascular benefit. Risks outweigh benefits.",
    "Despite theoretical synergy (complementary RAAS blockade points), clinical outcomes were worse with the combination in the landmark ONTARGET trial. Current guidelines recommend monotherapy.",
    True))

fc_rows.append(fc(S5,"easy",
    "Name two key differences between ACE inhibitors and ARBs.",
    "1. ARBs do NOT inhibit bradykinin degradation → no cough or angioedema (rare); 2. ARBs block AT1 receptors directly → allow angiotensin II to act on AT2 receptors (potentially vasodilatory)",
    "Clinical implication: ARBs are used when ACE inhibitors cause intolerable cough. Both reduce proteinuria and BP; both are contraindicated in pregnancy and bilateral RAS.",
    True))

fc_rows.append(fc(S5,"hard",
    "A patient with diabetic nephropathy has proteinuria 2 g/day on maximum-dose ACE inhibitor. What additional renoprotective strategy can be added?",
    "SGLT2 inhibitors (empagliflozin, dapagliflozin) — shown in CREDENCE, DAPA-CKD, EMPA-KIDNEY trials to reduce CKD progression independent of glycemia; finerenone (non-steroidal MRA) is also now indicated",
    "SGLT2 inhibitors cause tubuloglomerular feedback-mediated afferent constriction, reducing glomerular pressure — complementary to ACE inhibitor''s efferent dilation. Finerenone reduces cardiac and renal events in CKD with T2DM.",
    True))

fc_rows.append(fc(S5,"medium",
    "What electrolyte abnormality do ACE inhibitors and ARBs most commonly cause, and which patients are at highest risk?",
    "Hyperkalemia — highest risk in patients with CKD, diabetes, or concurrent use of K+-sparing diuretics, NSAIDs, or trimethoprim",
    "Reduced aldosterone from RAAS blockade decreases K+ secretion in the collecting duct. Monitoring serum K+ within 1-2 weeks of initiating or dose-escalating RAAS blockers is essential.",
    True))

fc_rows.append(fc(S5,"easy",
    "What is the main reason ACE inhibitors are preferred over ARBs in heart failure with reduced ejection fraction?",
    "ACE inhibitors have more robust mortality evidence from landmark trials (CONSENSUS, SOLVD); ARBs are alternatives when ACE inhibitors are not tolerated (especially cough)",
    "Both classes are acceptable in HFrEF. Current guidelines indicate ACE inhibitors as first-line (or sacubitril/valsartan as upgrade for symptomatic patients). ARBs (e.g., valsartan) are used if ACE inhibitors not tolerated.",
    True))

# ─── SUBTOPIC 6: Drugs in CKD ────────────────────────────────────────────────
S6 = "Drugs in CKD"
fc_rows.append(fc(S6,"easy",
    "What is the general pharmacokinetic principle for dose adjustment of renally cleared drugs in CKD?",
    "Loading dose unchanged (depends on Vd); REDUCE maintenance dose and/or EXTEND dosing interval proportional to degree of renal impairment (based on CrCl/eGFR)",
    "Loading dose achieves therapeutic concentration quickly (Vd-dependent, not clearance-dependent). Maintenance dose maintains steady-state concentration — reduced in CKD to prevent accumulation.",
    True))

fc_rows.append(fc(S6,"medium",
    "What is the mechanism of NSAID nephrotoxicity, and which patients are at greatest risk?",
    "NSAIDs inhibit renal prostaglandins → loss of prostaglandin-mediated afferent arteriolar vasodilation → renal ischemia and AKI. Greatest risk: CKD, heart failure, cirrhosis, dehydration (reduced effective circulating volume states)",
    "In healthy people with normal perfusion, renal prostaglandins play a minor role. In low-perfusion states, they become critical for maintaining GFR — NSAIDs remove this compensatory mechanism.",
    True))

fc_rows.append(fc(S6,"easy",
    "At what eGFR threshold is metformin generally contraindicated, and what is the risk?",
    "Contraindicated when eGFR <30 mL/min; use with caution 30-45 mL/min. Risk: metformin accumulation → inhibition of mitochondrial complex I → lactic acidosis",
    "Metformin is renally eliminated. In CKD, it accumulates and predisposes to lactic acidosis — particularly when renal function deteriorates further (dehydration, contrast, surgery, illness).",
    True))

fc_rows.append(fc(S6,"medium",
    "What is contrast-induced nephropathy (CIN), and what are the two most effective prevention strategies?",
    "CIN = AKI within 48-72h of iodinated contrast from direct tubular toxicity + renal medullary vasoconstriction. Prevention: 1. IV isotonic saline hydration; 2. Minimize contrast volume (use low-osmolar or iso-osmolar contrast)",
    "N-acetylcysteine (NAC) has uncertain additional benefit beyond hydration. Stop nephrotoxic drugs (NSAIDs, aminoglycosides) before contrast. Delay contrast in patients with AKI.",
    True))

fc_rows.append(fc(S6,"hard",
    "Aminoglycoside pharmacodynamics: why does once-daily dosing reduce nephrotoxicity compared to multiple-daily dosing?",
    "Proximal tubular aminoglycoside uptake is SATURABLE. Once-daily dosing: high peak → better bacterial killing (concentration-dependent) + drug-free trough allows tubular cells to clear accumulated drug → less tubular accumulation and toxicity",
    "Multiple daily doses maintain constant low tubular concentrations, leading to continuous saturation and maximal accumulation. The drug-free trough in once-daily dosing is protective for the tubule.",
    True))

fc_rows.append(fc(S6,"medium",
    "What is the mechanism of lithium-induced nephrogenic diabetes insipidus, and how is it treated?",
    "Lithium enters collecting duct principal cells via ENaC → intracellularly inhibits adenylyl cyclase downstream of V2 receptor → blocks cAMP-mediated AQP-2 insertion → nephrogenic DI. Treatment: amiloride (blocks ENaC, reducing Li+ entry)",
    "Amiloride is preferred over thiazides for lithium-induced NDI because it reduces lithium entry into principal cells (via ENaC blockade), addressing the root cause. Also: indomethacin can help (but caution in CKD).",
    True))

fc_rows.append(fc(S6,"easy",
    "Name the safest analgesic in CKD and explain why.",
    "Acetaminophen (paracetamol) — hepatically metabolized; inactive metabolites are renally excreted but not nephrotoxic at therapeutic doses; does not affect renal blood flow",
    "NSAIDs are contraindicated in advanced CKD. Opioids require caution (active metabolites accumulate). Acetaminophen is generally safe at standard doses in CKD (though some metabolites retain in severe CKD — monitor for accumulation).",
    True))

fc_rows.append(fc(S6,"hard",
    "Which direct oral anticoagulant has the highest renal dependence, and how does this affect its use in CKD?",
    "Dabigatran (~80% renal elimination) — contraindicated when CrCl <15-30 mL/min (depending on indication). Apixaban (~27% renal) has lowest renal dependence and is relatively safest in CKD.",
    "Rivaroxaban (~33% renal) and edoxaban (~35% renal) are intermediate. Warfarin (hepatically metabolized, monitored by INR) is an alternative but complicated by CKD-related drug interactions and INR instability.",
    True))

fc_rows.append(fc(S6,"medium",
    "What toxicity does allopurinol cause in CKD, and what is the mechanism?",
    "Allopurinol''s active metabolite oxypurinol is renally cleared → accumulates in CKD → risk of severe adverse drug reactions: SJS/TEN, allopurinol hypersensitivity syndrome, bone marrow suppression. Dose reduction required based on eGFR.",
    "Oxypurinol''s half-life extends dramatically in CKD. The HLA-B*5801 allele (common in Asian populations) increases risk of severe cutaneous reactions from allopurinol in CKD.",
    True))

fc_rows.append(fc(S6,"easy",
    "Which drugs are classic causes of acute interstitial nephritis (AIN)?",
    "Beta-lactam antibiotics, NSAIDs, proton pump inhibitors (most common currently), sulfonamides, rifampin, allopurinol. Classic triad: fever + rash + eosinophilia (often absent in NSAID/PPI-AIN)",
    "AIN is an immune-mediated (T-cell) reaction causing interstitial inflammation. Biopsy shows interstitial infiltrate with eosinophils. Treatment: remove offending drug; corticosteroids in severe or progressive cases.",
    True))

# ─── SUBTOPIC 7: Phosphate Binders & ESAs ────────────────────────────────────
S7 = "Phosphate Binders and Erythropoiesis-Stimulating Agents"
fc_rows.append(fc(S7,"easy",
    "What are the three main classes of phosphate binders used in CKD, and when is each preferred?",
    "1. Calcium-based (calcium carbonate, acetate): inexpensive, but worsen hypercalcemia/vascular calcification; 2. Sevelamer (non-absorbed polymer): preferred with hypercalcemia or high CV risk; 3. Lanthanum carbonate: effective non-calcium alternative",
    "Aluminum hydroxide — highly effective but avoided long-term due to CNS and bone toxicity. Choose binder based on serum Ca, PTH, and vascular calcification status.",
    True))

fc_rows.append(fc(S7,"medium",
    "What is the mechanism of action of sevelamer, and what additional benefit does it offer?",
    "Sevelamer is a non-absorbed cationic polymer that binds dietary phosphate AND bile acids in the gut → reduces phosphate absorption AND LDL cholesterol (~15-30% reduction)",
    "This dual benefit may contribute to cardiovascular risk reduction in CKD patients who face high CVD burden. Sevelamer also does not contribute to calcium load or vascular calcification.",
    True))

fc_rows.append(fc(S7,"easy",
    "What is the target hemoglobin range when using ESAs in CKD, and why is over-correction harmful?",
    "Target Hb 10-11.5 g/dL. Over-correction to Hb >13 g/dL increases cardiovascular events (stroke, MI, thrombosis) — CHOIR and TREAT trials demonstrated this harm",
    "ESAs increase erythropoiesis but also cause dose-dependent hypertension and prothrombotic effects. Higher Hb targets worsen cardiovascular outcomes without quality of life benefit in CKD.",
    True))

fc_rows.append(fc(S7,"medium",
    "What is the most common cause of ESA hyporesponsiveness in CKD patients?",
    "Iron deficiency (absolute: ferritin <200 ng/mL, TSAT <20%; or functional: ferritin adequate but TSAT low) — limits erythropoiesis even with adequate EPO levels",
    "Always replete iron before and during ESA therapy. IV iron is preferred in hemodialysis patients (oral absorption is poor). Other causes: infection/inflammation (hepcidin excess), vitamin B12/folate deficiency, secondary hyperparathyroidism, aluminum toxicity.",
    True))

fc_rows.append(fc(S7,"hard",
    "What is pure red cell aplasia (PRCA) and how does it relate to ESA therapy?",
    "PRCA: severe anemia + absent erythroblasts on bone marrow biopsy. Caused by neutralizing antibodies against recombinant EPO that cross-react with endogenous EPO. Must stop ESA immediately; treat with immunosuppression.",
    "PRCA is rare but life-threatening. Was most associated with subcutaneous epoetin alfa (one brand with changed formulation). Diagnosis: bone marrow biopsy + anti-EPO antibody test. Darbepoetin alfa substitution worsens it (antibodies cross-react).",
    True))

fc_rows.append(fc(S7,"easy",
    "Describe the pathophysiology of secondary hyperparathyroidism in CKD in 4 steps.",
    "1. Reduced GFR → phosphate retention; 2. Elevated phosphate + reduced GFR → decreased calcitriol production (↓1α-hydroxylase); 3. Reduced calcitriol → hypocalcemia; 4. Hypocalcemia + low calcitriol → stimulate PTH secretion → secondary hyperparathyroidism",
    "FGF-23 also plays a role — it is the earliest marker of CKD-MBD, rising before phosphate and PTH become abnormal. FGF-23 suppresses 1α-hydroxylase, contributing to low calcitriol.",
    True))

fc_rows.append(fc(S7,"medium",
    "How does cinacalcet reduce PTH levels in secondary hyperparathyroidism?",
    "Cinacalcet is a calcimimetic — allosterically sensitizes the calcium-sensing receptor (CaSR) on parathyroid cells, making the receptor respond as if Ca2+ is higher → suppresses PTH release",
    "Cinacalcet lowers PTH, Ca2+, and phosphate simultaneously — beneficial in hyperparathyroidism with hypercalcemia. Main adverse effect: hypocalcemia (can be severe). Must monitor serum Ca2+ closely.",
    True))

fc_rows.append(fc(S7,"hard",
    "What is the role of active vitamin D analogs (calcitriol, paricalcitol) in CKD-MBD, and what complication limits their use?",
    "Replace deficient calcitriol to suppress PTH, enhance Ca2+ absorption, and maintain bone health. Limitation: can cause hypercalcemia and hyperphosphatemia → worsening vascular calcification",
    "Paricalcitol (synthetic vitamin D analog) may cause less hypercalcemia/hyperphosphatemia than calcitriol. Often combined with phosphate binders to control both phosphate and PTH simultaneously.",
    True))

fc_rows.append(fc(S7,"medium",
    "What should be monitored before and during IV iron therapy in CKD?",
    "Ferritin (iron stores), TSAT (transferrin saturation), CBC (hemoglobin response). Monitor for hypersensitivity reactions during infusion (especially first dose); have resuscitation equipment available.",
    "Target ferritin typically 200-500 ng/mL and TSAT 20-50% in dialysis patients. Avoid IV iron when active infection is present (iron fuels bacterial growth and may worsen sepsis).",
    True))

fc_rows.append(fc(S7,"easy",
    "Why is IV iron preferred over oral iron in hemodialysis patients?",
    "Uremic gut inflammation reduces oral iron absorption (~2-10%); IV iron bypasses gut, providing reliable and rapid repletion; hemodialysis itself causes chronic blood loss requiring ongoing iron supplementation",
    "Oral iron is used in predialysis CKD (non-dialysis CKD) where absorption is still partially intact. In dialysis patients, IV iron (iron sucrose, ferric gluconate) is standard of care.",
    True))

# ─── SUBTOPIC 8: Immunosuppressants in Transplant ────────────────────────────
S8 = "Immunosuppressants in Transplant"
fc_rows.append(fc(S8,"easy",
    "What is the mechanism of cyclosporine and tacrolimus, and why are they both called calcineurin inhibitors?",
    "Both bind intracellular immunophilins (cyclosporine → cyclophilin; tacrolimus → FKBP-12), forming complexes that inhibit calcineurin phosphatase → prevent NFAT dephosphorylation → block IL-2 transcription → T-cell suppression",
    "Calcineurin is the phosphatase that activates NFAT (nuclear factor of activated T cells). Blocking calcineurin = blocking IL-2 = blocking T-cell proliferation. Despite different binding proteins, both converge on the same target.",
    True))

fc_rows.append(fc(S8,"medium",
    "List 3 adverse effects unique to cyclosporine (not tacrolimus) and 2 unique to tacrolimus.",
    "Cyclosporine unique: hirsutism, gingival hyperplasia, hyperlipidemia (more). Tacrolimus unique: higher NODAT (new-onset diabetes), alopecia. Shared: nephrotoxicity, hypertension, hyperkalemia, neurotoxicity",
    "Exam pearl: if asked about which CNI causes more hirsutism/gum hyperplasia → cyclosporine. Which causes more diabetes → tacrolimus. Which causes more neurotoxicity → tacrolimus (tremor, seizures at high levels).",
    True))

fc_rows.append(fc(S8,"easy",
    "What is the mechanism of mycophenolate mofetil (MMF) and its selectivity for lymphocytes?",
    "MMF → mycophenolic acid (MPA) → inhibits IMPDH (inosine monophosphate dehydrogenase) → blocks de novo purine synthesis. Selective for lymphocytes because they CANNOT use the salvage purine pathway (unlike other cells)",
    "Other rapidly dividing cells can use the purine salvage pathway when de novo synthesis is blocked. Lymphocytes depend almost exclusively on de novo synthesis, making MMF relatively lymphocyte-selective.",
    True))

fc_rows.append(fc(S8,"medium",
    "What drug interactions with tacrolimus increase the risk of nephrotoxicity?",
    "CYP3A4 inhibitors increase tacrolimus levels: azole antifungals (fluconazole, voriconazole, itraconazole), macrolide antibiotics (clarithromycin, erythromycin), diltiazem, verapamil, grapefruit juice",
    "CYP3A4 inducers (rifampin, phenytoin, carbamazepine, St. John''s Wort) dramatically decrease tacrolimus/cyclosporine levels → risk of rejection. These interactions must be managed by TDM.",
    True))

fc_rows.append(fc(S8,"hard",
    "How does sirolimus (rapamycin) differ mechanistically from calcineurin inhibitors, and when is it used instead?",
    "Sirolimus binds FKBP-12 → complex inhibits mTOR → blocks G1-to-S phase progression in response to IL-2 (NOT IL-2 production). Used when calcineurin inhibitor nephrotoxicity is a major concern; deferred post-transplant due to wound healing impairment",
    "Key distinction: calcineurin inhibitors block IL-2 PRODUCTION; sirolimus blocks T-cell RESPONSE TO IL-2. Sirolimus also has antiproliferative uses (coronary stent coating, certain cancers). It does not cause nephrotoxicity via afferent vasoconstriction.",
    True))

fc_rows.append(fc(S8,"medium",
    "Why is therapeutic drug monitoring (TDM) critical for calcineurin inhibitors?",
    "Narrow therapeutic index: subtherapeutic levels → graft rejection; supratherapeutic levels → nephrotoxicity, neurotoxicity, infection, hypertension. Trough whole-blood levels guide dosing.",
    "Highly variable pharmacokinetics (CYP3A4 metabolism, P-gp efflux, food interactions, drug-drug interactions) make empiric dosing unreliable. Target trough levels differ by time post-transplant and immunological risk.",
    True))

fc_rows.append(fc(S8,"easy",
    "What is the mechanism and clinical significance of tacrolimus-induced NODAT?",
    "Tacrolimus inhibits calcineurin in pancreatic beta-cells → blocks NFAT-mediated insulin gene transcription → impaired insulin synthesis and secretion → NODAT. Concurrent corticosteroids amplify risk.",
    "NODAT affects ~20-30% of tacrolimus-treated transplant recipients. Management: reduce tacrolimus dose if possible, start antidiabetic therapy. Converting to cyclosporine may improve glycemia but risks other toxicities.",
    True))

fc_rows.append(fc(S8,"hard",
    "Explain the rationale for triple immunosuppression in renal transplantation (CNI + antimetabolite + corticosteroid).",
    "Each drug targets a different step of T-cell activation: CNI blocks IL-2 production (TCR signaling); antimetabolite (MMF/azathioprine) blocks lymphocyte proliferation; corticosteroids suppress antigen presentation and inflammation. Synergistic efficacy allows lower doses of each → reduced individual toxicities.",
    "Triple therapy also provides coverage against different rejection mechanisms. The corticosteroid is often tapered/withdrawn over months, leaving dual CNI + antimetabolite maintenance to minimize long-term metabolic complications.",
    True))

fc_rows.append(fc(S8,"medium",
    "What is the primary adverse effect requiring monitoring with mycophenolate mofetil?",
    "GI toxicity (diarrhea, nausea, abdominal pain) and bone marrow suppression (leukopenia, anemia) — CBC and dose reductions required if significant cytopenias develop",
    "MMF is also a potent teratogen — contraindicated in pregnancy. Female patients of reproductive age require two forms of contraception. Enteric-coated mycophenolate sodium has better GI tolerability.",
    True))

fc_rows.append(fc(S8,"easy",
    "Why are corticosteroids included in transplant immunosuppression despite their many adverse effects?",
    "Corticosteroids have rapid, potent, broad anti-inflammatory and immunosuppressive effects: suppress antigen presentation, reduce cytokine production, inhibit T-cell activation and migration. Essential for treating acute rejection episodes.",
    "Long-term steroid adverse effects (Cushingoid habitus, osteoporosis, hyperglycemia, hypertension, cataracts) drive steroid-minimization and steroid-withdrawal protocols — aiming to maintain immunosuppression with CNI + MMF while reducing steroid burden.",
    True))

# ─── SUBTOPIC 9: Urinary Tract Drugs ─────────────────────────────────────────
S9 = "Urinary Tract Drugs"
fc_rows.append(fc(S9,"easy",
    "What is the mechanism and indication of tamsulosin?",
    "Alpha-1A selective adrenergic receptor antagonist → relaxes prostate smooth muscle and bladder neck → reduces urethral resistance and improves urine flow in BPH (benign prostatic hyperplasia)",
    "Alpha-1A selectivity reduces orthostatic hypotension compared to non-selective alpha-blockers (doxazosin, terazosin). Tamsulosin is also used for ureteral stone passage (relaxes ureteral smooth muscle).",
    True))

fc_rows.append(fc(S9,"medium",
    "What is intraoperative floppy iris syndrome (IFIS) and which drug causes it?",
    "IFIS occurs during cataract surgery in patients on alpha-1 adrenergic antagonists (especially tamsulosin). Iris dilator muscle relaxation causes iris billowing, flopping, and prolapse through surgical incisions.",
    "Even if tamsulosin is stopped before surgery, IFIS can persist. Ophthalmologists must be informed pre-operatively. IFIS occurs because alpha-1A receptors in the iris dilator are blocked by the drug.",
    True))

fc_rows.append(fc(S9,"easy",
    "Compare the mechanisms of oxybutynin and mirabegron for overactive bladder.",
    "Oxybutynin: muscarinic (M3) receptor antagonist → blocks detrusor contractions. Mirabegron: beta-3 adrenergic agonist → relaxes detrusor → increases bladder capacity. Mirabegron avoids anticholinergic side effects.",
    "Mirabegron is preferred in elderly patients where anticholinergic side effects (confusion, dry mouth, constipation, urinary retention) are particularly harmful. Both drugs are effective for OAB urgency/frequency.",
    True))

fc_rows.append(fc(S9,"medium",
    "Compare finasteride and dutasteride for BPH treatment.",
    "Finasteride: inhibits 5-alpha reductase type 2 only (~70% DHT reduction). Dutasteride: inhibits types 1 AND 2 (~95% DHT reduction). Both require 3-6 months for clinical benefit. Dutasteride has ~5-week half-life vs ~6-hour finasteride.",
    "5-ARIs reduce prostate volume 20-30% over months, reducing urinary obstruction and long-term risk of acute urinary retention and need for surgery. Often combined with alpha-blockers for maximum efficacy in moderate-severe BPH.",
    True))

fc_rows.append(fc(S9,"hard",
    "Why is oxybutynin especially problematic in elderly patients, and what CNS adverse effect must be monitored?",
    "Oxybutynin readily crosses the blood-brain barrier and has high CNS anticholinergic activity → causes cognitive impairment, confusion, delirium, and memory problems in elderly. Avoid in patients with dementia or cognitive impairment.",
    "The Beers criteria list oxybutynin as a potentially inappropriate medication in older adults due to CNS anticholinergic effects. Tolterodine (extended-release), trospium, or mirabegron are preferred in the elderly.",
    True))

fc_rows.append(fc(S9,"easy",
    "Phenazopyridine: mechanism, indication, and key patient counseling point.",
    "Phenazopyridine: urinary analgesic (azo dye excreted in urine). Indication: symptomatic relief of UTI dysuria/urgency (not antibacterial). Counseling: causes orange-red discoloration of urine, tears, and contacts — harmless but expected.",
    "Phenazopyridine should be used for only 1-2 days while antibiotic therapy takes effect. It does NOT treat the underlying infection. Patients must be warned about discoloration to avoid unnecessary alarm.",
    True))

fc_rows.append(fc(S9,"medium",
    "What is the mechanism and indication for bethanechol?",
    "Bethanechol: direct M3 muscarinic agonist → stimulates detrusor contraction and bladder emptying. Indicated for non-obstructive urinary retention (post-operative bladder atony, neurogenic bladder with hypotonic detrusor).",
    "Contraindicated in obstructive uropathy (BPH with urinary outlet obstruction) — forcing bladder contraction against obstruction risks bladder rupture. Cholinergic side effects: sweating, bradycardia, bronchospasm.",
    True))

fc_rows.append(fc(S9,"hard",
    "How does intravesical onabotulinumtoxin A work for neurogenic detrusor overactivity?",
    "Botulinum toxin cleaves SNAP-25 protein in cholinergic nerve terminals of the detrusor → blocks ACh vesicle fusion and release → prevents detrusor contractions. Effect lasts 6-12 months.",
    "Injected cystoscopically into the detrusor (not the urethra). Risk: urinary retention requiring self-catheterization in ~20-30% of patients — must be counseled before treatment. Alternative for anticholinergic-refractory OAB.",
    True))

fc_rows.append(fc(S9,"medium",
    "What is the advantage of extended-release formulations of anticholinergic drugs (e.g., oxybutynin ER, tolterodine ER) for overactive bladder?",
    "ER formulations reduce peak plasma concentrations → reduce systemic anticholinergic side effects (dry mouth, constipation) while maintaining therapeutic bladder effects. Better tolerability → improved adherence.",
    "The immediate-release forms of these drugs produce high peak concentrations that cause more side effects. Transdermal oxybutynin further reduces first-pass liver metabolism and peak concentration, minimizing dry mouth.",
    True))

fc_rows.append(fc(S9,"easy",
    "What are the two main drug classes for BPH, and how do they differ in mechanism and onset?",
    "1. Alpha-1 antagonists (tamsulosin, doxazosin): relax smooth muscle → rapid symptom relief within days. 2. 5-alpha reductase inhibitors (finasteride, dutasteride): reduce prostate size via DHT blockade → benefit over months",
    "Combination therapy (alpha-blocker + 5-ARI) is used in larger prostates and severe symptoms. The MTOPS and CombAT trials support combination for reducing BPH progression and surgery risk.",
    True))

# ─── SUBTOPIC 10: Drug-Induced Nephrotoxicity ────────────────────────────────
S10 = "Drug-Induced Nephrotoxicity"
fc_rows.append(fc(S10,"easy",
    "What pattern of AKI do aminoglycosides cause, and how does once-daily dosing reduce toxicity?",
    "Non-oliguric acute tubular necrosis (proximal tubule). Once-daily dosing exploits saturable proximal tubule uptake — high peak for efficacy, drug-free trough allows cells to export accumulated drug → less nephrotoxicity",
    "Risk factors: pre-existing CKD, volume depletion, prolonged therapy, concurrent nephrotoxins. Monitor creatinine, urine output, and aminoglycoside trough levels.",
    True))

fc_rows.append(fc(S10,"medium",
    "What is the mechanism of cisplatin nephrotoxicity, and how is it prevented?",
    "Cisplatin accumulates in proximal tubule cells → DNA crosslinking → p53-mediated apoptosis + ROS generation → tubular cell death and AKI. Prevention: aggressive IV saline hydration (diuresis dilutes cisplatin in tubule), mannitol, amifostine.",
    "Cisplatin nephrotoxicity is the dose-limiting toxicity. Carboplatin is less nephrotoxic. Magnesium wasting is also common with cisplatin (inhibits Mg2+ reabsorption in the loop of Henle) — requires Mg2+ supplementation.",
    True))

fc_rows.append(fc(S10,"easy",
    "What is the mechanism and clinical presentation of NSAID-induced AKI?",
    "NSAIDs inhibit COX → reduce prostaglandin synthesis → afferent arteriolar vasoconstriction → reduced GFR. Presents as oliguria, rising creatinine, often functional/prerenal pattern (FENa <1%, concentrated urine) without tubular necrosis",
    "Reversible with NSAID discontinuation and volume restoration in most cases. High-risk: dehydration, CKD, heart failure, cirrhosis, advanced age, concurrent ACE inhibitors/ARBs.",
    True))

fc_rows.append(fc(S10,"medium",
    "What are the 2 mechanisms of contrast-induced nephropathy (CIN)?",
    "1. Direct tubular cytotoxicity from hyperosmolar/ionic contrast molecules; 2. Renal medullary vasoconstriction of vasa recta → medullary ischemia (medulla is already borderline hypoxic)",
    "The medullary thick ascending limb is exquisitely sensitive to ischemia (high metabolic demand, low oxygen environment). CIN risk reduced by hydration, using minimum contrast volume, iso-osmolar contrast, and avoiding concurrent nephrotoxins.",
    True))

fc_rows.append(fc(S10,"hard",
    "Describe the renal syndrome caused by tenofovir disoproxil fumarate (TDF) and how tenofovir alafenamide (TAF) reduces this risk.",
    "TDF causes Fanconi syndrome (proximal tubular dysfunction: phosphaturia, glucosuria, proteinuria, aminoaciduria) via mitochondrial toxicity. TAF is activated intracellularly in lymphocytes (not plasma) → lower plasma concentrations → less proximal tubule accumulation → ~90% less nephrotoxicity",
    "Full Fanconi syndrome includes hypophosphatemia (bone loss/osteomalacia), glucosuria (despite normal glucose), low molecular weight proteinuria. TAF represents a significant safety improvement for HIV/HBV treatment in patients with or at risk for CKD.",
    True))

fc_rows.append(fc(S10,"medium",
    "What is the mechanism of methotrexate nephrotoxicity and how is it prevented?",
    "Methotrexate and 7-OH-methotrexate precipitate as crystals in renal tubules at acidic urine pH → intratubular obstruction → AKI. Prevention: aggressive IV hydration + urinary alkalinization (sodium bicarbonate to pH >7) + leucovorin rescue",
    "High-dose methotrexate is used for lymphoma, osteosarcoma. Monitoring serum MTX levels is essential. Glucarpidase (carboxypeptidase G2) cleaves MTX in patients with toxic levels and AKI preventing normal renal elimination.",
    True))

fc_rows.append(fc(S10,"easy",
    "What are the two distinct renal toxicities of long-term lithium use?",
    "1. Nephrogenic diabetes insipidus (polyuria, polydipsia) — from inhibition of V2 receptor signaling reducing AQP-2 insertion; 2. Chronic tubulointerstitial nephritis → progressive CKD",
    "Both toxicities require regular monitoring of renal function, urine osmolality, and lithium levels. Amiloride helps NDI by blocking ENaC (route of lithium entry into collecting duct cells).",
    True))

fc_rows.append(fc(S10,"hard",
    "What is vancomycin nephrotoxicity, how is it potentiated, and how is it monitored?",
    "Vancomycin causes proximal tubular damage via oxidative stress. Potentiated by aminoglycosides (synergistic tubular toxicity), loop diuretics (volume depletion), and piperacillin-tazobactam (recent evidence of synergistic nephrotoxicity). Monitor AUC24/MIC ratio (preferred over trough-only monitoring).",
    "Traditional monitoring used trough levels alone (target 15-20 mg/L for serious infections). AUC-guided monitoring (target AUC24 400-600 mg·h/L) achieves therapeutic efficacy with less nephrotoxicity. Bayesian dosing software is used for AUC calculation.",
    True))

fc_rows.append(fc(S10,"medium",
    "What is acute interstitial nephritis (AIN) and how does it differ from acute tubular necrosis (ATN)?",
    "AIN: immune-mediated (T-cell) interstitial inflammation from drugs/infection. Features: eosinophilia (50%), rash (25%), sterile pyuria, white cell casts, eosinophiluria. ATN: direct tubular cell death from ischemia or toxins. Features: muddy-brown granular casts, minimal inflammation.",
    "AIN biopsy: interstitial lymphocytes/eosinophils, edema, tubulitis. ATN biopsy: necrotic tubular cells, granular casts. Treatment differs: AIN → remove offending drug ± corticosteroids; ATN → supportive care, remove nephrotoxin, address ischemia.",
    True))

fc_rows.append(fc(S10,"easy",
    "Which 4 drug classes/agents are most commonly associated with drug-induced nephrotoxicity that must be avoided in CKD?",
    "1. NSAIDs (afferent vasoconstriction); 2. Aminoglycosides (proximal tubular ATN); 3. Iodinated contrast (tubular toxicity + vasoconstriction); 4. Calcineurin inhibitors (cyclosporine, tacrolimus — afferent vasoconstriction + fibrosis)",
    "Also: cisplatin, tenofovir, methotrexate, vancomycin + aminoglycosides, lithium. In CKD, reduced reserve for nephrotoxicity means standard doses of these agents cause disproportionate injury.",
    True))

# Write SQL file
output_path = '/sessions/keen-ecstatic-cannon/mnt/Skoolie/scripts/med_renal_pharm_fc.sql'
with open(output_path, 'w') as f:
    f.write("-- Renal System Pharmacology Flashcards\n")
    f.write("-- 100 flashcards across 10 subtopics (10 each)\n")
    f.write("-- Source: Lippincott Illustrated Reviews Pharmacology 7th Ed\n\n")
    for row in fc_rows:
        f.write(row + "\n\n")

print(f"Written {len(fc_rows)} flashcard rows to {output_path}")
