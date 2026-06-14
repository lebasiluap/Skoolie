#!/usr/bin/env python3
"""
Skoolie Question Generator
==========================
Generates MCQs, flashcards, and case studies using Claude API
and inserts them directly into Supabase.

Usage:
  python3 generate_questions.py --type mcq --topic "Cardiovascular System" --subtopic "Hypertension" --year year3 --count 20
  python3 generate_questions.py --type flashcard --topic "Cardiovascular System" --year year2 --count 30
  python3 generate_questions.py --type case_study --topic "Cardiovascular System" --subtopic "Heart Failure" --year year5 --count 5

Requirements:
  pip install anthropic supabase python-dotenv

Environment variables (create a .env file in project root):
  ANTHROPIC_API_KEY=sk-ant-...
  SUPABASE_URL=https://bqhiwlpmrejvjdljxspy.supabase.co
  SUPABASE_SERVICE_KEY=...   (service role key, not anon key)
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

# ─── Year level definitions ────────────────────────────────────────────────────

YEAR_PROFILES = {
    "year1": {
        "description": "First year PharmD student. Basic sciences, pharmacology fundamentals, drug nomenclature, basic pharmacokinetics (ADME), simple mechanisms of action.",
        "difficulty": "easy",
        "focus": "foundational concepts, drug names, basic mechanisms, terminology"
    },
    "year2": {
        "description": "Second year PharmD student. Intermediate pharmacology, drug classes, adverse effects, basic drug interactions, simple therapeutic decisions.",
        "difficulty": "easy",
        "focus": "drug classes, common ADRs, simple interactions, basic counselling"
    },
    "year3": {
        "description": "Third year PharmD student. Clinical pharmacology, evidence-based therapy selection, monitoring parameters, significant drug interactions.",
        "difficulty": "medium",
        "focus": "therapy selection, monitoring, significant interactions, guideline-based decisions"
    },
    "year4": {
        "description": "Fourth year PharmD student. Therapeutics, complex drug interactions, special populations (renal/hepatic impairment, pregnancy, elderly), pharmacoeconomics.",
        "difficulty": "medium",
        "focus": "complex therapeutics, special populations, CYP450, renal/hepatic dosing adjustments"
    },
    "year5": {
        "description": "Fifth year PharmD student. Advanced clinical pharmacy, clinical decision making, complex multi-drug regimens, rare complications, evidence appraisal.",
        "difficulty": "hard",
        "focus": "advanced clinical decisions, complex cases, evidence-based medicine, rare but important scenarios"
    },
    "year6": {
        "description": "Sixth year PharmD student / final year. Comprehensive therapeutics, OSCE-level clinical skills, advanced counselling, complex case management.",
        "difficulty": "hard",
        "focus": "comprehensive clinical management, OSCE competencies, advanced patient assessment"
    },
    "practitioner": {
        "description": "Practising pharmacist / intern. High-complexity clinical scenarios, unusual presentations, drug safety signals, evolving guidelines, specialist knowledge.",
        "difficulty": "hard",
        "focus": "specialist knowledge, unusual presentations, cutting-edge guidelines, drug safety"
    },
}

# ─── MCQ prompt ───────────────────────────────────────────────────────────────

MCQ_SYSTEM = """You are an expert pharmacy educator and question writer for a 6-year PharmD programme in Ghana, West Africa.
You write high-quality, clinically relevant multiple-choice questions (MCQs) for the Skoolie medical education app.

SOURCES to draw from:
- BNF 83 (British National Formulary)
- Clinical Pharmacy & Therapeutics (Roger Walker)
- Koda-Kimble Applied Therapeutics
- Lippincott Illustrated Reviews: Pharmacology (7th Ed)
- Pharmacotherapy: A Pathophysiologic Approach (DiPiro, 7th Ed)
- Ghana Standard Treatment Guidelines
- West African Postgraduate College of Pharmacists (WAPCP) standards

QUESTION QUALITY RULES:
1. Each question must have EXACTLY 4 options (A, B, C, D)
2. Only ONE answer is definitively correct — no ambiguity
3. Distractors must be plausible but clearly wrong on reflection
4. All options must be similar in length and structure (no giveaway formatting)
5. Avoid "all of the above" / "none of the above"
6. Never repeat stems or options across questions in the same batch
7. Include Ghana/West Africa context where relevant (e.g. available drugs, local guidelines)
8. Explanation must be 2-4 sentences: explain WHY the correct answer is right AND briefly address the key distractor
9. distractor_explanations: provide a short explanation for each WRONG option

