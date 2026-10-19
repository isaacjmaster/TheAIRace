import express from 'express';
import {DatabaseSync} from 'node:sqlite';
import {resolve} from 'node:path';
import {mkdirSync} from 'node:fs';
import {registerFoundation} from '../server/foundation-api';
import {startOwnedOperation} from '../shared/infiltration-army';
if(process.env.NODE_ENV==='production')throw new Error('Local isolated preview only.');
const root=resolve(import.meta.dirname,'..');mkdirSync(resolve(root,'data/opening-media'),{recursive:true});
const db=new DatabaseSync(resolve(root,'data/opening-preview.sqlite'));db.exec('PRAGMA journal_mode=WAL;PRAGMA foreign_keys=ON;PRAGMA busy_timeout=5000');
const app=express();app.use(express.json());registerFoundation(app,db,{cookieName:'airace_opening',legacyPaths:[]});
// Deliberate local fixtures, isolated from every normal player and the production database.
app.get('/opening-preview/:scene',async(req,res)=>{try{
 const response=await fetch('http://127.0.0.1:3055/api/foundation'),data=await response.json();
 const cookie=response.headers.get('set-cookie')!;const row=db.prepare('SELECT save_id FROM company_players WHERE id=?').get(data.company.playerId)!;
 const scene=req.params.scene,now=Date.now(),s=data.state;
 if(scene!=='fresh')Object.assign(s,{compute:900,builders:1,starterStation:'placed',stationLayout:{position:[3,5],orientation:0},bots:4,training:[],fabricator:{separateHangar:true,position:[6,-6],hangarPosition:[13,-6],orientation:0,startedAt:now-60000,completesAt:now-45000},hangar:{position:[13,-6],orientation:0,size:'expanded',startedAt:now-60000,completesAt:now-45000},rig:{position:[6,0],orientation:0,startedAt:now-60000,completesAt:now-45000,lastProducedAt:now,stored:15}});
 if(scene==='lumen'||scene==='vector'){startOwnedOperation(s,crypto.randomUUID(),scene==='lumen'?'lumen-labs':'vector-works',now);if(req.query.tutorial==='done')s.infiltrationTutorial='complete';}
 if(scene==='stages'){const kind=String(req.query.building??'rig'),p=Number(req.query.progress??.1),timer={startedAt:now-p*120000,completesAt:now+(1-p)*120000};if(kind==='hq')s.hqUpgrade={id:crypto.randomUUID(),targetLevel:2,...timer};else if(kind==='lab')s.lab={position:[6,-12],orientation:0,stored:0,lastProducedAt:timer.completesAt,...timer};else if(kind==='droneStation')s.droneStation={position:[12,-12],orientation:0,...timer};else Object.assign(s[kind],timer);s.buildersBusy=p<1?1:0;}
 const step=0;
 db.prepare('UPDATE foundation_saves SET state=? WHERE id=?').run(JSON.stringify(s),row.save_id as string);
 db.prepare('UPDATE foundation_ava SET progress=? WHERE session=?').run(JSON.stringify(scene==='fresh'?data.ava:{status:scene==='legacy'?'active':'complete',step:scene==='legacy'?0:16,builderStep:4,revision:0,collected:false}),row.save_id as string);
 if(scene!=='fresh')await fetch('http://127.0.0.1:3055/api/foundation/company/later',{method:'POST',headers:{'Content-Type':'application/json','X-Company-ID':data.company.playerId,cookie:cookie.split(';')[0]},body:'{}'});
 res.setHeader('Set-Cookie',cookie);res.redirect('/?testAudio=off');
 }catch(e){res.status(500).send((e as Error).message);}});
app.get('/healthz',(_req,res)=>res.json({status:'ok',isolatedPreview:true}));app.use(express.static(resolve(root,'dist')));app.get('/{*path}',(_req,res)=>res.sendFile(resolve(root,'dist/index.html')));
const server=app.listen(3055,'0.0.0.0',()=>console.log('Retina/new-company opening isolated preview: http://192.168.1.40:3055/?testAudio=off'));
process.on('SIGTERM',()=>server.close(()=>db.close()));
