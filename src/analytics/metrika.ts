import type { Grade } from '../domain/problem';
export const COUNTER_ID=112317340;
export type GoalName='session_started'|'answer_submitted'|'session_completed'|'session_start_failed';
declare global { interface Window { ym?: (...args:unknown[])=>unknown; } }
const allowed:Record<GoalName,readonly string[]>={session_started:['session_id','grade','timestamp'],answer_submitted:['session_id','grade','timestamp','problem_number'],session_completed:['session_id','grade','timestamp','score','duration_ms'],session_start_failed:['grade','timestamp','reason_code']};
export class Metrika { constructor(private canSend:()=>boolean){} send(goal:GoalName,params:Record<string,unknown>):boolean { if(!this.canSend())return false; const safe=Object.fromEntries(Object.entries(params).filter(([k])=>allowed[goal].includes(k))); try{ if(typeof window.ym!=='function')return false; window.ym(COUNTER_ID,'reachGoal',goal,safe); return true;}catch{return false;} } }
export type Common={session_id:string;grade:Grade;timestamp:number};
