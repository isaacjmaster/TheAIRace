/** Actual application, isolated accounts and SQLite; no production player data. */
import {worldFixture} from '../tests/helpers/player-world-fixture';
import {createServer} from 'vite';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
if(process.env.NODE_ENV==='production')throw Error('Review only');
const out='output/Focused_HUD_Polish';mkdirSync(out,{recursive:true});
const f=await worldFixture(':memory:',Date.now());
const player=await f.fresh('Rank_Review','developed'),opponent=await f.fresh('Prism_Founder');
for(const [p,rating] of [[player,1525],[opponent,610]] as const)f.db.prepare('INSERT INTO company_infiltration_ratings VALUES(?,?) ON CONFLICT(company_id) DO UPDATE SET total=excluded.total').run(p.id,rating);
await f.post(player,'/company/later',{});
f.app.get('/ranking-fixture',(_req,res)=>{res.setHeader('Set-Cookie',player.cookie+'; Path=/; SameSite=Lax');res.redirect('/?testAudio=off');});
const vite=await createServer({server:{host:'127.0.0.1',port:5237,strictPort:true,hmr:false,watch:null,proxy:{'/api':f.url,'/ranking-fixture':f.url}}});
await vite.listen();
const {chromium}=createRequire('C:/Users/socce/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/check.cjs')('playwright');
let browser:any;const checks:any[]=[];
try{
 browser=await chromium.launch({channel:'msedge',headless:true});
 for(const [name,width,height]of[['desktop',1440,900],['iphone',390,844]]as const){
  const context=await browser.newContext({viewport:{width,height},isMobile:name==='iphone',hasTouch:name==='iphone'});
  try{
   const page=await context.newPage(),errors:string[]=[];page.on('pageerror',(e:Error)=>errors.push(e.message));
   await page.goto('http://127.0.0.1:5237/ranking-fixture?testAudio=off');
   const hud=page.getByRole('button',{name:'Infiltration rank and leaderboards',exact:true});await hud.waitFor({timeout:60000});await page.waitForTimeout(6000);
   const hb=await hud.boundingBox(),ib=await hud.locator('img').boundingBox();assert.ok(ib.x>=hb.x&&ib.y>=hb.y&&ib.x+ib.width<=hb.x+hb.width&&ib.y+ib.height<=hb.y+hb.height,'HUD badge contained');

   assert.ok(await hud.locator('.rank-hud-count strong').evaluate((e:any)=>parseFloat(getComputedStyle(e).fontSize)<=19));
   await page.screenshot({path:`${out}/${name}-home.png`});
   await page.emulateMedia({reducedMotion:'reduce'});
   assert.equal(await hud.locator('.rank-hud-emblem').evaluate((e:any)=>getComputedStyle(e,':before').animationName),'none');
   await hud.click();await page.getByRole('dialog',{name:'Infiltration Ranks',exact:true}).waitFor();
   checks.push({name,contained:true,smallerDigits:true,reducedMotion:true,opensRanks:true,errors});assert.deepEqual(errors,[]);
  }finally{await context.close();}
 }
}finally{await browser?.close();await vite.close();await f.close();writeFileSync(`${out}/checks.json`,JSON.stringify(checks,null,2));}
console.log(checks);
