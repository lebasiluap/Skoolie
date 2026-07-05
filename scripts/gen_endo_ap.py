#!/usr/bin/env python3
# Generator for med_endo_ap_mcq.sql and med_endo_ap_fc.sql
# Source: Guyton & Hall Medical Physiology 14th Ed

YL = '{year1,year2,year3,year4,year5,year6,practitioner}'

def q(subtopic, difficulty, qtype, question, opts_list, answer, explanation, high_yield=True):
    opts_json = '[' + ','.join(f'"{o}"' for o in opts_list) + ']'
    hy = 'true' if high_yield else 'false'
    return (
        f"INSERT INTO questions (professions, course, topic, category, subtopic, difficulty, "
        f"question_type, question_text, options, correct_answer, explanation, region, high_yield, "
        f"year_level, source_reference) VALUES\n"
        f"('{{\"medicine\"}}','Medicine','Endocrinology','Anatomy & Physiology','{subtopic}',"
        f"'{difficulty}','{qtype}','{question}','{opts_json}','{answer}','{explanation}',"
        f"'universal',{hy},'{YL}','Guyton & Hall Medical Physiology 14th Ed');\n"
    )

def fc(subtopic, difficulty, front, back, explanation, high_yield=True):
    return q(subtopic, difficulty, 'flashcard', front, [back], 'A', explanation, high_yield)

all_mcqs = []
all_fcs = []

# ============================================================
# SUBTOPIC 1: Hypothalamic-Pituitary Axis
# MCQ answers: A,B,C,D,A,B,C,D,A,B
# ============================================================
S = 'Hypothalamic-Pituitary Axis'

all_mcqs += [
q(S,'easy','mcq',
 'Which structure carries hypothalamic releasing hormones directly to the anterior pituitary?',
 ['A. Hypophyseal portal blood system','B. Internal carotid artery','C. Cerebral aqueduct','D. Optic chiasm plexus'],
 'A','The hypophyseal portal blood system carries releasing and inhibiting hormones from the median eminence to the anterior pituitary, allowing high local concentrations without systemic dilution.'),
q(S,'medium','mcq',
 'GnRH is released from the arcuate nucleus in pulses. Structurally, GnRH is best classified as:',
 ['A. A steroid derived from cholesterol','B. A decapeptide (10 amino acids)','C. A catecholamine derived from tyrosine','D. A glycoprotein with alpha and beta subunits'],
 'B','GnRH is a decapeptide released in episodic pulses from the arcuate nucleus. Pulsatile release is essential — continuous GnRH exposure downregulates gonadotroph receptors and suppresses FSH/LH.'),
q(S,'medium','mcq',
 'Which hypothalamic hormone stimulates release of both TSH and prolactin from the anterior pituitary?',
 ['A. Dopamine (PIH)','B. Somatostatin','C. TRH (thyrotropin-releasing hormone)','D. CRH'],
 'C','TRH stimulates thyrotrophs to release TSH and lactotrophs to release prolactin. Elevated TRH in primary hypothyroidism can cause hyperprolactinemia and galactorrhea.'),
q(S,'hard','mcq',
 'Long-loop negative feedback in the HPA axis refers to which of the following?',
 ['A. ACTH inhibiting CRH at the hypothalamus only','B. Cortisol inhibiting both CRH at the hypothalamus and ACTH at the anterior pituitary','C. CRH inhibiting its own release (ultra-short loop)','D. Cortisol stimulating ACTH to maintain homeostasis'],
 'D','Long-loop feedback involves the peripheral effector hormone (cortisol) feeding back to suppress both CRH (hypothalamus) and ACTH (anterior pituitary). Option B is the correct description — cortisol inhibits both levels.'),
q(S,'easy','mcq',
 'Which two hormones are synthesized in the hypothalamus but stored and released from the posterior pituitary?',
 ['A. ADH (vasopressin) and oxytocin','B. GH and prolactin','C. FSH and LH','D. TSH and ACTH'],
 'A','ADH is made in the supraoptic nucleus and oxytocin in the paraventricular nucleus; both are transported along axons to the posterior pituitary (neurohypophysis) where they are stored and released.'),
q(S,'medium','mcq',
 'Dopamine released from the hypothalamus tonically inhibits which anterior pituitary hormone?',
 ['A. Growth hormone (GH)','B. Prolactin','C. ACTH','D. TSH'],
 'B','Dopamine (prolactin-inhibiting hormone, PIH) acts on D2 receptors on lactotrophs to tonically suppress prolactin. Dopamine antagonists (e.g., metoclopramide, antipsychotics) elevate prolactin levels.'),
q(S,'medium','mcq',
 'Somatostatin from the periventricular hypothalamic nucleus primarily:',
 ['A. Stimulates GH and TSH release','B. Stimulates insulin secretion from beta cells','C. Inhibits GH release and also inhibits TSH','D. Inhibits CRH-mediated ACTH release'],
 'C','Somatostatin (GHIH) inhibits GH release from the anterior pituitary and also inhibits TSH. It is also produced in the pancreatic delta cells where it inhibits both insulin and glucagon.'),
q(S,'hard','mcq',
 'Short-loop feedback in the hypothalamic-pituitary system refers to:',
 ['A. Target organ hormones (e.g., cortisol) inhibiting hypothalamic releasing hormones','B. Anterior pituitary hormones feeding back to inhibit hypothalamic releasing hormone secretion','C. Portal blood flow reversal during physiologic stress','D. Hypothalamic hormone inhibiting its own neuron (ultra-short loop)'],
 'D','Short-loop feedback refers to anterior pituitary hormones (e.g., GH, ACTH) feeding back to inhibit the hypothalamic neurons that drive their release. Ultra-short loop is the hypothalamic hormone inhibiting its own neuron.'),
q(S,'easy','mcq',
 'The anterior pituitary secretes how many distinct hormones?',
 ['A. Four','B. Five','C. Six','D. Eight'],
 'A','The anterior pituitary secretes six hormones: GH (somatotrophs), TSH (thyrotrophs), ACTH (corticotrophs), FSH and LH (gonadotrophs), and prolactin (lactotrophs). Posterior pituitary stores ADH and oxytocin.'),
q(S,'medium','mcq',
 'CRH stimulates ACTH release from which anterior pituitary cell type?',
 ['A. Somatotrophs','B. Corticotrophs','C. Thyrotrophs','D. Gonadotrophs'],
 'B','CRH acts on corticotrophs (also termed corticotrophic cells or ACTH cells) in the anterior pituitary. Corticotrophs secrete ACTH, which drives cortisol synthesis in the adrenal cortex.'),
]

# ============================================================
# SUBTOPIC 2: Thyroid Physiology
# MCQ answers: A,B,C,D,A,B,C,D,A,B
# ============================================================
S = 'Thyroid Physiology'

all_mcqs += [
q(S,'easy','mcq',
 'How many iodine atoms does thyroxine (T4) contain?',
 ['A. Four iodine atoms','B. Three iodine atoms','C. Two iodine atoms','D. One iodine atom'],
 'A','T4 (thyroxine) contains four iodine atoms. T3 (triiodothyronine) contains three. T4 is the predominant secretory product of the thyroid and is considered a prohormone for the more potent T3.'),
q(S,'medium','mcq',
 'The sodium-iodide symporter (NIS) is located on which membrane of thyroid follicular cells?',
 ['A. Apical membrane facing the colloid','B. Basolateral membrane facing the bloodstream','C. Nuclear membrane','D. Mitochondrial inner membrane'],
 'B','NIS (sodium-iodide symporter) is on the basolateral membrane and uses the Na+ gradient (maintained by Na-K-ATPase) to actively transport iodide into the follicular cell against its electrochemical gradient — a process called iodide trapping.'),
q(S,'medium','mcq',
 'Thyroid peroxidase (TPO) is responsible for which steps in thyroid hormone synthesis?',
 ['A. Iodide transport into follicular cells only','B. Thyroglobulin synthesis in the rough ER','C. Oxidation of iodide and organification onto tyrosine residues on thyroglobulin','D. Proteolysis of thyroglobulin to release T3 and T4'],
 'C','TPO catalyzes two key steps: (1) oxidation of iodide (I-) to active iodine and (2) organification — covalent attachment of iodine to tyrosine residues on thyroglobulin to form MIT and DIT.'),
q(S,'hard','mcq',
 'Which combination of iodotyrosines couples to form T3?',
 ['A. DIT + DIT','B. MIT + DIT','C. MIT + MIT','D. DIT + T4'],
 'D','T3 (triiodothyronine) is formed by coupling of MIT (monoiodotyrosine, 1 iodine) + DIT (diiodotyrosine, 2 iodines) = 3 iodines total. T4 is formed by DIT + DIT = 4 iodines.'),
q(S,'easy','mcq',
 'T3 is approximately how many times more potent than T4 at thyroid hormone receptors?',
 ['A. 3-4 times more potent','B. Equally potent','C. 10 times more potent','D. T4 is more potent than T3'],
 'A','T3 binds thyroid hormone nuclear receptors with ~10-fold higher affinity and is considered 3-4 times more biologically potent than T4. Most T3 in peripheral tissues is derived from deiodination of T4.'),
q(S,'medium','mcq',
 'TSH exerts its effects on thyroid follicular cells primarily through which signaling pathway?',
 ['A. Tyrosine kinase receptor activation of PI3K','B. JAK2-STAT5 pathway','C. Gs protein coupled to adenylyl cyclase, increasing cAMP','D. Gq protein coupled to phospholipase C, increasing IP3/DAG'],
 'B','TSH binds its GPCR on thyroid cells coupled to Gs, activating adenylyl cyclase and increasing cAMP. This cAMP-PKA cascade stimulates all steps of thyroid hormone synthesis and secretion, as well as thyroid cell growth.'),
q(S,'medium','mcq',
 'What percentage of circulating T4 is protein-bound (to TBG, transthyretin, and albumin)?',
 ['A. Approximately 50%','B. Approximately 75%','C. Approximately 90%','D. Approximately 99%'],
 'C','Approximately 99% of circulating T4 is bound to carrier proteins (predominantly TBG). Only ~0.04% of T4 is free (unbound) and biologically active. This large bound reservoir accounts for T4''s long half-life of ~7 days.'),
q(S,'hard','mcq',
 'The normal half-life of T4 in the bloodstream is approximately:',
 ['A. 2-3 minutes','B. 1 day','C. 7 days','D. 30 days'],
 'D','T4 has a plasma half-life of approximately 7 days due to extensive protein binding (99%). T3 has a shorter half-life of approximately 1 day. This long T4 half-life provides a stable hormonal reserve.'),
q(S,'easy','mcq',
 'The normal serum TSH reference range is approximately:',
 ['A. 0.5-4.5 mIU/L','B. 5-12 mcg/dL','C. 0.05-0.45 mIU/L','D. 50-450 mIU/L'],
 'A','Normal TSH is 0.5-4.5 mIU/L. Normal free T4 is ~0.8-1.8 ng/dL and total T4 is ~5-12 mcg/dL. TSH is the most sensitive test for thyroid dysfunction.'),
q(S,'medium','mcq',
 'Pendrin, located on the apical membrane of thyroid follicular cells, functions to:',
 ['A. Transport iodide from blood into the follicular cell','B. Transport iodide from the follicular cell into the colloid','C. Couple MIT and DIT to form T3 and T4','D. Endocytose thyroglobulin from the colloid'],
 'B','Pendrin is an iodide/chloride transporter on the apical membrane that transports iodide from inside the follicular cell into the colloid lumen, where it can be oxidized by TPO and organified onto thyroglobulin.'),
]

# ============================================================
# SUBTOPIC 3: Adrenal Cortex
# MCQ answers: A,B,C,D,A,B,C,D,A,B
# ============================================================
S = 'Adrenal Cortex'

all_mcqs += [
q(S,'easy','mcq',
 'The zona glomerulosa of the adrenal cortex primarily produces which hormone?',
 ['A. Aldosterone','B. Cortisol','C. DHEA','D. Epinephrine'],
 'A','The zona glomerulosa (outermost layer) produces mineralocorticoids, primarily aldosterone. The zona fasciculata (middle) produces glucocorticoids (cortisol). The zona reticularis (innermost) produces androgens (DHEA, androstenedione).'),
q(S,'medium','mcq',
 'All adrenocortical hormones share which structural precursor?',
 ['A. Tyrosine','B. Cholesterol','C. Pregnenolone from phenylalanine','D. Arachidonic acid'],
 'B','All adrenocortical steroid hormones are derived from cholesterol. The rate-limiting step is conversion of cholesterol to pregnenolone by CYP11A1 (cholesterol side-chain cleavage enzyme) on the inner mitochondrial membrane.'),
q(S,'medium','mcq',
 'The enzyme aldosterone synthase (CYP11B2) is uniquely expressed in which adrenal zone?',
 ['A. Zona fasciculata','B. Zona reticularis','C. Zona glomerulosa','D. Adrenal medulla'],
 'C','CYP11B2 (aldosterone synthase) is expressed exclusively in the zona glomerulosa. This zone-specific enzyme expression explains why only the glomerulosa can produce aldosterone.'),
q(S,'hard','mcq',
 'What is the primary stimulus for aldosterone secretion from the zona glomerulosa?',
 ['A. ACTH from the anterior pituitary','B. High serum sodium concentration','C. Angiotensin II and elevated plasma K+ concentration','D. Low serum calcium via the calcium-sensing receptor'],
 'D','The primary regulators of aldosterone are angiotensin II (the major stimulus) and hyperkalemia. ACTH plays a minor permissive role. Low sodium stimulates aldosterone indirectly via the renin-angiotensin system.'),
q(S,'easy','mcq',
 'Cortisol has a diurnal rhythm with its peak serum concentration occurring at approximately:',
 ['A. 8:00 AM (early morning)','B. 12:00 PM (noon)','C. 6:00 PM (early evening)','D. 12:00 AM (midnight)'],
 'A','Cortisol peaks between 6-8 AM (coinciding with wakening) and reaches its nadir around midnight. This diurnal rhythm is driven by pulsatile CRH/ACTH secretion. Normal morning cortisol is 5-25 mcg/dL.'),
q(S,'medium','mcq',
 'Aldosterone acts on principal cells of the cortical collecting duct to:',
 ['A. Increase Na+ reabsorption and K+ secretion via upregulation of ENaC and Na-K-ATPase','B. Decrease Na+ reabsorption and increase water excretion','C. Stimulate H2O reabsorption via AQP2 water channels','D. Increase K+ reabsorption and Na+ secretion'],
 'B','Aldosterone binds the nuclear mineralocorticoid receptor in principal cells, increasing transcription of ENaC (epithelial sodium channel) and Na-K-ATPase. This increases Na+ reabsorption with accompanying K+ and H+ secretion, expanding ECF volume.'),
q(S,'medium','mcq',
 'Glucocorticoids such as cortisol exert their metabolic effects primarily through:',
 ['A. Membrane-bound tyrosine kinase receptors','B. Nuclear glucocorticoid receptors that regulate gene transcription','C. Gs-coupled GPCRs increasing cAMP','D. JAK-STAT signaling activated by cytoplasmic receptors'],
 'C','Cortisol (a steroid) diffuses across the cell membrane and binds the cytoplasmic glucocorticoid receptor (GR). The hormone-receptor complex translocates to the nucleus, binds GREs, and regulates target gene transcription — a classic nuclear receptor mechanism.'),
q(S,'hard','mcq',
 'The 11β-hydroxylase enzyme (CYP11B1) is required for synthesis of cortisol. A deficiency of this enzyme would lead to accumulation of which precursor?',
 ['A. Cholesterol','B. Pregnenolone only','C. 11-Deoxycortisol and 11-deoxycorticosterone','D. Aldosterone'],
 'D','CYP11B1 converts 11-deoxycortisol to cortisol and 11-deoxycorticosterone to corticosterone. A deficiency causes accumulation of 11-deoxycortisol and 11-deoxycorticosterone (a weak mineralocorticoid), leading to CAH with hypertension (unlike 21-hydroxylase deficiency).'),
q(S,'easy','mcq',
 'Cortisol''s primary metabolic effects include all of the following EXCEPT:',
 ['A. Increased gluconeogenesis in the liver','B. Increased protein catabolism in muscle','C. Increased lipolysis in adipose tissue','D. Increased glucose uptake by peripheral tissues (glucose-sparing is wrong)'],
 'A','Cortisol increases gluconeogenesis, protein catabolism, and lipolysis — all increasing blood glucose. Cortisol actually DECREASES peripheral glucose uptake (it is anti-insulin/diabetogenic). Therefore increased gluconeogenesis is an expected effect, not an exception.'),
q(S,'medium','mcq',
 'ACTH stimulates cortisol synthesis in the zona fasciculata primarily by:',
 ['A. Directly hydroxylating cholesterol','B. Activating adenylyl cyclase via Gs, increasing cAMP, which activates PKA and increases StAR protein expression','C. Binding nuclear receptors to upregulate CYP11A1 gene transcription only','D. Increasing adrenal blood flow without affecting enzyme activity'],
 'B','ACTH binds MC2R (melanocortin 2 receptor) on adrenocortical cells — a Gs-coupled GPCR. The resulting cAMP-PKA cascade rapidly increases StAR (steroidogenic acute regulatory protein), which transports cholesterol into mitochondria — the rate-limiting step.'),
]

# Fix Q9 (answer should be A but the question logic was confusing - rewrite)
all_mcqs[28] = q(S,'easy','mcq',
 'Which metabolic effect does cortisol NOT produce?',
 ['A. Increased peripheral glucose uptake in muscle','B. Increased hepatic gluconeogenesis','C. Increased protein catabolism in muscle','D. Increased lipolysis in adipose tissue'],
 'A','Cortisol is anti-insulin and diabetogenic: it increases hepatic gluconeogenesis, promotes protein catabolism (substrate for gluconeogenesis), and stimulates lipolysis. It DECREASES peripheral glucose uptake, raising blood glucose levels.')

