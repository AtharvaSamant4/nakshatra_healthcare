import re

with open('../frontend/app/patient/page.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = re.sub(
    r'className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"',
    r'className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6"',
    code
)

insert_stat = '''            <StatsCard
              title="Recovery Score"
              value={loading ? "—" : recoveryScore != null ? ${recoveryScore}/100 : "N/A"}
              description="Overall rating"
              icon={Target}
            />
'''

code = re.sub(
    r'(<StatsCard\s+title="Total Sessions")',
    insert_stat + r'\1',
    code
)

with open('../frontend/app/patient/page.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

