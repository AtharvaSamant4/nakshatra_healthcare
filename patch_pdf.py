with open("frontend/app/doctor/[patientId]/page.tsx", "r", encoding="utf-8") as f:
    lines = f.read()

import re

# Insert after the end of the gap-2 div
new_btn = """                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs flex items-center gap-1 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  alert("Downloading PDF...");
                                }}
                              >
                                <Download className="h-3 w-3" />
                                PDF
                              </Button>
                            </div>"""

res = re.sub(r"                              \)}\s+</div>", new_btn, lines)

with open("frontend/app/doctor/[patientId]/page.tsx", "w", encoding="utf-8") as f:
    f.write(res)
print("done")