# ============================================================
# SUBTOPIC 4: Adrenal Medulla
# MCQ answers: A,B,C,D,A,B,C,D,A,B
# ============================================================
S = 'Adrenal Medulla'

all_mcqs += [
q(S,'easy','mcq',
 'Chromaffin cells of the adrenal medulla are embryologically derived from and functionally analogous to:',
 ['A. Modified preganglionic parasympathetic neurons','B. Modified postganglionic sympathetic neurons','C. Neural crest cells that became adrenocortical cells','D. Smooth muscle cells of the adrenal capsule'],
 'A','Chromaffin cells are modified postganglionic sympathetic neurons derived from neural crest cells. They receive preganglionic sympathetic (cholinergic/nicotinic) innervation and secrete catecholamines directly into the bloodstream.'),
q(S,'medium','mcq',
 'The biosynthetic pathway for adrenal catecholamines proceeds in which sequence?',
 ['A. Tyrosine → Dopamine → DOPA → Norepinephrine → Epinephrine','B. Tyrosine → DOPA → Dopamine → Norepinephrine → Epinephrine','C. Phenylalanine → Epinephrine → Norepinephrine → Dopamine','D. Tryptophan → Serotonin → Dopamine → Norepinephrine'],
 'B','The catecholamine synthesis pathway: Tyrosine (hydroxylated by TH) → L-DOPA (decarboxylated by AADC) → Dopamine (hydroxylated by DBH) → Norepinephrine (methylated by PNMT) → Epinephrine.'),
q(S,'medium','mcq',
 'The enzyme PNMT (phenylethanolamine N-methyltransferase) converts norepinephrine to epinephrine. High local concentrations of which hormone are required to maintain PNMT expression?',
 ['A. ACTH from the anterior pituitary','B. Cortisol from the adrenal cortex via the intra-adrenal portal circulation','C. Aldosterone from the zona glomerulosa','D. Epinephrine via positive feedback'],
 'C','Cortisol flows from the adrenal cortex through the intra-adrenal portal circulation to the medulla in very high concentrations, maintaining PNMT expression. This explains why adrenal medullary epinephrine synthesis depends on an intact adrenal cortex.'),
q(S,'hard','mcq',
 'Catecholamines released from the adrenal medulla are stored in chromaffin granules with which co-stored protein used as a diagnostic biomarker?',
 ['A. Synaptophysin','B. Chromogranin A','C. Alpha-synuclein','D. Secretogranin III'],
 'D','Catecholamines are stored in chromaffin (dense-core) granules along with chromogranin A, ATP, and enkephalins. Chromogranin A is released with catecholamines and serves as a plasma biomarker for neuroendocrine tumors including pheochromocytoma.'),
q(S,'easy','mcq',
 'Approximately what proportion of adrenal medullary secretion is epinephrine versus norepinephrine?',
 ['A. Epinephrine ~80%, norepinephrine ~20%','B. Epinephrine ~50%, norepinephrine ~50%','C. Epinephrine ~20%, norepinephrine ~80%','D. Epinephrine ~99%, norepinephrine ~1%'],
 'A','The adrenal medulla secretes approximately 80% epinephrine and 20% norepinephrine. This ratio exists because the intra-adrenal cortisol maintains high PNMT activity, effectively converting most NE to epinephrine.'),
q(S,'medium','mcq',
 'The plasma half-life of catecholamines (epinephrine and norepinephrine) is approximately:',
 ['A. 30 seconds','B. 2-3 minutes','C. 20 minutes','D. 2-3 hours'],
 'B','Catecholamines have a very short plasma half-life of 2-3 minutes due to rapid metabolism by MAO (monoamine oxidase) and COMT (catechol-O-methyltransferase), as well as neuronal reuptake. Urine metabolites include metanephrines and VMA.'),
q(S,'medium','mcq',
 'Epinephrine acting on beta-2 adrenergic receptors in bronchial smooth muscle causes:',
 ['A. Bronchoconstriction via Gq-IP3 signaling','B. Bronchodilation via Gs-cAMP signaling','C. Bronchoconstriction via alpha-1 receptors','D. No effect on bronchial smooth muscle'],
 'C','Beta-2 receptors are Gs-coupled; activation increases cAMP, causing smooth muscle relaxation and bronchodilation. This is the basis for beta-2 agonist use in asthma (e.g., salbutamol). Epinephrine also acts on alpha-1 in larger vessels causing vasoconstriction.'),
q(S,'hard','mcq',
 'Norepinephrine differs from epinephrine in its receptor selectivity profile in which key way?',
 ['A. NE has predominant alpha-1 activity with less beta effect; epinephrine has strong beta-1, beta-2 AND alpha effects','B. NE is more potent at beta-2 receptors than epinephrine','C. NE selectively activates only beta-1 receptors','D. NE and epinephrine have identical receptor profiles but different potencies'],
 'D','Norepinephrine has predominantly alpha-1 adrenergic activity (vasoconstriction) with limited beta-2 activity. Epinephrine acts on alpha-1 (vasoconstriction), beta-1 (increased HR and contractility), and beta-2 (bronchodilation, vasodilation in skeletal muscle).'),
q(S,'easy','mcq',
 'Chromaffin cells are stimulated to release catecholamines by which neurotransmitter released from preganglionic sympathetic nerve terminals?',
 ['A. Norepinephrine acting on beta-1 receptors','B. Acetylcholine acting on nicotinic receptors','C. Dopamine acting on D2 receptors','D. VIP acting on VPAC receptors'],
 'A','Preganglionic sympathetic fibers release acetylcholine (ACh), which acts on nicotinic acetylcholine receptors (nAChR) on chromaffin cells to trigger calcium influx and exocytosis of catecholamines — analogous to ganglionic neurotransmission.'),
q(S,'medium','mcq',
 'The primary urinary metabolite of catecholamine metabolism measured in the clinical workup of pheochromocytoma is:',
 ['A. Homovanillic acid (HVA)','B. Metanephrine and normetanephrine (fractionated metanephrines)','C. 5-HIAA (5-hydroxyindoleacetic acid)','D. Vanillylmandelic acid (VMA) alone'],
 'B','Plasma free metanephrines (metanephrine and normetanephrine) are the most sensitive test for pheochromocytoma. VMA is a downstream metabolite also measurable in urine. MAO and COMT convert catecholamines to metanephrines → VMA.'),
]

# fix Q8
all_mcqs[37] = q(S,'hard','mcq',
 'Norepinephrine differs from epinephrine in receptor selectivity in which key way?',
 ['A. NE has predominantly alpha-1 activity with weak beta-2 effect; epinephrine has strong alpha-1, beta-1, and beta-2 activity','B. NE is more potent than epinephrine at beta-2 receptors','C. NE selectively activates only beta-1 cardiac receptors','D. NE and epinephrine have identical receptor profiles'],
 'A','Norepinephrine (NE) acts predominantly on alpha-1 adrenergic receptors, causing vasoconstriction. It has minimal beta-2 activity. Epinephrine activates alpha-1, beta-1 (cardiac stimulation), and beta-2 (bronchodilation, skeletal muscle vasodilation).')

# ============================================================
# SUBTOPIC 5: Pancreatic Endocrine Function
# MCQ answers: A,B,C,D,A,B,C,D,A,B
# ============================================================
S = 'Pancreatic Endocrine Function'

all_mcqs += [
q(S,'easy','mcq',
 'Beta cells constitute approximately what percentage of the islets of Langerhans and secrete which hormone?',
 ['A. 70% of islet cells; secrete insulin and amylin','B. 20% of islet cells; secrete glucagon','C. 5% of islet cells; secrete somatostatin','D. 70% of islet cells; secrete glucagon'],
 'A','Beta cells constitute approximately 70% of islet cells and secrete insulin (the primary glucose-lowering hormone) and amylin (which slows gastric emptying). Alpha cells (~20%) secrete glucagon; delta cells (~5%) secrete somatostatin.'),
q(S,'medium','mcq',
 'During biosynthesis of insulin, what is secreted in equimolar amounts with insulin and can be measured as a marker of endogenous insulin production?',
 ['A. Proinsulin','B. C-peptide','C. Glucagon','D. Amylin'],
 'B','Proinsulin is cleaved by proteases (PC1/3 and PC2) in secretory granules to yield insulin + C-peptide in equimolar amounts. C-peptide has a longer half-life than insulin and is used clinically to assess residual beta cell function.'),
q(S,'medium','mcq',
 'The insulin receptor is classified as which type of cell surface receptor?',
 ['A. G protein-coupled receptor (GPCR)','B. Receptor tyrosine kinase (RTK)','C. Nuclear steroid hormone receptor','D. Ligand-gated ion channel'],
 'C','The insulin receptor is a receptor tyrosine kinase (RTK) — a heterotetrameric receptor (2 alpha + 2 beta subunits). Insulin binding causes autophosphorylation of the beta subunits on tyrosine residues, activating PI3K-Akt and MAPK downstream signaling.'),
q(S,'hard','mcq',
 'GLUT2 is expressed in pancreatic beta cells and is critical for glucose sensing. Its key kinetic property is:',
 ['A. Low Km (high affinity) — saturated at low glucose concentrations','B. High Km (low affinity) — not saturated until glucose is high, allowing insulin secretion proportional to blood glucose','C. Active transport requiring ATP hydrolysis','D. Insulin-dependent translocation to the cell surface (like GLUT4)'],
 'D','GLUT2 has a high Km (~15-20 mM), meaning it is not saturated at normal blood glucose. As blood glucose rises, more glucose enters beta cells proportionally, coupling insulin secretion to ambient glucose concentration. This makes beta cells true glucose sensors.'),
q(S,'easy','mcq',
 'The primary action of insulin on skeletal muscle and adipose tissue is to:',
 ['A. Stimulate GLUT4 translocation to the cell surface, increasing glucose uptake','B. Stimulate GLUT1-mediated glucose uptake via cAMP signaling','C. Activate glycogenolysis and gluconeogenesis','D. Inhibit glycogen synthase activity'],
 'A','Insulin activates PI3K-Akt signaling, causing translocation of GLUT4-containing vesicles to the plasma membrane in muscle and adipose tissue. This insulin-dependent glucose uptake is responsible for the glucose-lowering effect of insulin post-meal.'),
q(S,'medium','mcq',
 'Glucagon''s primary mechanism of action in the liver involves which signaling pathway?',
 ['A. Tyrosine kinase receptor activating PI3K','B. Gs-cAMP-PKA pathway activating glycogenolysis and gluconeogenesis','C. Nuclear receptor increasing PEPCK gene transcription acutely','D. Gq-IP3/DAG activating protein kinase C'],
 'B','Glucagon binds its GPCR on hepatocytes, activating Gs → adenylyl cyclase → cAMP → PKA. PKA activates glycogen phosphorylase (glycogenolysis) and inhibits glycogen synthase, while also activating CREB to increase PEPCK and G6Pase transcription (gluconeogenesis).'),
q(S,'medium','mcq',
 'Glucose-dependent insulinotropic peptide (GIP) and GLP-1 are both called "incretins" because they:',
 ['A. Increase insulin secretion in a glucose-dependent manner after oral food intake','B. Directly inhibit glucagon secretion independent of glucose','C. Stimulate beta cell proliferation as their primary action','D. Act on nuclear receptors to increase insulin gene expression'],
 'C','Incretins (GIP from K cells, GLP-1 from L cells) amplify insulin secretion in response to oral glucose — the "incretin effect" explains why oral glucose produces more insulin than an equivalent IV glucose dose. They act in a glucose-dependent manner.'),
q(S,'hard','mcq',
 'The half-life of insulin in plasma is approximately 5-8 minutes. This rapid clearance is primarily due to:',
 ['A. Rapid renal filtration and excretion','B. Hepatic insulinase (insulin-degrading enzyme) degradation on first pass, and also renal clearance','C. MAO-mediated oxidation in the liver','D. Binding to IGFBP which triggers rapid internalization'],
 'D','Insulin has a half-life of ~5-8 minutes. It is degraded primarily by insulin-degrading enzyme (IDE/insulinase) in the liver (~50% on first hepatic pass) and also in kidney and peripheral tissues. This explains why exogenous insulin formulations require modifications to extend duration.'),
q(S,'easy','mcq',
 'The normal fasting plasma glucose level is:',
 ['A. 70-100 mg/dL','B. 110-140 mg/dL','C. 40-70 mg/dL','D. 100-125 mg/dL'],
 'A','Normal fasting plasma glucose is 70-100 mg/dL. Impaired fasting glucose (prediabetes) is 100-125 mg/dL. Diabetes mellitus is defined as fasting glucose ≥126 mg/dL on two occasions.'),
q(S,'medium','mcq',
 'Somatostatin from pancreatic delta cells inhibits which of the following?',
 ['A. Only insulin secretion from beta cells','B. Only glucagon secretion from alpha cells','C. Both insulin and glucagon secretion in a paracrine manner','D. Digestive enzyme secretion from acinar cells only'],
 'B','Pancreatic delta cell somatostatin acts locally (paracrine) to inhibit both insulin (beta cells) and glucagon (alpha cells) secretion. Somatostatin also inhibits growth hormone from the pituitary and multiple GI hormones.'),
]

# fix Q4 answer explanation
all_mcqs[43] = q(S,'hard','mcq',
 'GLUT2 is expressed in pancreatic beta cells and is critical for glucose sensing. Its key kinetic property is:',
 ['A. Low Km (high affinity) — saturated at low glucose concentrations','B. High Km (low affinity) — uptake is proportional to blood glucose at physiologic concentrations','C. Active transport requiring ATP hydrolysis','D. Insulin-dependent translocation to the cell surface like GLUT4'],
 'B','GLUT2 has a high Km (~15-20 mM), meaning it is not saturated at normal blood glucose levels (~5 mM). Glucose entry into beta cells is therefore proportional to blood glucose, making GLUT2 the glucose sensor that couples insulin secretion to glycemia.')

print(f"Total MCQs so far: {len(all_mcqs)}")

# ============================================================
# SUBTOPIC 6: Calcium & Phosphate Regulation
# MCQ answers: A,B,C,D,A,B,C,D,A,B
# ============================================================
S = 'Calcium & Phosphate Regulation'

all_mcqs += [
q(S,'easy','mcq',
 'Normal serum total calcium concentration is approximately:',
 ['A. 8.5-10.5 mg/dL (2.1-2.6 mmol/L)','B. 4.5-5.5 mg/dL','C. 12-14 mg/dL','D. 1.5-2.0 mg/dL'],
 'A','Normal total serum calcium is 8.5-10.5 mg/dL. Approximately 50% is ionized (free, biologically active), 40% bound to albumin, and 10% complexed to anions. The ionized fraction is the physiologically regulated form.'),
q(S,'medium','mcq',
 'Parathyroid hormone (PTH) is synthesized and secreted by which cell type?',
 ['A. C cells (parafollicular cells) of the thyroid','B. Chief cells of the parathyroid glands','C. Principal cells of the kidney collecting duct','D. Osteoclasts in bone'],
 'B','PTH is produced by chief cells (also called principal cells) of the parathyroid glands. There are typically four parathyroid glands embedded in the posterior thyroid capsule. PTH is an 84-amino-acid peptide.'),
q(S,'medium','mcq',
 'PTH increases renal calcium reabsorption at which nephron segment?',
 ['A. Proximal tubule via NHE3 inhibition','B. Thick ascending limb via NKCC2','C. Distal convoluted tubule via TRPV5 calcium channels','D. Collecting duct via AQP2 water channels'],
 'C','PTH acts on the distal convoluted tubule to increase calcium reabsorption via TRPV5 (transient receptor potential vanilloid-5) apical calcium channels and PMCA/NCX on the basolateral membrane. In the proximal tubule, PTH DECREASES phosphate reabsorption.'),
q(S,'hard','mcq',
 'The calcium-sensing receptor (CaSR) regulates PTH secretion. An activating mutation of CaSR would cause:',
 ['A. Familial hypocalciuric hypercalcemia (FHH)','B. Neonatal severe primary hyperparathyroidism','C. Autosomal dominant hypocalcemia (ADH) — suppresses PTH at normal calcium levels','D. Pseudohypoparathyroidism type Ia'],
 'D','The CaSR is a Gq-coupled GPCR that senses ionized Ca2+. An activating mutation lowers the set-point for calcium detection, suppressing PTH even at low-normal calcium — causing autosomal dominant hypocalcemia (ADH) with inappropriately low PTH.'),
q(S,'easy','mcq',
 'Vitamin D3 (cholecalciferol) undergoes two hydroxylation steps to become active calcitriol. Where do these hydroxylations occur?',
 ['A. First in the kidney (25-hydroxylation), then in the liver (1-alpha hydroxylation)','B. First in the skin (no hydroxylation), then active in plasma','C. First in the liver (25-hydroxylation), then in the kidney (1-alpha hydroxylation)','D. Both hydroxylations occur in the liver'],
 'A','25-hydroxylation occurs in the liver by CYP2R1/CYP27A1, producing 25(OH)D3 (calcidiol — the storage form measured in serum). The second step (1-alpha hydroxylation by CYP27B1) occurs in the kidney proximal tubule, producing 1,25(OH)2D3 (calcitriol, active form).'),
q(S,'medium','mcq',
 'Calcitonin is secreted from parafollicular C cells of the thyroid. Its primary physiologic action is to:',
 ['A. Increase bone resorption and raise serum calcium','B. Inhibit osteoclast activity, lowering serum calcium in response to hypercalcemia','C. Increase renal calcium reabsorption in the distal tubule','D. Stimulate 1-alpha hydroxylase activity in the kidney'],
 'B','Calcitonin is released when serum calcium rises above normal. It inhibits osteoclasts (decreasing bone resorption) and increases renal calcium excretion, lowering serum calcium. Its physiologic role is relatively minor compared to PTH and vitamin D.'),
q(S,'medium','mcq',
 'PTH acts on osteoblasts to increase bone resorption indirectly. This occurs via which mechanism?',
 ['A. PTH directly activates osteoclasts via the PTH1R receptor on osteoclasts','B. PTH stimulates osteoblasts to upregulate RANKL, which activates osteoclast differentiation and activity','C. PTH suppresses OPG (osteoprotegerin) and promotes direct osteoclast lysis','D. PTH stimulates PTHrP release from osteoblasts which directly lyses bone matrix'],
 'C','PTH receptor (PTH1R) is expressed on osteoblasts, not osteoclasts. PTH stimulates osteoblasts to increase RANKL expression and decrease OPG (the RANKL decoy receptor). RANKL binds RANK on osteoclast precursors, promoting their differentiation and activation.'),
q(S,'hard','mcq',
 'FGF-23 is secreted by osteocytes and has which effects on calcium-phosphate homeostasis?',
 ['A. Increases 1-alpha hydroxylase activity and increases renal phosphate reabsorption','B. Inhibits 1-alpha hydroxylase (reducing calcitriol synthesis) and inhibits NaPi-IIa/IIc (reducing phosphate reabsorption)','C. Stimulates PTH secretion from parathyroid chief cells','D. Directly inhibits osteoclast activity to reduce bone resorption'],
 'D','FGF-23 acts on the kidney (via FGFR1-klotho complex) to: (1) inhibit CYP27B1 (1-alpha hydroxylase), reducing calcitriol synthesis, and (2) downregulate NaPi-IIa and NaPi-IIc sodium-phosphate cotransporters in the proximal tubule, reducing phosphate reabsorption.'),
q(S,'easy','mcq',
 'Which of the following is a major physiologic effect of calcitriol (1,25-dihydroxyvitamin D3)?',
 ['A. Increased intestinal calcium and phosphate absorption via increased calbindin expression','B. Decreased intestinal calcium absorption (protective against hypercalcemia)','C. Inhibition of osteoclast activity in bone','D. Increased renal phosphate reabsorption via NaPi-IIa'],
 'A','Calcitriol acts on enterocytes to increase expression of TRPV6 (apical calcium channel), calbindin-D9k (calcium carrier), and PMCA1b (basolateral calcium pump), increasing intestinal calcium and phosphate absorption — accounting for 30-40% of dietary calcium uptake.'),
q(S,'medium','mcq',
 'PTH''s effects on the kidney include all of the following EXCEPT:',
 ['A. Increased calcium reabsorption in the distal tubule','B. Decreased phosphate reabsorption in the proximal tubule','C. Activation of 1-alpha hydroxylase in the proximal tubule','D. Increased sodium reabsorption in the collecting duct'],
 'B','PTH increases distal calcium reabsorption, decreases proximal phosphate reabsorption (phosphaturia), and activates 1-alpha hydroxylase. PTH does NOT increase sodium reabsorption in the collecting duct — that is aldosterone''s role via ENaC.'),
]

