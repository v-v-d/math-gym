import type { Grade, Problem } from './problem';
export interface ResponseRecord { problemId:string; entered:number; correct:boolean; submittedAt:number; }
export type SelectionState={screen:'selection';selectedGrade:Grade|null;error:string|null};
export type ActiveState={screen:'active';grade:Grade;problems:readonly Problem[];index:number;answer:string;responses:readonly ResponseRecord[];sessionId:string;startedAt:number;submitLocked:boolean};
export type ResultState={screen:'result';grade:Grade;score:number;sessionId:string;startedAt:number;completedAt:number};
export type AppState=SelectionState|ActiveState|ResultState;
export const initialState=():SelectionState=>({screen:'selection',selectedGrade:null,error:null});
export function selectGrade(s:AppState,grade:Grade):AppState { return s.screen==='selection'?{...s,selectedGrade:grade,error:null}:s; }
export function commitSession(grade:Grade,problems:readonly Problem[],sessionId:string,startedAt:number):ActiveState { return {screen:'active',grade,problems,index:0,answer:'',responses:[],sessionId,startedAt,submitLocked:false}; }
export function appendDigit(s:AppState,digit:string):AppState { if(s.screen!=='active'||s.submitLocked||!/^[0-9]$/.test(digit)||s.answer.length>=3)return s; return {...s,answer:s.answer+digit}; }
export function deleteDigit(s:AppState):AppState { if(s.screen!=='active'||s.submitLocked||!s.answer)return s; return {...s,answer:s.answer.slice(0,-1)}; }
export function submitAnswer(s:AppState,now:number):{state:AppState;accepted:boolean;problemNumber?:number;completed?:boolean} {
  if(s.screen!=='active'||s.submitLocked||!s.answer)return {state:s,accepted:false};
  const p=s.problems[s.index]; const entered=Number.parseInt(s.answer,10); const rec={problemId:p.id,entered,correct:entered===p.answer,submittedAt:now};
  const responses=[...s.responses,rec]; const problemNumber=s.index+1;
  if(problemNumber===10){ const score=responses.filter(r=>r.correct).length; return {state:{screen:'result',grade:s.grade,score,sessionId:s.sessionId,startedAt:s.startedAt,completedAt:now},accepted:true,problemNumber,completed:true}; }
  return {state:{...s,index:s.index+1,answer:'',responses,submitLocked:false},accepted:true,problemNumber,completed:false};
}
