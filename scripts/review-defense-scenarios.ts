import {writeFileSync,mkdirSync} from 'node:fs';
import {BASE_IDS} from '../shared/infiltration-bases';
import {newSquadOperation,advanceSquad} from '../shared/squad-infiltration';
import {commandOperation,targetBounds,validDeployment,type Vec} from '../shared/infiltration';
import {LEGACY_TACTICAL_BALANCE as OLD} from '../shared/tactical-infiltration';
const results:unknown[]=[];
for(const id of BASE_IDS)for(const strategy of ['south','north','split','east','west','southwest','northwest']){
 const o=newSquadOperation('review',id,100000),b=targetBounds(o.target),points:Vec[]=[];
 for(let i=0;i<10;i++){
  const x=(i-4.5)*1.2,z=(i-4.5)*1.1;
  const p:Vec=strategy==='north'?[x,b.minZ+1.5]:strategy==='east'?[b.maxX-1.5,z]:strategy==='west'?[b.minX+1.5,z]:strategy==='southwest'?[b.minX+1.5,b.maxZ-3-i*.25]:strategy==='northwest'?[b.minX+1.5,b.minZ+3+i*.25]:strategy==='split'?[i%2?b.maxX-1.5:b.minX+1.5,z]:[x,b.maxZ-1.5];
  if(validDeployment(o.target,p))points.push(p);
 }
 for(const position of points)commandOperation(o,{action:'deploy',position},100000);
 advanceSquad(o,280000);
 const row={id,strategy,deployed:points.length,status:o.status,hacked:o.hacked.length,objectives:o.target.assets.filter(a=>a.hackSeconds).length,disabled:o.drones.filter(d=>d.health===0).length,lost:o.squad!.agents.filter(a=>a.state==='lost').length,seconds:(o.finishedAt!-100000)/1000};results.push(row);console.log(JSON.stringify(row));
}
const combat=[];
for(const old of [true,false])for(const count of [1,3,5,8]){
 const o=newSquadOperation('combat','vector-works',100000);if(old)delete o.squad!.balanceVersion;
 o.target.walls=[];o.target.assets=[{id:'gpu',kind:'gpu',name:'GPU',position:[8,-6],size:[2,2],access:[8,-4],hackSeconds:12,compute:20,research:0}];o.target.defenses=o.target.defenses.slice(0,1);o.target.defenses[0].route=[[0,0],[1,0]];o.drones=o.drones.slice(0,1);o.drones[0].position=[0,0];if(old)o.drones[0].health=OLD.droneHealth;
 for(let i=0;i<count;i++)commandOperation(o,{action:'deploy',position:[-18,i*.1]},100000);
 for(const [i,a]of o.squad!.agents.entries()){a.position=[-2+i*.4,3];a.target=undefined;a.path=[];a.mode='idle';a.nextPlanAt=100000;}
 advanceSquad(o,120000);const row={version:old?'before':'after',bots:count,lost:o.squad!.agents.filter(a=>a.state==='lost').length,disabled:o.drones.filter(d=>d.health===0).length,droneHealth:o.drones[0].health};combat.push(row);console.log(JSON.stringify(row));
}
mkdirSync('output/Defense_Daytime_Review',{recursive:true});writeFileSync('output/Defense_Daytime_Review/simulations.json',JSON.stringify({bases:results,combat},null,2));