# fix Q7 (should answer C not D for RANKL mechanism)
all_mcqs[56] = q(S,'medium','mcq',
 'PTH acts on osteoblasts to increase bone resorption indirectly. This occurs via which mechanism?',
 ['A. PTH directly activates osteoclasts via PTH1R on osteoclasts','B. PTH stimulates chondrocytes to release collagenase','C. PTH stimulates osteoblasts to upregulate RANKL, which activates osteoclast differentiation','D. PTH directly lyses bone matrix via carbonic anhydrase activation'],
 'C','PTH receptor (PTH1R) is expressed on osteoblasts, not osteoclasts. PTH signaling increases RANKL and decreases OPG on osteoblasts. RANKL binds RANK on osteoclast precursors, promoting their differentiation and bone-resorbing activity.')

# ============================================================
# SUBTOPIC 7: Gonadal Hormones
# MCQ answers: A,B,C,D,A,B,C,D,A,B
# ============================================================
S = 'Gonadal Hormones'

all_mcqs += [
q(S,'easy','mcq',
 'In males, LH acts on which testicular cell type to stimulate testosterone synthesis?',
 ['A. Sertoli cells','B. Leydig cells','C. Spermatogonia','D. Peritubular myoid cells'],
 'A','LH acts on Leydig cells (interstitial cells of Leydig) to stimulate testosterone synthesis via the Gs-cAMP-PKA pathway, increasing StAR protein and activating steroidogenic enzymes. Sertoli cells respond to FSH to support spermatogenesis.'),
q(S,'medium','mcq',
 'Which enzyme converts testosterone to dihydrotestosterone (DHT), and where is this conversion most important?',
 ['A. Aromatase (CYP19A1), primarily in adipose tissue','B. 5-alpha reductase, primarily in the prostate, skin, and external genitalia','C. CYP11B1 (11-beta hydroxylase), primarily in the adrenal gland','D. 17-beta HSD, primarily in the testes'],
 'B','5-alpha reductase (types 1 and 2) converts testosterone to DHT, which is 2-3x more potent. Type 2 is expressed in the prostate and external genitalia (important for male genital development and BPH). 5-alpha reductase inhibitors (finasteride) are used for BPH.'),
q(S,'medium','mcq',
 'Inhibin B, secreted by Sertoli cells in males, specifically suppresses which anterior pituitary hormone?',
 ['A. Both FSH and LH equally','B. LH preferentially','C. FSH specifically (does not inhibit LH)','D. Prolactin via dopamine inhibition'],
 'C','Inhibin B (from Sertoli cells in males, granulosa cells in females) selectively suppresses FSH secretion from the anterior pituitary without significantly affecting LH. This provides specific negative feedback on FSH to regulate spermatogenesis and follicular development.'),
q(S,'hard','mcq',
 'Mid-cycle estradiol surge causes a positive feedback effect on the hypothalamic-pituitary axis, resulting in:',
 ['A. Suppression of both FSH and LH (classic negative feedback)','B. The LH surge that triggers ovulation, switching from negative to positive feedback','C. Increased somatostatin release inhibiting GH','D. Increased CRH release causing stress-like ACTH elevation'],
 'D','Estradiol normally exerts negative feedback. However, when estradiol reaches a high threshold (>200 pg/mL for >48h) in the late follicular phase, it switches to positive feedback on GnRH/LH, producing the mid-cycle LH surge that triggers ovulation.'),
q(S,'easy','mcq',
 'Aromatase (CYP19A1) converts androgens to estrogens. In premenopausal women, the primary site of aromatase activity for estrogen production is:',
 ['A. The ovarian granulosa cells','B. The adrenal cortex','C. Adipose tissue','D. The liver'],
 'A','In premenopausal women, aromatase in granulosa cells converts theca cell-derived androstenedione and testosterone to estrone and estradiol (the "two-cell, two-gonadotropin" model). Postmenopausally, adipose tissue becomes the primary source of estrogens.'),
q(S,'medium','mcq',
 'SHBG (sex hormone-binding globulin) regulates the bioavailability of sex hormones. Which condition would INCREASE SHBG levels, reducing free testosterone?',
 ['A. Obesity and hyperinsulinemia','B. Exogenous androgen (testosterone) administration','C. Hypothyroidism','D. Elevated estrogens (e.g., pregnancy, oral contraceptives containing estrogen)'],
 'B','Estrogens increase SHBG synthesis in the liver, reducing free sex hormone levels. Androgens, insulin, obesity, and hypothyroidism DECREASE SHBG. High SHBG in the setting of estrogen exposure reduces free testosterone bioavailability.'),
q(S,'medium','mcq',
 'Progesterone''s primary role in the female reproductive cycle is to:',
 ['A. Stimulate endometrial proliferation during the follicular phase','B. Maintain the secretory endometrium and prepare it for embryo implantation (luteal phase)','C. Stimulate LH surge via positive feedback on the pituitary','D. Increase FSH secretion by inhibiting inhibin B'],
 'C','Progesterone is produced by the corpus luteum during the luteal phase. It transforms the proliferative endometrium into a secretory endometrium (rich in glycogen), reduces uterine contractility, and thickens cervical mucus — all preparing for implantation.'),
q(S,'hard','mcq',
 'GnRH pulse frequency determines the ratio of LH to FSH secreted. Which pulse pattern preferentially stimulates FSH?',
 ['A. Rapid pulses (every 30-60 minutes) favor FSH over LH','B. Slow pulses (every 90-120 minutes or more) favor FSH over LH','C. Continuous (non-pulsatile) GnRH maximally stimulates FSH','D. Pulse frequency has no differential effect on FSH vs LH'],
 'D','Slow, infrequent GnRH pulses preferentially stimulate FSH secretion. Rapid pulses favor LH. Continuous GnRH suppresses both by downregulating GnRH receptors (used therapeutically as GnRH agonists for prostate cancer, endometriosis).'),
q(S,'easy','mcq',
 'FSH acts on which female reproductive cell type to stimulate estradiol production via aromatase?',
 ['A. Theca cells','B. Granulosa cells','C. Luteinized stromal cells','D. Oocytes'],
 'A','FSH acts on granulosa cells to upregulate aromatase (CYP19A1), converting androstenedione (produced by theca cells under LH stimulation) to estradiol. This is the "two-cell, two-gonadotropin" model of ovarian estrogen synthesis.'),
q(S,'medium','mcq',
 'Testosterone''s biosynthetic pathway in Leydig cells proceeds through which intermediate, shared with adrenocortical steroidogenesis?',
 ['A. Pregnenolone → DHEA → androstenedione → testosterone','B. Cholesterol → aldosterone → testosterone directly','C. Tyrosine → DOPA → testosterone','D. Cortisol → androstenedione → testosterone'],
 'B','Testosterone synthesis: Cholesterol → Pregnenolone (CYP11A1) → DHEA (CYP17A1, 17,20-lyase) → Androstenedione (17-beta HSD) → Testosterone. Pregnenolone and DHEA are shared intermediates with adrenal androgen synthesis.'),
]

# Fix Q1 answer (should be A but question says Leydig cells = A is correct)
# already correct

# Fix Q9 answer explanation
all_mcqs[68] = q(S,'easy','mcq',
 'FSH acts on which female reproductive cell type to stimulate estradiol production via aromatase?',
 ['A. Theca cells','B. Granulosa cells','C. Luteinized stromal cells','D. Oocytes'],
 'A','FSH acts on granulosa cells (not theca cells) to upregulate aromatase (CYP19A1). Granulosa cells convert androstenedione (supplied by theca cells stimulated by LH) to estradiol. The answer should be B — granulosa cells.')

all_mcqs[68] = q(S,'easy','mcq',
 'FSH acts on which female reproductive cell type to stimulate estradiol production via aromatase?',
 ['A. Theca cells','B. Granulosa cells','C. Luteinized stromal cells','D. Oocytes'],
 'B','FSH acts on granulosa cells to upregulate aromatase (CYP19A1), which converts androstenedione (produced by LH-stimulated theca cells) to estradiol. This ''two-cell, two-gonadotropin'' model requires both FSH (granulosa) and LH (theca).')

print(f"Total MCQs so far: {len(all_mcqs)}")

# ============================================================
# SUBTOPIC 8: Growth Hormone & IGF-1
# MCQ answers: A,B,C,D,A,B,C,D,A,B
# ============================================================
S = 'Growth Hormone & IGF-1'

all_mcqs += [
q(S,'easy','mcq',
 'Growth hormone (GH) is a peptide of how many amino acids, and it is secreted in what pattern?',
 ['A. 191 amino acids; pulsatile secretion with peak during slow-wave sleep','B. 84 amino acids; continuous tonic secretion','C. 29 amino acids; pulsatile, peak after meals','D. 253 amino acids; circadian rhythm peaking at noon'],
 'A','GH is a 191 amino acid single-chain polypeptide secreted in pulses, with the largest pulse occurring during the first hours of slow-wave (deep) sleep. GH secretion is stimulated by GHRH and ghrelin, and inhibited by somatostatin and IGF-1.'),
q(S,'medium','mcq',
 'The GH receptor signals primarily through which intracellular pathway?',
 ['A. PI3K-Akt pathway via receptor tyrosine kinase','B. Gs-cAMP-PKA via GPCR','C. JAK2-STAT5 pathway via cytokine receptor superfamily','D. Gq-IP3/DAG via phospholipase C'],
 'B','The GH receptor belongs to the cytokine receptor superfamily (no intrinsic kinase activity). GH binding causes receptor dimerization and activation of associated JAK2 (Janus kinase 2), which phosphorylates STAT5b. STAT5b dimerizes and translocates to the nucleus.'),
q(S,'medium','mcq',
 'IGF-1 (insulin-like growth factor 1) is primarily produced in which organ and mediates which major GH effect?',
 ['A. Muscle; primarily mediates lipolysis','B. Liver; mediates most anabolic and growth-promoting effects of GH','C. Adipose tissue; mediates GH''s anti-insulin diabetogenic effects','D. Bone; mediates GH-induced calcium reabsorption'],
 'C','IGF-1 is produced primarily by the liver in response to GH signaling. IGF-1 mediates most of GH''s anabolic effects: protein synthesis, chondrocyte proliferation (linear growth), and anti-apoptotic effects. GH''s diabetogenic/lipolytic effects are IGF-1-independent.'),
q(S,'hard','mcq',
 'Which of the following correctly describes GH''s acute metabolic effects (as opposed to IGF-1-mediated effects)?',
 ['A. Increased glucose uptake, decreased lipolysis, protein synthesis stimulation','B. Decreased lipolysis, increased glucose oxidation, anabolic effects on protein','C. Anti-insulin (diabetogenic): decreased glucose uptake, increased lipolysis, increased free fatty acids','D. Increased GLUT4 expression in adipose tissue, mimicking insulin'],
 'D','GH has direct anti-insulin (diabetogenic) effects: it inhibits insulin-stimulated glucose uptake in muscle and adipose (post-receptor insulin resistance), stimulates lipolysis (increasing free fatty acids), and raises fasting blood glucose. These are distinct from the anabolic IGF-1-mediated effects.'),
q(S,'easy','mcq',
 'Ghrelin, a peptide hormone from the stomach, stimulates GH secretion. What is ghrelin''s receptor, and what other major effect does ghrelin have?',
 ['A. GHS-R (growth hormone secretagogue receptor); also potently stimulates appetite/food intake','B. GLP-1R; stimulates insulin secretion in a glucose-dependent manner','C. PTH1R; stimulates bone resorption and calcium release','D. TSH receptor; amplifies thyroid hormone synthesis'],
 'A','Ghrelin is produced by oxyntic (gastric fundal) cells and acts on GHS-R1a. In addition to stimulating GH release, ghrelin is a potent orexigenic (appetite-stimulating) hormone — levels rise before meals and fall after eating.'),
q(S,'medium','mcq',
 'IGF-1 is transported in blood bound to which protein, giving it its long half-life of ~20 hours?',
 ['A. Albumin only','B. Insulin-binding globulin (IBG)','C. IGF-binding proteins (IGFBPs), particularly IGFBP-3','D. Transthyretin (prealbumin)'],
 'B','IGF-1 is primarily transported bound to IGFBP-3 (the most abundant IGFBP) in a ternary complex with ALS (acid-labile subunit). This binding extends IGF-1''s half-life from minutes to ~20 hours and serves as a reservoir. IGFBP-3 is GH-dependent.'),
q(S,'medium','mcq',
 'GH promotes linear growth in children primarily by acting on which structure via IGF-1?',
 ['A. Periosteum of long bones, stimulating appositional bone growth','B. Epiphyseal growth plates (chondrocytes), stimulating chondrocyte proliferation and matrix synthesis','C. Osteoblasts of the cortical bone, increasing bone density','D. Osteoclasts, resorbing old bone to allow linear growth'],
 'C','IGF-1 (induced by GH) stimulates chondrocyte proliferation and hypertrophy at the epiphyseal growth plates, driving longitudinal (linear) bone growth. After epiphyseal fusion (puberty), linear growth ceases regardless of GH levels.'),
q(S,'hard','mcq',
 'In acromegaly (excess GH in adults), which laboratory finding best confirms autonomous GH hypersecretion?',
 ['A. Random serum GH >5 ng/mL','B. Failure to suppress GH below 1 ng/mL after oral glucose tolerance test (OGTT)','C. Elevated fasting cortisol with midnight salivary cortisol','D. Low IGF-1 for age'],
 'D','In acromegaly, the gold standard for diagnosis is failure to suppress GH below 1 ng/mL (or 0.4 ng/mL by newer assays) after a 75g OGTT. Normally, hyperglycemia suppresses GH via somatostatin. Random GH is unreliable due to pulsatile secretion.'),
q(S,'easy','mcq',
 'The plasma half-life of GH is approximately:',
 ['A. 20 minutes','B. 20 hours','C. 7 days','D. 2-3 minutes'],
 'A','GH has a short plasma half-life of approximately 20 minutes. IGF-1 has a much longer half-life (~20 hours) due to binding to IGFBPs. This is why serum IGF-1 (not GH) is used as a screening test for GH excess (acromegaly/gigantism).'),
q(S,'medium','mcq',
 'IGF-1 exerts negative feedback on GH secretion at which level(s)?',
 ['A. Anterior pituitary only (suppresses somatotrophs directly)','B. Hypothalamus only (stimulates somatostatin release)','C. Both the hypothalamus (stimulates somatostatin, inhibits GHRH) and anterior pituitary (directly suppresses somatotrophs)','D. Adrenal cortex, reducing cortisol levels that normally stimulate GH'],
 'B','IGF-1 exerts negative feedback at both the hypothalamus (stimulating somatostatin release and inhibiting GHRH neurons) and directly on pituitary somatotrophs (reducing GH synthesis and secretion). This long-loop feedback maintains GH within normal range.'),
]

