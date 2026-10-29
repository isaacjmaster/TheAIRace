/** Actual application, isolated accounts and SQLite; no production player data. */
import {worldFixture} from '../tests/helpers/player-world-fixture';
import {createServer} from 'vite';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
if(process.env.NODE_ENV==='production')throw Error('Review only');
const out='output/Ranking_Review';mkdirSync(out,{recursive:true});
const f=await worldFixture(':memory:',Date.now());
const player=await f.fresh('Rank_Review','developed'),opponent=await f.fresh('Prism_Founder');
for(const [p,rating] of [[player,372],[opponent,610]] as const)f.db.prepare('INSERT INTO company_infiltration_ratings VALUES(?,?) ON CONFLICT(company_id) DO UPDATE SET total=excluded.total').run(p.id,rating);
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
   await page.screenshot({path:`${out}/${name}-home.png`});await hud.click();
   await page.getByRole('dialog',{name:'Infiltration Ranks',exact:true}).waitFor();await page.screenshot({path:`${out}/${name}-ranks.png`});
   assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'),'372');
   await page.getByRole('button',{name:/Ascendant, 2,200 Rating/}).click();await page.screenshot({path:`${out}/${name}-ascendant-detail.png`});
   await page.getByRole('button',{name:'View leaderboards',exact:true}).click();
   await page.getByRole('button',{name:'Infiltration Rating',exact:true}).click();await page.getByText('Prism_Founder',{exact:true}).waitFor();
   await page.screenshot({path:`${out}/${name}-leaderboard.png`});await page.getByText('Prism_Founder',{exact:true}).click();await page.getByRole('dialog',{name:'Player profile',exact:true}).waitFor();await page.screenshot({path:`${out}/${name}-profile.png`});
   for(const outcome of ['promotion','loss']){
    f.setTime(f.time()+7*60*60*1000);
    f.db.prepare('UPDATE company_infiltration_ratings SET total=? WHERE company_id=?').run(outcome==='promotion'?499:100,player.id);
    const state=f.read(player);state.bots=10;f.save(player,state);
    const scout=(await f.search(player)).data.scout;assert.ok(scout?.ratingEligible);
    const start=await f.command(player,{action:'pvp-start',scoutId:scout.id});assert.equal(start.status,200);
    await page.goto('http://127.0.0.1:5237/?testAudio=off');await page.waitForTimeout(1500);if(await page.getByRole('button',{name:'INFILTRATE',exact:true}).count()){await page.getByRole('button',{name:'INFILTRATE',exact:true}).click();await page.getByRole('button',{name:'Resume operation',exact:true}).click();}
    await page.getByRole('button',{name:'Select Pulsewheel',exact:true}).waitFor();
    for(let i=0;i<(outcome==='promotion'?3:1);i++)assert.equal((await f.command(player,{action:'infiltration-command',operationId:start.data.state.infiltration.id,intent:{action:'deploy'}})).status,200);
    if(outcome==='loss')await f.command(player,{action:'infiltration-command',operationId:start.data.state.infiltration.id,intent:{action:'abandon'}});
    else f.setTime(f.time()+180000);
    const settled=(await f.get(player)).data.state.infiltration;
    assert.equal(settled.settlement.rating.eligible,true);assert.ok(outcome==='promotion'?settled.settlement.rating.after>=500:settled.settlement.rating.delta===-12);
    await page.getByRole('button',{name:'Return to HQ',exact:true}).waitFor({timeout:30000});await page.waitForTimeout(1800);
    await page.screenshot({path:`${out}/${name}-${outcome}.png`});checks.push({viewport:name,outcome,battleId:settled.id,tokens:settled.settlement.rating,engineStatus:settled.status});
    await page.getByRole('button',{name:'Return to HQ',exact:true}).click();
   }
   f.db.prepare('UPDATE company_infiltration_ratings SET total=372 WHERE company_id=?').run(player.id);
   assert.deepEqual(errors,[]);checks.push({viewport:name,errors,rank:'Alloy',rating:372});
  }finally{await context.close();}
 }
}finally{writeFileSync(`${out}/checks.json`,JSON.stringify(checks,null,2));await browser?.close();await vite.close();await f.close();}
console.log('Actual ranking application review passed');
