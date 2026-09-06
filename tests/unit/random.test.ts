import { describe,it,expect } from 'vitest';
import { sampleWithoutReplacement } from '../../src/domain/random';
describe('sampling',()=>{it('is deterministic and unique',()=>{const seq=[0,0.9,0.2,0.7];let i=0;const out=sampleWithoutReplacement([1,2,3,4,5],4,{next:()=>seq[i++]});expect(new Set(out).size).toBe(4);expect(out).toEqual([1,5,3,4]);});it('rejects bad random',()=>expect(()=>sampleWithoutReplacement([1,2],1,{next:()=>1})).toThrow());});
