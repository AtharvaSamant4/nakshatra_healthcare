const fs = require('fs');
let txt = fs.readFileSync('frontend/lib/api.ts', 'utf-8');

if (!txt.includes('export function normalizeUserId')) {
  txt = txt.replace(
    'async function request<T>',
    'export function normalizeUserId(id?: string | null): string {\n  if (!id) return "";\n  return id.replace(/^[a-z]/i, "0");\n}\n\nasync function request<T>'
  );
}

// Handle template strings: `/api/patients/${id}` -> `/api/patients/${normalizeUserId(id)}`
txt = txt.replace(/\$\{((?:patient_|doctor_|user_|staff_|session_)?id)\}/g, '${normalizeUserId($1)}');

// Handle object property shorthands: { patient_id } -> { patient_id: normalizeUserId(patient_id) }
txt = txt.replace(/\{ ([a-z_]*id) \}/g, '{ $1: normalizeUserId($1) }');

// We also need to map the bodies of payloads before JSON.stringify
// E.g. body: JSON.stringify(payload) -> body: JSON.stringify(normalizePayload(payload))
if (!txt.includes('function normalizePayload(')) {
  txt = txt.replace(
    'async function request<T>',
    `function normalizePayload(payload: any): any {
  if (!payload || typeof payload !== 'object') return payload;
  const clone = { ...payload };
  for (const key of Object.keys(clone)) {
     if (key.endsWith('id') && typeof clone[key] === 'string') {
        clone[key] = normalizeUserId(clone[key]);
     }
  }
  return clone;
}

async function request<T>`
  );
}

txt = txt.replace(/JSON\.stringify\((payload|\{.*?\})\)/g, 'JSON.stringify(normalizePayload($1))');

fs.writeFileSync('frontend/lib/api.ts', txt);
