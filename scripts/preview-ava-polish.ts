import express from 'express';
import {DatabaseSync} from 'node:sqlite';
import {resolve} from 'node:path';
import {mkdirSync} from 'node:fs';
import {registerFoundation} from '../server/foundation-api';
if(process.env.NODE_ENV==='production')throw new Error('Local isolated preview only.');
const root=resolve(import.meta.dirname,'..');mkdirSync(resolve(root,'data/ava-media'),{recursive:true});
const db=new DatabaseSync(resolve(root,'data/ava-polish-preview.sqlite'));db.exec('PRAGMA journal_mode=WAL;PRAGMA foreign_keys=ON;PRAGMA busy_timeout=5000');
const app=express();app.use(express.json());registerFoundation(app,db,{cookieName:'airace_ava_polish',legacyPaths:[]});
// Deliberate local fixtures, isolated from every normal player and the production database.
app.get('/ava-preview/:scene',async(req,res)=>{try{
 const response=await fetch('http://127.0.0.1:3053/api/foundation'),data=await response.json();
 const cookie=response.headers.get('set-cookie')!;const row=db.prepare('SELECT save_id FROM company_players WHERE id=?').get(data.company.playerId)!;
 const scene=req.params.scene,now=Date.now(),s=data.state;
 if(scene!=='fresh')Object.assign(s,{builders:1,starterStation:'placed',stationLayout:{position:[3,5],orientation:0}});
 if(['construction','collection','ready'].includes(scene))s.rig={position:[6,0],orientation:0,startedAt:scene==='construction'?now:now-15000,completesAt:scene==='construction'?now+15000:now,lastProducedAt:now,stored:scene==='ready'?2:0};
 const step=scene==='compute'?5:scene==='research'?6:scene==='construction'?10:['collection','ready'].includes(scene)?12:scene==='build'?7:0;
 db.prepare('UPDATE foundation_saves SET state=? WHERE id=?').run(JSON.stringify(s),row.save_id as string);
 db.prepare('UPDATE foundation_ava SET progress=? WHERE session=?').run(JSON.stringify({status:'active',step,builderStep:4,revision:0,collected:false}),row.save_id as string);
 if(scene!=='fresh')await fetch('http://127.0.0.1:3053/api/foundation/company/later',{method:'POST',headers:{'Content-Type':'application/json','X-Company-ID':data.company.playerId,cookie:cookie.split(';')[0]},body:'{}'});
 res.setHeader('Set-Cookie',cookie);res.redirect('/?testAudio=off');
 }catch(e){res.status(500).send((e as Error).message);}});
app.get('/healthz',(_req,res)=>res.json({status:'ok',isolatedPreview:true}));app.use(express.static(resolve(root,'dist')));app.get('/{*path}',(_req,res)=>res.sendFile(resolve(root,'dist/index.html')));
const server=app.listen(3053,'0.0.0.0',()=>console.log('Ava polish isolated preview: http://192.168.1.40:3053/?testAudio=off'));
process.on('SIGTERM',()=>server.close(()=>db.close()));
