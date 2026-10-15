import { z } from 'zod';
import type { ExpeditionCommand, ExpeditionState, ExpeditionWorld, Point, Resources } from '../../shared/expedition';
import {applyOperationCommand, operationCommandOptions} from './operation';

export const WORLD: ExpeditionWorld = {
  width: 7, height: 7, dock: { x: 0, y: 5 }, charger: { x: 0, y: 2 },
  blocked: [{x:1,y:1},{x:3,y:1},{x:3,y:5}, ...[0,1,2,4,5,6].map(y=>({x:4,y}))],
  hazards: [{x:1,y:3},{x:2,y:4},{x:5,y:3}],
  deposits: [
    {id:'scrap-pile',name:'Broken drones',resource:'scrap',position:{x:1,y:4},amount:3,charges:3,requiredRig:0},
    {id:'circuit-bin',name:'Circuit crates',resource:'scrap',position:{x:3,y:4},amount:3,charges:3,requiredRig:0},
    {id:'cell-cache',name:'Battery cache',resource:'cells',position:{x:2,y:2},amount:1,charges:3,requiredRig:0},
    {id:'gpu-vault',name:'GPU vault',resource:'gpu',position:{x:5,y:2},amount:2,charges:3,requiredRig:1},
    {id:'server-wreck',name:'Server wreck',resource:'scrap',position:{x:6,y:5},amount:3,charges:3,requiredRig:1},
  ],
};
export const RIG_UPGRADE = {name:'Recovery Rig',cost:{scrap:6,gpu:0,cells:2},description:'40 energy · 20 cargo · GPU sector access'};
const empty = (): Resources => ({scrap:0,gpu:0,cells:0});
export const rigStats = (level: number) => level >= 1 ? {energy:40,capacity:20} : {energy:26,capacity:12};
export const cargoCount = (resources: Resources): number => resources.scrap + resources.gpu + resources.cells;
const same = (a:Point,b:Point) => a.x===b.x && a.y===b.y;
const distance = (a:Point,b:Point) => Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const validPoint = (p:Point) => Number.isInteger(p?.x) && Number.isInteger(p?.y) && p.x>=0 && p.y>=0 && p.x<WORLD.width && p.y<WORLD.height;
const passable = (p:Point,rig:number) => validPoint(p) && (rig>=1 || p.x<4) && !WORLD.blocked.some(b=>same(p,b)) && !WORLD.deposits.some(d=>same(p,d.position));

