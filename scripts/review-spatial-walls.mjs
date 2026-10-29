import {createServer} from 'vite';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const {chromium}=createRequire('C:/Users/socce/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/check.cjs')('playwright');
const out='output/Spatial_Review';mkdirSync(out,{recursive:true});
const before=process.argv.includes('--before'),label=before?'before':'after';

const server=await createServer({server:{host:'127.0.0.1',port:5232,strictPort:true,hmr:false,watch:{ignored:['**/output/**']}}});await server.listen();let browser;const checks=[];
async function save(page,name){const png=await page.evaluate(()=>window.wallPng());writeFileSync(`${out}/${label}-${name}.png`,Buffer.from(png.split(',')[1],'base64'));}
async function measure(page){return page.evaluate(`new Promise(resolve=>{const times=[];let last=performance.now();function tick(n){times.push(n-last);last=n;if(times.length<185)requestAnimationFrame(tick);else{const a=times.slice(5).sort((a,b)=>a-b);resolve({...window.wallStats(),medianMs:a[Math.floor(a.length*.5)],p95Ms:a[Math.floor(a.length*.95)],frames:a.length});}}requestAnimationFrame(tick);})`);}
try{browser=await chromium.launch({channel:'msedge',headless:true});for(const [viewport,width,height]of[['desktop',1500,560],['phone',390,844]]){const context=await browser.newContext({viewport:{width,height},isMobile:viewport==='phone',hasTouch:viewport==='phone'});try{const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:5232/scripts/review-spatial-walls.html?testAudio=off${before?'&before=1':''}`);await page.waitForFunction(()=>window.wallReady);if(viewport==='desktop'){checks.push({viewport,kind:'lineup',...await page.evaluate(()=>window.wallSetup('lineup'))});await save(page,'lineup');await page.setViewportSize({width:700,height:560});for(let level=1;level<=5;level++){checks.push({viewport,kind:'single',level,...await page.evaluate(l=>window.wallSetup('single',l),level)});await save(page,`level-${level}`);await page.evaluate(l=>window.wallSetup('isolated',l),level);await save(page,`tile-${level}`);}await page.setViewportSize({width:1500,height:900});}
await page.evaluate(()=>window.wallSetup('connections'));await save(page,`${viewport}-connections`);
for(const level of [4,5]){await page.evaluate(l=>{window.wallSetup('stress',l);window.wallAnimate(true);},level);await page.waitForTimeout(300);const stats=await measure(page);checks.push({viewport,kind:'200-wall-stress',level,...stats});await save(page,`${viewport}-200-level-${level}`);await page.evaluate(()=>window.wallAnimate(false));}await page.evaluate(()=>window.wallCleanup());checks.push({viewport,errors});if(errors.length)throw Error(errors.join('\n'));}finally{await context.close();}}

}finally{writeFileSync(`${out}/${label}-wall-checks.json`,JSON.stringify({environment:'Headless Edge on Windows desktop; phone is viewport emulation, not physical iPhone. Same camera/lighting and 200 cells before and after.',checks},null,2));await browser?.close();await server.close();}
console.log(`${label}: renderer checks saved to ${out}`);