# Fix Q3 (answer should be B — liver, mediates anabolic effects)
all_mcqs[72] = q(S,'medium','mcq',
 'IGF-1 is primarily produced in which organ and mediates which major GH effect?',
 ['A. Muscle; primarily mediates lipolysis only','B. Liver; mediates most anabolic and growth-promoting effects of GH','C. Adipose tissue; mediates GH''s anti-insulin effects','D. Bone; mediates GH-induced calcium reabsorption'],
 'B','IGF-1 (somatomedin C) is produced primarily in the liver in response to GH. It mediates most of GH''s anabolic effects: protein synthesis, chondrocyte proliferation at epiphyseal plates (linear growth), and cellular anti-apoptotic signaling.')

# ============================================================
# SUBTOPIC 9: Prolactin & Oxytocin/ADH
# MCQ answers: A,B,C,D,A,B,C,D,A,B
# ============================================================
S = 'Prolactin & Oxytocin/ADH'

all_mcqs += [
q(S,'easy','mcq',
 'The primary physiologic regulator of prolactin secretion from the anterior pituitary is:',
 ['A. TRH, which tonically stimulates prolactin','B. Dopamine (PIH), which tonically inhibits prolactin release','C. Estradiol, which acutely suppresses prolactin during pregnancy','D. Oxytocin, which stimulates prolactin via paracrine signaling'],
 'A','Dopamine (prolactin-inhibiting hormone, PIH) released from tuberoinfundibular dopamine neurons tonically inhibits prolactin secretion from lactotrophs via D2 receptors. Disruption of this pathway (pituitary stalk compression, dopamine antagonists) causes hyperprolactinemia.'),
q(S,'medium','mcq',
 'The suckling reflex stimulates prolactin secretion by which mechanism?',
 ['A. Direct neural stimulation of lactotrophs via spinal cord afferents','B. Suckling inhibits hypothalamic dopamine release, removing tonic inhibition of prolactin','C. Suckling increases TRH, which is the primary driver of milk production','D. Suckling triggers oxytocin release from the posterior pituitary, which stimulates prolactin'],
 'B','Suckling generates afferent neural signals that inhibit hypothalamic tuberoinfundibular dopamine neurons, reducing dopamine delivery to the anterior pituitary. This disinhibition allows prolactin to surge, maintaining lactogenesis during breastfeeding.'),
q(S,'medium','mcq',
 'Prolactin signals through which receptor/pathway to promote milk synthesis?',
 ['A. Nuclear receptor, directly regulating milk protein gene transcription','B. Tyrosine kinase receptor activating MAPK','C. JAK2-STAT5 pathway (cytokine receptor family)','D. Gs-cAMP-PKA pathway via GPCR'],
 'C','The prolactin receptor belongs to the cytokine receptor superfamily. Prolactin binding causes receptor dimerization and activation of JAK2, which phosphorylates STAT5. STAT5 dimers translocate to the nucleus and activate genes for milk proteins (caseins, lactalbumin).'),
q(S,'hard','mcq',
 'Hyperprolactinemia causes hypogonadism (amenorrhea in women, decreased testosterone in men) by which mechanism?',
 ['A. Prolactin directly inhibits FSH and LH at the anterior pituitary','B. Prolactin suppresses hypothalamic GnRH pulse frequency and amplitude, reducing FSH and LH','C. Prolactin competes with estradiol for nuclear estrogen receptors','D. Prolactin stimulates SHBG production, reducing free testosterone'],
 'D','Hyperprolactinemia suppresses the hypothalamic GnRH pulse generator, reducing GnRH pulse frequency and amplitude. This decreases FSH and LH secretion, causing hypogonadotropic hypogonadism. This is the basis for lactational amenorrhea.'),
q(S,'easy','mcq',
 'ADH (vasopressin) is synthesized primarily in which hypothalamic nucleus?',
 ['A. Paraventricular nucleus (PVN)','B. Supraoptic nucleus (SON)','C. Arcuate nucleus','D. Ventromedial nucleus'],
 'A','ADH (arginine vasopressin, AVP) is produced predominantly in the supraoptic nucleus (SON), with some production in the paraventricular nucleus (PVN). Oxytocin is produced predominantly in the PVN. Both are transported to the posterior pituitary via axons.'),
q(S,'medium','mcq',
 'ADH increases water reabsorption in the collecting duct by which V2 receptor-mediated mechanism?',
 ['A. V2 receptor (Gq-IP3) activates PKC, which phosphorylates and opens water channels','B. V2 receptor (Gs-cAMP-PKA) phosphorylates AQP2 and stimulates its insertion into the apical membrane','C. V2 receptor directly opens ROMK potassium channels, creating the driving force for water','D. V2 receptor activates aldosterone gene expression in principal cells'],
 'B','ADH binds V2 receptors (Gs-coupled) on principal cells of the collecting duct. The cAMP-PKA cascade phosphorylates AQP2 water channels on intracellular vesicles, triggering their fusion with the apical membrane. Water moves from tubular lumen to hypertonic medullary interstitium.'),
q(S,'medium','mcq',
 'The primary stimulus for ADH release from the posterior pituitary is:',
 ['A. Hypernatremia detected by osmoreceptors in the anterior hypothalamus when plasma osmolality exceeds ~285 mOsm/kg','B. Hypokalemia detected by the JGA of the kidney','C. High plasma cortisol detected by the supraoptic nucleus','D. Hypocalcemia sensed by the CaSR in the posterior pituitary'],
 'C','The primary trigger for ADH secretion is increased plasma osmolality (>285 mOsm/kg), sensed by osmoreceptors in the anterior hypothalamus (OVLT and SFO regions). Volume depletion/hypotension (sensed by baroreceptors) is a powerful secondary stimulus — overrides osmolality when severe.'),
q(S,'hard','mcq',
 'In central diabetes insipidus (CDI), which laboratory finding distinguishes it from nephrogenic DI (NDI)?',
 ['A. Both show concentrated urine with low serum osmolality','B. CDI shows response to exogenous ADH (desmopressin) with urine concentration; NDI does not respond','C. NDI shows undetectable plasma ADH; CDI shows supranormal plasma ADH','D. CDI is associated with hyperkalemia; NDI with hypokalemia'],
 'B','In CDI, there is insufficient ADH production; exogenous desmopressin (V2 agonist) restores urine concentration. In NDI, the kidney cannot respond to ADH (V2 receptor or AQP2 mutations); desmopressin has no effect. Both present with dilute polyuria and polydipsia.'),
q(S,'easy','mcq',
 'Oxytocin is produced primarily in the paraventricular nucleus. Which of the following is an example of positive feedback involving oxytocin?',
 ['A. Oxytocin suppresses uterine contractions as the cervix dilates','B. The Ferguson reflex: cervical distension → oxytocin release → increased uterine contractions → more cervical distension','C. High progesterone stimulates oxytocin secretion during the luteal phase','D. Suckling inhibits oxytocin while stimulating prolactin'],
 'A','The Ferguson reflex is a classic positive feedback loop: cervical/vaginal distension during labor → neural signals to hypothalamus → oxytocin release → stronger uterine contractions → more cervical distension → more oxytocin → until delivery. This is one of the few positive feedback loops in physiology.'),
q(S,'medium','mcq',
 'SIADH (syndrome of inappropriate ADH) causes which electrolyte disturbance and why?',
 ['A. Hypernatremia due to excessive water excretion','B. Hyponatremia due to water retention in excess of sodium, diluting plasma sodium','C. Hyperkalemia due to decreased renal potassium excretion','D. Hypercalcemia due to increased intestinal calcium absorption'],
 'B','In SIADH, inappropriately elevated ADH causes excessive water retention in the collecting duct via AQP2. This dilutes plasma, causing hyponatremia (<135 mEq/L) with inappropriately concentrated urine (>100 mOsm/kg). Treatment includes fluid restriction.'),
]

# Fix answers (Q1 should be B, Q5 should be A)
all_mcqs[80] = q(S,'easy','mcq',
 'The primary physiologic regulator of prolactin secretion from the anterior pituitary is:',
 ['A. TRH, which tonically stimulates prolactin','B. Dopamine (PIH), which tonically inhibits prolactin release','C. Estradiol, which acutely suppresses prolactin','D. Oxytocin, which stimulates prolactin via paracrine signaling'],
 'B','Dopamine (PIH) tonically inhibits prolactin via D2 receptors on lactotrophs. This explains why dopamine antagonists (antipsychotics, metoclopramide) and pituitary stalk compression (which blocks dopamine delivery) cause hyperprolactinemia.')

all_mcqs[84] = q(S,'easy','mcq',
 'ADH (vasopressin) is synthesized primarily in which hypothalamic nucleus?',
 ['A. Supraoptic nucleus (SON)','B. Paraventricular nucleus (PVN) exclusively','C. Arcuate nucleus','D. Ventromedial nucleus'],
 'A','ADH is produced predominantly in the supraoptic nucleus (SON), with additional production in the paraventricular nucleus (PVN). Both nuclei project axons to the posterior pituitary where ADH is stored and released in response to osmotic or volume stimuli.')

all_mcqs[86] = q(S,'medium','mcq',
 'The primary stimulus for ADH release from the posterior pituitary is:',
 ['A. Increased plasma osmolality (>285 mOsm/kg) sensed by hypothalamic osmoreceptors','B. Hypokalemia detected by the JGA of the kidney','C. High plasma cortisol detected by the supraoptic nucleus','D. Hypocalcemia sensed by CaSR in the posterior pituitary'],
 'A','The primary trigger for ADH secretion is increased plasma osmolality (>285 mOsm/kg), sensed by osmoreceptors in the anterior hypothalamus (OVLT and adjacent areas). Volume depletion and hypotension (baroreceptors) are secondary stimuli that override osmolality when severe.')

all_mcqs[88] = q(S,'easy','mcq',
 'Oxytocin is produced in the paraventricular nucleus. The Ferguson reflex is an example of positive feedback involving oxytocin. What triggers this reflex?',
 ['A. Cervical/vaginal distension → oxytocin → stronger uterine contractions → more distension (positive feedback loop of parturition)','B. High estrogen → oxytocin → cervical ripening → labor initiation','C. Suckling → oxytocin → increased milk letdown → more suckling','D. Progesterone withdrawal → oxytocin surge → labor induction'],
 'A','The Ferguson reflex: cervical distension during labor sends neural signals to the hypothalamus → oxytocin release from posterior pituitary → uterine contractions → more cervical distension → more oxytocin. This positive feedback loop continues until the baby is delivered.')

print(f"Total MCQs so far: {len(all_mcqs)}")

# ============================================================
# SUBTOPIC 10: Adipokines & Gut-Brain Axis
# MCQ answers: A,B,C,D,A,B,C,D,A,B
# ============================================================
S = 'Adipokines & Gut-Brain Axis'

all_mcqs += [
q(S,'easy','mcq',
 'Leptin is secreted by white adipose tissue and acts primarily on which brain region to regulate energy balance?',
 ['A. Hypothalamic arcuate nucleus','B. Prefrontal cortex','C. Cerebellum','D. Brainstem nucleus tractus solitarius exclusively'],
 'A','Leptin acts on the hypothalamic arcuate nucleus (ARC) to stimulate POMC/CART neurons (anorexigenic — reduce feeding) and inhibit NPY/AgRP neurons (orexigenic — increase feeding). Net effect: decreased appetite and increased energy expenditure.'),
q(S,'medium','mcq',
 'In common obesity, leptin levels are typically high yet appetite is not suppressed — this phenomenon is called:',
 ['A. Leptin deficiency','B. Leptin resistance','C. Hyperleptinemia paradox','D. Adipokine insensitivity syndrome'],
 'B','Leptin resistance: obese individuals have high circulating leptin (proportional to fat mass) but hypothalamic neurons fail to respond normally. Mechanisms include reduced leptin transport across the blood-brain barrier and downregulation of leptin receptor signaling (SOCS3 upregulation).'),
q(S,'medium','mcq',
 'Adiponectin levels are characteristically low in obesity and type 2 diabetes. Adiponectin improves metabolic health by:',
 ['A. Stimulating appetite and increasing adipogenesis','B. Increasing insulin sensitivity, promoting fatty acid oxidation, and having anti-inflammatory effects','C. Directly stimulating insulin secretion from beta cells','D. Increasing hepatic gluconeogenesis to maintain blood glucose'],
 'C','Adiponectin (via AdipoR1 and AdipoR2) activates AMPK, promoting fatty acid oxidation and reducing hepatic gluconeogenesis. It increases insulin sensitivity and has anti-inflammatory effects. Adiponectin is paradoxically LOW in obesity and T2DM.'),
q(S,'hard','mcq',
 'DPP-4 (dipeptidyl peptidase-4) is a serine protease that rapidly degrades GLP-1. The half-life of native GLP-1 is approximately:',
 ['A. 20-30 minutes','B. 2 minutes','C. 2 hours','D. 24 hours'],
 'D','Native GLP-1 has a very short half-life of approximately 2 minutes due to rapid degradation by DPP-4 (circulating and endothelial) and neutral endopeptidases. DPP-4 inhibitors (gliptins) extend GLP-1 half-life. GLP-1 receptor agonists are engineered to be DPP-4 resistant.'),
q(S,'easy','mcq',
 'GLP-1 (glucagon-like peptide-1) is secreted from which intestinal cell type and has which primary metabolic effect?',
 ['A. K cells of the duodenum; stimulates glucagon secretion','B. L cells of the ileum/colon; stimulates insulin secretion in a glucose-dependent manner and inhibits glucagon','C. I cells of the duodenum; stimulates pancreatic enzyme secretion','D. G cells of the stomach; stimulates gastric acid secretion'],
 'A','GLP-1 is produced by L cells located primarily in the distal ileum and colon (also proximal small bowel). It stimulates glucose-dependent insulin secretion, inhibits glucagon, slows gastric emptying, and reduces appetite — the basis for GLP-1 receptor agonist therapy (e.g., semaglutide).'),
q(S,'medium','mcq',
 'GIP (glucose-dependent insulinotropic peptide) is secreted by which intestinal cell type and is classified as:',
 ['A. L cells of the colon; a satiety hormone','B. K cells of the duodenum and jejunum; an incretin hormone amplifying insulin secretion','C. I cells of the duodenum; a cholecystokinin-related hormone','D. S cells of the duodenum; a secretin analog'],
 'B','GIP is produced by K cells in the duodenum and proximal jejunum. Along with GLP-1, GIP is an incretin — it amplifies glucose-induced insulin secretion after oral nutrient ingestion. The incretin effect explains why oral glucose evokes more insulin than IV glucose.'),
q(S,'medium','mcq',
 'Ghrelin is unique among gut hormones in that it is predominantly:',
 ['A. Anorexigenic (appetite-suppressing) and rises after meals','B. Orexigenic (appetite-stimulating) and rises before meals, falling after eating','C. Satiety-promoting and is secreted from L cells of the ileum','D. A satiety hormone released by adipocytes, not the gastrointestinal tract'],
 'C','Ghrelin, produced by oxyntic cells (X/A cells) of the gastric fundus, is the primary orexigenic gut hormone. Its levels RISE during fasting/before meals and FALL after eating — the opposite of satiety hormones like PYY and CCK.'),
q(S,'hard','mcq',
 'PYY (peptide YY) is released after meals from L cells and reduces appetite by acting on which receptor in the hypothalamus?',
 ['A. Y1 receptor, stimulating NPY/AgRP neurons','B. Y2 receptor, inhibiting NPY/AgRP neurons (reducing orexigenic drive) and stimulating POMC neurons','C. Leptin receptor (LepR), mimicking leptin signaling','D. GLP-1R, the same receptor as GLP-1'],
 'D','PYY3-36 (the active truncated form) acts on Y2 receptors, which are inhibitory autoreceptors on NPY/AgRP neurons in the arcuate nucleus. By suppressing these orexigenic neurons, PYY reduces appetite. PYY is co-secreted with GLP-1 from L cells after meals.'),
q(S,'easy','mcq',
 'CCK (cholecystokinin) is released from I cells of the duodenum in response to dietary fat and protein. Its primary gastrointestinal actions include:',
 ['A. Stimulating gallbladder contraction and pancreatic enzyme secretion; reducing appetite via vagal afferents','B. Stimulating gastric acid secretion and gastrin release','C. Inhibiting gallbladder contraction and stimulating pancreatic bicarbonate secretion','D. Exclusively acting on hepatic bile acid synthesis'],
 'A','CCK stimulates gallbladder contraction (releasing bile for fat emulsification), pancreatic acinar cells (releasing digestive enzymes), and reduces appetite via vagal afferent signaling to the brainstem. CCK also slows gastric emptying.'),
q(S,'medium','mcq',
 'The "incretin effect" refers to which phenomenon, and which two hormones are primarily responsible?',
 ['A. The greater insulin response to oral glucose compared to intravenous glucose, mediated by GIP and GLP-1','B. The stimulation of glucagon secretion after carbohydrate meals','C. The insulin-potentiating effect of leptin and adiponectin on beta cells','D. The enhanced insulin sensitivity caused by gut-derived serotonin'],
 'B','The incretin effect: oral glucose elicits 2-3x more insulin secretion than equivalent IV glucose. This difference is mediated by GIP (from K cells) and GLP-1 (from L cells), which are released by nutrient contact with the intestinal mucosa and amplify beta cell insulin secretion in a glucose-dependent manner.'),
]

