export type Grade = 1 | 2;
export type Operation = 'add' | 'subtract' | 'multiply' | 'divide';
export interface Problem { id:string; grade:Grade; operation:Operation; left:number; right:number; answer:number; display:string; spoken:string; }
