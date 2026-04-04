path = 'c:/OLD D DRIVE/Nakshatra Hackathon Prototype/nakshatra_healthcare/frontend/components/dashboard/ai-recommendation.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

old_text = '''  const compositePercent = Math.round((recommendation.composite_score ?? 0) * 100)
  const warnings = recommendation.warnings ?? []
  const exercises = recommendation.recommended_exercises ?? []'''

new_text = '''  const compositePercent = Math.round((recommendation.composite_score ?? 0) * 100)
  const warnings = recommendation.warnings || []
  const exercises = recommendation.recommended_exercises || []
  console.log('recommendation', recommendation, 'warnings:', warnings, 'exercises:', exercises)'''

text = text.replace(old_text, new_text)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
