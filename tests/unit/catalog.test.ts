import { describe,it,expect } from 'vitest';
import { StaticCatalog } from '../../src/domain/catalog';
describe('catalog',()=>{it('contains exact complete sets',()=>{const c=new StaticCatalog();expect(c.validate()).toBeNull();expect(c.forGrade(1)).toHaveLength(10302);expect(c.forGrade(2)).toHaveLength(200);const counts=(g:1|2,op:string)=>c.forGrade(g).filter(p=>p.operation===op).length;expect(counts(1,'add')).toBe(5151);expect(counts(1,'subtract')).toBe(5151);expect(counts(2,'multiply')).toBe(100);expect(counts(2,'divide')).toBe(100);});});
