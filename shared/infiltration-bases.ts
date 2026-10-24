import {SENTINEL} from './sentinel-catalog';
import {DRONE_DETECTION_RADIUS} from './drone-balance';
import type {TargetSnapshot,Asset,Vec,Defense} from './infiltration';
import type {FoundationState} from './foundation';
import type {SecurityBarrier} from './security-walls';
export const BASE_IDS=['lumen-labs','vector-works','prism-systems','orbit-research','apex-compute'] as const;
export const BASE_REWARDS=[{compute:30,research:20,influence:25},{compute:50,research:32,influence:40},{compute:65,research:44,influence:55},{compute:80,research:56,influence:70},{compute:100,research:70,influence:90}] as const;
const rect=(id:string,x:number,z:number,w:number,d:number):SecurityBarrier=>({id,x,z,w,d,height:1.2});
const asset=(id:string,kind:Asset['kind'],x:number,z:number,access?:Vec):Asset=>({id,kind,name:kind==='hq'?'Founder HQ':kind==='gpu'?'GPU Rig':kind==='lab'?'Research Lab':'Core terminal',position:[x,z],size:kind==='hq'?[7,6]:kind==='gpu'?[4,3]:kind==='lab'?[3.8,2.8]:[1.6,1.4],access,hackSeconds:access?(kind==='gpu'?12:kind==='lab'?16:22):undefined,compute:0,research:0});
/** Hand-authored new-operation snapshots. Previously saved missions keep their layouts. */
export function craftCampusTarget(id:string):TargetSnapshot{
 const rank=BASE_IDS.indexOf(id as typeof BASE_IDS[number]);if(rank<0)throw Error('Unknown rival campus');
 const layouts=[
  {half:[15,12],compound:[11,7],entry:[-12,9],assets:[asset('hq','hq',0,-2),asset('gpu','gpu',-6,2,[-6,4.3]),asset('lab','lab',6,2,[6,4.4]),asset('terminal','terminal',7,-4,[7,-2.5])],walls:[rect('back',0,-6,21,.5),rect('left',-10.5,-1,.5,10),rect('right',10.5,-1,.5,10),rect('front',2,6,12,.5)],routes:[[[2,4],[5,4],[7,1]]]},
  {half:[19,13],compound:[14,8],entry:[-16,10],assets:[asset('hq','hq',-4,-3),asset('gpu','gpu',-10,3,[-10,5.3]),asset('lab','lab',7,1,[7,3.4]),asset('terminal','terminal',11,-5,[11,-3.5])],walls:[rect('back',0,-7,26,.5),rect('left',-13,-1,.5,12),rect('right',13,-1,.5,12),rect('front-a',-8,7,10,.5),rect('front-b',9,7,8,.5),rect('wing',3,-3,.5,6)],routes:[[[-8,5],[-3,4],[1,3]],[[8,4],[11,1],[10,-2]]]},
  {half:[20,17],compound:[15,12],entry:[-17,14],assets:[asset('hq','hq',-7,-5),asset('gpu','gpu',-8,6,[-8,8.3]),asset('lab','lab',7,5,[7,7.4]),asset('terminal','terminal',9,-7,[9,-8.5]),asset('gpu-2','gpu',1,-6,[1,-3.7])],walls:[rect('back',-4,-11,20,.5),rect('left',-14,-1,.5,20),rect('elbow',6,-8,.5,6),rect('shoulder',10,-5,8,.5),rect('right',14,2,.5,14),rect('front-a',-9,10,10,.5),rect('front-b',9,10,10,.5),rect('inner',-2,3,.5,7)],routes:[[[-11,6],[-6,8],[-4,4]],[[5,8],[10,7],[11,2]],[[8,-2],[10,-5],[10,-8]]]},
  {half:[22,18],compound:[17,13],entry:[-19,15],assets:[asset('hq','hq',0,-6),asset('gpu','gpu',-11,4,[-11,6.3]),asset('lab','lab',10,4,[10,6.4]),asset('terminal','terminal',10,-7,[10,-5.5]),asset('gpu-2','gpu',-10,-6,[-10,-3.7])],walls:[rect('back',0,-12,32,.5),rect('left',-16,-2,.5,20),rect('right',16,-2,.5,20),rect('front-a',-10,11,12,.5),rect('front-b',10,11,12,.5),rect('divide-a',-5,1,18,.5),rect('divide-b',12,1,8,.5),rect('core-a',-5,-6,.5,7),rect('core-b',5,-6,.5,7)],routes:[[[-13,8],[-8,7],[-5,4]],[[7,8],[13,7],[13,3]],[[-12,-3],[-10,-9],[-7,-9]],[[8,-4],[13,-7],[12,-10]]]},
  {half:[24,20],compound:[19,15],entry:[-21,17],assets:[asset('hq','hq',0,-7),asset('gpu','gpu',-12,6,[-12,8.3]),asset('lab','lab',11,6,[11,8.4]),asset('terminal','terminal',13,-8,[13,-6.5]),asset('gpu-2','gpu',-11,-7,[-11,-4.7]),asset('lab-2','lab',1,4,[1,6.4])],walls:[rect('back',0,-14,36,.5),rect('left',-18,-3,.5,22),rect('right-a',18,-8,.5,12),rect('right-b',16,8,.5,8),rect('step',17,2,2,.5),rect('front-a',-12,13,12,.5),rect('front-b',9,13,14,.5),rect('divide-a',-7,0,22,.5),rect('divide-b',14,0,8,.5),rect('core-left',-5,-7,.5,8),rect('core-right',5,-7,.5,8),rect('core-back',0,-11,10,.5)],routes:[[[-14,10],[-9,10],[-8,6]],[[7,10],[12,10],[13,5]],[[-14,-3],[-12,-11],[-8,-10]],[[8,-4],[14,-6],[14,-11]],[[20,-12],[21,-10],[20,-6]]]}
 ];
 const l=layouts[rank],reward=BASE_REWARDS[rank];
 // Fixed defensive emplacements replace one mobile patrol per tower to retain a viable army budget.
 const towerPositions:Vec[]=rank===2?[[6,-2]]:rank===3?[[0,6]]:rank===4?[[-7,6],[11,-3]]:[];
 // Mission emplacements use a slower training-defense profile; owned PvP towers retain their balance.
 const sentinels=towerPositions.map((position,i)=>({id:'vanguard-'+i,position,range:SENTINEL.range,damage:SENTINEL.damage,lockStep:SENTINEL.lockStep,maxDamage:SENTINEL.maxDamage,intervalMs:2000,warmupMs:900}));
 for(const tower of sentinels)l.assets.push({id:tower.id,kind:'station',model:'sentinel',name:'Sentinel Tower',position:tower.position,size:[4,4],access:[tower.position[0],tower.position[1]+2.7],hackSeconds:12,compute:0,research:0});
 const tech=l.assets.filter(a=>a.access);let c=reward.compute,r=reward.research;
 for(const [i,a]of tech.entries()){a.compute=i===tech.length-1?c:Math.floor(reward.compute/tech.length);a.research=i===tech.length-1?r:Math.floor(reward.research/tech.length);c-=a.compute;r-=a.research;}
 const walls=l.walls.flatMap(w=>{const horizontal=w.w>w.d,len=Math.max(w.w,w.d),n=Math.ceil(len/2),span=len/n;return Array.from({length:n},(_,i)=>({...w,id:w.id+'-'+i,x:w.x+(horizontal?-len/2+span*(i+.5):0),z:w.z+(horizontal?0:-len/2+span*(i+.5)),w:horizontal?span:w.w,d:horizontal?w.d:span}));});
 const defenses:Defense[]=l.routes.slice(0,l.routes.length-sentinels.length-(rank===4?1:0)).map((route,i)=>({id:'sentinel-'+(i+1),route:route as Vec[],radius:DRONE_DETECTION_RADIUS,patrolSpeed:1.2,pursuitSpeed:2.1,warningSeconds:.35}));
 return {version:1,id,name:['Lumen Labs','Vector Works','Prism Systems','Orbit Research','Apex Compute'][rank],difficulty:['Startup','Developing','Established','Advanced','Elite'][rank],arena:'campus-v2',campusBounds:{minX:-l.half[0],maxX:l.half[0],minZ:-l.half[1],maxZ:l.half[1]},compound:l.compound as Vec,entry:l.entry as Vec,exit:l.entry as Vec,assets:l.assets,sentinels,defenses,walls,influence:reward.influence,navigationVersion:2,hqLevel:2};
}
/** Random within a progression-appropriate pool; HQ 2 and three successful missions unlock all tiers. */
export function chooseInfiltrationBase(s:FoundationState,seed:number,completed=0){const level=s.founderHqLevel??1,bots=s.bots??0;const tiers=completed>=3&&level>=2?5:completed>=1&&level>=2?4:level>=2||bots>=10?3:bots>=5?2:1;return BASE_IDS[(seed>>>0)%tiers];}

