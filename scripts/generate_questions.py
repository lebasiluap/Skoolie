#!/usr/bin/env python3
"""
Skoolie Question Generator
==========================
Generates MCQs, flashcards, and case studies using Claude API
and inserts them directly into Supabase.

Usage:
  python3 generate_questions.py --type mcq --topic "Cardiovascular System" --category "Pathophysiology" --subtopic "Hypertension" --years year2,year3,year4 --count 25
  python3 generate_questions.py --type flashcard --topic "Cardiovascular System" --category "Pharmacology" --years year1,year2,year3,year4,year5,year6,practitioner --count 25
  python3 generate_questions.py --type case_study --topic "Cardiovascular System" --subtopic "Heart Failure" --years year3,year4,year5 --count 5
  python3 generate_questions.py --batch scripts/batch_ap.json

Requirements:
  pip install anthropic supabase python-dotenv

Environment variables (create a .env.local file in project root):
  ANTHROPIC_API_KEY=sk-ant-...
  NEXT_PUBLIC_SUPABASE_URL=https://bqhiwlpmrejvjdljxspy.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=...
"""

import argparse
import json
import os
import sys
import time
import uuid
from pathlib import Path

try:
    import anthropic
    from supabase import create_client
    from dotenv import load_dotenv
except ImportError:
    print("Missing dependencies. Run: pip install anthropic supabase python-dotenv")
    sys.exit(1)

load_dotenv(Path(__file__).parent.parent / ".env.local")
load_dotenv(Path(__file__).parent.parent / ".env")

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")

if not ANTHROPIC_API_KEY:
    print("ERROR: ANTHROPIC_API_KEY not set in environment or .env / .env.local")
    sys.exit(1)
if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set")
    sys.exit(1)

claude = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ─── Category-specific system prompts ─────────────────────────────────────────

BASE_CONTEXT = """You are an expert pharmacy educator and question writer for a 6-year PharmD programme in Ghana, West Africa.
You write high-quality, clinically relevant questions for the Skoolie medical education app.

SOURCES to draw from:
- BNF 83 (British National Formulary)
- Clinical Pharmacy & Therapeutics (Roger Walker)
- Koda-Kimble Applied Therapeutics
- Lippincott Illustrated Reviews: Pharmacology (7th Ed)
- Pharmacotherapy: A Pathophysiologic Approach (DiPiro, 7th Ed)
- Lilian Azzopardi – Lecture Notes in Pharmacy Practice
- NAPLEX Comprehensive Pharmacy Review
- Ghana Standard Treatment Guidelines
- West African Postgraduate College of Pharmacists (WAPCP) standards

GENERAL QUALITY RULES:
1. Each MCQ must have EXACTLY 4 options (A, B, C, D)
2. Only ONE answer is definitively correct — no ambiguity
3. Distractors must be plausible but clearly wrong on reflection
4. All options should be similar in length and structure (no giveaway formatting)
5. Avoid "all of the above" / "none of the above"
6. Never repeat stems or options across questions in the same batch
7. Include Ghana/West Africa context where relevant (available drugs, local guidelines, common presentations)
8. Explanation must be 2-4 sentences: explain WHY the correct answer is right AND briefly address the key distractor
9. distractor_explanations: provide a short explanation for each WRONG option"""

MCQ_FORMAT = """
OUTPUT FORMAT — return a JSON array ONLY, no markdown fences, no commentary:
[
  {
    "question_text": "...",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correct_answer": "A",
    "explanation": "...",
    "distractor_explanations": {"B": "...", "C": "...", "D": "..."},
    "subtopic": "...",
    "difficulty": "easy|medium|hard",
    "high_yield": true,
    "source_reference": "BNF 83 / DiPiro Ch.XX"
  }
]"""

