import express from 'express';import {DatabaseSync} from 'node:sqlite';import {randomUUID} from 'node:crypto';
import {registerFoundation} from '../../server/foundation-api';import {initialFoundation,type FoundationState} from '../../shared/foundation';import {identityHeaders,saveIdForCookie} from './identity';
export async function worldFixture(path=':memory:',initialTime=1700000000000){
 const db=new DatabaseSync(path),app=express();app.use(express.json());let now=initialTime;registerFoundation(app,db,{clock:()=>now});const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const url=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 type Player={id:string;cookie:string;saveId:string};const headers=(p:Player)=>identityHeaders(db,p.cookie);
 const get=async(p:Player,route='')=>{const r=await fetch(url+'/api/foundation'+route,{headers:headers(p)});return {status:r.status,data:await r.json()};};
 const post=async(p:Player,route:string,body:unknown)=>{const r=await fetch(url+'/api/foundation'+route,{method:'POST',headers:headers(p),body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
 const read=(p:Player)=>JSON.parse(String(db.prepare('SELECT state FROM foundation_saves WHERE id=?').get(p.saveId)!.state)) as FoundationState;
 const save=(p:Player,s:FoundationState)=>db.prepare('UPDATE foundation_saves SET state=? WHERE id=?').run(JSON.stringify(s),p.saveId);
 async function fresh(name:string,kind:'simple'|'developed'|'new'='simple'){
  const r=await fetch(url+'/api/foundation'),d=await r.json(),cookie=r.headers.get('set-cookie')!.split(';')[0],p={id:d.company.playerId,cookie,saveId:saveIdForCookie(db,cookie)};
  const named=await post(p,'/company/username',{username:name});if(named.status!==200)throw Error(JSON.stringify(named.data));if(kind==='new')return p;
  const s=initialFoundation(),job={startedAt:now-1000,completesAt:now-500};Object.assign(s,{compute:500,research:200,bots:10,builders:1,starterStation:'placed',hqLayout:{position:[-5,-1],orientation:kind==='developed'?2:1},stationLayout:{position:[12,-12],orientation:1},rig:{position:[10,-2],orientation:3,...job,lastProducedAt:now,stored:17},landscape:{version:1,epoch:'qa',sequence:0,nextSpawnAt:now+1e12,items:[{id:'qa-tree',kind:'tree',position:[25,20],variant:1}],pendingCompute:0}});
  if(kind==='developed'){s.founderHqLevel=2;s.lab={position:[-16,9],orientation:2,...job,lastProducedAt:now,stored:6};s.fabricator={position:[14,10],orientation:3,...job,separateHangar:true,hangarPosition:[21,10]};s.hangar={position:[21,10],orientation:1,...job,size:'expanded'};s.rig2={position:[-21,-9],orientation:1,...job,lastProducedAt:now,stored:31};s.decorations=[{id:'qa-flowers',kind:'flowers',position:[-20,18],orientation:1}];s.walls=[];let n=0;for(let x=-14;x<=14;x+=2)for(const z of [-10,8])s.walls.push({id:'qa-wall-'+n++,position:[x,z],orientation:0});for(let z=-9;z<=7;z+=2)for(const x of [-15,15])s.walls.push({id:'qa-wall-'+n++,position:[x,z],orientation:1});}
  save(p,s);db.prepare('UPDATE foundation_ava SET progress=? WHERE session=?').run(JSON.stringify({status:'complete',step:16,builderStep:4,revision:0,collected:true}),p.saveId);return p;
 }
 const command=(p:Player,command:unknown,requestId=randomUUID())=>post(p,'/bots',{requestId,generation:read(p).generation??0,command});
 const search=(p:Player,previous?:string,requestId=randomUUID())=>post(p,'/pvp/search',{requestId,...(previous?{previous}:{})});
 return {db,app,url,server,headers,get,post,read,save,fresh,command,search,time:()=>now,setTime:(n:number)=>{now=n;},close:()=>new Promise<void>(r=>server.close(()=>{db.close();r();}))};
}
