import type { AppState, ActiveState, SelectionState, ResultState } from '../domain/session';
import type { Grade } from '../domain/problem';

export type ViewHandlers={onGrade:(g:Grade)=>void;onStart:()=>void;onDigit:(d:string)=>void;onDelete:()=>void;onSubmit:()=>void;onRepeat:()=>void;onChooseGrade:()=>void};
export class AppView {
  private screen:HTMLElement;
  readonly announcer:HTMLElement;
  constructor(private root:HTMLElement,private h:ViewHandlers){
    root.innerHTML='';
    const shell=document.createElement('main');shell.className='app-shell';shell.dataset.testid='app-shell';
    this.screen=document.createElement('div');this.screen.className='screen-host';
    this.announcer=document.createElement('div');this.announcer.dataset.testid='announcer';this.announcer.className='sr-only';this.announcer.setAttribute('role','status');this.announcer.setAttribute('aria-live','polite');this.announcer.setAttribute('aria-atomic','true');
    shell.append(this.screen,this.announcer);root.append(shell);
  }
  render(state:AppState){ if(state.screen==='selection')this.selection(state); else if(state.screen==='active')this.active(state); else this.result(state); }
  private header(compact=false){const h=document.createElement('header');h.className=compact?'app-header compact':'app-header';h.textContent='Математический тренажер';return h;}
  private button(text:string,cls:string,fn:()=>void){const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=text;b.addEventListener('click',fn);return b;}
  private selection(s:SelectionState){
    const c=document.createElement('section');c.className='card selection-screen';c.append(this.header());
    const title=document.createElement('h1');title.id='grade-heading';title.tabIndex=-1;title.textContent='Выбери класс';c.append(title);
    const sub=document.createElement('p');sub.className='support';sub.textContent='Мы подготовим 10 примеров.';c.append(sub);
    const group=document.createElement('div');group.className='grade-group';group.setAttribute('role','radiogroup');group.setAttribute('aria-label','Класс');
    const defs:[[Grade,string,string],[Grade,string,string]]=[[1,'1 класс','Сложение и вычитание до 100'],[2,'2 класс','Умножение и деление · таблица 1–10']];
    for(const [g,label,desc] of defs){const b=this.button('',`grade-card${s.selectedGrade===g?' selected':''}`,()=>this.h.onGrade(g));b.setAttribute('role','radio');b.setAttribute('aria-checked',String(s.selectedGrade===g));const check=document.createElement('span');check.className='grade-check';check.setAttribute('aria-hidden','true');check.textContent='✓';const strong=document.createElement('strong');strong.textContent=label;const details=document.createElement('span');details.textContent=desc;b.append(check,strong,details);group.append(b);}
    c.append(group);
    if(s.error){const e=document.createElement('div');e.className='error';e.setAttribute('role','alert');e.textContent=s.error;c.append(e);}
    const start=this.button('Начать','primary start-button',this.h.onStart);if(!s.selectedGrade){start.setAttribute('aria-disabled','true');start.classList.add('disabled');} c.append(start);
    this.screen.replaceChildren(c);
  }
  private active(s:ActiveState){
    const c=document.createElement('section');c.className='card exercise-screen';c.append(this.header(true));
    const progress=document.createElement('div');progress.className='progress';progress.dataset.testid='progress';progress.textContent=`${s.index+1} из 10`;progress.setAttribute('aria-label',`Задание ${s.index+1} из 10`);c.append(progress);
    const task=document.createElement('div');task.className='task-row';
    const expr=document.createElement('div');expr.className='expression';expr.dataset.testid='expression';expr.textContent=`${s.problems[s.index].display} =`;
    const answer=document.createElement('div');answer.className='answer';answer.dataset.testid='answer-display';answer.setAttribute('aria-label',s.answer?`Введенный ответ: ${s.answer}`:'Ответ не введен');answer.textContent=s.answer||'?';task.append(expr,answer);c.append(task);
    const keypad=document.createElement('div');keypad.className='keypad';
    for(const n of ['1','2','3','4','5','6','7','8','9']) keypad.append(this.button(n,'key',()=>this.h.onDigit(n)));
    const del=this.button('Стереть','key secondary',this.h.onDelete);del.setAttribute('aria-label','Стереть последнюю цифру');keypad.append(del);
    keypad.append(this.button('0','key',()=>this.h.onDigit('0')));
    const done=this.button('Готово','key primary done-button',this.h.onSubmit);if(!s.answer||s.submitLocked){done.setAttribute('aria-disabled','true');done.classList.add('disabled');}keypad.append(done);c.append(keypad);
    this.screen.replaceChildren(c);
  }
  private result(s:ResultState){
    const c=document.createElement('section');c.className='card result-screen';c.append(this.header());
    const mark=document.createElement('div');mark.className='celebration';mark.setAttribute('aria-hidden','true');mark.textContent='★';c.append(mark);
    const h=document.createElement('h1');h.className='score';h.textContent=s.score===10?'Ура, 10 из 10!':`Готово! ${s.score} из 10`;c.append(h);
    const p=document.createElement('p');p.className='support';p.textContent='Все ответы проверены автоматически.';c.append(p);
    c.append(this.button('Еще раз','primary repeat-button',this.h.onRepeat),this.button('Выбрать класс','secondary choose-button',this.h.onChooseGrade));this.screen.replaceChildren(c);
  }
}
