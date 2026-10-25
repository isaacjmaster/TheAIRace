import express from 'express';
import {DatabaseSync} from 'node:sqlite';
import {resolve} from 'node:path';
import {mkdirSync} from 'node:fs';
import {registerFoundation} from '../server/foundation-api';
import {startOwnedOperation} from '../shared/infiltration-army';
import {newSquadOperation} from '../shared/squad-infiltration';
if(process.env.NODE_ENV==='production')throw new Error('Local isolated preview only.');
const root=resolve(import.meta.dirname,'..');mkdirSync(resolve(root,'data/breacher-preview'),{recursive:true});
const db=new DatabaseSync(resolve(root,'data/breacher-preview.sqlite'));db.exec('PRAGMA journal_mode=WAL;PRAGMA foreign_keys=ON;PRAGMA busy_timeout=5000');
const app=express();app.use(express.json());registerFoundation(app,db,{cookieName:'airace_breacher_preview',legacyPaths:[],buildingGrid:true});
// Deliberate local fixtures, isolated from every normal player and the production database.
app.get('/simple-preview/:scene',async(req,res)=>{try{
 const response=await fetch('http://127.0.0.1:3071/api/foundation'),data=await response.json();
 const cookie=response.headers.get('set-cookie')!;const row=db.prepare('SELECT save_id FROM company_players WHERE id=?').get(data.company.playerId)!;
 const scene=req.params.scene,now=Date.now(),s=data.state;if(!['hq','training'].includes(scene))return res.status(404).end();
 if(scene!=='fresh')Object.assign(s,{compute:900,builders:1,starterStation:'placed',stationLayout:{position:[3,5],orientation:0},founderHqLevel:2,bots:10,breachers:scene==='training'?0:2,training:[],trainingKinds:[],trainingDurations:[],fabricator:{separateHangar:true,position:[6,-6],hangarPosition:[13,-6],orientation:0,startedAt:now-60000,completesAt:now-45000},hangar:{position:[13,-6],orientation:0,size:'expanded',startedAt:now-60000,completesAt:now-45000},rig:{position:[6,0],orientation:0,startedAt:now-60000,completesAt:now-45000,lastProducedAt:now,stored:15}});
 if(req.query.two==='true'){s.founderHqLevel=2;s.rig2={...s.rig!,position:[12,0],stored:7};}
 if(scene==='station'){delete s.rig;delete s.fabricator;delete s.hangar;s.builders=0;s.starterStation='unplaced';delete s.stationLayout;}
 if(scene==='construction'){s.fabricator.startedAt=now;s.fabricator.completesAt=now+60000;}
 if(scene==='wait'||scene==='ready'){s.rig!.stored=scene==='ready'?2:0;s.rig!.lastProducedAt=now+2500;}

 s.buildingUpdate={version:1,acknowledged:true,pending:false,replacementCount:0};
 s.landscape.items=[];s.landscape.legacyRocksRegistered=true;s.landscape.nextSpawnAt=now+1e10;
 s.builderHuts=[{id:'builder-hut-2',position:[2.5,7],orientation:0}];s.hqLayout={position:[-5.5,-3],orientation:0};s.stationLayout={position:[2.5,3],orientation:0};
 s.rig.position=[6.5,1.5];s.fabricator.position=[4,-6.5];s.hangar.position=[11,-6.5];s.hangar.size='expanded';
 s.walls=[];let n=0;for(let x=-12.5;x<=-1.5;x++)for(const z of [-10.5,4.5])s.walls.push({id:'wall'+n++,position:[x,z],orientation:0});
 for(let z=-9.5;z<=3.5;z++)for(const x of [-12.5,-1.5])s.walls.push({id:'wall'+n++,position:[x,z],orientation:1});
 for(let x=-.5;x<12;x++)s.walls.push({id:'wall'+n++,position:[x,4.5],orientation:0});
 for(let z=5.5;z<9;z++)s.walls.push({id:'wall'+n++,position:[4.5,z],orientation:1});
 s.infiltrationTutorial='complete';
 if(req.query.mission)startOwnedOperation(s,crypto.randomUUID(),String(req.query.mission),now,newSquadOperation);
 db.prepare('UPDATE foundation_saves SET state=? WHERE id=?').run(JSON.stringify(s),row.save_id as string);
 db.prepare('UPDATE foundation_ava SET progress=? WHERE session=?').run(JSON.stringify(scene==='fresh'?data.ava:scene==='station'?{status:'active',step:5,builderStep:2,revision:0,collected:false}:{status:scene==='wait'||scene==='ready'?'active':'complete',step:scene==='wait'||scene==='ready'?12:16,builderStep:4,revision:0,collected:false}),row.save_id as string);
 if(scene!=='fresh'){db.prepare('INSERT INTO player_usernames VALUES(?,?,?,?)').run(data.company.playerId,'Founder_'+Math.random().toString(36).slice(2,8),null,now);db.prepare('INSERT INTO company_influence VALUES(?,?)').run(data.company.playerId,375);}
 if(scene!=='fresh')await fetch('http://127.0.0.1:3071/api/foundation/company/later',{method:'POST',headers:{'Content-Type':'application/json','X-Company-ID':data.company.playerId,cookie:cookie.split(';')[0]},body:'{}'});
 if(scene==='clearing'){const o=s.landscape.items.find((o:any)=>o.kind==='scrap')||s.landscape.items[0];await fetch('http://127.0.0.1:3071/api/foundation/bots',{method:'POST',headers:{'Content-Type':'application/json','X-Company-ID':data.company.playerId,cookie:cookie.split(';')[0]},body:JSON.stringify({generation:s.generation??0,requestId:crypto.randomUUID(),command:{action:'clear-obstacle',obstacleId:o.id}})});}
 res.setHeader('Set-Cookie',cookie);res.redirect('/?testAudio=off');
 }catch(e){res.status(500).send((e as Error).message);}});
app.get('/healthz',(_req,res)=>res.json({status:'ok',isolatedPreview:true}));app.use(express.static(resolve(root,'dist')));app.get('/{*path}',(_req,res)=>res.sendFile(resolve(root,'dist/index.html')));
const server=app.listen(3071,'0.0.0.0',()=>console.log('Breacher isolated UI preview: http://127.0.0.1:3071/simple-preview/hq?testAudio=off'));
process.on('SIGTERM',()=>server.close(()=>db.close()));
