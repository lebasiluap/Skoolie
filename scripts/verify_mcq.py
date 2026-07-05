import re

with open('/sessions/keen-ecstatic-cannon/mnt/Skoolie/scripts/med_renal_pharm_mcq.sql') as f:
    content = f.read()

answers = re.findall(r",'([ABCD])','", content)
print(f"Total answers: {len(answers)}")
print("Answer distribution:", {a: answers.count(a) for a in 'ABCD'})
print("Per-subtopic (groups of 10):")
for i in range(10):
    group = answers[i*10:(i+1)*10]
    expected = ['A','B','C','D','A','B','C','D','A','B']
    match = group == expected
    print(f"  Subtopic {i+1}: {group} {'OK' if match else 'MISMATCH'}")

# Also verify flashcards
with open('/sessions/keen-ecstatic-cannon/mnt/Skoolie/scripts/med_renal_pharm_fc.sql') as f:
    fc_content = f.read()
fc_answers = re.findall(r",'([ABCD])','", fc_content)
print(f"\nFC Total: {len(fc_answers)}, All A: {all(a=='A' for a in fc_answers)}")
print(f"MCQ count: {content.count('INSERT INTO')}")
print(f"FC count: {fc_content.count('INSERT INTO')}")
