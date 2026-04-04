import re

with open('../frontend/app/patient/page.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = re.sub(
    r'(const \[riskAssessment,[^\]]+\] = useState\s*<[^>]+>\s*\(null\))',
    r'\1\n  const [recoveryScore, setRecoveryScore] = useState<number | null>(null)',
    code
)

code = re.sub(
    r'(aiApi\.calculateRisk\(selectedUserId\)\.catch\(\(\) => null\),)',
    r'\1\n        aiApi.recoveryScore(selectedUserId).catch(() => null),',
    code
)

code = re.sub(
    r'\.then\(\(\[prog, sessions, rx, recs, recovery, adaptive, risk\]\) => \{',
    r'.then(([prog, sessions, rx, recs, recovery, adaptive, risk, recScore]) => {',
    code
)

code = re.sub(
    r'(if \(risk\) setRiskAssessment\(risk\))',
    r'\1\n          if (recScore) setRecoveryScore(recScore.recovery_score)',
    code
)

with open('../frontend/app/patient/page.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

