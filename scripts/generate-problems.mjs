import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const out = resolve(process.argv[2] ?? 'src/generated/problems.json');
const problems = [];
const push = (grade, operation, left, right, answer, display, spoken) => {
  problems.push({ id: `g${grade}-${operation}-${left}-${right}`, grade, operation, left, right, answer, display, spoken });
};
const n = (v) => String(v);
for (let a = 0; a <= 100; a++) for (let b = 0; b <= 100 - a; b++)
  push(1, 'add', a, b, a + b, `${a} + ${b}`, `${n(a)} плюс ${n(b)}`);
for (let a = 0; a <= 100; a++) for (let b = 0; b <= a; b++)
  push(1, 'subtract', a, b, a - b, `${a} − ${b}`, `${n(a)} минус ${n(b)}`);
for (let a = 1; a <= 10; a++) for (let b = 1; b <= 10; b++)
  push(2, 'multiply', a, b, a * b, `${a} × ${b}`, `${n(a)} умножить на ${n(b)}`);
for (let a = 1; a <= 10; a++) for (let b = 1; b <= 10; b++)
  push(2, 'divide', a * b, a, b, `${a * b} ÷ ${a}`, `${n(a * b)} разделить на ${n(a)}`);

const expected = 10502;
if (problems.length !== expected) throw new Error(`Expected ${expected}, got ${problems.length}`);
if (new Set(problems.map(p => p.id)).size !== expected) throw new Error('Duplicate IDs');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ schemaVersion: 1, problems }, null, 2) + '\n');
console.log(`Generated ${problems.length} problems -> ${out}`);
