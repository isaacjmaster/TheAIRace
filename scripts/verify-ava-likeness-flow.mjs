import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=createRequire('C:/Users/socce/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/check.cjs')('playwright');
const base='http://127.0.0.1:3067',out='output/Wall_Ava/ava-flow';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true}),results=[];
try{
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 try{
  const p=await context.newPage(),requests=[];p.on('request',r=>{if(r.url().includes('/characters/ava/'))requests.push(r.url());});
  p.setDefaultTimeout(25000);
  await p.route('**/characters/ava/*.webp',async route=>{await new Promise(r=>setTimeout(r,1000));await route.continue();});
  await p.goto(base+'/simple-preview/fresh?testAudio=off');
  const img=p.locator('.ava-character');await img.waitFor();await img.evaluate(n=>n.decode());
  const notice=p.getByRole('button',{name:'Got It',exact:true});if(await notice.count()){await notice.focus();await p.keyboard.press('Enter');}
  assert.equal(await img.evaluate(n=>getComputedStyle(n).animationName),'none');
  const next=()=>p.getByRole('button',{name:/^Continue/}).click();
  await next();await next();
  await p.getByRole('textbox',{name:'Username',exact:true}).fill('Ava_'+Math.random().toString(36).slice(2,9));
  await p.getByRole('button',{name:'Save',exact:true}).click();await p.getByRole('button',{name:/^Continue/}).waitFor();
  await p.screenshot({path:out+'/naming.png'});assert.equal(requests.length,1,'welcome reused across introductory dialogue');
  for(let i=0;i<4;i++)await next();
  await p.getByRole('button',{name:/Build/}).first().click();await p.getByRole('button',{name:'Place Builder Station',exact:true}).click();
  await p.getByRole('button',{name:'Confirm',exact:true}).click();await p.locator('.ava-character[data-pose="encourage"]').waitFor();
  await next();await p.locator('.ava-character[data-pose="tablet"]').waitFor();await next();await next();
  await p.getByRole('button',{name:/Build/}).first().click();await p.getByRole('button',{name:'Place GPU Rig',exact:true}).click();await p.getByRole('button',{name:'Confirm',exact:true}).click();
  await p.getByRole('button',{name:/Explore/}).click();await p.locator('.ava-character[data-pose="encourage"]').waitFor();await next();
  await p.locator('.compute-ready').waitFor();await p.locator('.compute-ready').click();
  await p.getByText('This is just the beginning.',{exact:true}).waitFor();
  for(let i=0;i<3;i++)await p.getByRole('button',{name:/^Continue|Let’s build/}).click();
  await p.locator('.ava-dialogue').waitFor({state:'detached'});await p.reload();await p.locator('.foundation-world canvas').waitFor();await p.waitForTimeout(1500);
  assert.equal(await p.locator('.ava-dialogue').count(),0);
  results.push('Reduced motion, delayed portrait, username, Continue, builder and GPU build, pose switching, collection, completion and reload persistence passed.');
 }catch(error){const pages=context.pages();if(pages.length)await pages[0].screenshot({path:out+'/failure.png'});throw error;}finally{await context.close();}
 const skipContext=await browser.newContext({viewport:{width:1440,height:900}});
 try{const p=await skipContext.newPage();await p.goto(base+'/simple-preview/fresh?testAudio=off');await p.getByRole('button',{name:'Skip Tutorial',exact:true}).click();await p.locator('.ava-dialogue').waitFor({state:'detached'});await p.reload();await p.locator('.foundation-world canvas').waitFor();await p.waitForTimeout(1500);assert.equal(await p.locator('.ava-dialogue').count(),0);results.push('Skip and reload persistence passed.');}finally{await skipContext.close();}
}finally{await browser.close();writeFileSync(out+'/results.json',JSON.stringify(results,null,2));}
console.log(results.join('\n'));