/** Shortest orthogonal route. Tap a waypoint to route around costly hazard tiles. */
export function findPath(from:Point,to:Point,rigLevel:number):Point[]|null {
  if (!passable(from,rigLevel)||!passable(to,rigLevel)) return null;
  const queue: {point:Point;path:Point[]}[] = [{point:from,path:[]}];
  const visited = new Set([`${from.x},${from.y}`]);
  for(let i=0;i<queue.length;i++) {
    const {point,path}=queue[i];
    if(same(point,to)) return path;
    for(const next of [{x:point.x+1,y:point.y},{x:point.x,y:point.y-1},{x:point.x-1,y:point.y},{x:point.x,y:point.y+1}]) {
      const key=`${next.x},${next.y}`;
      if(passable(next,rigLevel)&&!visited.has(key)) {visited.add(key);queue.push({point:next,path:[...path,next]});}
    }
  }
  return null;
}
const pointSchema = z.object({x:z.number().int().min(0).max(6),y:z.number().int().min(0).max(6)}).strict();
export const expeditionCommandSchema = z.discriminatedUnion('type',[
  ...operationCommandOptions,
  z.object({type:z.literal('depart')}).strict(),z.object({type:z.literal('move'),to:pointSchema}).strict(),
  z.object({type:z.literal('gather'),depositId:z.string().min(1).max(50)}).strict(),
  ...(['recharge','return','evacuate','upgrade'] as const).map(type=>z.object({type:z.literal(type)}).strict()),
]);
export function createExpeditionState():ExpeditionState {
  return {version:1,revision:0,resources:empty(),rigLevel:0,completedRuns:0,run:null,lastResult:null};
}
/** Pure authoritative transition: invalid commands throw without mutating the save. */
export function applyExpeditionCommand(state:ExpeditionState,input:ExpeditionCommand,now=Date.now()):ExpeditionState {
  const parsed=expeditionCommandSchema.safeParse(input);
  if(!parsed.success) throw new Error('Invalid expedition command.');
  if(!Number.isFinite(now)||now<0) throw new Error('Invalid clock.');
  const command=parsed.data;
  if(command.type==='destination'||command.type==='headHome'||command.type==='launch'||command.type==='sync'||command.type==='pause'||command.type==='order')return applyOperationCommand(state,command,now);
  if(state.run?.operation&&command.type!=='evacuate'&&command.type!=='upgrade')throw new Error('Use operation orders to direct Pixel.');
  const next:ExpeditionState=structuredClone(state);
  if(command.type==='depart') {
    if(next.run) throw new Error('Pixel is already exploring.');
    next.run={id:`run-${state.revision+1}-${now}`,position:{...WORLD.dock},energy:rigStats(next.rigLevel).energy,cargo:empty(),remaining:Object.fromEntries(WORLD.deposits.map(d=>[d.id,d.charges])),readyAt:now,lastPath:[],recharged:false};
    next.lastResult=null;
  } else if(command.type==='upgrade') {
    if(next.run) throw new Error('Return to HQ to install the rig.');
    if(next.rigLevel>=1) throw new Error('Recovery Rig already installed.');
    for(const resource of ['scrap','gpu','cells'] as const) if(next.resources[resource]<RIG_UPGRADE.cost[resource]) throw new Error('Collect 6 scrap and 2 energy cells first.');
    for(const resource of ['scrap','gpu','cells'] as const) next.resources[resource]-=RIG_UPGRADE.cost[resource];
    next.rigLevel=1;
  } else {
    const run=next.run;
    if(!run) throw new Error('Depart from HQ first.');
    if(command.type!=='evacuate'&&now<run.readyAt) throw new Error('Pixel is still moving or collecting.');
    if(command.type==='move') {
      const path=findPath(run.position,command.to,next.rigLevel);
      if(!path||!path.length) throw new Error('Choose an open reachable tile.');
      const cost=path.reduce((sum,p)=>sum+(WORLD.hazards.some(h=>same(h,p))?4:1),0);
      if(run.energy<cost) throw new Error('Not enough energy for that route.');
      run.energy-=cost;run.lastPath=path;run.position={...command.to};run.readyAt=now+path.length*180;
    } else if(command.type==='gather') {
      const deposit=WORLD.deposits.find(d=>d.id===command.depositId);
      if(!deposit) throw new Error('Unknown resource deposit.');
      if(deposit.requiredRig>next.rigLevel) throw new Error('Install the Recovery Rig to access this deposit.');
      if(distance(run.position,deposit.position)!==1) throw new Error('Move next to the deposit first.');
      if(!run.remaining[deposit.id]) throw new Error('Deposit depleted. Explore another cache.');
      if(run.energy<2) throw new Error('Not enough energy to collect.');
      if(cargoCount(run.cargo)+deposit.amount>rigStats(next.rigLevel).capacity) throw new Error('Cargo full. Return to the dock.');
      run.energy-=2;run.cargo[deposit.resource]+=deposit.amount;run.remaining[deposit.id]--;run.lastPath=[];run.readyAt=now+500;
    } else if(command.type==='recharge') {
      if(!same(run.position,WORLD.charger)) throw new Error('Move to the charger first.');
      if(run.recharged) throw new Error('Charger already used this expedition.');
      if(run.cargo.cells<1) throw new Error('Collect an energy cell to recharge.');
      if(run.energy>=rigStats(next.rigLevel).energy) throw new Error('Battery is already full.');
      run.cargo.cells--;run.energy=Math.min(rigStats(next.rigLevel).energy,run.energy+8);run.recharged=true;run.lastPath=[];run.readyAt=now+500;
    } else {
      const evacuated=command.type==='evacuate';
      if(!evacuated&&!same(run.position,WORLD.dock)) throw new Error('Return to the dock to bank all cargo.');
      const resources=empty();
      for(const resource of ['scrap','gpu','cells'] as const) {resources[resource]=evacuated?Math.floor(run.cargo[resource]/2):run.cargo[resource];next.resources[resource]+=resources[resource];}
      next.lastResult={resources,evacuated,message:evacuated?'Emergency recovery saved half of each resource.':'Cargo secured. Welcome home, founder!'};
      next.completedRuns++;next.run=null;
    }
  }
  next.revision++;
  return next;
}
