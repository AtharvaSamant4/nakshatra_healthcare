with open("frontend/app/doctor/[patientId]/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

target = "                              )}\n                            </div>\n                          </div>\n                        </CardHeader>"
replacement = """                              )}
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
                              </Button>
                            </div>
                          </div>
                        </CardHeader>"""

if target in text:
    print("Found target!")
    text = text.replace(target, replacement)
    with open("frontend/app/doctor/[patientId]/page.tsx", "w", encoding="utf-8") as f:
        f.write(text)
else:
    print("Target not found. Doing chunk fallback.")
    target2 = '                              )}\n                            </div>'
    if target2 in text:
        print("Found smaller target")
        # Ensure we only replace the specific one we know goes with the CardTitle
        splits = text.split("</CardTitle>\n                            <div className=\"flex gap-2\">\n")
        new_text = splits[0] + "</CardTitle>\n                            <div className=\"flex gap-2\">\n" + splits[1].replace(target2, """                              )}
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
                              </Button>
                            </div>""", 1)
        
        with open("frontend/app/doctor/[patientId]/page.tsx", "w", encoding="utf-8") as f:
            f.write(new_text)

