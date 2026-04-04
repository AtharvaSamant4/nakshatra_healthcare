import re

with open('../frontend/app/patient/page.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = re.sub(
    r'\$\{recoveryScore\}\/100',
    r'\${recoveryScore}/100\',
    code
)

with open('../frontend/app/patient/page.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

