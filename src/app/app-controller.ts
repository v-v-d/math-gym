import { StaticCatalog } from '../domain/catalog';
import { CryptoRandomSource } from '../domain/random';
import { initialState, selectGrade, commitSession, appendDigit, deleteDigit, submitAnswer, type AppState, type SelectionState } from '../domain/session';
import type { Grade } from '../domain/problem';
import { BrowserClock, BrowserIdSource, createSession, type StartError } from './session-factory';
import { AppView } from './app-view';
import { SessionAnnouncer } from './session-announcer';
import { FocusManager } from './focus-manager';
import { Metrika } from '../analytics/metrika';
import { analyticsAllowed } from '../analytics/policy-bootstrap';

export class AppController {
  private state:AppState=initialState(); private view:AppView; private announcer:SessionAnnouncer; private focus=new FocusManager();
  private catalog=new StaticCatalog(); private random=new CryptoRandomSource(); private ids=new BrowserIdSource(); private clock=new BrowserClock(); private metrics=new Metrika(analyticsAllowed);
  constructor(root:HTMLElement){this.view=new AppView(root,{onGrade:g=>this.grade(g),onStart:()=>this.start(),onDigit:d=>this.digit(d),onDelete:()=>this.del(),onSubmit:()=>this.submit(),onRepeat:()=>this.repeat(),onChooseGrade:()=>this.choose()});this.announcer=new SessionAnnouncer(this.view.announcer);this.view.render(this.state);this.bindKeyboard();}
  private grade(g:Grade){this.state=selectGrade(this.state,g);this.view.render(this.state);}
  private startWith(grade:Grade){const r=createSession(grade,{catalog:this.catalog,random:this.random,ids:this.ids,clock:this.clock});if(typeof r==='string'){this.failStart(grade,r);return;}this.state=commitSession(r.grade,r.problems,r.sessionId,r.startedAt);this.view.render(this.state);this.announcer.task(this.state);this.focus.next('.done-button');this.metrics.send('session_started',{session_id:r.sessionId,grade:r.grade,timestamp:r.startedAt});}
  private start(){if(this.state.screen!=='selection'||!this.state.selectedGrade)return;this.startWith(this.state.selectedGrade);}
  private failStart(grade:Grade,reason:StartError){if(this.state.screen==='selection')this.state={...this.state,error:'Не удалось начать занятие. Попробуйте позже.'};this.view.render(this.state);this.metrics.send('session_start_failed',{grade,timestamp:Date.now(),reason_code:reason});}
  private digit(d:string){const keepDone=document.activeElement?.classList.contains('done-button')===true;const n=appendDigit(this.state,d);if(n===this.state)return;this.state=n;this.view.render(this.state);if(keepDone)document.querySelector<HTMLElement>('.done-button')?.focus();if(this.state.screen==='active')this.announcer.answer(this.state.answer);}
  private del(){const keepDone=document.activeElement?.classList.contains('done-button')===true;const n=deleteDigit(this.state);if(n===this.state)return;this.state=n;this.view.render(this.state);if(keepDone)document.querySelector<HTMLElement>('.done-button')?.focus();if(this.state.screen==='active')this.announcer.answer(this.state.answer);}
  private submit(){if(this.state.screen!=='active'||!this.state.answer)return;const before=this.state;const now=this.clock.now();const r=submitAnswer(this.state,now);if(!r.accepted)return;this.state=r.state;this.metrics.send('answer_submitted',{session_id:before.sessionId,grade:before.grade,timestamp:now,problem_number:r.problemNumber});this.view.render(this.state);if(this.state.screen==='active'){document.querySelector<HTMLElement>('.done-button')?.focus();this.announcer.task(this.state);}else if(this.state.screen==='result'){this.announcer.result(this.state);this.metrics.send('session_completed',{session_id:this.state.sessionId,grade:this.state.grade,timestamp:this.state.completedAt,score:this.state.score,duration_ms:this.state.completedAt-this.state.startedAt});this.focus.next('.repeat-button');}}
  private repeat(){if(this.state.screen!=='result')return;this.startWith(this.state.grade);}
  private choose(){this.state=initialState();this.view.render(this.state);this.announcer.clear();this.focus.next('#grade-heading');}
  private bindKeyboard(){window.addEventListener('keydown',(e)=>{if(this.state.screen!=='active')return;if(/^[0-9]$/.test(e.key)){e.preventDefault();this.digit(e.key);}else if(e.key==='Backspace'||e.key==='Delete'){e.preventDefault();this.del();}else if(e.key==='Enter'){e.preventDefault();this.submit();}});}
}