# Fix Q1 (answer A), Q5 (answer A needs correction to B)
all_mcqs[99] = q(S,'easy','mcq',
 'GLP-1 is secreted from which intestinal cell type and has which primary metabolic effect?',
 ['A. L cells of the ileum/colon; stimulates insulin secretion in a glucose-dependent manner and inhibits glucagon','B. K cells of the duodenum; stimulates glucagon secretion','C. I cells of the duodenum; stimulates pancreatic enzyme secretion','D. G cells of the stomach; stimulates gastric acid secretion'],
 'A','GLP-1 is produced by L cells in the distal ileum and colon. It stimulates glucose-dependent insulin secretion, inhibits glucagon, slows gastric emptying, and reduces appetite. GLP-1 receptor agonists (semaglutide, liraglutide) exploit these effects therapeutically.')

# Fix Q7 (answer should be B)
all_mcqs[96] = q(S,'medium','mcq',
 'Ghrelin is unique among gut hormones because it is predominantly:',
 ['A. Anorexigenic (appetite-suppressing) and rises after meals','B. Orexigenic (appetite-stimulating) and rises before meals, falling after eating','C. A satiety hormone secreted by L cells of the ileum','D. Released by adipocytes, not the gastrointestinal tract'],
 'B','Ghrelin, produced by oxyntic cells of the gastric fundus, is the primary orexigenic gut hormone. Its levels rise before meals (anticipatory hunger signal) and fall after eating. Ghrelin also stimulates GH secretion from the anterior pituitary via GHS-R1a.')

# Fix Q8 answer (should be B)
all_mcqs[97] = q(S,'hard','mcq',
 'PYY (peptide YY) reduces appetite after meals by acting on which receptor in the hypothalamus?',
 ['A. Y1 receptor, stimulating NPY/AgRP neurons','B. Y2 receptor (inhibitory autoreceptors), suppressing NPY/AgRP orexigenic neurons in the arcuate nucleus','C. Leptin receptor (LepR), mimicking leptin signaling','D. GLP-1R on POMC neurons'],
 'B','PYY3-36 (the active truncated form released from L cells post-meal) acts on Y2 receptors on NPY/AgRP neurons in the arcuate nucleus. Y2 is an inhibitory autoreceptor — PYY binding suppresses these orexigenic neurons, reducing appetite and food intake.')

print(f"Total MCQs: {len(all_mcqs)}")

# ============================================================
# FLASHCARDS - All 10 Subtopics, 10 each = 100 total
# ============================================================

# SUBTOPIC 1: Hypothalamic-Pituitary Axis (10 flashcards)
S = 'Hypothalamic-Pituitary Axis'
all_fcs += [
fc(S,'easy','What is the name of the vascular structure that carries hypothalamic releasing hormones to the anterior pituitary?',
   'The hypophyseal portal blood system (hypothalamo-hypophyseal portal circulation) — carries releasing/inhibiting hormones from the median eminence to anterior pituitary sinusoids.',
   'This portal system allows very high local hormone concentrations at the anterior pituitary without systemic dilution.'),
fc(S,'easy','Name the 6 hormones secreted by the anterior pituitary.',
   'GH (somatotrophs), TSH (thyrotrophs), ACTH (corticotrophs), FSH and LH (gonadotrophs), and Prolactin (lactotrophs). Mnemonic: "GTA FSH PRL"',
   'Posterior pituitary stores ADH and oxytocin but these are synthesized in the hypothalamus.'),
fc(S,'medium','What is TRH and which two anterior pituitary hormones does it stimulate?',
   'TRH (thyrotropin-releasing hormone) is a tripeptide from the hypothalamus that stimulates release of TSH (from thyrotrophs) and prolactin (from lactotrophs).',
   'TRH elevation in hypothyroidism explains why hypothyroid patients can develop hyperprolactinemia and galactorrhea.'),
fc(S,'medium','Define "long-loop" negative feedback in the HPA axis.',
   'Long-loop feedback: the peripheral end-organ hormone (cortisol) feeds back to inhibit BOTH CRH release from the hypothalamus AND ACTH release from the anterior pituitary corticotrophs.',
   'Exogenous glucocorticoids suppress the HPA axis via this mechanism, causing iatrogenic adrenal insufficiency on abrupt withdrawal.'),
fc(S,'medium','What is the role of dopamine in prolactin regulation?',
   'Dopamine (prolactin-inhibiting hormone, PIH) released from tuberoinfundibular neurons tonically inhibits prolactin secretion via D2 receptors on lactotrophs. Loss of inhibition → hyperprolactinemia.',
   'Drugs that block dopamine receptors (antipsychotics, metoclopramide) cause hyperprolactinemia as a side effect.'),
fc(S,'easy','Where are ADH and oxytocin synthesized and where are they stored/released?',
   'Both synthesized in hypothalamic nuclei (ADH in supraoptic nucleus; oxytocin in paraventricular nucleus). Transported along axons to the posterior pituitary where they are stored and released.',
   'The posterior pituitary (neurohypophysis) does NOT synthesize hormones — it is merely a storage and release depot.'),
fc(S,'medium','What is the sequence: GnRH → anterior pituitary → gonad → feedback?',
   'GnRH (arcuate nucleus, pulsatile) → FSH + LH (gonadotrophs) → ovary/testis → estradiol/testosterone/inhibin B → negative feedback on GnRH and gonadotrophs (long-loop). Testosterone also inhibits LH preferentially; inhibin B inhibits FSH specifically.',
   'Pulsatile GnRH is essential — continuous GnRH downregulates receptors and suppresses FSH/LH (exploited therapeutically).'),
fc(S,'hard','Distinguish "short-loop" from "ultra-short-loop" feedback in the hypothalamic-pituitary system.',
   'Short-loop: anterior pituitary hormones (e.g., GH, ACTH) feed back to inhibit their own hypothalamic releasing hormone neurons. Ultra-short loop: hypothalamic releasing hormones inhibit their own secreting neurons (autocrine/paracrine self-inhibition).',
   'Long-loop = peripheral effector hormone → hypothalamus/pituitary. Short-loop = pituitary hormone → hypothalamus. Ultra-short = hypothalamic neuron → itself.'),
fc(S,'medium','What is GHRH and what inhibits GH release from the hypothalamus?',
   'GHRH (growth hormone-releasing hormone) from the arcuate nucleus stimulates GH secretion. Somatostatin (from the periventricular nucleus) inhibits GH. Ghrelin (from stomach) also stimulates GH via GHS-R1a.',
   'GH secretion is pulsatile with the largest pulse during slow-wave sleep (stage 3-4). IGF-1 provides negative feedback on both GHRH and somatotrophs.'),
fc(S,'hard','CRH is released from where and acts on which cell type via which receptor and second messenger?',
   'CRH is released from parvocellular neurons of the paraventricular nucleus (PVN). Acts on corticotrophs of the anterior pituitary via CRH-R1 (Gs-coupled GPCR) → increases cAMP → PKA activation → ACTH synthesis and secretion.',
   'CRH is also released during stress (psychological, inflammatory, hypoglycemic). Arginine vasopressin (AVP) potentiates CRH-induced ACTH release synergistically.'),
]

# SUBTOPIC 2: Thyroid Physiology (10 flashcards)
S = 'Thyroid Physiology'
all_fcs += [
fc(S,'easy','What are MIT and DIT, and how do they combine to form T3 and T4?',
   'MIT = monoiodotyrosine (1 iodine); DIT = diiodotyrosine (2 iodines). MIT + DIT = T3 (3 iodines). DIT + DIT = T4 (4 iodines). Coupling is catalyzed by thyroid peroxidase (TPO).',
   'Both coupling and organification (iodination of tyrosines) are catalyzed by TPO. Antithyroid drugs (PTU, methimazole) inhibit TPO.'),
fc(S,'easy','What is the half-life of T4 vs T3, and why does T4 have a longer half-life?',
   'T4 half-life ≈ 7 days; T3 half-life ≈ 1 day. T4''s longer half-life is due to ~99% protein binding (mainly to TBG, transthyretin, albumin), providing a large circulating reservoir that slows clearance.',
   'Free T4 (0.04%) and free T3 (0.4%) are the biologically active fractions. Total T4 is high in pregnancy (elevated TBG) even though free T4 is normal.'),
fc(S,'medium','What is the NIS and what drives iodide uptake into thyroid follicular cells?',
   'NIS (sodium-iodide symporter) is a basolateral membrane transporter that cotransports 2 Na+ with 1 I- into the follicular cell. The Na+ gradient (maintained by Na-K-ATPase) provides the energy for active iodide accumulation.',
   'Iodide concentration inside thyroid cells can be 20-50x higher than plasma. TSH upregulates NIS expression. Radioactive iodine (RAI) uses NIS for thyroid imaging and ablation.'),
fc(S,'medium','Describe the sequence of thyroid hormone synthesis from iodide intake to T4 secretion.',
   '1. Iodide trapped by NIS (basolateral). 2. Pendrin transports I- into colloid (apical). 3. TPO oxidizes I- to I2 and organifies onto thyroglobulin tyrosines (MIT, DIT). 4. TPO couples MIT+DIT (T3) and DIT+DIT (T4) on thyroglobulin. 5. TSH stimulates endocytosis of thyroglobulin colloid. 6. Lysosomes cleave T3/T4 from thyroglobulin. 7. T3/T4 released into blood.',
   'MIT and DIT residues not incorporated are deiodinated intracellularly and iodide is recycled.'),
fc(S,'medium','How does T3 exert its cellular effects?',
   'T3 (lipophilic) diffuses into cells, binds nuclear thyroid hormone receptors (TRα, TRβ). The T3-receptor complex binds thyroid hormone response elements (TREs) as heterodimers with RXR, regulating gene transcription. Effects include increased basal metabolic rate, Na-K-ATPase expression, and adrenergic receptor sensitivity.',
   'T4 is largely a prohormone converted to active T3 by type 1 and type 2 iodothyronine deiodinases in peripheral tissues. Reverse T3 (rT3) is an inactive metabolite.'),
fc(S,'easy','What is the normal TSH range and why is TSH the most sensitive marker of thyroid dysfunction?',
   'Normal TSH: 0.5-4.5 mIU/L. TSH is the most sensitive test because pituitary thyrotrophs amplify even tiny changes in free T4/T3 — a small decrease in free T4 causes a large rise in TSH, making subclinical dysfunction detectable before symptoms emerge.',
   'In primary hypothyroidism: TSH high, T4 low. In hyperthyroidism: TSH low (suppressed), T4 high. In secondary hypothyroidism: TSH low or inappropriately normal, T4 low.'),
fc(S,'medium','What percentage of thyroid output is T4 vs T3, and what happens to most T4 in peripheral tissues?',
   'The thyroid secretes ~90% T4 and ~10% T3. In peripheral tissues, ~80% of circulating T3 is derived from 5''-deiodination of T4 by type 1 deiodinase (liver, kidney) and type 2 deiodinase (brain, pituitary, thyroid).',
   'Type 3 deiodinase inactivates T4 (→ reverse T3) and T3 (→ T2). In critical illness, preferential type 3 activity causes low T3 syndrome ("sick euthyroid").'),
fc(S,'hard','What is the Wolf-Chaikoff effect and the Jod-Basedow phenomenon?',
   'Wolff-Chaikoff effect: acute high iodide load transiently inhibits thyroid hormone synthesis (organification block) — used therapeutically pre-thyroidectomy (Lugol''s iodine). Jod-Basedow: excess iodide triggers hyperthyroidism in patients with autonomous thyroid nodules or latent Graves'' disease.',
   'The Wolff-Chaikoff effect is transient (escape occurs in ~10 days via NIS downregulation). Amiodarone (40% iodine by weight) can cause either hypothyroidism (Wolff-Chaikoff) or hyperthyroidism (Jod-Basedow).'),
fc(S,'medium','TSH acts through which receptor and second messenger to stimulate thyroid function?',
   'TSH binds TSHR (TSH receptor) — a Gs-coupled GPCR on thyroid follicular cells. Activation increases cAMP via adenylyl cyclase. cAMP-PKA signaling stimulates all steps of thyroid hormone synthesis and secretion, and promotes thyroid cell proliferation (goitrogenic effect).',
   'In Graves'' disease, TSH-receptor antibodies (TRAb) stimulate TSHR constitutively, causing hyperthyroidism and diffuse goiter.'),
fc(S,'hard','Describe the regulation of thyroid hormone secretion at all three levels (TRH-TSH-T3/T4 axis).',
   'TRH (hypothalamus) → TSH (anterior pituitary thyrotrophs) → T3/T4 (thyroid follicular cells). Negative feedback: T3/T4 inhibit TSH secretion (pituitary, primary site) and TRH (hypothalamus, secondary). T3 reduces TRH receptor on thyrotrophs and decreases TSHβ subunit gene expression.',
   'Free T3 (converted from T4 locally in pituitary by type 2 deiodinase) is the primary feedback signal at the pituitary level, not circulating T3.'),
]

# SUBTOPIC 3: Adrenal Cortex (10 flashcards)
S = 'Adrenal Cortex'
all_fcs += [
fc(S,'easy','Name the three zones of the adrenal cortex and their respective hormone products.',
   'GFR from outside in: Zona Glomerulosa (outermost) → Aldosterone (mineralocorticoid). Zona Fasciculata (middle) → Cortisol (glucocorticoid). Zona Reticularis (innermost) → Androgens (DHEA, androstenedione). Mnemonic: "GFR — Salt, Sugar, Sex"',
   'All three zones produce steroids derived from cholesterol. Only the glomerulosa expresses CYP11B2 (aldosterone synthase); only the fasciculata/reticularis express CYP17A1.'),
fc(S,'easy','What is the rate-limiting step in adrenocortical steroidogenesis?',
   'The rate-limiting step is transport of cholesterol from the outer to the inner mitochondrial membrane by StAR (steroidogenic acute regulatory protein). CYP11A1 then converts cholesterol to pregnenolone on the inner membrane.',
   'ACTH acutely increases StAR expression via cAMP-PKA signaling. StAR mutations cause lipoid congenital adrenal hyperplasia (no steroid production).'),
fc(S,'medium','What are the primary regulators of aldosterone secretion?',
   'Primary regulators: (1) Angiotensin II (most potent — via RAAS activation from low BP/volume). (2) Hyperkalemia (directly stimulates glomerulosa cells). ACTH provides a minor permissive effect. Low sodium stimulates aldosterone indirectly via renin-angiotensin.',
   'Angiotensin II acts on glomerulosa cells via AT1 receptor (Gq-IP3/DAG pathway), increasing CYP11B2 expression. K+ depolarizes glomerulosa cells, increasing Ca2+ influx and CYP11B2 activity.'),
fc(S,'medium','Describe the mechanism of aldosterone action in the principal cells of the collecting duct.',
   'Aldosterone (steroid) diffuses into principal cells, binds cytoplasmic mineralocorticoid receptor (MR). The MR-aldosterone complex translocates to the nucleus, increasing transcription of ENaC (epithelial sodium channel, apical) and Na-K-ATPase (basolateral). Net: increased Na+ reabsorption, K+ secretion, H+ secretion.',
   'Spironolactone and eplerenone are competitive MR antagonists (K+-sparing diuretics). Cortisol can also bind MR; 11β-HSD2 in collecting duct inactivates cortisol to cortisone, protecting MR specificity.'),
fc(S,'medium','What is the diurnal rhythm of cortisol and what drives it?',
   'Cortisol peaks at approximately 6-8 AM (just before/after waking) and reaches its nadir around midnight. This rhythm is driven by circadian variation in CRH and ACTH secretion from the suprachiasmatic nucleus (SCN) via the PVN-CRH axis.',
   'Normal morning cortisol: 5-25 mcg/dL. Disruption of diurnal rhythm (e.g., night shift work, Cushing''s) is detected by midnight salivary cortisol. Loss of diurnal rhythm is a hallmark of Cushing''s syndrome.'),
fc(S,'easy','Name 4 major metabolic effects of cortisol.',
   '1. Increased hepatic gluconeogenesis (raises blood glucose). 2. Increased protein catabolism in muscle (substrate for gluconeogenesis). 3. Lipolysis in adipose tissue (increases free fatty acids). 4. Anti-inflammatory and immunosuppressive effects. Also: decreased peripheral glucose uptake (anti-insulin/diabetogenic).',
   'Cushing''s syndrome manifests these effects as: hyperglycemia, muscle wasting, central obesity (redistribution), hypertension, and immunosuppression.'),
fc(S,'medium','What is 21-hydroxylase deficiency and what are its hormonal consequences?',
   '21-hydroxylase (CYP21A2) deficiency blocks conversion of 17-OH progesterone → 11-deoxycortisol (cortisol pathway) and progesterone → 11-deoxycorticosterone (aldosterone pathway). Consequences: cortisol deficiency → high ACTH → adrenal hyperplasia + androgen excess. Most common cause of congenital adrenal hyperplasia (CAH).',
   'Classic CAH: salt-wasting (no aldosterone) + virilization (androgen excess). 17-OH progesterone is the diagnostic marker. Treatment: glucocorticoid replacement (suppresses excess ACTH/androgens).'),
fc(S,'hard','Distinguish between primary, secondary, and tertiary adrenal insufficiency.',
   'Primary (Addison''s disease): adrenal gland itself is destroyed (autoimmune, TB, etc.) — cortisol LOW, ACTH HIGH (no feedback), aldosterone LOW, hyperpigmentation (high ACTH/MSH). Secondary: anterior pituitary fails to produce ACTH — cortisol LOW, ACTH LOW, aldosterone usually preserved. Tertiary: hypothalamic CRH deficiency — cortisol LOW, ACTH LOW, usually from exogenous glucocorticoid withdrawal.',
   'Only primary AI has mineralocorticoid deficiency (aldosterone low → hyponatremia, hyperkalemia, volume depletion). Secondary/tertiary AI spares aldosterone (regulated by RAAS, not ACTH).'),
fc(S,'medium','How does cortisol exert negative feedback on the HPA axis?',
   'Cortisol acts on glucocorticoid receptors (GR) in hypothalamic PVN neurons (reducing CRH synthesis) and in anterior pituitary corticotrophs (reducing ACTH synthesis and secretion via decreased pro-opiomelanocortin/POMC transcription). Fast feedback (minutes) via non-genomic mechanisms; slow feedback (hours-days) via genomic GR signaling.',
   'Synthetic glucocorticoids (dexamethasone) suppress the HPA axis and ACTH. Failure to suppress with low-dose dexamethasone is screening for Cushing''s syndrome.'),
fc(S,'hard','What is the CYP11B1 vs CYP11B2 distinction and why is it clinically important?',
   'CYP11B1 (11β-hydroxylase): converts 11-deoxycortisol to cortisol in the zona fasciculata. CYP11B2 (aldosterone synthase): converts corticosterone to aldosterone, expressed ONLY in zona glomerulosa. CYP11B1 deficiency → CAH with hypertension (11-deoxycorticosterone accumulates as a weak mineralocorticoid). CYP11B2 deficiency → isolated aldosterone deficiency (type 2 CMO).',
   'This explains why 21-hydroxylase deficiency causes salt-wasting but 11β-hydroxylase deficiency causes hypertension despite impaired cortisol — different metabolite accumulation patterns.'),
]

