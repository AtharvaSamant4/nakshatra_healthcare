with open("frontend/app/doctor/[patientId]/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

import re

old = r'''                              \{rj\.risk_level && \(
                                <span className=\{`text-xs font-medium px-2 py-0\.5 rounded-full flex items-center gap-1 \$\{
                                  rj\.risk_level === "high" \? "bg-red-100 text-red-700" :
                                  rj\.risk_level === "medium" \? "bg-yellow-100 text-yellow-700" :
                                  "bg-green-100 text-green-700"
                                \}`\}>
                                  \{rj\.risk_level === "high" && <AlertTriangle className="h-3 w-3" />\}
                                  \{rj\.risk_level\} risk
                                </span>
                              \)\}'''

new = r'''                              {rj.risk_level && (
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                  rj.risk_level === "high" ? "bg-red-100 text-red-700" :
                                  rj.risk_level === "medium" ? "bg-yellow-100 text-yellow-700" :
                                  "bg-green-100 text-green-700"
                                }`}>
                                  {rj.risk_level === "high" && <AlertTriangle className="h-3 w-3" />}
                                  {rj.risk_level} risk
                                </span>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs flex items-center gap-1 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadPdf(r.id ?? String(i), i);
                                }}
                              >
                                <Download className="h-3 w-3" />
                                PDF
                              </Button>'''

text, count = re.subn(old, new, text)
print("Replaced:", count)

with open("frontend/app/doctor/[patientId]/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

