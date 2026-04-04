with open("frontend/app/doctor/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

import re
old = r'''                    <div className="flex items-center gap-3">
                      <Badge'''

new = '''                    <div className="flex items-center gap-3">
                      {patient.has_alert && (
                        <Badge variant="destructive" className="bg-red-500 hover:bg-red-600">
                          High Risk Alert
                        </Badge>
                      )}
                      <Badge'''

text = re.sub(old, new, text)

with open("frontend/app/doctor/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)
