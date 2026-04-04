with open("frontend/app/doctor/[patientId]/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

import re

# 1. Add ID to the Card
old_card = r"<Card key=\{r\.id \?\? i\}>"
new_card = r'''<Card key={r.id ?? i} id={`report-${r.id ?? i}`}>'''
text = re.sub(old_card, new_card, text)

# 2. Add Button if not already correctly placed. Wait, I injected it previously.
# Let's see what I injected:
# `onClick={(e) => { e.stopPropagation(); alert("Downloading PDF..."); }}` 
# I need to change that to `downloadPdf(r.id ?? String(i), i)`!

old_btn = r'''                                onClick={\(e\) => \{
                                  e\.stopPropagation\(\);
                                  alert\("Downloading PDF\.\.\."\);
                                \}\}'''
new_btn = r'''                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadPdf(r.id ?? String(i), i + 1);
                                }}'''
text = re.sub(old_btn, new_btn, text)

# Did I even add the button correctly? Let's fix if my first injection was partial.
with open("frontend/app/doctor/[patientId]/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