FLASHCARD_FORMAT = """
FLASHCARD FORMAT:
- question_text (front): A short, direct question or "fill in the blank" prompt testing ONE fact
- correct_answer: always "A" (option A is always the answer)
- options: ["A. [THE ANSWER — concise fact]", "B. [plausible wrong]", "C. [plausible wrong]", "D. [plausible wrong]"]
- explanation: 1-2 sentences expanding on the answer + 1 key clinical pearl

OUTPUT FORMAT — JSON array ONLY, no markdown fences, no commentary:
[
  {
    "question_text": "What is the mechanism of action of spironolactone?",
    "options": ["A. Aldosterone receptor antagonist — blocks Na retention and K excretion in the collecting duct", "B. Loop diuretic — inhibits Na/K/2Cl cotransporter in thick ascending limb", "C. Thiazide diuretic — inhibits NaCl cotransporter in DCT", "D. Carbonic anhydrase inhibitor — reduces bicarbonate reabsorption"],
    "correct_answer": "A",
    "explanation": "Spironolactone competitively blocks mineralocorticoid receptors, reducing Na retention and K loss. In HFrEF it also attenuates cardiac fibrosis (RALES trial).",
    "distractor_explanations": {"B": "Furosemide is the loop diuretic.", "C": "Thiazides act on DCT.", "D": "Acetazolamide is the CAI."},
    "subtopic": "...",
    "difficulty": "easy|medium|hard",
    "high_yield": true,
    "source_reference": "BNF 83; Lippincott Pharmacology Ch.16"
  }
]"""

CATEGORY_SYSTEM_PROMPTS = {
    "Anatomy & Physiology": BASE_CONTEXT + """

CATEGORY: ANATOMY & PHYSIOLOGY
Focus on the STRUCTURE and FUNCTION of the cardiovascular system as a whole:
- Cardiac anatomy (chambers, valves, great vessels, coronary circulation)
- Cardiac cycle (systole, diastole, pressures, volumes)
- Cardiac output and its determinants (heart rate, stroke volume, preload, afterload, contractility)
- Electrophysiology (action potentials, conduction system, ECG basics)
- Vascular anatomy and physiology (arteries, veins, capillaries, circulation)
- Blood pressure regulation (baroreceptors, RAAS, ANS, renal mechanisms)
- Haemodynamics (flow, resistance, compliance, Starling's law)
- Lymphatics and fluid balance

Questions should test understanding of HOW the system works, NOT disease management.
DO NOT include questions about specific drugs, diseases, or treatments.
Vary across all the above subtopics. Keep subtopic field as "" (empty string).""" + MCQ_FORMAT,

    "Pharmacology": BASE_CONTEXT + """

CATEGORY: PHARMACOLOGY — CVS DRUG CLASSES
Focus on the pharmacology of cardiovascular drug CLASSES (mechanisms, PK, PD, ADRs, interactions):
- Beta-blockers (selective vs non-selective, ISA, cardioselectivity, clinical uses)
- Alpha-adrenergic blockers (alpha-1, alpha-2, mixed; prazosin, doxazosin, labetalol)
- ACE inhibitors (mechanism, cough, angioedema, renal effects, contraindications)
- Angiotensin receptor blockers (ARBs — losartan, valsartan, candesartan)
- Calcium channel blockers (dihydropyridines vs non-DHP; nifedipine, amlodipine, verapamil, diltiazem)
- Loop diuretics (furosemide, bumetanide — mechanism, monitoring, ototoxicity)
- Thiazide diuretics (bendroflumethiazide, indapamide — mechanism, metabolic effects)
- Potassium-sparing diuretics (spironolactone, eplerenone, amiloride)
- Nitrates (GTN, ISDN, ISMN — mechanism, tolerance, headache)
- Antiarrhythmic drugs (Vaughan Williams Classes I–IV; amiodarone, digoxin, adenosine)
- Anticoagulants (warfarin, heparins, DOACs — mechanism, monitoring, reversal)
- Antiplatelet agents (aspirin, clopidogrel, ticagrelor, GP IIb/IIIa inhibitors)
- Statins and other lipid-lowering agents (statins, ezetimibe, fibrates, PCSK9 inhibitors)
- Vasopressors and inotropes (dopamine, noradrenaline, adrenaline, dobutamine, milrinone)
- Ivabradine, sacubitril/valsartan, SGLT2 inhibitors in HF

Questions test drug mechanisms, pharmacokinetics, adverse effects, contraindications, drug interactions, monitoring parameters.
DO NOT organise by disease. Test drug CLASS knowledge.
Keep subtopic field as "" (empty string).""" + MCQ_FORMAT,

    "Pathophysiology": BASE_CONTEXT + """

CATEGORY: PATHOPHYSIOLOGY
Focus on HOW cardiovascular diseases DEVELOP — mechanisms, risk factors, pathological changes, classification:
- Epidemiology and risk factors
- Molecular and cellular mechanisms of disease
- Pathological anatomy and histology
- Haemodynamic consequences
- Disease classification (e.g. HF staging, hypertension grades, ACS types)
- Natural history and complications
- Biomarkers and their significance (troponin, BNP, etc.)
- ECG and investigation findings and their pathophysiological basis

Questions should test understanding of disease mechanisms, NOT treatments or drugs.
DO NOT include drug names or management questions — save those for Clinicals.""" + MCQ_FORMAT,

    "Clinicals": BASE_CONTEXT + """

CATEGORY: CLINICALS — THERAPEUTIC MANAGEMENT
Focus on the CLINICAL MANAGEMENT of cardiovascular diseases:
- First-line and second-line drug choices (guideline-based)
- Dosing, frequency, titration
- Monitoring parameters and target values
- Adverse effect management in context
- Special populations (renal/hepatic impairment, pregnancy, elderly, diabetes)
- Drug interactions relevant to clinical practice
- Non-pharmacological management
- Patient counselling key points
- Treatment escalation and de-escalation
- Local Ghanaian/West African context (available drugs, NHIS coverage, Ghana STG)

Questions should be clinically realistic. Use patient scenarios where appropriate.
Focus on TREATMENT DECISIONS, not disease mechanisms.""" + MCQ_FORMAT,

    "default": BASE_CONTEXT + MCQ_FORMAT,
}

