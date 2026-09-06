import { readFileSync } from 'node:fs';
const data = JSON.parse(readFileSync('src/generated/problems.json','utf8'));
const counts = data.problems.reduce((a,p)=>((a[`${p.grade}:${p.operation}`]=(a[`${p.grade}:${p.operation}`]||0)+1),a),{});
const expected = {'1:add':5151,'1:subtract':5151,'2:multiply':100,'2:divide':100};
for (const [k,v] of Object.entries(expected)) if (counts[k] !== v) throw new Error(`${k}: ${counts[k]} != ${v}`);
if (new Set(data.problems.map(p=>p.id)).size !== 10502) throw new Error('IDs are not unique');
console.log(JSON.stringify({ total:data.problems.length, counts }, null, 2));
