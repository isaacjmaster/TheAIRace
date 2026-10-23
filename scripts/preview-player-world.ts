import express from 'express';import {resolve} from 'node:path';import {mkdirSync} from 'node:fs';import {worldFixture} from '../tests/helpers/player-world-fixture';
if(process.env.NODE_ENV==='production')throw Error('Isolated development preview only');
mkdirSync('data/player-world-review',{recursive:true});const f=await worldFixture(resolve('data/player-world-review','review-'+Date.now()+'.sqlite'),Date.now()-540000);
const viewer=await f.fresh('QA_Your_Company','developed'),simple=await f.fresh('QA_New_Startup'),developed=await f.fresh('QA_Cyan_Campus','developed');
// Disposable registered test companies only. Nothing is added to the production leaderboard.
for(let i=0;i<9;i++){const p=await f.fresh('QA_Founder_'+(i+4),i%2?'simple':'developed');f.db.prepare('INSERT INTO company_influence VALUES(?,?)').run(p.id,70-i*4);}
f.db.prepare('INSERT INTO company_influence VALUES(?,?)').run(viewer.id,125);f.db.prepare('INSERT INTO company_influence VALUES(?,?)').run(simple.id,95);f.db.prepare('INSERT INTO company_influence VALUES(?,?)').run(developed.id,110);
// Completed real simulations provide both history tabs, including one attack against the viewer.
for(const [attacker,defender] of [[simple,developed],[developed,viewer]]){const scout=(await f.search(attacker)).data.scout;f.db.prepare('UPDATE pvp_scouts SET defender_id=? WHERE id=?').run(defender.id,scout.id);const r=await f.command(attacker,{action:'pvp-start',scoutId:scout.id}),o=r.data.state.infiltration;for(let i=0;i<6;i++)await f.command(attacker,{action:'infiltration-command',operationId:o.id,intent:{action:'deploy'}});f.setTime(f.time()+180000);await f.get(attacker);}
// Seed a legitimate completed attack for the viewer as well.
const sc=(await f.search(viewer)).data.scout;f.db.prepare('UPDATE pvp_scouts SET defender_id=? WHERE id=?').run(simple.id,sc.id);const r=await f.command(viewer,{action:'pvp-start',scoutId:sc.id});for(let i=0;i<3;i++)await f.command(viewer,{action:'infiltration-command',operationId:r.data.state.infiltration.id,intent:{action:'deploy'}});f.setTime(f.time()+180000);await f.get(viewer);
// Runtime previews use the real clock so browser/server progress stays synchronized.
for(const p of [viewer,simple,developed]){const s=f.read(p);for(const rig of [s.rig,s.rig2,s.lab])if(rig)rig.lastProducedAt=Date.now();f.save(p,s);}f.setTime(Date.now());let previewOffset=0;const timer=setInterval(()=>f.setTime(Date.now()+previewOffset),50);
f.app.post('/review/advance',(req,res)=>{const ms=Number(req.body?.ms);if(!Number.isFinite(ms)||ms<0||ms>180000){res.status(400).json({error:'Invalid isolated preview clock step.'});return;}previewOffset+=ms;f.setTime(Date.now()+previewOffset);res.json({serverTime:f.time()});});
f.app.get('/review/player-world',(_req,res)=>{res.setHeader('Set-Cookie',viewer.cookie+'; Path=/; HttpOnly; SameSite=Lax');res.redirect('/?testAudio=off');});
f.app.use(express.static(resolve('dist')));f.app.get('/{*path}',(_req,res)=>res.sendFile(resolve('dist/index.html')));
await new Promise<void>(r=>f.server.close(()=>r()));const server=f.app.listen(3094,'0.0.0.0',()=>console.log('Isolated player-world preview http://127.0.0.1:3094/review/player-world?testAudio=off; LAN http://192.168.1.40:3094/review/player-world?testAudio=off'));
process.on('SIGTERM',()=>server.close(()=>{clearInterval(timer);f.db.close();}));