FLASHCARD_SYSTEM_PROMPTS = {
    "Anatomy & Physiology": BASE_CONTEXT + """

CATEGORY: ANATOMY & PHYSIOLOGY FLASHCARDS
Create rapid-recall flashcards on cardiovascular anatomy and physiology:
- Key values and normal ranges (cardiac output, EF, pressures, volumes)
- Definitions (e.g. "What is stroke volume?")
- Mechanism questions ("How does the baroreceptor reflex respond to hypovolaemia?")
- Anatomy mnemonics and key facts
- Electrophysiology key points
Each card tests ONE specific fact. No compound questions. Keep subtopic field as "".""" + FLASHCARD_FORMAT,

    "Pharmacology": BASE_CONTEXT + """

CATEGORY: PHARMACOLOGY FLASHCARDS — CVS DRUG CLASSES
Create rapid-recall flashcards covering CVS drug class pharmacology:
- Drug mechanisms of action (one drug/class per card)
- Monitoring parameters and target values
- Key adverse effects (especially class-specific ones)
- Key contraindications
- Important drug interactions (mechanism and clinical significance)
- Pharmacokinetics (half-life, renal/hepatic clearance, protein binding where important)
- Drug of choice questions ("First-line for hypertension in CKD with proteinuria?")
Each card tests ONE specific fact. Keep subtopic field as "".""" + FLASHCARD_FORMAT,

    "Pathophysiology": BASE_CONTEXT + """

CATEGORY: PATHOPHYSIOLOGY FLASHCARDS
Create rapid-recall flashcards on cardiovascular disease mechanisms:
- Pathophysiology key facts, definitions, and mechanisms
- Classification criteria
- Biomarker significance
- Risk factors and their mechanisms
Each card tests ONE specific pathophysiological fact.""" + FLASHCARD_FORMAT,

    "Clinicals": BASE_CONTEXT + """

CATEGORY: CLINICALS FLASHCARDS
Create rapid-recall flashcards on CVS disease management:
- First-line drug choices for specific conditions
- Target values (BP targets, INR targets, lipid targets)
- Monitoring parameters
- Key counselling points
- Dose ranges
Each card tests ONE clinical fact.""" + FLASHCARD_FORMAT,

    "default": BASE_CONTEXT + FLASHCARD_FORMAT,
}

