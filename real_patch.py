with open("frontend/app/doctor/[patientId]/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

target = '                          </div>\n                        </div>\n                      </CardHeader>'
replacement = '''                            <Button
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
                      </CardHeader>'''

text = text.replace(target, replacement)
with open("frontend/app/doctor/[patientId]/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)
print("Should be applied!")
