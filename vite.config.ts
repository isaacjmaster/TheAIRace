import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {readFileSync} from 'node:fs';
export default defineConfig({plugins:[react(),{
 name:'local-display-diagnostics',apply:'serve',
 configureServer(server){
  server.middlewares.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('X-AI-Race-Local-Build','display-diagnostics-v2');next();});
  server.middlewares.use('/diagnostics.webmanifest',(_req,res)=>{const manifest=JSON.parse(readFileSync('public/manifest.webmanifest','utf8'));res.setHeader('Content-Type','application/manifest+json');res.end(JSON.stringify({...manifest,id:'/display-diagnostics',name:'AI Race Display Test',short_name:'Display Test',start_url:'/display-diagnostics'}));});
 },
 transformIndexHtml(html,ctx){
  const url=new URL(ctx.originalUrl||ctx.path,'http://local.invalid');
  if(!['/display-diagnostics','/display-diagnostics/','/diagnostics','/diagnostics/'].includes(url.pathname)&&url.searchParams.get('display-diagnostics')!=='1')return html;
  return html.replace('href="/manifest.webmanifest"','href="/diagnostics.webmanifest"').replace('<div id="root"></div>',`<div id="root"></div>
<aside id="diagnostic-boot" style="position:fixed;z-index:2147483647;top:calc(env(safe-area-inset-top,0px) + 8px);left:12px;right:12px;padding:16px;background:#fffbea;color:#142c42;border:2px solid #44697b;font:16px system-ui">AI Race diagnostics v2 — loading local measurements…<noscript>Enable JavaScript in Safari to capture measurements.</noscript></aside>
<script type="module">
import('/src/ui/displayDiagnostics.ts').then(m=>{m.installDisplayDiagnostics(true);document.getElementById('diagnostic-boot')?.remove();}).catch(()=>{document.getElementById('diagnostic-boot').textContent='AI Race diagnostics v2 — module could not start. Reload this page and report this message. Your game data has not been changed.';});
</script>`);
 }
}],server:{proxy:{'/api':process.env.AI_RACE_DEV_API||'http://127.0.0.1:3001'}}});
