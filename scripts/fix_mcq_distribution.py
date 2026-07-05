import re
import json

# Read the file
with open('/sessions/keen-ecstatic-cannon/mnt/Skoolie/scripts/med_repro_pharm_mcq.sql', 'r') as f:
    content = f.read()

# Split into individual INSERT statements
# Each INSERT starts with "INSERT INTO questions"
inserts = re.split(r'(?=INSERT INTO questions)', content)
inserts = [i for i in inserts if i.strip()]

print(f"Total INSERT statements found: {len(inserts)}")

# Verify current distribution
current_answers = []
for ins in inserts:
    # Match: options JSON array, then ]','<LETTER>','
    m = re.search(r'\[("[^"]*"(?:,\s*"[^"]*")*)\]\',\'([ABCD])\'', ins)
    if m:
        current_answers.append(m.group(2))
    else:
        print(f"WARNING: Could not parse: {ins[:200]}")

from collections import Counter
print("Current distribution:", Counter(current_answers))

# Target distribution: questions 1-25 -> A, 26-50 -> B, 51-75 -> C, 76-100 -> D
def target_letter(idx):
    # idx is 0-based
    if idx < 25:
        return 'A'
    elif idx < 50:
        return 'B'
    elif idx < 75:
        return 'C'
    else:
        return 'D'

letter_to_idx = {'A': 0, 'B': 1, 'C': 2, 'D': 3}
idx_to_letter = {0: 'A', 1: 'B', 2: 'C', 3: 'D'}

def fix_insert(insert_str, question_num):
    """Fix one INSERT statement to have the target correct answer."""
    target = target_letter(question_num)
    
    # Find the options array and correct_answer
    # Pattern: ['...JSON array...']','<LETTER>','
    m = re.search(r"('\[.*?\]'),\s*'([ABCD])'", insert_str, re.DOTALL)
    if not m:
        print(f"Q{question_num+1}: Could not match pattern")
        return insert_str
    
    options_str_with_quotes = m.group(1)  # includes surrounding single quotes
    current_letter = m.group(2)
    
    if current_letter == target:
        # No change needed
        return insert_str
    
    # Parse the options JSON (remove the surrounding SQL single quotes)
    options_json_str = options_str_with_quotes[1:-1]  # strip leading/trailing '
    
    try:
        options = json.loads(options_json_str)
    except json.JSONDecodeError as e:
        print(f"Q{question_num+1}: JSON parse error: {e}")
        print(f"  JSON string: {options_json_str[:200]}")
        return insert_str
    
    if len(options) != 4:
        print(f"Q{question_num+1}: Expected 4 options, got {len(options)}")
        return insert_str
    
    # Extract the content after the letter prefix (e.g., "A. ", "B. ", etc.)
    # Options format: "A. some text", "B. some text", etc.
    def get_content(opt_str):
        # Remove the "X. " prefix
        m2 = re.match(r'^[ABCD]\.\s*(.*)', opt_str)
        if m2:
            return m2.group(1)
        return opt_str
    
    # Get contents of all options (text after prefix)
    contents = [get_content(opt) for opt in options]
    
    # The correct answer content is at current position
    curr_idx = letter_to_idx[current_letter]
    tgt_idx = letter_to_idx[target]
    
    correct_content = contents[curr_idx]
    
    # Swap: move correct content to target position, move whatever was at target to current position
    contents[curr_idx], contents[tgt_idx] = contents[tgt_idx], contents[curr_idx]
    
    # Rebuild options with fixed letter prefixes
    prefixes = ['A', 'B', 'C', 'D']
    new_options = [f"{prefixes[i]}. {contents[i]}" for i in range(4)]
    
    new_options_json = json.dumps(new_options)
    
    # Replace in the insert string
    old_segment = f"{options_str_with_quotes},'{current_letter}'"
    new_segment = f"'{new_options_json}','{target}'"
    
    if old_segment not in insert_str:
        print(f"Q{question_num+1}: Could not find old segment to replace")
        print(f"  Looking for: {old_segment[:100]}")
        return insert_str
    
    new_insert = insert_str.replace(old_segment, new_segment, 1)
    return new_insert

# Process all inserts
fixed_inserts = []
for i, ins in enumerate(inserts):
    fixed = fix_insert(ins, i)
    fixed_inserts.append(fixed)

# Verify new distribution
new_answers = []
for ins in fixed_inserts:
    m = re.search(r'\[("[^"]*"(?:,\s*"[^"]*")*)\]\',\'([ABCD])\'', ins)
    if m:
        new_answers.append(m.group(2))

print("New distribution:", Counter(new_answers))

# Write the fixed file
output = ''.join(fixed_inserts)
with open('/sessions/keen-ecstatic-cannon/mnt/Skoolie/scripts/med_repro_pharm_mcq.sql', 'w') as f:
    f.write(output)

print("File written successfully.")
