import policy from '../generated/analytics-policy.json';
type Mode='approved-basis'|'consent-gated'|'disabled';
const mode=policy.mode as Mode;
let allowed=mode==='approved-basis';
let initialized=mode==='approved-basis';
function initConsentGranted(){
  if(initialized||!allowed)return;
  initialized=true;
  const w=window as Window & {ym?:any};
  w.ym=w.ym||function(...args:unknown[]){(w.ym.a=w.ym.a||[]).push(args)};w.ym.l=Date.now();
  const s=document.createElement('script');s.async=true;s.src='https://mc.yandex.ru/metrika/tag.js';document.head.appendChild(s);
  w.ym(112317340,'init',{ssr:true,clickmap:true,ecommerce:'dataLayer',referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true});
}
export function bootstrapAnalytics(){/* approved-basis is materialized by Vite HTML transform; other modes remain inert */}
export function analyticsAllowed(){return allowed;}
export function setConsent(state:'unknown'|'granted'|'denied'|'revoked'){if(mode!=='consent-gated')return;allowed=state==='granted';if(allowed)initConsentGranted();}