# ─── Prompt builders ───────────────────────────────────────────────────────────

def build_mcq_prompt(topic, category, subtopic, years, count, profession, difficulty_hint):
    sub_instruction = f"Focus on subtopic: **{subtopic}**." if subtopic else f"Cover the full breadth of {category} for {topic}. Vary subtopics across the batch."
    year_desc = f"year levels: {', '.join(years)}" if years else "all year levels"
    diff_instruction = f"Target difficulty: **{difficulty_hint}**." if difficulty_hint else "Mix difficulties: ~30% easy, ~40% medium, ~30% hard."

    return f"""Generate {count} MCQ questions.

TOPIC: {topic}
CATEGORY: {category}
{sub_instruction}

TARGET AUDIENCE: PharmD students at {year_desc}
PROFESSION: {profession}
{diff_instruction}

Vary the cognitive level:
- ~30% recall (name, mechanism, dose, definition)
- ~40% application (which drug for this patient, what to monitor, what to counsel)
- ~30% analysis (why is this wrong, what interaction, what happens next, compare options)

Make questions specific. Use realistic patient scenarios for application/analysis questions.
Each question must be DISTINCT — no repeated stems, facts, or options."""

def build_flashcard_prompt(topic, category, subtopic, years, count, profession):
    sub_instruction = f"Focus on subtopic: **{subtopic}**." if subtopic else f"Cover the full breadth of {category} for {topic}. Vary what each card tests."
    return f"""Generate {count} flashcard questions.

TOPIC: {topic}
CATEGORY: {category}
{sub_instruction}

TARGET AUDIENCE: PharmD students
PROFESSION: {profession}

Each flashcard must test ONE specific fact. Cover a mix of:
- Mechanisms of action
- Key monitoring parameters and target values
- Dose ranges and frequency
- Classic/important adverse effects
- Key contraindications
- Important drug interactions
- Drug of choice / first-line questions
- Key pathophysiology facts
- Pharmacokinetic facts
- Counselling key points

No compound questions. Each card must be clearly different from the others."""

def build_case_study_prompt(topic, subtopic, years, count, profession):
    is_advanced = any(y in years for y in ['year5', 'year6', 'practitioner'])
    style = "osce" if is_advanced else "multi_question"
    q_count = "5-8 sub-questions" if is_advanced else "3-5 sub-questions"
    sub_instruction = f"Focus on subtopic: **{subtopic}**." if subtopic else "Vary the clinical scenarios across different CVS conditions."

    return f"""Generate {count} case stud{'y' if count == 1 else 'ies'} on: **{topic}**.
{sub_instruction}

STYLE: {style.upper()} ({q_count} per case)
TARGET AUDIENCE: PharmD students
PROFESSION: {profession}
REGION: Ghana/West Africa — use locally available drugs, realistic Ghanaian patient contexts (KBTH, Korle Bu, district hospital settings)

{'Include FULL patient history, vitals, and investigation results for realistic complex presentations.' if is_advanced else 'Keep vignette concise (100-200 words). Questions build progressively: diagnosis → drug selection → monitoring → counselling.'}

Each sub-question tests something DIFFERENT:
- Q1: Diagnosis / interpretation / assessment
- Q2: Drug selection / first-line therapy
- Q3: Monitoring / dose adjustment / target values
- Q4: Adverse effect / drug interaction / counselling
- Q5+: Special population / escalation / complication management

OUTPUT FORMAT — JSON array ONLY, no markdown:
[
  {{
    "title": "Descriptive case title",
    "style": "{style}",
    "difficulty": "easy|medium|hard",
    "subtopic": "Disease name",
    "clinical_vignette": "Full scenario paragraph...",
    "patient_history": null,
    "examination_findings": null,
    "investigations": null,
    "questions": [
      {{
        "question_number": 1,
        "question_text": "...",
        "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
        "correct_answer": "B",
        "explanation": "...",
        "distractor_explanations": {{"A": "...", "C": "...", "D": "..."}},
        "marks": 2,
        "learning_objective": "..."
      }}
    ],
    "high_yield": true,
    "source_reference": "DiPiro Ch.XX; Ghana STG 2022",
    "region": "ghana"
  }}
]"""

