import re
import json
from supabase import create_client

url = "https://bqhiwlpmrejvjdljxspy.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxaGl3bHBtcmVqdmpkbGp4c3B5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzODEzMjIsImV4cCI6MjA5Njk1NzMyMn0.DvuXJ3yGAvGqBA9ZzZLuZktKkTPFpBYrTgOMhlEUBuA"
supabase = create_client(url, key)


def parse_postgres_string(s):
    """Remove surrounding single quotes and unescape '' -> '"""
    if s.startswith("'") and s.endswith("'"):
        s = s[1:-1]
    return s.replace("''", "'")


def parse_value_tuple(raw_tuple_str):
    """Parse a single SQL value tuple string into a list of raw field strings."""
    fields = []
    i = 0
    s = raw_tuple_str.strip()

    # Remove outer parentheses
    if s.startswith('('):
        s = s[1:]
    if s.endswith(')'):
        s = s[:-1]

    current = ''
    in_string = False

    while i < len(s):
        c = s[i]

        if in_string:
            if c == "'" and i + 1 < len(s) and s[i + 1] == "'":
                # Escaped quote
                current += "''"
                i += 2
                continue
            elif c == "'":
                # End of string
                current += c
                in_string = False
                i += 1
                continue
            else:
                current += c
                i += 1
                continue
        else:
            if c == "'":
                in_string = True
                current += c
                i += 1
                continue
            elif c == ',':
                fields.append(current.strip())
                current = ''
                i += 1
                continue
            else:
                current += c
                i += 1
                continue

    if current.strip():
        fields.append(current.strip())

    return fields


def parse_professions(raw):
    """Parse '{"medicine"}' -> ['medicine']"""
    val = parse_postgres_string(raw)
    val = val.strip('{}')
    items = [x.strip().strip('"') for x in val.split(',') if x.strip()]
    return items


def parse_year_level(raw):
    """Parse '{year1,year2,...}' -> ['year1','year2',...]"""
    val = parse_postgres_string(raw)
    val = val.strip('{}')
    items = [x.strip() for x in val.split(',') if x.strip()]
    return items


def parse_options(raw):
    """Parse JSON array string from a quoted SQL value."""
    val = parse_postgres_string(raw)
    return json.loads(val)


def parse_bool(raw):
    """Parse true/false -> Python bool"""
    return raw.strip().lower() == 'true'


def parse_sql_file(filepath):
    """Read SQL file and extract all INSERT row tuples."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    match = re.search(r'VALUES\s*\n(.*)', content, re.DOTALL)
    if not match:
        raise ValueError(f"Could not find VALUES block in {filepath}")

    values_block = match.group(1).strip().rstrip(';').strip()

    rows_raw = []
    i = 0
    s = values_block
    depth = 0
    in_string = False
    current = ''

    while i < len(s):
        c = s[i]

        if in_string:
            if c == "'" and i + 1 < len(s) and s[i + 1] == "'":
                current += "''"
                i += 2
                continue
            elif c == "'":
                current += c
                in_string = False
                i += 1
                continue
            else:
                current += c
                i += 1
                continue
        else:
            if c == "'":
                in_string = True
                current += c
                i += 1
                continue
            elif c == '(':
                depth += 1
                current += c
                i += 1
                continue
            elif c == ')':
                depth -= 1
                current += c
                i += 1
                if depth == 0:
                    rows_raw.append(current.strip())
                    current = ''
                    while i < len(s) and s[i] in (',', '\n', '\r', ' ', '\t'):
                        i += 1
                    continue
                continue
            else:
                current += c
                i += 1
                continue

    if current.strip():
        rows_raw.append(current.strip())

    return rows_raw


def build_record(fields):
    """Map 15 parsed fields to a dict for Supabase insertion."""
    if len(fields) != 15:
        raise ValueError(f"Expected 15 fields, got {len(fields)}: {fields}")

    (f_professions, f_course, f_topic, f_category, f_subtopic,
     f_difficulty, f_question_type, f_question_text, f_options,
     f_correct_answer, f_explanation, f_region, f_high_yield,
     f_year_level, f_source_reference) = fields

    return {
        'professions': parse_professions(f_professions),
        'course': parse_postgres_string(f_course),
        'topic': parse_postgres_string(f_topic),
        'category': parse_postgres_string(f_category),
        'subtopic': parse_postgres_string(f_subtopic),
        'difficulty': parse_postgres_string(f_difficulty),
        'question_type': parse_postgres_string(f_question_type),
        'question_text': parse_postgres_string(f_question_text),
        'options': parse_options(f_options),
        'correct_answer': parse_postgres_string(f_correct_answer),
        'explanation': parse_postgres_string(f_explanation),
        'region': parse_postgres_string(f_region),
        'high_yield': parse_bool(f_high_yield),
        'year_level': parse_year_level(f_year_level),
        'source_reference': parse_postgres_string(f_source_reference),
    }


def insert_file(filepath, label, batch_size=20):
    print(f"\n{'='*60}")
    print(f"Processing: {label}")
    print(f"File: {filepath}")

    rows_raw = parse_sql_file(filepath)
    print(f"Found {len(rows_raw)} row tuples")

    records = []
    for idx, raw in enumerate(rows_raw):
        try:
            fields = parse_value_tuple(raw)
            record = build_record(fields)
            records.append(record)
        except Exception as e:
            print(f"  ERROR parsing row {idx + 1}: {e}")
            print(f"  Raw (first 200 chars): {raw[:200]}")
            raise

    print(f"Parsed {len(records)} records successfully")

    total_inserted = 0
    for batch_start in range(0, len(records), batch_size):
        batch = records[batch_start:batch_start + batch_size]
        batch_end = batch_start + len(batch)
        try:
            result = supabase.table('questions').insert(batch).execute()
            inserted_count = len(result.data) if result.data else 0
            total_inserted += inserted_count
            print(f"  Batch {batch_start + 1}-{batch_end}: inserted {inserted_count} rows")
        except Exception as e:
            print(f"  ERROR inserting batch {batch_start + 1}-{batch_end}: {e}")
            raise

    print(f"Total inserted from {label}: {total_inserted}")
    return total_inserted


if __name__ == '__main__':
    mcq_file = '/sessions/keen-ecstatic-cannon/mnt/Skoolie/scripts/med_cvs_ap_mcq.sql'
    fc_file = '/sessions/keen-ecstatic-cannon/mnt/Skoolie/scripts/med_cvs_ap_fc.sql'

    total_mcq = insert_file(mcq_file, 'CVS A&P MCQs (100 questions)')
    total_fc = insert_file(fc_file, 'CVS A&P Flashcards (100 cards)')

    print(f"\n{'='*60}")
    print(f"FINAL SUMMARY")
    print(f"  MCQ rows inserted:       {total_mcq}")
    print(f"  Flashcard rows inserted: {total_fc}")
    print(f"  TOTAL:                   {total_mcq + total_fc}")