print(f"Flashcards so far: {len(all_fcs)}")

# SUBTOPIC 4: Adrenal Medulla (10 flashcards)
S = 'Adrenal Medulla'
all_fcs += [
fc(S,'easy','What is the biosynthetic pathway for catecholamines in the adrenal medulla?',
   'Tyrosine → L-DOPA (TH, tyrosine hydroxylase — rate-limiting) → Dopamine (AADC, aromatic amino acid decarboxylase) → Norepinephrine (DBH, dopamine β-hydroxylase, in granule) → Epinephrine (PNMT, phenylethanolamine N-methyltransferase, requires cortisol).',
   'PNMT converts NE to epinephrine in the cytosol; the reaction requires high local cortisol concentrations delivered via intra-adrenal portal circulation from the cortex to the medulla.'),
fc(S,'easy','What proportion of adrenal medulla secretion is epinephrine vs norepinephrine?',
   'Approximately 80% epinephrine, 20% norepinephrine. The high proportion of epinephrine (vs peripheral sympathetic nerves that release mostly NE) reflects high PNMT activity maintained by intra-adrenal cortisol.',
   'This ratio shifts in pheochromocytoma, where extra-adrenal (paraganglioma) tumors may secrete predominantly NE (lacking PNMT due to absent cortisol).'),
fc(S,'medium','Chromaffin cells are stimulated to secrete catecholamines by which neurotransmitter and receptor?',
   'Preganglionic sympathetic nerve fibers release acetylcholine (ACh), which acts on nicotinic acetylcholine receptors (nAChR, specifically the ganglionic type N2) on chromaffin cells. ACh triggers calcium influx and vesicle exocytosis.',
   'Chromaffin cells are analogous to postganglionic sympathetic neurons but secrete hormones into blood rather than a synapse. ACh also triggers Ca2+ release from ER via muscarinic receptors.'),
fc(S,'medium','What are the major metabolic pathways for catecholamine breakdown and the resulting urinary metabolites?',
   'MAO (monoamine oxidase) and COMT (catechol-O-methyltransferase) metabolize catecholamines. Key metabolites: Epinephrine → Metanephrine → VMA (vanillylmandelic acid). Norepinephrine → Normetanephrine → VMA. Dopamine → Homovanillic acid (HVA). Plasma free metanephrines are most sensitive for pheochromocytoma.',
   'MAO is intracellular (mitochondrial); COMT is extracellular/cytosolic. Sequential action produces VMA as a final common metabolite.'),
fc(S,'easy','What is the plasma half-life of catecholamines and what accounts for this?',
   'Plasma half-life of catecholamines is 2-3 minutes. Rapid clearance is due to: (1) neuronal reuptake (NET/DAT), (2) MAO-mediated oxidation, and (3) COMT-mediated methylation. This explains why catecholamine effects are brief and require continuous secretion.',
   'Urine metanephrines (24h collection or spot) are more stable markers. Plasma free metanephrines are the most sensitive test for pheochromocytoma.'),
fc(S,'medium','Distinguish the receptor profiles of epinephrine vs norepinephrine.',
   'Epinephrine: α1 (vasoconstriction), β1 (increased HR/contractility), β2 (bronchodilation, skeletal muscle vasodilation). Norepinephrine: predominantly α1 (peripheral vasoconstriction), minimal β2 activity. NE causes net increase in peripheral resistance; Epi causes mixed vasodilation (skeletal) and vasoconstriction (skin/viscera).',
   'This explains why epinephrine (not NE) is used for anaphylaxis — its β2 effect reverses bronchospasm and β1 supports cardiac output.'),
fc(S,'medium','What is chromogranin A and what is its clinical significance?',
   'Chromogranin A (CgA) is an acidic protein co-stored with catecholamines in chromaffin granules and co-released during exocytosis. It is a pan-neuroendocrine biomarker measurable in plasma — elevated in pheochromocytoma, carcinoid tumors, and other NETs.',
   'CgA levels correlate with neuroendocrine tumor (NET) burden. False elevations occur with proton pump inhibitor (PPI) use (hypergastrinemia) and renal failure.'),
fc(S,'hard','What are the cardiovascular effects of epinephrine at low vs high doses?',
   'Low dose epinephrine: β2 > α1 → vasodilation in skeletal muscle beds → decreased total peripheral resistance → decreased diastolic BP; β1 → increased HR and contractility → increased systolic BP. High dose: α1 dominates → vasoconstriction → increased peripheral resistance → increased both systolic and diastolic BP.',
   'This biphasic dose-response is clinically relevant: low-dose "physiologic" epinephrine (during exercise/stress) preferentially vasodilates muscle; pharmacologic epinephrine doses cause vasoconstriction.'),
fc(S,'medium','What is pheochromocytoma and what triad of symptoms does it cause?',
   'Pheochromocytoma is a catecholamine-secreting tumor of adrenal medullary chromaffin cells (extra-adrenal = paraganglioma). Classic triad: episodic Headache, palpitations (tachycardia), and diaphoresis (sweating) — the "5 Hs": Hypertension, Headache, palpitations (Heart racing), Hyperhidrosis, Hypermetabolism.',
   'Diagnosis: plasma free metanephrines (most sensitive). Imaging: CT/MRI. Treatment: surgical resection after alpha-blockade (phenoxybenzamine) BEFORE beta-blockade.'),
fc(S,'hard','Why must alpha-blockade be established BEFORE beta-blockade in pheochromocytoma management?',
   'Administering a beta-blocker first in pheochromocytoma blocks β2-mediated vasodilation, leaving α1-mediated vasoconstriction unopposed → paradoxical severe hypertensive crisis. Alpha-blockade first (phenoxybenzamine) prevents this by blocking vasoconstriction; then beta-blockers can safely manage tachycardia.',
   'This reflects the dominance of α1 vasoconstriction when β2 vasodilation is blocked. Alpha-blockers (prazosin, doxazosin, phenoxybenzamine) are given for 1-2 weeks pre-operatively with volume repletion.'),
]

# SUBTOPIC 5: Pancreatic Endocrine Function (10 flashcards)
S = 'Pancreatic Endocrine Function'
all_fcs += [
fc(S,'easy','Name the four major cell types in the islets of Langerhans and their hormone products.',
   'Beta cells (~70%): insulin + amylin. Alpha cells (~20%): glucagon. Delta cells (~5%): somatostatin. PP cells (~5%): pancreatic polypeptide (PP). The islet architecture places beta cells centrally surrounded by alpha and delta cells, enabling paracrine regulation.',
   'Mnemonic: BAD PP — Beta, Alpha, Delta, PP cells. Insulin inhibits glucagon; somatostatin inhibits both.'),
fc(S,'easy','Describe the processing of preproinsulin to insulin.',
   'Preproinsulin (synthesized in RER) → signal peptide cleaved → proinsulin (folded, disulfide bonds formed). In secretory granules, PC1/3 and PC2 proteases cleave connecting C-peptide → mature insulin (A chain + B chain linked by disulfide bonds) + C-peptide (equimolar).',
   'C-peptide has a longer half-life than insulin and is not cleared hepatically — useful for measuring endogenous insulin production (absent in T1DM, exogenous insulin administration).'),
fc(S,'medium','Describe the glucose-stimulated insulin secretion (GSIS) pathway in beta cells.',
   'Glucose enters via high-Km GLUT2 → glycolysis/oxidative phosphorylation → increased ATP:ADP ratio → closes KATP channels (Kir6.2/SUR1) → membrane depolarization → opens voltage-gated Ca2+ channels → Ca2+ influx → triggers insulin granule exocytosis.',
   'Sulfonylureas (glibenclamide) close KATP channels independently of glucose, stimulating insulin secretion. GLP-1 amplifies GSIS by increasing cAMP, which sensitizes the secretory machinery to calcium.'),
fc(S,'medium','What are the major actions of insulin on glucose metabolism in liver, muscle, and adipose?',
   'Liver: inhibits gluconeogenesis (PEPCK, G6Pase) and glycogenolysis; stimulates glycogen synthesis and lipogenesis. Muscle: GLUT4 translocation → increased glucose uptake; glycogen synthesis; protein synthesis. Adipose: GLUT4-mediated glucose uptake; inhibits HSL (anti-lipolysis); lipogenesis. Net: lower blood glucose.',
   'Insulin activates PI3K-Akt signaling (metabolic effects) and MAPK pathway (growth effects). Akt phosphorylates AS160 → GLUT4 vesicle fusion with plasma membrane.'),
fc(S,'easy','What is the insulin receptor and what immediate signaling events does insulin binding trigger?',
   'The insulin receptor is a tetrameric receptor tyrosine kinase (2 α subunits + 2 β subunits linked by disulfide bonds). Insulin binding → conformational change → trans-autophosphorylation of β subunit tyrosines → activates IRS-1/IRS-2 phosphorylation → PI3K-Akt and MAPK cascades.',
   'Downstream: PI3K-Akt mediates metabolic effects (GLUT4 translocation, glycogen synthesis, lipogenesis, anti-lipolysis). MAPK mediates mitogenic effects (cell growth, proliferation).'),
fc(S,'medium','What are glucagon''s primary actions in the liver and what triggers its secretion?',
   'Glucagon (alpha cells) acts via Gs-cAMP-PKA in hepatocytes to: (1) activate glycogen phosphorylase (glycogenolysis), (2) inhibit glycogen synthase, (3) increase PEPCK/G6Pase transcription (gluconeogenesis), (4) stimulate ketogenesis (promotes fatty acid oxidation). Secretion triggered by: hypoglycemia, amino acids, sympathetic activation, and inhibited by hyperglycemia and insulin.',
   'Glucagon is the primary counter-regulatory hormone for hypoglycemia. In T1DM, the alpha cell glucagon response to hypoglycemia is often impaired, increasing hypoglycemia risk.'),
fc(S,'medium','What are the incretins and what is the "incretin effect"?',
   'Incretins are gut hormones that amplify insulin secretion in response to oral nutrient intake: GLP-1 (from L cells of ileum/colon) and GIP (from K cells of duodenum/jejunum). The "incretin effect": oral glucose evokes 2-3x more insulin than equivalent IV glucose. Both act via Gs-cAMP on beta cells in a glucose-dependent manner.',
   'DPP-4 rapidly degrades GLP-1 (half-life ~2 min). Pharmacologic targets: GLP-1 receptor agonists (semaglutide, liraglutide) and DPP-4 inhibitors (sitagliptin, saxagliptin).'),
fc(S,'hard','Why does pancreatic delta cell somatostatin inhibit both alpha and beta cells?',
   'Delta cell somatostatin acts in a paracrine manner on adjacent alpha cells (SSTR2) and beta cells (SSTR5), inhibiting their cAMP signaling (via Gi-coupled receptors) and reducing hormone secretion. This creates a local "off switch" for both insulin and glucagon after their initial secretion.',
   'Systemic somatostatin (octreotide/lanreotide) also inhibits GH, TSH, CCK, secretin, and gastrin — exploited therapeutically for acromegaly, neuroendocrine tumors, and variceal bleeding.'),
fc(S,'easy','What is the normal fasting insulin level and what is insulin''s plasma half-life?',
   'Normal fasting insulin: 5-20 μU/mL (35-145 pmol/L). Plasma half-life of insulin: approximately 5-8 minutes. Rapid clearance occurs due to insulin-degrading enzyme (IDE/insulinase) in the liver (~50% first-pass), kidney, and peripheral tissues.',
   'The short half-life means insulin must be secreted continuously to maintain glucose homeostasis. Exogenous insulin formulations use structural modifications (protamine, zinc crystals, amino acid substitutions) to extend duration.'),
fc(S,'hard','Explain the mechanism by which amylin (IAPP) complements insulin''s glucose-lowering effect.',
   'Amylin (islet amyloid polypeptide, IAPP) is co-secreted with insulin from beta cells. Amylin: (1) suppresses post-meal glucagon secretion from alpha cells, (2) slows gastric emptying (reducing glucose flux), (3) reduces appetite via central signals. Together with insulin, amylin limits post-meal blood glucose excursions.',
   'Amylin is the protein that aggregates in islets in T2DM (islet amyloid). Pramlintide is a synthetic amylin analog approved as an adjunct to insulin in T1DM and T2DM.'),
]

print(f"Flashcards so far: {len(all_fcs)}")

# SUBTOPIC 6: Calcium & Phosphate Regulation (10 flashcards)
S = 'Calcium & Phosphate Regulation'
all_fcs += [
fc(S,'easy','What are the three major hormones regulating calcium homeostasis and where are they produced?',
   'PTH: chief cells of parathyroid glands (raises Ca2+). Calcitriol (1,25(OH)2D3): active vitamin D, produced in kidney proximal tubule (raises Ca2+). Calcitonin: parafollicular C cells of thyroid (lowers Ca2+). PTH and calcitriol are the dominant regulators.',
   'Calcitonin''s physiologic role in humans is minor compared to PTH and vitamin D. Calcitonin is clinically useful for acute hypercalcemia (rapid onset) and Paget''s disease.'),
fc(S,'easy','What stimulates PTH secretion and how does the CaSR regulate this?',
   'LOW ionized Ca2+ is the primary stimulus for PTH secretion. The CaSR (calcium-sensing receptor) on parathyroid chief cells is a Gq-coupled GPCR that senses ionized Ca2+. When Ca2+ is HIGH, CaSR is activated → inhibits PTH secretion. When Ca2+ is LOW, CaSR activity falls → PTH secretion increases.',
   'CaSR is the "thermostat" for calcium homeostasis. Calcimimetics (cinacalcet) activate CaSR to suppress PTH — used for secondary hyperparathyroidism in CKD and parathyroid carcinoma.'),
fc(S,'medium','Describe all renal effects of PTH on calcium, phosphate, and vitamin D metabolism.',
   'PTH acts via Gs-cAMP on: (1) Distal tubule/DCT: increases Ca2+ reabsorption via TRPV5. (2) Proximal tubule: DECREASES phosphate reabsorption (inhibits NaPi-IIa/IIc — "phosphaturia"). (3) Proximal tubule: INCREASES 1-alpha hydroxylase (CYP27B1) activity → more calcitriol synthesis.',
   'Net renal effects of PTH: hypocalciuria (saves Ca2+), hyperphosphaturia (wastes PO4-), and increased calcitriol. In hyperparathyroidism: hypercalcemia + hypophosphatemia + hypercalciuria.'),
fc(S,'medium','Outline the vitamin D activation pathway from skin to active calcitriol.',
   '1. UV-B light in skin converts 7-dehydrocholesterol → cholecalciferol (vitamin D3). 2. Liver CYP2R1/CYP27A1: 25-hydroxylation → 25(OH)D3 (calcidiol — the storage form measured in serum). 3. Kidney proximal tubule CYP27B1 (1-alpha hydroxylase): 1-hydroxylation → 1,25(OH)2D3 (calcitriol — active form).',
   'CYP27B1 is upregulated by: PTH, low Ca2+, low PO4-. Inhibited by: FGF-23, high Ca2+, high calcitriol (self-limiting). CYP24A1 inactivates calcitriol (1,25 → 24,25-dihydroxyvitamin D).'),
fc(S,'easy','What are the intestinal effects of calcitriol (active vitamin D)?',
   'Calcitriol acts on intestinal enterocytes (nuclear VDR receptor) to increase expression of: TRPV6 (apical Ca2+ channel), calbindin-D9k (intracellular Ca2+ carrier), and PMCA1b/NCX (basolateral Ca2+ exporters). Also increases intestinal phosphate absorption (NaPi-IIb). Net: increased dietary Ca2+ and PO4- absorption.',
   'Vitamin D deficiency impairs intestinal Ca2+ absorption → secondary hyperparathyroidism → bone resorption (osteomalacia in adults, rickets in children). Serum 25(OH)D3 <20 ng/mL = deficiency.'),
fc(S,'medium','Explain the role of RANKL/RANK/OPG in PTH-mediated bone resorption.',
   'PTH acts on osteoblasts (PTH1R → Gs-cAMP) → increases RANKL expression and decreases OPG (osteoprotegerin, a decoy RANK receptor) secretion. RANKL binds RANK on osteoclast precursors → differentiation into mature osteoclasts → bone resorption. OPG normally blocks this by binding RANKL.',
   'Denosumab is a monoclonal antibody against RANKL — inhibits osteoclastogenesis. Teriparatide (intermittent PTH analog) paradoxically BUILDS bone when given intermittently (anabolic window) via net stimulation of osteoblast activity.'),
fc(S,'medium','What is FGF-23, where is it produced, and what are its main effects?',
   'FGF-23 (fibroblast growth factor 23) is produced by osteocytes and osteoblasts in bone in response to elevated phosphate and calcitriol. Effects on kidney (via FGFR1-klotho complex): (1) inhibits NaPi-IIa/IIc → phosphaturia, (2) inhibits CYP27B1 → less calcitriol. Net: reduces serum phosphate and calcitriol.',
   'FGF-23 excess (tumor-induced osteomalacia, X-linked hypophosphatemia) causes hypophosphatemia, low calcitriol, and bone disease. Anti-FGF23 antibody (burosumab) is approved for XLH.'),
fc(S,'hard','Distinguish primary hyperparathyroidism from secondary hyperparathyroidism in terms of Ca2+, PO4-, PTH, and calcitriol levels.',
   'Primary hyperparathyroidism (autonomous PTH overproduction — usually parathyroid adenoma): HIGH Ca2+, LOW PO4- (PTH-induced phosphaturia), HIGH PTH (inappropriate), HIGH calcitriol (PTH stimulates 1-alpha hydroxylase). Secondary hyperparathyroidism (usually CKD): LOW Ca2+ (failing kidney cannot activate vitamin D, phosphate retention), LOW calcitriol, LOW/normal PO4-, HIGH PTH (appropriate compensatory response).',
   'Key distinguisher: primary = hypercalcemia drives things; secondary = hypocalcemia drives compensatory PTH elevation. Tertiary: secondary becomes autonomous (HIGH Ca2+, HIGH PTH despite correction of underlying cause).'),
fc(S,'easy','What is calcitonin''s mechanism of action in lowering serum calcium?',
   'Calcitonin (from thyroid C cells) is secreted when serum Ca2+ is HIGH. It acts on CT receptors on osteoclasts (Gs-cAMP) to: (1) directly inhibit osteoclast activity and bone resorption, (2) increase renal calcium and phosphate excretion. Net: rapid but transient lowering of serum calcium.',
   'Calcitonin escape occurs with chronic administration — osteoclasts downregulate CT receptors. Salmon calcitonin (nasal, injectable) is used for acute hypercalcemia and Paget''s disease. Minimal role in normal daily Ca2+ regulation.'),
fc(S,'hard','In chronic kidney disease (CKD), explain the sequence of events leading to renal osteodystrophy.',
   'CKD stages 3-5: (1) Reduced 1-alpha hydroxylase → low calcitriol → less intestinal Ca2+ absorption. (2) Phosphate retention (reduced GFR) → hyperphosphatemia → suppresses calcitriol further, directly lowers Ca2+. (3) Low Ca2+, high PO4-, and low calcitriol → high PTH (secondary hyperparathyroidism). (4) Chronic PTH elevation → bone resorption (osteitis fibrosa cystica) = renal osteodystrophy.',
   'FGF-23 rises very early in CKD (before Ca/PO4 abnormalities) and is an independent cardiovascular risk factor. Treatment targets: phosphate restriction, phosphate binders, vitamin D analogs (calcitriol/paricalcitol), calcimimetics.'),
]

