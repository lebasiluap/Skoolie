import fitz

pdf_path = '/sessions/keen-ecstatic-cannon/mnt/uploads/Lippincott Illustrated Reviews Pharmacology Seventh Edition-1b09fed5.pdf'
doc = fitz.open(pdf_path)

# Extract diuretics chapter (pages 654-695 = index 654-695)
text = ''
for pg in range(654, 700):
    page = doc[pg]
    text += page.get_text()

print(text[:6000])
