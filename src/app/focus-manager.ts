export class FocusManager { next(selector:string){requestAnimationFrame(()=>document.querySelector<HTMLElement>(selector)?.focus());} }