OUTPUT FORMAT — return a JSON array only, no markdown fences, no commentary:
[
  {
    "question_text": "...",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correct_answer": "A",
    "explanation": "...",
    "distractor_explanations": {"B": "...", "C": "...", "D": "..."},
    "subtopic": "...",
    "high_yield": true,
    "source_reference": "BNF 83, p.XXX / DiPiro Ch.XX"
  }
]"""

def build_mcq_prompt(topic, subtopic, year, count, profession):
    profile = YEAR_PROFILES[year]
    sub_instruction = f"Focus specifically on the subtopic: **{subtopic}**." if subtopic else "Cover the full breadth of the topic, varying subtopics."
    return f"""Generate {count} MCQ questions on the topic: **{topic}**.
{sub_instruction}

TARGET AUDIENCE: {profile['description']}
DIFFICULTY: {profile['difficulty']}
FOCUS: {profile['focus']}
PROFESSION: {profession}

Vary the cognitive level across questions:
- ~30% recall (drug name, mechanism, dose)
- ~40% application (which drug for this patient, what to monitor)
- ~30% analysis (why is this wrong, what is the interaction, what happens next)

Make questions specific, not vague. Use realistic patient scenarios where appropriate.
All questions should be appropriate for a pharmacy student at year {year[-1] if year != 'practitioner' else '6+'} level."""

# ─── Flashcard prompt ──────────────────────────────────────────────────────────

FLASHCARD_SYSTEM = """You are an expert pharmacy educator creating flashcards for the Skoolie app for PharmD students in Ghana.

Flashcards are for RAPID RECALL of key facts. They are NOT full clinical scenarios.
Good flashcard fronts: drug mechanism, key monitoring parameter, specific dose, drug of choice for X, first-line agent for Y,
classic side effect, specific contraindication, key drug interaction, pharmacokinetic fact.

FLASHCARD FORMAT:
- question_text (front): A short, direct question or "fill in the blank" prompt
- The "answer" is embedded as the correct_answer option (option A) — a concise fact
- options: ["A. [THE ANSWER]", "B. [plausible wrong]", "C. [plausible wrong]", "D. [plausible wrong]"]
- correct_answer: always "A"
- explanation: 1-2 sentences expanding on WHY this is the answer + 1 key clinical pearl
- distractor_explanations: brief note on each distractor

OUTPUT FORMAT — JSON array only, no markdown:
[
  {
    "question_text": "What is the mechanism of action of spironolactone in heart failure?",
    "options": ["A. Aldosterone receptor antagonist — blocks sodium retention and potassium excretion in the collecting duct", "B. Loop diuretic — inhibits Na/K/2Cl co-transporter in the thick ascending limb", "C. Thiazide diuretic — inhibits NaCl co-transporter in the distal convoluted tubule", "D. Carbonic anhydrase inhibitor — reduces bicarbonate reabsorption in the proximal tubule"],
    "correct_answer": "A",
    "explanation": "Spironolactone competitively blocks aldosterone at the mineralocorticoid receptor, reducing sodium retention and potassium loss. In HFrEF, it also attenuates cardiac fibrosis and remodelling, contributing to its mortality benefit (RALES trial).",
    "distractor_explanations": {"B": "Loop diuretics (furosemide) act on the thick ascending limb.", "C": "Thiazides act on the DCT.", "D": "Acetazolamide is a carbonic anhydrase inhibitor."},
    "subtopic": "Heart Failure",
    "high_yield": true,
    "source_reference": "BNF 83; Lippincott Pharmacology Ch.16"
  }
]"""

def build_flashcard_prompt(topic, subtopic, year, count, profession):
    profile = YEAR_PROFILES[year]
    sub_instruction = f"Focus on subtopic: **{subtopic}**." if subtopic else "Cover the full breadth of the topic across subtopics."
    return f"""Generate {count} flashcard questions on: **{topic}**.
{sub_instruction}

TARGET AUDIENCE: {profile['description']}
FOCUS: {profile['focus']}
PROFESSION: {profession}

Cover a mix of:
- Drug mechanisms (MOA)
- Key monitoring parameters and target values
- Dose ranges and frequency
- Classic/important adverse effects
- Key contraindications
- Important drug interactions
- Drug of choice questions
- Pharmacokinetic facts (half-life, renal clearance, etc.)
- Counselling key points

