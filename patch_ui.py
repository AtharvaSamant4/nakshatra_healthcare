with open("frontend/app/patient/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

import re
old = 'description="Overall rating"'
new = 'description={improvement != null ? `${improvement > 0 ? "+" : ""}${improvement}% improvement from last week` : "Overall rating"}'

text = text.replace(old, new)

with open("frontend/app/patient/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)
