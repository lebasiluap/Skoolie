import re
from collections import Counter

with open('/sessions/keen-ecstatic-cannon/mnt/Skoolie/scripts/med_repro_pharm_mcq.sql') as f:
    content = f.read()

inserts = re.split(r'(?=INSERT INTO questions)', content)
header = [i for i in inserts if 'INSERT INTO' not in i]
inserts = [i for i in inserts if 'INSERT INTO' in i]

# Current: easy=30, medium=40, hard=30
# Target:  easy=25, medium=50, hard=25
# We need to convert 5 easy -> medium and 5 hard -> medium

# Find easy questions and hard questions
easy_idxs = []
hard_idxs = []
for i, ins in enumerate(inserts):
    m = re.search(r"'(easy|medium|hard)'", ins)
    if m:
        if m.group(1) == 'easy':
            easy_idxs.append(i)
        elif m.group(1) == 'hard':
            hard_idxs.append(i)

print(f"Easy indices (first 5 to convert): {easy_idxs[:5]}")
print(f"Hard indices (first 5 to convert): {hard_idxs[:5]}")

# Convert last 5 easy -> medium, last 5 hard -> medium
# (use last ones to avoid changing early questions)
to_convert_easy = easy_idxs[-5:]
to_convert_hard = hard_idxs[-5:]

for idx in to_convert_easy:
    inserts[idx] = re.sub(r"'easy'", "'medium'", inserts[idx], count=1)

for idx in to_convert_hard:
    inserts[idx] = re.sub(r"'hard'", "'medium'", inserts[idx], count=1)

# Verify
difficulties = []
for ins in inserts:
    m = re.search(r"'(easy|medium|hard)'", ins)
    if m:
        difficulties.append(m.group(1))
print("New difficulty distribution:", Counter(difficulties))

# Write back
output = ''.join(header) + ''.join(inserts)
with open('/sessions/keen-ecstatic-cannon/mnt/Skoolie/scripts/med_repro_pharm_mcq.sql', 'w') as f:
    f.write(output)
print("File written successfully.")