# ─── Core generation function ──────────────────────────────────────────────────

def generate_questions(qtype, topic, category, subtopic, years, count, profession, region,
                       difficulty=None, dry_run=False):
    category = category or ""
    subtopic_val = subtopic or ""

    if qtype == "mcq":
        sys_prompt = CATEGORY_SYSTEM_PROMPTS.get(category, CATEGORY_SYSTEM_PROMPTS["default"])
        user_prompt = build_mcq_prompt(topic, category, subtopic_val, years, count, profession, difficulty)
    elif qtype == "flashcard":
        sys_prompt = FLASHCARD_SYSTEM_PROMPTS.get(category, FLASHCARD_SYSTEM_PROMPTS["default"])
        user_prompt = build_flashcard_prompt(topic, category, subtopic_val, years, count, profession)
    elif qtype == "case_study":
        sys_prompt = CATEGORY_SYSTEM_PROMPTS.get("default", CATEGORY_SYSTEM_PROMPTS["default"])
        user_prompt = build_case_study_prompt(topic, subtopic_val, years, count, profession)
    else:
        raise ValueError(f"Unknown question type: {qtype}")

    print(f"\n🤖 [{qtype}] {topic} > {category or 'no category'} > {subtopic_val or 'flat'} | years={years} | ×{count}")

    response = claude.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=8192,
        system=sys_prompt,
        messages=[{"role": "user", "content": user_prompt}]
    )

    raw = response.content[0].text.strip()

    # Strip markdown fences if present
    if raw.startswith("```"):
        raw = raw.split("```", 1)[1]
        if raw.startswith("json"):
            raw = raw[4:]
    if raw.endswith("```"):
        raw = raw.rsplit("```", 1)[0]

    try:
        items = json.loads(raw.strip())
    except json.JSONDecodeError as e:
        print(f"❌ JSON parse error: {e}")
        with open("/tmp/skoolie_last_output.txt", "w") as f:
            f.write(raw)
        print("Raw output saved to /tmp/skoolie_last_output.txt")
        return 0

    print(f"✅ Generated {len(items)} items")

    if dry_run:
        print("\n--- DRY RUN (first item) ---")
        print(json.dumps(items[0], indent=2))
        return len(items)

    inserted = 0
    for item in items:
        try:
            if qtype == "case_study":
                row = {
                    "id": str(uuid.uuid4()),
                    "professions": [profession] if profession != "all" else ["pharmacy", "medicine", "nursing"],
                    "course": "Pharmacology",
                    "topic": topic,
                    "category": category or None,
                    "subtopic": item.get("subtopic") or subtopic_val or topic,
                    "title": item.get("title", f"Case: {subtopic_val or topic}"),
                    "year_level": years,
                    "style": item.get("style", "multi_question"),
                    "difficulty": item.get("difficulty", difficulty or "medium"),
                    "clinical_vignette": item.get("clinical_vignette", ""),
                    "patient_history": item.get("patient_history"),
                    "examination_findings": item.get("examination_findings"),
                    "investigations": item.get("investigations"),
                    "questions": item.get("questions", []),
                    "region": item.get("region", region),
                    "high_yield": item.get("high_yield", False),
                    "source_reference": item.get("source_reference", ""),
                }
                supabase.table("case_studies").insert(row).execute()
            else:
                # Determine difficulty: from item, then arg, then default
                item_diff = item.get("difficulty", difficulty or "medium")
                row = {
                    "id": str(uuid.uuid4()),
                    "professions": [profession] if profession != "all" else ["pharmacy", "medicine", "nursing"],
                    "course": "Pharmacology",
                    "topic": topic,
                    "category": category or None,
                    "subtopic": item.get("subtopic") or subtopic_val,
                    "difficulty": item_diff,
                    "question_type": qtype,
                    "question_text": item.get("question_text", ""),
                    "options": item.get("options", []),
                    "correct_answer": item.get("correct_answer", "A"),
                    "explanation": item.get("explanation", ""),
                    "distractor_explanations": item.get("distractor_explanations", {}),
                    "image_url": None,
                    "region": item.get("region", region),
                    "source_reference": item.get("source_reference", ""),
                    "high_yield": item.get("high_yield", False),
                    "year_level": years,
                }
                supabase.table("questions").insert(row).execute()

            inserted += 1
        except Exception as e:
            print(f"  ⚠️  Insert error: {e}")

    print(f"  💾 Inserted {inserted}/{len(items)} into Supabase")
    return inserted