Each flashcard must test ONE specific fact. No compound questions."""

# ─── Case study prompt ─────────────────────────────────────────────────────────

CASE_STUDY_SYSTEM = """You are an expert clinical pharmacy educator creating case studies for the Skoolie app for PharmD students in Ghana.

You create two styles:
1. MULTI_QUESTION (years 1-4): A focused clinical vignette (100-200 words) followed by 3-5 MCQ-style sub-questions that build on each other
2. OSCE (years 5-6, practitioner): A comprehensive OSCE-style case with full patient history, vitals, labs, and 5-8 progressive decision-making questions

ALL sub-questions follow standard MCQ format (4 options A-D, one correct).

OUTPUT FORMAT — JSON array, no markdown:
[
  {
    "title": "Case title (e.g. 'A 58-year-old with uncontrolled hypertension and CKD')",
    "style": "multi_question",   // or "osce"
    "difficulty": "medium",
    "subtopic": "Hypertension",
    "clinical_vignette": "Full scenario paragraph...",
    "patient_history": {    // null for multi_question, full object for osce
      "age": 58, "sex": "Male", "weight_kg": 82, "height_cm": 172,
      "chief_complaint": "...", "hpi": "...", "pmh": "...",
      "current_medications": ["..."], "allergies": "NKDA",
      "family_history": "...", "social_history": "..."
    },
    "examination_findings": {   // null for multi_question
      "vitals": {"bp": "178/102 mmHg", "hr": "84 bpm", "rr": "16/min", "temp": "36.8°C", "spo2": "98%"},
      "general": "...", "cardiovascular": "...", "respiratory": "...", "other": "..."
    },
    "investigations": {   // null for multi_question
      "bloods": {"Na": "138", "K": "5.2", "Cr": "198 µmol/L", "eGFR": "32", "HbA1c": "7.8%"},
      "ecg": "...", "imaging": "...", "other": "..."
    },
    "questions": [
      {
        "question_number": 1,
        "question_text": "...",
        "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
        "correct_answer": "B",
        "explanation": "...",
        "distractor_explanations": {"A": "...", "C": "...", "D": "..."},
        "marks": 2,
        "learning_objective": "Select appropriate antihypertensive in CKD"
      }
    ],
    "high_yield": true,
    "source_reference": "DiPiro Ch.XX; Ghana STG 2022",
    "region": "ghana"
  }
]"""

def build_case_study_prompt(topic, subtopic, year, count, profession):
    profile = YEAR_PROFILES[year]
    is_advanced = year in ['year5', 'year6', 'practitioner']
    style = "osce" if is_advanced else "multi_question"
    q_count = "5-8 sub-questions" if is_advanced else "3-5 sub-questions"
    sub_instruction = f"Focus on subtopic: **{subtopic}**." if subtopic else "Vary the subtopics across cases."

    return f"""Generate {count} case stud{'y' if count == 1 else 'ies'} on: **{topic}**.
{sub_instruction}

STYLE: {style.upper()} ({q_count} per case)
TARGET AUDIENCE: {profile['description']}
DIFFICULTY: {profile['difficulty']}
FOCUS: {profile['focus']}
PROFESSION: {profession}
REGION: Ghana/West Africa — use locally available drugs and realistic Ghanaian patient contexts

{'Include FULL patient history, vitals, and investigation results. Cases should reflect complex real-world presentations.' if is_advanced else 'Keep vignette concise (100-200 words). Questions should build progressively from diagnosis → drug selection → monitoring → counselling.'}

Each sub-question must be DIFFERENT in what it tests:
- Q1: Diagnosis / interpretation
- Q2: Drug selection / first-line therapy
- Q3: Monitoring / dose adjustment
- Q4: Adverse effect / interaction
- Q5+: Counselling / special population / escalation