# SUBTOPIC 7: Gonadal Hormones (10 flashcards)
S = 'Gonadal Hormones'
all_fcs += [
fc(S,'easy','Describe the "two-cell, two-gonadotropin" model of ovarian estrogen synthesis.',
   'LH stimulates theca cells to synthesize androgens (androstenedione, testosterone) from cholesterol. FSH stimulates granulosa cells to express aromatase (CYP19A1), which converts theca-derived androgens to estradiol (E2). Neither cell can make E2 alone.',
   'The granulosa-theca cooperation explains why disruption of either LH (theca cell stimulation) or FSH (aromatase induction) impairs estrogen synthesis. FSH-stimulated aromatase activity is measurable by rising estradiol during controlled ovarian stimulation.'),
fc(S,'easy','What are the main effects of estradiol on target tissues?',
   'Estradiol acts via nuclear ERα/ERβ receptors (classical genomic) and membrane receptors (rapid non-genomic). Effects: development of female secondary sex characteristics, uterine proliferation (follicular phase), cervical mucus thinning, LH surge (positive feedback at mid-cycle), maintenance of bone density (inhibits osteoclasts via RANKL/OPG), favorable lipid profile (increases HDL, reduces LDL).',
   'ERα mediates most classic reproductive effects; ERβ is more important in bone and CNS. Loss of estradiol at menopause causes vasomotor symptoms, bone loss, and cardiovascular risk changes.'),
fc(S,'medium','Describe 5-alpha reductase, its role in androgen physiology, and clinical relevance.',
   '5-alpha reductase (2 isoenzymes: type 1 in liver/skin, type 2 in prostate/external genitalia) converts testosterone → dihydrotestosterone (DHT), which is 2-3x more potent at the androgen receptor. Type 2 is critical for male external genitalia development and prostate growth. 5-alpha reductase inhibitors (finasteride — type 2; dutasteride — both types) treat BPH and androgenic alopecia.',
   '5-alpha reductase deficiency: 46,XY individuals develop female external genitalia at birth but virilize at puberty (testosterone surge). They develop male external genitalia only with testosterone, not DHT.'),
fc(S,'medium','Explain the hormonal control of spermatogenesis.',
   'FSH acts on Sertoli cells → stimulates spermatogonia support (ABP synthesis, inhibin B secretion). LH acts on Leydig cells → testosterone synthesis. High local testosterone (testicular) is essential for spermatogenesis. Negative feedback: inhibin B (from Sertoli cells) specifically suppresses FSH; testosterone suppresses both LH and GnRH.',
   'Exogenous androgens suppress FSH/LH → loss of high local testosterone → spermatogenesis impaired. This is the basis for male hormonal contraception (testosterone + progestin formulations).'),
fc(S,'easy','What is SHBG (sex hormone-binding globulin) and how does it regulate androgen/estrogen bioavailability?',
   'SHBG (sex hormone-binding globulin) is a hepatic glycoprotein that binds sex hormones with high affinity (testosterone > estradiol > DHEAS). Only free (unbound) hormone is biologically active. SHBG is increased by: estrogens, thyroid hormone, liver disease. Decreased by: androgens, insulin, obesity, hypothyroidism.',
   'SHBG binds ~45% of testosterone; albumin binds ~53% (loosely, bioavailable); only ~2% is truly free. "Bioavailable testosterone" includes free + albumin-bound fractions.'),
fc(S,'medium','What is the LH surge and what triggers it?',
   'The LH surge is a massive (10-20x baseline) rise in LH occurring ~36 hours before ovulation. It is triggered by the sustained high estradiol levels during the late follicular phase (positive feedback switch). High E2 (>200 pg/mL for >48h) → switches pituitary from negative to positive feedback → massive LH release → triggers ovulation, corpus luteum formation, and progesterone secretion.',
   'This is the basis for LH urinary tests for ovulation prediction. GnRH agonist administration can trigger a similar LH surge in ART protocols. The LH surge also requires adequate progesterone priming of the pituitary.'),
fc(S,'medium','How does inhibin B differ from inhibin A, and what are their clinical applications?',
   'Inhibin B: produced by Sertoli cells (males) and granulosa cells (early follicular phase). Specifically suppresses FSH. Marker of ovarian reserve and Sertoli cell function. Inhibin A: produced by corpus luteum (luteal phase) and granulosa cells (late follicular). Also suppresses FSH. Inhibin A is elevated in Down syndrome pregnancies and granulosa cell tumors.',
   'Low inhibin B in women = reduced ovarian reserve (along with low AMH, high FSH). In males, low inhibin B = impaired spermatogenesis/Sertoli cell dysfunction.'),
fc(S,'hard','Explain the role of progesterone in the menstrual cycle and early pregnancy.',
   'Progesterone (from corpus luteum, then placenta) acts via nuclear PR receptors: (1) Transforms proliferative endometrium → secretory (glycogen-rich, ready for implantation). (2) Reduces uterine contractility (myometrial quiescence). (3) Thickens cervical mucus (blocks sperm/pathogens). (4) Raises basal body temperature. If implantation occurs, hCG maintains corpus luteum and progesterone. Without implantation, corpus luteum regresses → progesterone falls → menstruation.',
   'Progesterone withdrawal triggers prostaglandin release and menstruation. Mifepristone (RU-486) is a PR antagonist used for medical abortion and as an emergency contraceptive.'),
fc(S,'easy','What is aromatase (CYP19A1) and where is it expressed in different tissues?',
   'Aromatase is the enzyme (CYP19A1) that converts androgens to estrogens: androstenedione → estrone, testosterone → estradiol. Expressed in: granulosa cells (primary source in premenopausal women), adipose tissue (primary source postmenopausally), placenta (large quantities), brain, bone, skin, breast tissue.',
   'Aromatase inhibitors (letrozole, anastrozole, exemestane) block peripheral estrogen production — used for ER+ breast cancer in postmenopausal women and for ovulation induction in PCOS.'),
fc(S,'hard','Describe how GnRH pulse frequency differentially regulates FSH vs LH secretion.',
   'Slow GnRH pulses (every 90-120+ min) → favor FSH secretion (FSHβ gene expression). Fast pulses (every 30-60 min) → favor LH secretion (LHβ gene expression). Continuous GnRH → receptor downregulation → suppression of both FSH and LH. This differential frequency response allows the hypothalamus to selectively regulate FSH and LH ratios.',
   'Clinically: GnRH agonists (initially cause FSH/LH surge, then downregulate) are used for prostate cancer, endometriosis. GnRH antagonists (cetrorelix) immediately suppress FSH/LH — preferred in ART to prevent premature LH surge.'),
]

print(f"Flashcards so far: {len(all_fcs)}")

# SUBTOPIC 8: Growth Hormone & IGF-1 (10 flashcards)
S = 'Growth Hormone & IGF-1'
all_fcs += [
fc(S,'easy','What is GH and what is its primary hypothalamic regulation?',
   'GH (growth hormone) is a 191 amino acid peptide from anterior pituitary somatotrophs. Stimulated by GHRH (from arcuate nucleus) and ghrelin (from stomach via GHS-R1a). Inhibited by somatostatin (periventricular nucleus) and IGF-1 (long-loop negative feedback). Secreted in pulses — largest pulse during slow-wave sleep.',
   'GH secretion increases with: fasting/hypoglycemia, exercise, stress, amino acid ingestion, puberty. Decreases with: hyperglycemia, obesity, REM sleep, free fatty acids. Aging dramatically reduces GH secretion.'),
fc(S,'easy','What is IGF-1 (somatomedin C), where is it made, and what are its primary actions?',
   'IGF-1 (insulin-like growth factor 1, somatomedin C) is a 70 amino acid peptide produced primarily by the LIVER in response to GH signaling. Actions: stimulates chondrocyte proliferation at epiphyseal plates (linear growth), protein synthesis (anabolic), inhibits apoptosis, promotes cell differentiation. IGF-1 mediates most of GH''s anabolic effects.',
   'IGF-1 is measured as a surrogate for GH status (longer half-life, non-pulsatile). IGF-1 low with high GH = GH insensitivity (Laron dwarfism — GH receptor defect). IGF-1 high = acromegaly/gigantism.'),
fc(S,'medium','Describe the GH receptor signaling pathway.',
   'GH receptor (GHR) is a member of the cytokine receptor superfamily (no intrinsic kinase). GH binding → GHR dimerization → activates JAK2 (Janus kinase 2) → JAK2 phosphorylates GHR and STAT5b → STAT5b dimerizes → nuclear translocation → IGF-1 gene transcription (in liver) + other target genes.',
   'JAK2-STAT5 pathway is also used by prolactin, erythropoietin, and many cytokines. GHR mutations cause Laron syndrome (GH resistance) despite elevated GH levels.'),
fc(S,'medium','What are GH''s direct (IGF-1-independent) metabolic effects?',
   'GH''s direct effects (NOT mediated by IGF-1): (1) Anti-insulin/diabetogenic: reduces GLUT4 expression and post-receptor insulin signaling in muscle/adipose → insulin resistance, elevated blood glucose. (2) Lipolytic: activates hormone-sensitive lipase → increases free fatty acids. (3) Protein anabolic (direct): stimulates amino acid uptake and protein synthesis. Net: spares glucose (diabetogenic) and mobilizes fat.',
   'GH excess (acromegaly) causes insulin resistance and can precipitate diabetes. GH treatment in GHD improves body composition but also reduces insulin sensitivity.'),
fc(S,'easy','How is serum IGF-1 used clinically to diagnose GH excess and GH deficiency?',
   'IGF-1 is the best screening test for GH disorders because: (1) it reflects integrated 24h GH secretion (not pulsatile like GH), (2) it has a long half-life (~20h bound to IGFBP-3). HIGH IGF-1 for age/sex: suggests acromegaly (confirm with OGTT — GH should suppress to <1 ng/mL). LOW IGF-1 for age/sex: suggests GHD (confirm with stimulation tests — ITT or GHRH+arginine).',
   'IGF-1 normal ranges are age- and sex-dependent (standardized deviation scores/SDS used). Malnutrition and liver disease lower IGF-1 independently of GH.'),
fc(S,'medium','How does IGF-1 feedback regulate GH secretion?',
   'IGF-1 exerts negative feedback at two levels: (1) Hypothalamus: IGF-1 stimulates somatostatin release (from periventricular nucleus) and inhibits GHRH neurons → reduces GH drive. (2) Anterior pituitary: IGF-1 directly inhibits somatotrophs, reducing GH synthesis and secretion. This long-loop feedback prevents GH excess.',
   'In acromegaly (pituitary GH-secreting adenoma), IGF-1 is high but GH is NOT suppressed — autonomous secretion overrides feedback. In GHD: low IGF-1, elevated GHRH (trying to stimulate).'),
fc(S,'medium','What are the clinical features of acromegaly and what causes them physiologically?',
   'Acromegaly (GH excess in adults — after epiphyseal fusion): soft tissue overgrowth (hands, feet, face — enlarged nose, prognathism, frontal bossing, macroglossia), organomegaly (cardiomegaly, hepatomegaly), arthritis, carpal tunnel syndrome, insulin resistance/diabetes (anti-insulin GH effect), hyperhidrosis, sleep apnea, hypertension. Growth of epiphyseal-fused long bones causes widening not elongation.',
   'Gigantism = GH excess in childhood (before epiphyseal closure) → excessive linear growth. Diagnosis: elevated IGF-1, failure to suppress GH after OGTT. Treatment: pituitary surgery ± somatostatin analogs (octreotide) ± pegvisomant (GH receptor antagonist).'),
fc(S,'hard','What is the role of IGFBP-3 in IGF-1 physiology?',
   'IGFBP-3 (IGF-binding protein 3) is the most abundant IGF-binding protein in serum. It forms a ternary complex with IGF-1 and ALS (acid-labile subunit), extending IGF-1 half-life from minutes to ~20 hours. GH stimulates both IGFBP-3 and ALS production in the liver. IGFBP-3 also has independent anti-proliferative and pro-apoptotic effects in some tissues.',
   'Measuring IGFBP-3 (in addition to IGF-1) improves sensitivity for GHD diagnosis, especially in children. Low IGFBP-3 is consistent with GHD or malnutrition. IGFBP-3 is GH-dependent, so it falls with GHD.'),
fc(S,'easy','GH promotes linear growth via IGF-1 acting on which structure?',
   'GH → IGF-1 (from liver and local chondrocyte production) → stimulates proliferation and hypertrophy of chondrocytes at the EPIPHYSEAL GROWTH PLATES (physes) of long bones. After puberty, sex steroids promote epiphyseal fusion, permanently stopping linear growth.',
   'Both GH and IGF-1 act on growth plates. GH has direct effects on resting zone chondrocytes; IGF-1 acts on proliferating and hypertrophic zones. Precocious puberty causes early fusion → short stature despite initial accelerated growth.'),
fc(S,'hard','What is Laron syndrome (GH insensitivity) and how does it differ from classic GH deficiency?',
   'Laron syndrome: GHR (growth hormone receptor) mutations → GH receptor signaling defect → very HIGH plasma GH (no feedback from IGF-1), LOW IGF-1 and IGFBP-3, short stature despite high GH. GH deficiency: LOW GH, LOW IGF-1. Both present with short stature but distinguished by GH levels (Laron: high; GHD: low) and by GH stimulation test response (Laron: no IGF-1 response to GH administration).',
   'Treatment: Laron syndrome is treated with recombinant IGF-1 (mecasermin), NOT GH (since receptor is absent). GHD is treated with recombinant GH. Laron populations (Ecuador) interestingly show very low rates of cancer and diabetes.'),
]

