import fitz

pdf_path = '/sessions/keen-ecstatic-cannon/mnt/uploads/Lippincott Illustrated Reviews Pharmacology Seventh Edition-1b09fed5.pdf'
doc = fitz.open(pdf_path)

# Extract diuretics chapter and surrounding relevant pages
text = ''
for pg in range(654, 720):
    page = doc[pg]
    text += page.get_text()

print(text)
