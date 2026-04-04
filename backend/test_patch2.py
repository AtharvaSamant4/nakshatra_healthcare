path = 'c:/OLD D DRIVE/Nakshatra Hackathon Prototype/nakshatra_healthcare/frontend/components/dashboard/ai-recommendation.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

old_text = '''  const warnings = recommendation.warnings || []
  const exercises = recommendation.recommended_exercises || []'''

new_text = '''  const warnings = Array.isArray(recommendation?.warnings) ? recommendation.warnings : []
  const exercises = Array.isArray(recommendation?.recommended_exercises) ? recommendation.recommended_exercises : []'''

text = text.replace(old_text, new_text)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