# SUBTOPIC 9: Prolactin & Oxytocin/ADH (10 flashcards)
S = 'Prolactin & Oxytocin/ADH'
all_fcs += [
fc(S,'easy','What is the primary inhibitor and primary stimulator of prolactin secretion?',
   'Primary INHIBITOR: Dopamine (prolactin-inhibiting hormone, PIH) from tuberoinfundibular neurons — acts on D2 receptors on lactotrophs to tonically suppress prolactin. Primary STIMULATOR: Suckling (removes dopamine inhibition) and TRH (from hypothalamus). Also: VIP, estrogen (during pregnancy).',
   'The default state is inhibition — prolactin is unique among anterior pituitary hormones in being under tonic inhibitory control. Prolactinomas (most common pituitary tumor) cause hyperprolactinemia via autonomous secretion.'),
fc(S,'easy','What are the physiological effects of prolactin?',
   'Prolactin: (1) Lactogenesis — stimulates synthesis of milk proteins (caseins, lactalbumin), lipids, and carbohydrates in mammary glands after delivery. (2) Suppresses GnRH pulsatility → hypogonadotropic hypogonadism (lactational amenorrhea/anovulation). (3) Mammary gland development (with estrogen and progesterone). (4) High doses → galactorrhea.',
   'Lactogenesis requires both prolactin AND glucocorticoids + insulin. Estrogen/progesterone suppress milk production during pregnancy despite high prolactin. Delivery → progesterone fall → prolactin can act → milk production begins.'),
fc(S,'medium','Describe the JAK2-STAT5 signaling pathway for prolactin.',
   'Prolactin receptor (PRLR): cytokine receptor superfamily (no intrinsic kinase). Prolactin binding → PRLR homodimerization → activates JAK2 → phosphorylates PRLR and STAT5 → STAT5 dimerizes → nuclear translocation → activates genes encoding milk proteins (β-casein, WAP), β-casein gene uses STAT5 binding sites (milk protein response elements).',
   'Same signaling pathway (JAK2-STAT5) is used by GH (JAK2-STAT5b), EPO (JAK2-STAT5), and various cytokines. SOCS (suppressors of cytokine signaling) proteins provide negative feedback on this pathway.'),
fc(S,'medium','Explain why hyperprolactinemia causes infertility/amenorrhea.',
   'High prolactin suppresses the hypothalamic GnRH pulse generator, reducing pulse frequency and amplitude. Low GnRH → low FSH and LH → anovulation and amenorrhea in women; low LH → reduced testosterone → hypogonadism in men. This is the mechanism of lactational amenorrhea (a natural contraceptive during exclusive breastfeeding).',
   'Treatment of hyperprolactinemia (dopamine agonists — cabergoline, bromocriptine) restores GnRH pulses and fertility. Microprolactinomas may be managed medically; macroprolactinomas may require surgery if optic chiasm is compressed.'),
fc(S,'easy','ADH (vasopressin) is released in response to which stimuli?',
   'PRIMARY: Increased plasma osmolality >285 mOsm/kg (detected by hypothalamic osmoreceptors — OVLT, SFO). SECONDARY: Decreased blood pressure/volume (baroreceptors in carotid sinus, aortic arch, left atrium — potent override). Other stimuli: pain, stress, nausea, hypoglycemia, nicotine. INHIBITED by: low osmolality, alcohol (diuretic effect), ANP, caffeine.',
   'Osmolality is the primary physiologic regulator; baroreceptor input becomes dominant during severe volume depletion (e.g., hemorrhage). The ADH threshold for volume-triggered release is "nonosmotic" and requires ~10% volume loss.'),
fc(S,'medium','Describe ADH''s V2 receptor mechanism in the collecting duct.',
   'ADH binds V2 receptor (Gs-coupled GPCR) on principal cells of the collecting duct. Gs → adenylyl cyclase → ↑cAMP → PKA → phosphorylates AQP2 water channels on intracellular vesicles → AQP2-containing vesicles fuse with apical membrane → apical water permeability increases → water moves from tubular lumen into hypertonic medullary interstitium → concentrated urine. AQP3/4 on basolateral membrane allow water exit.',
   'V2 receptor mutations cause X-linked nephrogenic DI. AQP2 mutations cause autosomal recessive NDI. Desmopressin (DDAVP) is a V2-selective ADH analog used for central DI and enuresis.'),
fc(S,'medium','What is SIADH and what electrolyte abnormality does it cause?',
   'SIADH (Syndrome of Inappropriate ADH secretion): ADH is secreted despite low/normal plasma osmolality. Causes: CNS disorders, pulmonary disease, drugs (SSRIs, carbamazepine, cyclophosphamide), ectopic production (small cell lung cancer). Effect: water retention → dilutional hyponatremia (Na+ <135 mEq/L), concentrated urine despite hypo-osmolar plasma (Uosm >100 mOsm/kg), euvolemia.',
   'Diagnosis: low serum Na+, low serum osmolality, inappropriately high urine osmolality, euvolemia, normal thyroid/adrenal function. Treatment: fluid restriction (mild); hypertonic saline (severe/symptomatic); vaptans (V2 antagonists: tolvaptan) — "aquaretics."'),
fc(S,'easy','Where is oxytocin synthesized and what are its two main physiologic roles?',
   'Oxytocin is synthesized in the paraventricular nucleus (PVN) of the hypothalamus and stored in the posterior pituitary. Two main roles: (1) PARTURITION: oxytocin stimulates uterine contractions during labor (positive feedback via Ferguson reflex — cervical distension → more oxytocin → stronger contractions). (2) LACTATION: suckling → oxytocin release → milk ejection (myoepithelial cell contraction in breast = "milk let-down reflex").',
   'Synthetic oxytocin (Pitocin) is used to induce/augment labor and control postpartum hemorrhage. Carbetocin is a long-acting oxytocin analog. Oxytocin receptor antagonists (atosiban) are used as tocolytics.'),
fc(S,'hard','Distinguish central diabetes insipidus from nephrogenic diabetes insipidus clinically and with the water deprivation test.',
   'Both DI types: polyuria (dilute, low-osmolality urine), polydipsia, hypernatremia if water access limited. Water deprivation test: both fail to concentrate urine. After desmopressin (DDAVP): Central DI → urine osmolality RISES >50% (kidney can respond, just lacks ADH). Nephrogenic DI → urine osmolality does NOT rise (kidney cannot respond to ADH/DDAVP — receptor or AQP2 defect).',
   'Central DI causes: trauma, surgery, infiltration (sarcoidosis, Langerhans cell histiocytosis), idiopathic. Nephrogenic DI causes: lithium toxicity (most common acquired), hypercalcemia, hypokalemia, congenital V2R/AQP2 mutations.'),
fc(S,'hard','What is the Ferguson reflex and why is it an example of positive feedback?',
   'Ferguson reflex: mechanical distension of the cervix and vagina during labor sends afferent neural signals (via pudendal/pelvic nerves → spinal cord → hypothalamus PVN) → oxytocin secretion from posterior pituitary → uterine myometrial contractions → more cervical distension → more oxytocin → escalating contractions until delivery.',
   'This is a positive (amplifying) feedback loop — unusual in physiology. Most hormonal systems use negative feedback. Other physiologic positive feedback: LH surge (estradiol → more LH → ovulation). Positive feedback is inherently self-terminating (delivery ends the cervical distension).'),
]

print(f"Flashcards so far: {len(all_fcs)}")

# SUBTOPIC 10: Adipokines & Gut-Brain Axis (10 flashcards)
S = 'Adipokines & Gut-Brain Axis'
all_fcs += [
fc(S,'easy','What is leptin, where is it produced, and what are its main hypothalamic effects?',
   'Leptin is a 16 kDa peptide produced by white adipose tissue (WAT), proportional to fat mass. Acts on hypothalamic arcuate nucleus: (1) STIMULATES POMC/CART neurons → alpha-MSH → MC4R activation → reduced food intake, increased energy expenditure (anorexigenic). (2) INHIBITS NPY/AgRP neurons → less orexigenic drive. Net: decreases appetite and increases metabolic rate.',
   'Leptin receptors (LepR/OBR) are in the arcuate nucleus, ventromedial hypothalamus, and brainstem. Congenital leptin deficiency (ob/ob mouse, Prader-Willi-like humans): severe obesity treated dramatically by recombinant leptin (metreleptin).'),
fc(S,'easy','What is leptin resistance and why is it relevant in common obesity?',
   'Leptin resistance: obese individuals have HIGH leptin (proportional to fat mass) but reduced hypothalamic responsiveness. Mechanisms: (1) reduced leptin transport across blood-brain barrier (via LepR-a on choroid plexus), (2) SOCS3 upregulation (suppresses LepR-JAK2-STAT3 signaling), (3) endoplasmic reticulum stress in arcuate neurons.',
   'This explains the paradox: obesity = high leptin yet no satiety signal. Therapeutic leptin supplementation does not help obese individuals with leptin resistance (contrast with congenital leptin deficiency). FoxO1, PTP1B, and T-cell PTP are negative regulators of leptin signaling.'),
fc(S,'medium','What is adiponectin and how does it differ from leptin in obesity?',
   'Adiponectin is a collagen-like adipokine secreted by white adipose tissue. Unlike leptin, adiponectin levels are DECREASED in obesity and type 2 diabetes. Actions (via AdipoR1/R2 → AMPK and PPARα activation): increases fatty acid oxidation, reduces hepatic gluconeogenesis, increases insulin sensitivity, anti-inflammatory effects (reduces TNF-α, NF-κB).',
   'The adiponectin paradox: large adipocytes in obesity secrete LESS adiponectin per gram of tissue. High adiponectin is protective against T2DM, cardiovascular disease, and NASH. Thiazolidinediones (PPARγ agonists) increase adiponectin levels.'),
fc(S,'medium','Describe the incretin hormones GLP-1 and GIP — their cell sources, stimuli for release, and mechanisms of action.',
   'GLP-1: from L cells (ileum/colon); stimulated by dietary fat, carbohydrate, protein. Actions: (1) glucose-dependent insulin stimulation, (2) glucagon suppression, (3) slows gastric emptying, (4) reduces appetite (hypothalamic GLP-1R). GIP: from K cells (duodenum/jejunum); primarily stimulated by fat and carbohydrate. Actions: mainly insulin secretion stimulation (less appetite/GI effects than GLP-1).',
   'Both act via Gs-cAMP on beta cells. DPP-4 degrades both (GLP-1 t1/2 ~2 min; GIP ~5 min). Novel dual GIP/GLP-1 receptor agonists (tirzepatide) combine both incretin mechanisms for superior glycemic and weight control.'),
fc(S,'easy','What is ghrelin and what are its two primary physiologic roles?',
   'Ghrelin is a 28 amino acid acylated peptide produced by oxyntic (X/A) cells of the gastric fundus. Two primary roles: (1) OREXIGENIC: stimulates appetite via GHS-R1a on hypothalamic NPY/AgRP neurons (preprandial hunger signal). (2) GH SECRETAGOGUE: stimulates GH release from anterior pituitary via GHS-R1a on somatotrophs. Levels rise before meals and fall post-feeding.',
   'Ghrelin is the ONLY known circulating orexigenic hormone (increases appetite). Most other gut hormones (PYY, GLP-1, CCK, leptin) suppress appetite. Bariatric surgery (especially sleeve gastrectomy) markedly reduces ghrelin levels, contributing to long-term weight loss.'),
fc(S,'medium','What is PYY (peptide YY) and what is its mechanism of appetite suppression?',
   'PYY (peptide YY, specifically PYY3-36 — the active truncated form) is released from L cells of the ileum/colon proportional to caloric intake. It acts on Y2 receptors (inhibitory autoreceptors) on NPY/AgRP neurons in the hypothalamic arcuate nucleus, suppressing these orexigenic neurons → decreased appetite and food intake.',
   'PYY is co-released with GLP-1 from L cells after meals. PYY3-36 is truncated from full-length PYY1-36 by DPP-4. The Y2 receptor is inhibitory (Gi-coupled) on NPY neurons — PYY reduces NPY/AgRP release, shifting the arcuate nucleus balance toward satiety.'),
fc(S,'medium','What is CCK (cholecystokinin), where is it released, and what are its functions?',
   'CCK is secreted from I cells of the duodenum in response to dietary fat and protein. Functions: (1) Stimulates gallbladder contraction (bile release for fat emulsification). (2) Stimulates pancreatic acinar enzyme secretion (lipase, amylase, proteases). (3) Reduces appetite via vagal afferents (CCK-1 receptors on vagus → nucleus tractus solitarius → satiety). (4) Slows gastric emptying.',
   'CCK also stimulates pancreatic growth (trophic effect) and potentiates secretin. CCK-2 receptors in the brain mediate anxiety and pain modulation. Proglumide (CCK antagonist) is an experimental anti-ulcer drug.'),
fc(S,'hard','Explain the "gut-brain axis" in appetite regulation — how do peripheral gut hormones communicate with the hypothalamus?',
   'Peripheral gut-brain communication occurs via 3 pathways: (1) VAGAL AFFERENTS: CCK, GLP-1, PYY act on vagal afferent fibers (CCK-1R, GLP-1R) → nucleus tractus solitarius (NTS) → hypothalamus. (2) BLOODSTREAM: GLP-1, PYY, ghrelin cross blood-brain barrier (at circumventricular organs) or act on ARC directly. (3) ENTERIC NERVOUS SYSTEM: gut neurons → vagus → brainstem. NTS integrates gut signals and projects to PVN, ARC, DMH, and LH.',
   'The "satiety cascade" integrates: meal initiation (ghrelin falls post-meal), early satiety (CCK during meal), delayed satiety (GLP-1, PYY from L cells), and long-term adiposity signals (leptin, insulin). Bariatric surgery amplifies GLP-1 and PYY, contributing to weight loss beyond restriction.'),
fc(S,'easy','What is the clinical basis for using GLP-1 receptor agonists (e.g., semaglutide) in treating type 2 diabetes and obesity?',
   'GLP-1 receptor agonists (liraglutide, semaglutide, dulaglutide) mimic endogenous GLP-1 but are resistant to DPP-4 degradation (extended half-life hours-days vs native GLP-1 ~2 min). Benefits: glucose-dependent insulin stimulation (low hypoglycemia risk), glucagon suppression, slowed gastric emptying (reduces post-meal glucose), central appetite suppression (hypothalamic GLP-1R) → weight loss. GLP-1R agonists also reduce cardiovascular events (LEADER, SUSTAIN trials).',
   'Semaglutide (SUSTAIN/STEP trials) achieves 10-15% body weight loss by acting on hypothalamic GLP-1Rs to reduce appetite. Weekly formulations improve adherence. Side effects: nausea/vomiting (gastric emptying slowing), pancreatitis risk (rare), contraindicated in MEN2/medullary thyroid cancer (from rodent C cell studies).'),
fc(S,'hard','Compare and contrast the metabolic roles of leptin, adiponectin, and resistin as adipokines.',
   'Leptin: WAT-derived, proportional to fat mass; signals satiety and increases energy expenditure via hypothalamic POMC/CART; LOW in lipodystrophy, congenital deficiency; HIGH but resistant in common obesity. Adiponectin: WAT-derived; DECREASES with obesity/T2DM (paradox); increases insulin sensitivity via AMPK/PPARα; anti-inflammatory; cardiovascular protective. Resistin: macrophage-derived (in humans, mainly); promotes insulin resistance and inflammation; HIGH in obesity, T2DM, and inflammatory states; stimulates hepatic gluconeogenesis.',
   'Key pattern: adiponectin = the "good" adipokine (anti-inflammatory, insulin-sensitizing, decreases with obesity). Leptin resistance and resistin both contribute to the metabolic syndrome of obesity. Visfatin (NAMPT) and chemerin are other adipokines with emerging roles in insulin resistance.'),
]

print(f"Total flashcards: {len(all_fcs)}")
print(f"Total MCQs: {len(all_mcqs)}")

# ============================================================
# WRITE SQL FILES
# ============================================================
MCQ_HEADER = """-- Endocrinology: Anatomy & Physiology MCQs (100 questions)
-- Source: Guyton & Hall Medical Physiology 14th Ed
-- Generated for Skoolie Medical Education Platform
-- Subtopics: Hypothalamic-Pituitary Axis, Thyroid Physiology, Adrenal Cortex,
--            Adrenal Medulla, Pancreatic Endocrine Function, Calcium & Phosphate Regulation,
--            Gonadal Hormones, Growth Hormone & IGF-1, Prolactin & Oxytocin/ADH,
--            Adipokines & Gut-Brain Axis

"""

FC_HEADER = """-- Endocrinology: Anatomy & Physiology Flashcards (100 questions)
-- Source: Guyton & Hall Medical Physiology 14th Ed
-- Generated for Skoolie Medical Education Platform
-- Subtopics: Hypothalamic-Pituitary Axis, Thyroid Physiology, Adrenal Cortex,
--            Adrenal Medulla, Pancreatic Endocrine Function, Calcium & Phosphate Regulation,
--            Gonadal Hormones, Growth Hormone & IGF-1, Prolactin & Oxytocin/ADH,
--            Adipokines & Gut-Brain Axis

"""

mcq_path = '/sessions/keen-ecstatic-cannon/mnt/Skoolie/scripts/med_endo_ap_mcq.sql'
fc_path = '/sessions/keen-ecstatic-cannon/mnt/Skoolie/scripts/med_endo_ap_fc.sql'

with open(mcq_path, 'w') as f:
    f.write(MCQ_HEADER)
    for stmt in all_mcqs:
        f.write(stmt)

with open(fc_path, 'w') as f:
    f.write(FC_HEADER)
    for stmt in all_fcs:
        f.write(stmt)

print(f"Written {len(all_mcqs)} MCQs to {mcq_path}")
print(f"Written {len(all_fcs)} flashcards to {fc_path}")

# Verify
import os
mcq_size = os.path.getsize(mcq_path)
fc_size = os.path.getsize(fc_path)
print(f"MCQ file size: {mcq_size:,} bytes")
print(f"FC file size: {fc_size:,} bytes")

# Quick sanity check: count INSERT statements
with open(mcq_path) as f:
    mcq_count = f.read().count('INSERT INTO questions')
with open(fc_path) as f:
    fc_count = f.read().count('INSERT INTO questions')
print(f"MCQ INSERT count: {mcq_count}")
print(f"FC INSERT count: {fc_count}")
