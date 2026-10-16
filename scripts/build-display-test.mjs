import {build} from 'vite';
import react from '@vitejs/plugin-react';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const outDir=resolve('data/display-test/dist');
await build({configFile:false,plugins:[react(),{name:'isolated-display-test',transformIndexHtml:{order:'pre',handler(html){return html.replace('/src/main.tsx','/src/displayTest.ts').replace('<title>The AI Race</title>','<title>AI Race Standalone Test</title>').replace('name="apple-mobile-web-app-title" content="The AI Race"','name="apple-mobile-web-app-title" content="AI Race Test"');}}}],build:{outDir,emptyOutDir:true,sourcemap:false}});
const manifest=JSON.parse(readFileSync('public/manifest.webmanifest','utf8'));
writeFileSync(resolve(outDir,'manifest.webmanifest'),JSON.stringify({...manifest,id:'/standalone-test',name:'AI Race Standalone Test',short_name:'AI Race Test',start_url:'/display-diagnostics?test=standalone-v3'},null,2));
console.log('Isolated compiled diagnostic build ready. Normal dist and production configuration unchanged.');
