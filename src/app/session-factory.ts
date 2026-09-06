import type { Catalog, CatalogError } from '../domain/catalog';
import type { Grade, Problem } from '../domain/problem';
import { sampleWithoutReplacement, type RandomSource } from '../domain/random';
export interface IdSource { next():string } export interface Clock { now():number }
export type StartError=CatalogError|'random_source_failed'|'id_source_failed'|'clock_failed';
export interface StartSessionPayload { grade:Grade; problems:readonly Problem[]; sessionId:string; startedAt:number; }
export function createSession(grade:Grade,deps:{catalog:Catalog;random:RandomSource;ids:IdSource;clock:Clock}):StartSessionPayload|StartError {
  const c=deps.catalog.validate(); if(c)return c;
  let problems:Problem[]; try { problems=sampleWithoutReplacement(deps.catalog.forGrade(grade),10,deps.random); } catch { return 'random_source_failed'; }
  let sessionId:string; try { sessionId=deps.ids.next(); if(!sessionId)throw 0; } catch{return 'id_source_failed';}
  let startedAt:number; try { startedAt=deps.clock.now(); if(!Number.isFinite(startedAt))throw 0; } catch{return 'clock_failed';}
  return {grade,problems:Object.freeze(problems),sessionId,startedAt};
}
export class BrowserIdSource implements IdSource { next(){ if(crypto.randomUUID)return crypto.randomUUID(); const b=new Uint8Array(16);crypto.getRandomValues(b);return [...b].map(x=>x.toString(16).padStart(2,'0')).join(''); } }
export class BrowserClock implements Clock { now(){return Date.now();} }
