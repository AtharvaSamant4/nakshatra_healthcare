import re

with open('app/patient/page.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace /100 with \${recoveryScore}/100\
code = code.replace('{recoveryScore}/100', '{recoveryScore}/100')
# Need a proper replace
code = code.replace('? /100 :', '? ${recoveryScore}/100 :')
code = code.replace('? /100 :', '? ${recoveryScore}/100 :') 

with open('app/patient/page.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