# ─── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Skoolie Question Generator")
    parser.add_argument("--type", choices=["mcq", "flashcard", "case_study"])
    parser.add_argument("--topic", help='e.g. "Cardiovascular System"')
    parser.add_argument("--category", default="", help='e.g. "Anatomy & Physiology", "Pharmacology", "Pathophysiology", "Clinicals"')
    parser.add_argument("--subtopic", default="", help='e.g. "Hypertension" (leave empty for flat/general)')
    parser.add_argument("--years", default="year3,year4", help='Comma-separated year levels, e.g. year1,year2,year3')
    parser.add_argument("--difficulty", default=None, choices=["easy", "medium", "hard"])
    parser.add_argument("--count", type=int, default=10)
    parser.add_argument("--profession", default="pharmacy")
    parser.add_argument("--region", default="universal", choices=["ghana", "universal"])
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--batch", help="JSON file with list of generation jobs")

    args = parser.parse_args()

    if args.batch:
        with open(args.batch) as f:
            jobs = json.load(f)
        total = 0
        for i, job in enumerate(jobs, 1):
            years_list = job.get("years", ["year3", "year4"])
            if isinstance(years_list, str):
                years_list = [y.strip() for y in years_list.split(",")]

            print(f"\n[{i}/{len(jobs)}] {job.get('type')} | {job.get('category','')} | {job.get('subtopic','flat')} | ×{job.get('count',10)}")
            n = generate_questions(
                qtype=job["type"],
                topic=job["topic"],
                category=job.get("category", ""),
                subtopic=job.get("subtopic", ""),
                years=years_list,
                count=job.get("count", 10),
                profession=job.get("profession", "pharmacy"),
                region=job.get("region", "universal"),
                difficulty=job.get("difficulty"),
                dry_run=args.dry_run,
            )
            total += n
            if i < len(jobs):
                time.sleep(3)
        print(f"\n🎉 Batch complete — {total} items generated/inserted")
    else:
        if not args.type or not args.topic:
            parser.error("--type and --topic are required (or use --batch)")
        years_list = [y.strip() for y in args.years.split(",")]
        generate_questions(
            qtype=args.type,
            topic=args.topic,
            category=args.category,
            subtopic=args.subtopic,
            years=years_list,
            count=args.count,
            profession=args.profession,
            region=args.region,
            difficulty=args.difficulty,
            dry_run=args.dry_run,
        )

if __name__ == "__main__":
    main()
