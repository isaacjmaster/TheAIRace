/** Stable, database-free inputs for the authoritative combat balance matrix. */
import {newSquadOperation} from '../shared/squad-infiltration';
import {playerOperation} from '../shared/player-combat';
import {publicFootprint,type PublicBase,type PublicBuilding} from '../shared/player-base';
import {placementFootprint} from '../shared/foundation';
import type {Operation,Vec} from '../shared/infiltration';
export const SEED=729381;
export const COMPOSITIONS=[[20,0],[15,1],[10,2],[5,3],[0,4]] as const;
export const STRATEGIES=['frontal','heavy-first','light-first','sides','split'] as const;
export const EXTRA_STRATEGIES=['chaotic','quick-support'] as const;
export type Strategy=typeof STRATEGIES[number]|typeof EXTRA_STRATEGIES[number];
export const SCENARIOS=['lumen-labs','vector-works','prism-systems','orbit-research','apex-compute','pvp-open','pvp-average','pvp-fortified','pvp-compartments','pvp-spread','pvp-drone-coverage'] as const;
export const DIAGNOSTIC_SCENARIOS=['pvp-clear-fire-lanes'] as const;
export const TIERS={early:{hq:1,research:0,multiplier:1},hq2:{hq:2,research:0,multiplier:1},researched:{hq:2,research:3,multiplier:1.3}} as const;
const positions:PublicBuilding[]=[['hq',[-7.5,-4]],['rig',[2.5,-7.5]],['rig2',[9.5,-7.5]],['lab',[9,-1.5]],['fabricator',[2,-2.5]],['hangar',[8,7.5]],['station',[-7.5,5]],['droneStation',[-1.5,8.5]],['sentinel',[0,2]]].map(([id,position])=>({id,position,orientation:0,level:id==='hq'?2:1,complete:true,...(id==='hangar'?{size:'compound'}:{})})) as PublicBuilding[];
function perimeter(x0:number,z0:number,x1:number,z1:number){const points:Vec[]=[];for(let x=x0;x<=x1;x++){points.push([x,z0],[x,z1]);}for(let z=z0+1;z<z1;z++)points.push([x0,z],[x1,z]);return points;}
const overlap=(a:{x:number;z:number;w:number;d:number},b:{x:number;z:number;w:number;d:number})=>Math.abs(a.x-b.x)<(a.w+b.w)/2-.001&&Math.abs(a.z-b.z)<(a.d+b.d)/2-.001;
export function baseFixture(name:string):PublicBase{
 const buildings=structuredClone(positions);if(name==='pvp-clear-fire-lanes'){for(const b of buildings){if(b.id==='station')b.position=[-7.5,5];if(b.id==='droneStation')b.position=[-7.5,9];if(b.id==='sentinel')b.position=[0,7];}}if(name==='pvp-spread')for(const b of buildings){b.position=[b.position[0]+(b.position[0]<0?-7:7),b.position[1]+(b.position[1]<0?-5:5)];}
 let points:Vec[]=name==='pvp-open'||name==='pvp-spread'?[]:name==='pvp-compartments'?[...perimeter(-13.5,-10.5,-1.5,2.5),...perimeter(4.5,-10.5,12.5,1.5)]:perimeter(-13.5,-11.5,13.5,11.5);
 if(name==='pvp-average')points=points.filter((_,i)=>i%5!==0);
 const shapes=buildings.map(b=>placementFootprint(b.id,b));points=points.filter(p=>!shapes.some(f=>overlap(f,{x:p[0],z:p[1],w:1,d:1})));points=[...new Map(points.map(p=>[p.join(','),p])).values()];
 const base:PublicBase={version:1,companyId:name,capturedAt:1000,buildings,walls:points.map((p,i)=>({id:'wall-'+i,position:p,orientation:0})),decorations:[],scenery:[],droneGuards:name==='pvp-clear-fire-lanes'?[[-7,7],[7,7]]:name==='pvp-drone-coverage'?[[-7,0],[7,0]]:name==='pvp-open'||name==='pvp-average'?[[15,14],[16,12]]:[[-3,5],[5,2]]};
 if(base.walls.length>100)throw Error('Fixture exceeds legal wall cap');
 for(let i=0;i<shapes.length;i++)for(let j=i+1;j<shapes.length;j++)if(overlap(shapes[i],shapes[j]))throw Error(`Fixture overlap ${name}: ${buildings[i].id}/${buildings[j].id}`);
 for(const b of buildings){const f=publicFootprint(b);if(f.x-f.w/2< -34||f.x+f.w/2>38||f.z-f.d/2< -27||f.z+f.d/2>32)throw Error('Fixture outside campus');}
 return base;
}
export function operation(scenario:string){return scenario.startsWith('pvp-')?playerOperation('balance',baseFixture(scenario),{id:scenario,name:scenario,level:2,hqLevel:2,influence:0,rank:null,visitable:true},'isolated-attacker',1000):newSquadOperation('balance',scenario,1000);}
export function fixtureInfo(o:Operation){return {playerLayout:!!o.pvp,buildings:o.target.assets.length,walls:o.target.walls?.length??0,sentinels:o.target.sentinels?.length??0,drones:o.target.defenses.length,legalPlayerDefenseCounts:!o.pvp||((o.target.sentinels?.length??0)<=1&&o.target.defenses.length<=2&&(o.target.walls?.length??0)<=100),target:o.target};}
