import express from 'express';import {DatabaseSync} from 'node:sqlite';import {resolve} from 'node:path';import {mkdirSync} from 'node:fs';
import {registerFoundation} from '../server/foundation-api';import {commandOwnedOperation,startOwnedOperation} from '../shared/infiltration-army';import {advanceSquad,newSquadOperation} from '../shared/squad-infiltration';import {BASE_IDS} from '../shared/infiltration-bases';import {buyWall} from '../shared/cybersecurity';import {clearObstacle,clearingPosition} from '../shared/landscape';import {initialFoundation,type FoundationState} from '../shared/foundation';
if(process.env.NODE_ENV==='production')throw Error('Isolated local review only');
const root=resolve(import.meta.dirname,'..');mkdirSync(resolve(root,'data/research-startup'),{recursive:true});
const db=new DatabaseSync(resolve(root,'data/research-startup/review-'+Date.now()+'.sqlite'));
const app=express();app.use(express.json());registerFoundation(app,db,{cookieName:'airace_research_startup',legacyPaths:[]});
app.get('/review/:scene',async(req,res)=>{try{
 const response=await fetch('http://127.0.0.1:3092/api/foundation'),data=await response.json(),cookie=response.headers.get('set-cookie')!,row=db.prepare('SELECT save_id FROM company_players WHERE id=?').get(data.company.playerId)!;
 const now=Date.now(),s:FoundationState=Object.assign(initialFoundation(),{compute:900,builders:1,starterStation:'placed',stationLayout:{position:[10,-12],orientation:0},bots:10,founderHqLevel:2,training:[],landscape:{version:1,epoch:'review',sequence:0,nextSpawnAt:now+1e12,items:[],pendingCompute:0}}),scene=req.params.scene;
 if(['hq','phase','research','new'].includes(scene)){
  let n=0;for(let x=-13;x<=5;x+=2)for(const z of [-10,6])buyWall(s,[x,z],0,'wall-'+n++);for(let z=-9;z<=5;z+=2)for(const x of [-14,6])buyWall(s,[x,z],1,'wall-'+n++);
  if(scene==='research')s.walls=[];s.bots=4;s.research=400;s.lab={position:[6,-6],orientation:0,startedAt:0,completesAt:0,lastProducedAt:now,stored:7};s.fabricator={position:[12,0],orientation:0,startedAt:0,completesAt:0,separateHangar:true};s.hangar={position:[18,0],orientation:0,startedAt:0,completesAt:0};s.training=[now+5000,now+10000];
  s.rig={position:[-11,1],orientation:0,startedAt:0,completesAt:0,lastProducedAt:now,stored:9};s.landscape!.items=[{id:'phase-tree',kind:'tree',position:[-10.5,-7],variant:0},{id:'second-rock',kind:'rock',position:[4,-6],variant:1}];
  if(scene==='phase'){clearObstacle(s,'phase-tree',now);const j=s.landscape!.clearing!,travel=j.workAt-j.startedAt;let elapsed=travel*.5;
   for(let t=0;t<travel;t+=20){const [x,z]=clearingPosition(j,now+t);if(s.walls!.some(w=>Math.abs(x-w.position[0])<(w.orientation%2?.25:1)+.15&&Math.abs(z-w.position[1])<(w.orientation%2?1:.25)+.15)){elapsed=t;break;}}
   for(const k of ['startedAt','workAt','clearedAt','completesAt'] as const)j[k]-=elapsed;
  }
 }else if(BASE_IDS.includes(scene as typeof BASE_IDS[number])||scene==='failed'){
  if(scene==='failed')s.bots=1;startOwnedOperation(s,crypto.randomUUID(),scene==='failed'?'lumen-labs':scene,now,newSquadOperation);s.infiltrationTutorial='complete';
 }else throw Error('Choose hq, phase, failed or a base id');
 db.prepare('UPDATE foundation_saves SET state=? WHERE id=?').run(JSON.stringify(scene==='new'?initialFoundation():s),row.save_id as string);if(scene!=='new')db.prepare('UPDATE foundation_ava SET progress=? WHERE session=?').run(JSON.stringify({status:'complete',step:16,builderStep:4,revision:0,collected:false}),row.save_id as string);
 const named=await fetch('http://127.0.0.1:3092/api/foundation/company/username',{method:'POST',headers:{cookie:cookie.split(';')[0],'Content-Type':'application/json','X-Company-ID':data.company.playerId},body:JSON.stringify({username:'Review_'+data.company.playerId.replaceAll('-','').slice(0,8)})});if(!named.ok)throw Error(await named.text());
 res.setHeader('Set-Cookie',cookie);res.redirect('/?testAudio=off');
 }catch(e){res.status(500).send(String(e));}});
app.post('/review/resolve-failure',async(req,res)=>{try{const response=await fetch('http://127.0.0.1:3092/api/foundation',{headers:{cookie:req.headers.cookie??''}}),data=await response.json(),row=db.prepare('SELECT save_id FROM company_players WHERE id=?').get(data.company.playerId)!,s=data.state as FoundationState,now=Date.now();commandOwnedOperation(s,{action:'deploy',position:s.infiltration!.target.entry},now);const o=s.infiltration!,a=o.squad!.agents[0],d=o.drones[0];a.position=[...d.position];a.position[1]+=1.8;a.path=[];a.health=1;a.nextPlanAt=now+100000;o.squad!.undeployed=0;s.bots=0;advanceSquad(o,now+2000);db.prepare('UPDATE foundation_saves SET state=? WHERE id=?').run(JSON.stringify(s),row.save_id as string);res.json({status:o.status});}catch(e){res.status(500).send(String(e));}});
app.get('/healthz',(_req,res)=>res.json({status:'ok',isolatedReview:true}));app.use(express.static(resolve(root,'dist')));app.get('/{*path}',(_req,res)=>res.sendFile(resolve(root,'dist/index.html')));
const server=app.listen(3092,'0.0.0.0',()=>console.log('Isolated review http://192.168.1.40:3092/review/hq?testAudio=off'));process.on('SIGTERM',()=>server.close(()=>db.close()));
