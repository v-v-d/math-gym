import data from '../generated/problems.json';
import type { Grade, Problem } from './problem';
export type CatalogError = 'catalog_missing'|'catalog_invalid'|'catalog_incomplete';
export interface Catalog { forGrade(grade:Grade): readonly Problem[]; validate(): CatalogError|null; }
const expected = new Map([['1:add',5151],['1:subtract',5151],['2:multiply',100],['2:divide',100]]);
export class StaticCatalog implements Catalog {
  private readonly problems = (data.problems ?? []) as Problem[];
  validate(): CatalogError|null {
    if (!Array.isArray(this.problems)) return 'catalog_missing';
    const seen = new Set<string>(); const counts = new Map<string,number>();
    for (const p of this.problems) {
      if (!p || ![1,2].includes(p.grade) || !['add','subtract','multiply','divide'].includes(p.operation) || !Number.isInteger(p.left)||!Number.isInteger(p.right)||!Number.isInteger(p.answer)||p.answer<0 || seen.has(p.id)) return 'catalog_invalid';
      seen.add(p.id); counts.set(`${p.grade}:${p.operation}`,(counts.get(`${p.grade}:${p.operation}`)||0)+1);
    }
    if (seen.size !== 10502) return 'catalog_incomplete';
    for (const [k,v] of expected) if (counts.get(k)!==v) return 'catalog_incomplete';
    return null;
  }
  forGrade(grade:Grade): readonly Problem[] { return Object.freeze(this.problems.filter(p=>p.grade===grade)); }
}
