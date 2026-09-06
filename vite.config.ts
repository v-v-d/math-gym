import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

type Policy={mode:'approved-basis'|'consent-gated'|'disabled'};
const policy=JSON.parse(readFileSync(new URL('./src/generated/analytics-policy.json',import.meta.url),'utf8')) as Policy;
const metrikaInline=`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym(112317340,"init",{ssr:true,clickmap:true,ecommerce:"dataLayer",referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true});`;
const hash=createHash('sha256').update(metrikaInline).digest('base64');
const csp=["default-src 'self'",`script-src 'self' https://mc.yandex.ru 'sha256-${hash}'`,"connect-src 'self' https://mc.yandex.ru https://*.mc.yandex.ru","img-src 'self' data: https://mc.yandex.ru","style-src 'self'","object-src 'none'","base-uri 'self'","frame-ancestors 'none'"].join('; ');

export default defineConfig({
  plugins:[{name:'analytics-policy-html',transformIndexHtml(html){if(policy.mode!=='approved-basis')return html;return html.replace('</head>',`<script>${metrikaInline}</script></head>`).replace('</body>',`<noscript><div><img src="https://mc.yandex.ru/watch/112317340" style="position:absolute;left:-9999px" alt="" /></div></noscript></body>`);}}],
  build:{target:'es2022'},
  // Vite injects imported CSS through <style> tags in dev mode.
  // A production-style `style-src 'self'` CSP blocks those tags and makes
  // the app render without styles. Keep dev CSP permissive for styles, while
  // `vite preview` uses the production policy against emitted CSS assets.
  server:{headers:{'Content-Security-Policy':csp.replace("style-src 'self'", "style-src 'self' 'unsafe-inline'")}},
  preview:{headers:{'Content-Security-Policy':csp}}
});
