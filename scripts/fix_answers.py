import re

# The correct answers need to be properly distributed A/B/C/D
# I need to read each row, shuffle the options so the correct answer 
# rotates through A/B/C/D while keeping the content accurate

with open("/sessions/keen-ecstatic-cannon/mnt/Skoolie/scripts/med_resp_ap_mcq.sql") as f:
    content = f.read()

# Parse each row
# Each row starts with ('{"medicine"}' and ends with 14th Ed')
header = content.split('\n')[0] + '\n'
rows_raw = content[len(header):]

# Split on the row pattern - each row is a complete SQL values tuple
import json

# Use a smarter approach: find each row by tracking parentheses
lines = content.split('\n')
data_lines = [l for l in lines if l.startswith("('")]

print(f"Found {len(data_lines)} data rows")

# Target distribution: 25 each for A/B/C/D
target = ['A','B','C','D'] * 25
import random
random.seed(42)
random.shuffle(target)

# Track current and target answers
current_answers = []
for line in data_lines:
    matches = re.findall(r"\]','([ABCD])','", line)
    if matches:
        current_answers.append(matches[0])
    else:
        current_answers.append('?')

print("Current distribution:", {x: current_answers.count(x) for x in 'ABCD'})
print("Target distribution:", {x: target.count(x) for x in 'ABCD'})

# For each row, we need to rotate the options so that the correct answer
# appears at the target position
def rotate_options(options_json_str, current_correct, target_correct):
    """Rotate options array so correct answer is at target position"""
    # Parse the options
    options = json.loads(options_json_str)
    
    # Find current correct option index (0-based)
    curr_idx = ord(current_correct) - ord('A')
    tgt_idx = ord(target_correct) - ord('A')
    
    if curr_idx == tgt_idx:
        return options_json_str, current_correct
    
    # Get the correct option content (strip the letter prefix)
    correct_option = options[curr_idx]
    # Get the letter prefix from the correct option
    correct_content = re.sub(r'^[A-D]\.\s*', '', correct_option)
    
    # Rearrange: put correct option at target position
    # Build new options by rotating
    # Remove correct from current position, insert at target
    other_options = [opt for i, opt in enumerate(options) if i != curr_idx]
    
    # Reletter all options
    new_options = []
    other_idx = 0
    for i in range(4):
        letter = chr(ord('A') + i)
        if i == tgt_idx:
            new_options.append(f"{letter}. {correct_content}")
        else:
            # Take from other_options
            other_content = re.sub(r'^[A-D]\.\s*', '', other_options[other_idx])
            new_options.append(f"{letter}. {other_content}")
            other_idx += 1
    
    return json.dumps(new_options), target_correct

# Process each line
new_lines = []
answer_changes = 0
for i, line in enumerate(data_lines):
    if i >= len(target):
        new_lines.append(line)
        continue
    
    current_ans = current_answers[i]
    target_ans = target[i]
    
    if current_ans == target_ans or current_ans == '?':
        new_lines.append(line)
        continue
    
    # Find the options JSON array in the line
    # Pattern: ']' before correct_answer, '[' starts options
    # The options array is: '["A. ...","B. ...","C. ...","D. ..."]'
    options_match = re.search(r"'(\[\"[A-D]\..+?\])'", line)
    if not options_match:
        new_lines.append(line)
        continue
    
    old_options_str = options_match.group(1)
    try:
        new_options_str, new_ans = rotate_options(old_options_str, current_ans, target_ans)
        # Replace in the line
        # Replace old correct_answer
        new_line = line.replace(old_options_str, "'" + new_options_str.replace("'", "''") + "'")
        # This is getting complex - let's do a simpler replacement
        # Replace ]','X',' pattern with ]','Y',
        new_line = line.replace(
            old_options_str + f"','{current_ans}','",
            "'" + new_options_str + f"','{new_ans}','"
        )
        if new_line != line:
            new_lines.append(new_line)
            answer_changes += 1
        else:
            new_lines.append(line)
    except Exception as e:
        print(f"Error on row {i}: {e}")
        new_lines.append(line)

print(f"\nMade {answer_changes} answer changes")

# Check new distribution
new_answers = []
for line in new_lines:
    matches = re.findall(r"\]','([ABCD])','", line)
    if matches:
        new_answers.append(matches[0])

print("New distribution:", {x: new_answers.count(x) for x in 'ABCD'})

# Write the fixed file
with open("/sessions/keen-ecstatic-cannon/mnt/Skoolie/scripts/med_resp_ap_mcq.sql", 'w') as f:
    f.write(header)
    f.write(',\n'.join(new_lines))
    f.write('\n);\n')

print("Fixed file written!")

# Final verification
with open("/sessions/keen-ecstatic-cannon/mnt/Skoolie/scripts/med_resp_ap_mcq.sql") as f:
    final_content = f.read()
final_lines = [l for l in final_content.split('\n') if l.startswith("('")]
final_answers = []
for line in final_lines:
    m = re.findall(r"\]','([ABCD])','", line)
    if m:
        final_answers.append(m[0])
print(f"Final row count: {len(final_lines)}")
print(f"Final answer distribution: A={final_answers.count('A')}, B={final_answers.count('B')}, C={final_answers.count('C')}, D={final_answers.count('D')}")
