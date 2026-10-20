import express from 'express';
import {DatabaseSync} from 'node:sqlite';
import {resolve} from 'node:path';
import {mkdirSync} from 'node:fs';
import {registerFoundation} from '../server/foundation-api';
if(process.env.NODE_ENV==='production')throw new Error('Local isolated preview only.');
const root=resolve(import.meta.dirname,'..');mkdirSync(resolve(root,'data/hq-polish-media'),{recursive:true});
const db=new DatabaseSync(resolve(root,'data/hq-polish-preview.sqlite'));db.exec('PRAGMA journal_mode=WAL;PRAGMA foreign_keys=ON;PRAGMA busy_timeout=5000');
const app=express();app.use(express.json());registerFoundation(app,db,{cookieName:'airace_hq_polish',legacyPaths:[]});
// Deliberate local fixtures, isolated from every normal player and the production database.
app.get('/simple-preview/:scene',async(req,res)=>{try{
 const response=await fetch('http://127.0.0.1:3064/api/foundation'),data=await response.json();
 const cookie=response.headers.get('set-cookie')!;const row=db.prepare('SELECT save_id FROM company_players WHERE id=?').get(data.company.playerId)!;
 const scene=req.params.scene,now=Date.now(),s=data.state;if(!['hq','fresh','wait','ready'].includes(scene))return res.status(404).end();
 if(scene!=='fresh')Object.assign(s,{compute:900,builders:1,starterStation:'placed',stationLayout:{position:[3,5],orientation:0},bots:10,training:[],fabricator:{separateHangar:true,position:[6,-6],hangarPosition:[13,-6],orientation:0,startedAt:now-60000,completesAt:now-45000},hangar:{position:[13,-6],orientation:0,size:'expanded',startedAt:now-60000,completesAt:now-45000},rig:{position:[6,0],orientation:0,startedAt:now-60000,completesAt:now-45000,lastProducedAt:now,stored:15}});
 if(req.query.two==='true'){s.founderHqLevel=2;s.rig2={...s.rig!,position:[12,0],stored:7};}
 if(scene==='wait'||scene==='ready'){s.rig!.stored=scene==='ready'?2:0;s.rig!.lastProducedAt=now+2500;}
 db.prepare('UPDATE foundation_saves SET state=? WHERE id=?').run(JSON.stringify(s),row.save_id as string);
 db.prepare('UPDATE foundation_ava SET progress=? WHERE session=?').run(JSON.stringify(scene==='fresh'?data.ava:{status:scene==='wait'||scene==='ready'?'active':'complete',step:scene==='wait'||scene==='ready'?12:16,builderStep:4,revision:0,collected:false}),row.save_id as string);
 if(scene!=='fresh'){db.prepare('INSERT INTO player_usernames VALUES(?,?,?,?)').run(data.company.playerId,'Founder_'+Math.random().toString(36).slice(2,8),null,now);db.prepare('INSERT INTO company_influence VALUES(?,?)').run(data.company.playerId,375);}
 if(scene!=='fresh')await fetch('http://127.0.0.1:3064/api/foundation/company/later',{method:'POST',headers:{'Content-Type':'application/json','X-Company-ID':data.company.playerId,cookie:cookie.split(';')[0]},body:'{}'});
 res.setHeader('Set-Cookie',cookie);res.redirect('/?music=identity-v1&testAudio=off');
 }catch(e){res.status(500).send((e as Error).message);}});
app.get('/healthz',(_req,res)=>res.json({status:'ok',isolatedPreview:true}));app.use(express.static(resolve(root,'dist')));app.get('/{*path}',(_req,res)=>res.sendFile(resolve(root,'dist/index.html')));
const server=app.listen(3064,'0.0.0.0',()=>console.log('HQ interaction polish isolated preview: http://192.168.1.40:3064/?testAudio=off'));
process.on('SIGTERM',()=>server.close(()=>db.close()));
