import re

with open('frontend/app/patient/page.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = re.sub(
    r'(const \[adaptivePlan[^\]]+\] = useState\s*<[^>]+>\s*\(null\))',
    r'\1\n  const [riskAssessment, setRiskAssessment] = useState<{ risk_level: string; reasons: string[] } | null>(null)',
    code
)

code = re.sub(
    r'(aiApi\.adaptivePlan\(selectedUserId\)\.catch\(\(\) => null\),)',
    r'\1\n        aiApi.calculateRisk(selectedUserId).catch(() => null),',
    code
)

code = re.sub(
    r'\.then\(\(\[prog, sessions, rx, recs, recovery, adaptive\]\) => \{',
    r'.then(([prog, sessions, rx, recs, recovery, adaptive, risk]) => {',
    code
)

code = re.sub(
    r'(if \(adaptive\) setAdaptivePlan\(adaptive\))',
    r'\1\n          if (risk) setRiskAssessment(risk)',
    code
)

insert_ui = '''
          {/* Risk Assessment */}
          {riskAssessment && riskAssessment.risk_level === 'high' && (
            <Card className="border-red-500/50 shadow-sm mt-6 mb-6 bg-red-50/50 dark:bg-red-950/20">
              <CardHeader>
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <span className="text-xl"></span>
                  <CardTitle className="text-lg">High Risk</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-1 text-red-800 dark:text-red-200">
                  {riskAssessment.reasons.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
'''

code = re.sub(
    r'(\{\/\* AI Adaptive Plan \*\/\})',
    insert_ui.strip() + r'\n\n          \1',
    code
)

with open('frontend/app/patient/page.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

