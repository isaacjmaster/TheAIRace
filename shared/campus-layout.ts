import type { BuildingId, CampusState } from './progression';
export const GRID_SIZE = 1;
export const CAMPUS_BOUNDS = { minX:-24,maxX:28,minZ:-19,maxZ:24 };
export const DEFAULT_POSITIONS:Record<BuildingId,[number,number]>={hq:[-5,-1],compute:[8,-5],revenue:[8,4],training:[-7,15],gpu:[17,-5],research:[17,4],defense:[5,15]};
export const BUILDING_FOOTPRINTS:Record<BuildingId,{width:number;depth:number}>={hq:{width:14,depth:10},compute:{width:7,depth:7},revenue:{width:7,depth:7},training:{width:7,depth:7},gpu:{width:7,depth:7},research:{width:7,depth:7},defense:{width:7,depth:7}};
export interface CampusObstacle {id:string;name:string;kind:'tree'|'rock'|'debris'|'equipment';position:[number,number];width:number;depth:number;cost:{credits:number;compute:number};reward:{credits:number;compute:number}}
export const OBSTACLES:CampusObstacle[]=[
 {id:'cedar-west',name:'Circuit Cedar',kind:'tree',position:[-18,-9],width:4,depth:4,cost:{credits:25,compute:0},reward:{credits:0,compute:5}},
 {id:'cedar-north',name:'Circuit Cedar',kind:'tree',position:[3,-14],width:4,depth:4,cost:{credits:25,compute:0},reward:{credits:0,compute:5}},
 {id:'stone-west',name:'Basalt Cluster',kind:'rock',position:[-18,2],width:4,depth:4,cost:{credits:30,compute:5},reward:{credits:10,compute:0}},
 {id:'stone-east',name:'Basalt Cluster',kind:'rock',position:[24,14],width:4,depth:4,cost:{credits:30,compute:5},reward:{credits:10,compute:0}},
 {id:'debris-south',name:'Abandoned Crates',kind:'debris',position:[-17,18],width:4,depth:4,cost:{credits:15,compute:0},reward:{credits:5,compute:4}},
 {id:'debris-north',name:'Abandoned Crates',kind:'debris',position:[15,-14],width:4,depth:4,cost:{credits:15,compute:0},reward:{credits:5,compute:4}},
 {id:'equipment-east',name:'Retired Server Rack',kind:'equipment',position:[24,-13],width:4,depth:4,cost:{credits:20,compute:5},reward:{credits:5,compute:10}},
 {id:'equipment-south',name:'Retired Cooling Unit',kind:'equipment',position:[16,19],width:4,depth:4,cost:{credits:20,compute:5},reward:{credits:5,compute:10}},
];
export function positionFor(campus:CampusState,id:BuildingId):[number,number]{return campus.positions?.[id]||DEFAULT_POSITIONS[id];}
function overlaps(a:[number,number],aw:number,ad:number,b:[number,number],bw:number,bd:number){return Math.abs(a[0]-b[0])<(aw+bw)/2&&Math.abs(a[1]-b[1])<(ad+bd)/2;}
/** All building lots stay reserved, including locked lots, to keep future unlocks valid. */
export function validatePlacement(campus:CampusState,id:BuildingId,position:[number,number]):string|null{
 const f=BUILDING_FOOTPRINTS[id];if(!f)return 'Choose a valid building.';
 if(position.length!==2||!position.every(n=>Number.isFinite(n)&&Number.isInteger(n/GRID_SIZE)))return 'Place the building on the grid.';
 const [x,z]=position,b=CAMPUS_BOUNDS;
 if(x-f.width/2<b.minX||x+f.width/2>b.maxX||z-f.depth/2<b.minZ||z+f.depth/2>b.maxZ)return 'Keep the building inside the campus.';
 for(const other of Object.keys(DEFAULT_POSITIONS) as BuildingId[]){if(other===id)continue;const o=BUILDING_FOOTPRINTS[other];if(overlaps(position,f.width,f.depth,positionFor(campus,other),o.width,o.depth))return 'This space is reserved for another building.';}
 for(const obstacle of OBSTACLES){if(campus.clearedObstacles?.includes(obstacle.id))continue;if(overlaps(position,f.width,f.depth,obstacle.position,obstacle.width,obstacle.depth))return `Clear ${obstacle.name} first.`;}
 return null;
}
