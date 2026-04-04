with open("frontend/lib/api.ts", "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace(
    '''  injury_type?: string
  severity?: string
}''',
    '''  injury_type?: string
  severity?: string
  has_alert?: boolean
}'''
)

with open("frontend/lib/api.ts", "w", encoding="utf-8") as f:
    f.write(text)
