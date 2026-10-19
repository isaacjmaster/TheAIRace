import express from 'express';import {DatabaseSync} from 'node:sqlite';import {resolve} from 'node:path';import {mkdirSync} from 'node:fs';
import {registerFoundation} from '../server/foundation-api';
if(process.env.NODE_ENV==='production')throw new Error('HQ upgrade preview is local development only.');
const root=resolve(import.meta.dirname,'..'),path=resolve(root,'data/territory-preview.sqlite'),media=resolve(root,'data/hq2-media');mkdirSync(media,{recursive:true});
const db=new DatabaseSync(path);db.exec('PRAGMA journal_mode=WAL;PRAGMA foreign_keys=ON;PRAGMA busy_timeout=5000');
const app=express();app.use(express.json());registerFoundation(app,db,{cookieName:'airace_territory_preview',legacyPaths:[]});
let previewCookie='';app.get('/territory-preview',(_req,res)=>{if(!previewCookie){res.status(503).send('Preview is warming up. Reload shortly.');return;}res.setHeader('Set-Cookie',previewCookie);res.redirect('/');});
app.use('/preview-media',express.static(media));app.get('/healthz',(_req,res)=>res.json({status:'ok',isolatedPreview:true}));app.use(express.static(resolve(root,'dist')));app.get('/{*path}',(_req,res)=>res.sendFile(resolve(root,'dist/index.html')));
const server=app.listen(3040,'0.0.0.0',async()=>{try{
 const response=await fetch('http://127.0.0.1:3040/api/foundation'),data=await response.json();previewCookie=response.headers.get('set-cookie')!;const cookie=previewCookie.split(';')[0],row=db.prepare('SELECT save_id FROM company_players WHERE id=?').get(data.company.playerId)!;
 const now=Date.now(),state=data.state;Object.assign(state,{compute:650,builders:1,starterStation:'placed',stationLayout:{position:[3,5],orientation:0},rig:{position:[6,0],orientation:0,startedAt:now-30000,completesAt:now-15000,lastProducedAt:now,stored:0}});
 db.prepare('UPDATE foundation_saves SET state=? WHERE id=?').run(JSON.stringify(state),row.save_id as string);db.prepare('UPDATE foundation_ava SET progress=? WHERE session=?').run(JSON.stringify({status:'legacy',step:16,revision:0,collected:false}),row.save_id as string);
 await fetch('http://127.0.0.1:3040/api/foundation/company/name',{method:'POST',headers:{cookie,'Content-Type':'application/json','X-Company-ID':data.company.playerId},body:JSON.stringify({name:'Upgrade Preview '+Date.now().toString().slice(-5)})});
 console.log('Isolated territory preview: http://192.168.1.40:3040/territory-preview');
 }catch(e){console.error('Preview setup failed:',(e as Error).message);server.close();}});
process.on('SIGTERM',()=>server.close(()=>db.close()));