Make cases reflect real Ghanaian clinical contexts (KBTH, Korle Bu, district hospital settings)."""

# ─── Core generation function ──────────────────────────────────────────────────

def generate_questions(qtype, topic, subtopic, year, count, profession, region, dry_run=False):
    if qtype == "mcq":
        system = MCQ_SYSTEM
        user_prompt = build_mcq_prompt(topic, subtopic, year, count, profession)
        difficulty = YEAR_PROFILES[year]["difficulty"]
    elif qtype == "flashcard":
        system = FLASHCARD_SYSTEM
        user_prompt = build_flashcard_prompt(topic, subtopic, year, count, profession)
        difficulty = YEAR_PROFILES[year]["difficulty"]
    elif qtype == "case_study":
        system = CASE_STUDY_SYSTEM
        user_prompt = build_case_study_prompt(topic, subtopic, year, count, profession)
        difficulty = YEAR_PROFILES[year]["difficulty"]
    else:
        raise ValueError(f"Unknown question type: {qtype}")

    year_level_arr = [year]

    print(f"\n🤖 Calling Claude API ({qtype}, {topic}, {subtopic or 'all subtopics'}, {year}, ×{count})...")

    response = claude.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=8192,
        system=system,
        messages=[{"role": "user", "content": user_prompt}]
    )

    raw = response.content[0].text.strip()

    # Strip markdown fences if Claude included them
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    if raw.endswith("```"):
        raw = raw.rsplit("```", 1)[0]

    try:
        items = json.loads(raw.strip())
    except json.JSONDecodeError as e:
        print(f"❌ JSON parse error: {e}")
        print("Raw output saved to /tmp/skoolie_last_output.txt")
        with open("/tmp/skoolie_last_output.txt", "w") as f:
            f.write(raw)
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
                    "subtopic": item.get("subtopic", subtopic or topic),
                    "title": item.get("title", f"Case study: {subtopic or topic}"),
                    "year_level": year_level_arr,
                    "style": item.get("style", "multi_question"),
                    "difficulty": item.get("difficulty", difficulty),
                    "clinical_vignette": item.get("clinical_vignette", ""),
                    "patient_history": item.get("patient_history"),
                    "examination_findings": item.get("examination_findings"),
                    "investigations": item.get("investigations"),
                    "questions": item.get("questions", []),
                    "region": item.get("region", region),
                    "high_yield": item.get("high_yield", False),
                    "source_reference": item.get("source_reference", ""),
                }
                result = supabase.table("case_studies").insert(row).execute()
            else:
                row = {
                    "id": str(uuid.uuid4()),
                    "professions": [profession] if profession != "all" else ["pharmacy", "medicine", "nursing"],
                    "course": "Pharmacology",
                    "topic": topic,
                    "subtopic": item.get("subtopic", subtopic or topic),
                    "difficulty": item.get("difficulty", difficulty),
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
                    "year_level": year_level_arr,
                }
                result = supabase.table("questions").insert(row).execute()

            inserted += 1
        except Exception as e:
            print(f"  ⚠️  Insert error: {e}")

    print(f"  💾 Inserted {inserted}/{len(items)} into Supabase")
    return inserted

# ─── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Skoolie Question Generator")
    parser.add_argument("--type", choices=["mcq", "flashcard", "case_study"], required=True)
    parser.add_argument("--topic", required=True, help='e.g. "Cardiovascular System"')
    parser.add_argument("--subtopic", default=None, help='e.g. "Hypertension"')
    parser.add_argument("--year", choices=list(YEAR_PROFILES.keys()), default="year3")
    parser.add_argument("--count", type=int, default=10)
    parser.add_argument("--profession", default="pharmacy", help="pharmacy / medicine / nursing / all")
    parser.add_argument("--region", default="universal", choices=["ghana", "universal"])
    parser.add_argument("--dry-run", action="store_true", help="Generate but don't insert — print first item")
    parser.add_argument("--batch", help="JSON file with list of generation jobs to run sequentially")

    args = parser.parse_args()

    if args.batch:
        # Batch mode: run multiple generation jobs from a JSON config file
        with open(args.batch) as f:
            jobs = json.load(f)
        total = 0
        for i, job in enumerate(jobs, 1):
            print(f"\n[{i}/{len(jobs)}] {job}")
            n = generate_questions(
                qtype=job["type"],
                topic=job["topic"],
                subtopic=job.get("subtopic"),
                year=job.get("year", "year3"),
                count=job.get("count", 10),
                profession=job.get("profession", "pharmacy"),
                region=job.get("region", "universal"),
                dry_run=args.dry_run,
            )
            total += n
            if i < len(jobs):
                time.sleep(2)  # Avoid rate limits
        print(f"\n🎉 Batch complete — {total} items generated/inserted")
    else:
        generate_questions(
            qtype=args.type,
            topic=args.topic,
            subtopic=args.subtopic,
            year=args.year,
            count=args.count,
            profession=args.profession,
            region=args.region,
            dry_run=args.dry_run,
        )

if __name__ == "__main__":
    main()
