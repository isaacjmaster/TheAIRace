import {z} from 'zod';
import type {ExpeditionState, ExpeditionRun, Point, ExpeditionWorld, Deposit} from '../../shared/expedition';
import type {Operation, OperationCommand, Destination} from '../../shared/operation';
import {WORLD, rigStats, cargoCount, applyExpeditionCommand} from './expedition';

export const operationCommandOptions = [
  z.object({type:z.literal('launch'),destination:z.enum(['safe','medium','dangerous']).optional()}).strict(),
  z.object({type:z.literal('destination'),destination:z.enum(['safe','medium','dangerous'])}).strict(),
  z.object({type:z.literal('headHome')}).strict(),
  z.object({type:z.literal('sync')}).strict(),
  z.object({type:z.literal('pause'),paused:z.boolean()}).strict(),
  z.object({type:z.literal('order'),order:z.enum(['gather','scout','hold','return']),focus:z.enum(['auto','scrap','cells','gpu']).optional(),risk:z.enum(['safe','bold']).optional()}).strict(),
] as const;
export const operationCommandSchema=z.discriminatedUnion('type',operationCommandOptions);
const same=(a:Point,b:Point)=>a.x===b.x&&a.y===b.y;
const key=(p:Point)=>`${p.x},${p.y}`;
const distance=(a:Point,b:Point)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const neighbours=(p:Point)=>[{x:p.x+1,y:p.y},{x:p.x,y:p.y-1},{x:p.x-1,y:p.y},{x:p.x,y:p.y+1}];
const empty=()=>({scrap:0,gpu:0,cells:0});
const passable=(world:ExpeditionWorld,p:Point,rig:number)=>p.x>=0&&p.y>=0&&p.x<world.width&&p.y<world.height&&(rig>0||p.x<4)&&!world.blocked.some(b=>same(p,b))&&!world.deposits.some(d=>same(p,d.position));

/** Stable breadth-first routes; no browser coordinates or planner rewards are trusted. */
export function operationPath(world:ExpeditionWorld,from:Point,to:Point,rig:number,avoid:Point[]=[]):Point[]|null {
  if(!passable(world,from,rig)||!passable(world,to,rig))return null;
  const queue=[{point:from,path:[] as Point[]}],seen=new Set([key(from)]);
  for(let i=0;i<queue.length;i++){
    const {point,path}=queue[i];if(same(point,to))return path;
    for(const next of neighbours(point))if(passable(world,next,rig)&&!seen.has(key(next))&&!avoid.some(p=>same(p,next))){seen.add(key(next));queue.push({point:next,path:[...path,next]});}
  }
  // A moving patrol may temporarily cut the whole sector in two. Approach the
  // crossing along a nominal route, but never take a threatened next step.
  if(avoid.length){const nominal=operationPath(world,from,to,rig);if(nominal&&(!nominal.length||!avoid.some(p=>same(p,nominal[0]))))return nominal;}
  return null;
}
function makeWorld(seed:number,zoned=false):ExpeditionWorld {
  let value=seed>>>0;
  const random=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
  const shuffle=<T,>(items:T[])=>{for(let i=items.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[items[i],items[j]]=[items[j],items[i]];}return items;};
  const world=structuredClone(WORLD);
  const starter=shuffle(world.deposits.slice(0,3).map(d=>({...d.position})));
  const advanced=shuffle(world.deposits.slice(3).map(d=>({...d.position})));
  world.deposits.forEach((d,i)=>{d.position=i<3?starter[i]:advanced[i-3];});
  if(zoned){
    // Explicit destinations retain their geographic meaning across seeded sorties.
    // Yields, charges and rig access remain exactly the existing economy.
    const scraps=shuffle([{x:1,y:4},{x:3,y:4}]);
    world.deposits[0].position=scraps[0];world.deposits[1].position=scraps[1];
    world.deposits[2].position=random()<0.5?{x:2,y:2}:{x:2,y:1};
    world.deposits[3].position=random()<0.5?{x:5,y:2}:{x:6,y:2};
    world.deposits[4].position=random()<0.5?{x:6,y:5}:{x:5,y:5};
  }
  world.hazards=[]; // Patrols replace static damage tiles in Operations.
  return world;
}
function makeOperation(seed:number,now:number,destination?:Destination):Operation {
  const world=makeWorld(seed,!!destination);
  // Endpoint scan beats create readable windows through the central corridor.
  const routes=[[{x:1,y:3},{x:1,y:3},{x:2,y:3},{x:3,y:3},{x:3,y:3},{x:2,y:3}],[{x:5,y:3},{x:6,y:3},{x:6,y:4},{x:5,y:4}]];
  return {...(destination?{destination}:{}),version:2,seed,world,patrols:routes.map((route,i)=>{const index=(seed+i*3)%route.length;return{id:`patrol-${i}`,route,index,position:{...route[index]}};}),order:'gather',focus:destination?destinationFocus(destination):'auto',risk:destination==='dangerous'?'bold':'safe',paused:false,tick:0,lastTickAt:now,discovered:world.deposits.filter(d=>distance(d.position,world.dock)<=3).map(d=>d.id),visited:[{...world.dock}],status:'Gather order received. Finding a safe cache.',targetId:null,eventId:0,event:'hold'};
}
function threats(op:Operation):Point[]{return op.patrols.flatMap(p=>[p.position,p.route[(p.index+1)%p.route.length]]);}
function routeToDeposit(state:ExpeditionState,deposit:Deposit,avoid:Point[]):Point[]|null {
  const run=state.run!,op=run.operation!;
  const routes=neighbours(deposit.position).map(p=>operationPath(op.world,run.position,p,state.rigLevel,avoid)).filter((p):p is Point[]=>p!==null);
  routes.sort((a,b)=>a.length-b.length);return routes[0]??null;
}
function mark(run:ExpeditionRun,event:Operation['event'],status:string){const op=run.operation!;if(op.event==='hazard'&&event!=='hazard')return;op.event=event;op.eventId++;op.status=status;}
function discover(run:ExpeditionRun,radius=2){const op=run.operation!;for(const d of op.world.deposits)if(distance(run.position,d.position)<=radius&&!op.discovered.includes(d.id))op.discovered.push(d.id);}
function bank(state:ExpeditionState,now:number):ExpeditionState {
  // Reuse the exact existing bank/evacuation transition and resource arithmetic.
  delete state.run!.operation;state.run!.readyAt=now;
  return applyExpeditionCommand(state,{type:'return'},now);
}
function tick(state:ExpeditionState,now:number):ExpeditionState {
  const run=state.run!,op=run.operation!;op.tick++;run.lastPath=[];op.event='hold';
  for(const patrol of op.patrols){patrol.index=(patrol.index+1)%patrol.route.length;patrol.position={...patrol.route[patrol.index]};}
  // Dock shielding makes reviewing orders and banking safe.
  const interference=!same(run.position,op.world.dock)&&op.patrols.some(p=>same(p.position,run.position));
  if(interference){run.energy=Math.max(0,run.energy-3);mark(run,'hazard','Patrol interference! Battery lost. Consider a safer route.');}
  if(run.energy<=0){op.paused=true;mark(run,'hazard','Battery depleted. Emergency recovery can save half your cargo.');return state;}
  const avoid=op.risk==='safe'?threats(op):[];
  const home=operationPath(op.world,run.position,op.world.dock,state.rigLevel)!;
  if(op.order==='hold'){if(!interference)mark(run,'hold','Holding position. Patrols are still moving.');return state;}
  if(op.order==='return'){
    op.targetId=null;if(same(run.position,op.world.dock))return bank(state,now);
    const route=operationPath(op.world,run.position,op.world.dock,state.rigLevel,avoid);
    if(!route?.length){mark(run,'hold','Waiting for the patrol to clear the return route.');return state;}
    mark(run,'return','Returning to HQ with secured cargo.');move(run,route[0]);
    if(same(run.position,op.world.dock))return bank(state,now);
    return state;
  }
  if(run.energy<=home.length+4||cargoCount(run.cargo)>=rigStats(state.rigLevel).capacity){op.order='return';mark(run,'return','Battery reserve or cargo limit reached. Returning safely.');return state;}
  if(op.order==='scout'){
    // Search near undiscovered caches, revealing positions without spending cargo.
    const hidden=op.world.deposits.filter(d=>d.requiredRig<=state.rigLevel&&!op.discovered.includes(d.id));
    if(!hidden.length){op.order='hold';op.targetId=null;mark(run,'scout','Sector scanned. Choose a resource focus and Gather.');return state;}
    const options=hidden.map(d=>({d,path:routeToDeposit(state,d,avoid)})).filter(v=>v.path!==null).sort((a,b)=>a.path!.length-b.path!.length);
    const target=options[0];if(!target){mark(run,'hold','Patrol blocks the scan route. Waiting for an opening.');return state;}
    op.targetId=target.d.id;mark(run,'scout','Scanning caches and mapping safe approaches.');if(target.path!.length)move(run,target.path![0]);discover(run,3);return state;
  }
  const available=op.world.deposits.filter(d=>d.requiredRig<=state.rigLevel&&run.remaining[d.id]>0&&(op.focus==='auto'||d.resource===op.focus)&&cargoCount(run.cargo)+d.amount<=rigStats(state.rigLevel).capacity);
  const priority=(d:Deposit)=>op.focus!=='auto'?0:run.cargo.cells<2?(d.resource==='cells'?0:2):run.cargo.scrap<6?(d.resource==='scrap'?0:2):(d.resource==='gpu'?0:1);
  // Gather only collects mapped caches. It surveys toward an unknown priority
  // cache at normal radius; Scout maps a wider area without committing cargo.
  const surveys=available.filter(d=>!op.discovered.includes(d.id)).map(d=>({d,path:routeToDeposit(state,d,avoid)})).filter((v):v is {d:Deposit,path:Point[]}=>v.path!==null).sort((a,b)=>priority(a.d)-priority(b.d)||a.path.length-b.path.length);
  const bestKnown=available.filter(d=>op.discovered.includes(d.id)).reduce((best,d)=>Math.min(best,priority(d)),Infinity);
  if(surveys[0]&&priority(surveys[0].d)<bestKnown){
    const target=surveys[0];op.targetId=target.d.id;mark(run,'scout','Searching for an unmapped cache. Scout reveals more of the sector.');
    if(target.path.length)move(run,target.path[0]);discover(run);return state;
  }
  const options=available.filter(d=>op.discovered.includes(d.id)).map(d=>({d,path:routeToDeposit(state,d,avoid)})).filter((v):v is {d:Deposit,path:Point[]}=>v.path!==null).filter(v=>op.risk==='bold'||run.energy>=v.path.length+2+(operationPath(op.world,v.path.at(-1)??run.position,op.world.dock,state.rigLevel)?.length??100)+3).sort((a,b)=>priority(a.d)-priority(b.d)||a.path.length-b.path.length||a.d.id.localeCompare(b.d.id));
  const target=options[0];
  if(!target){if(!available.length){op.order='return';mark(run,'return','Selected caches depleted or cargo full. Heading home.');}else if(op.risk==='safe'&&run.energy<=home.length+8){op.order='return';mark(run,'return','Preserving enough battery for the journey home.');}else mark(run,'hold','Waiting for a safe opening. Scout, change focus, or choose Bold.');return state;}
  op.targetId=target.d.id;
  if(target.path.length){mark(run,'move',`Approaching ${target.d.name.toLowerCase()}.`);move(run,target.path[0]);}
  else {run.energy=Math.max(0,run.energy-2);run.cargo[target.d.resource]+=target.d.amount;run.remaining[target.d.id]--;discover(run);mark(run,'gather',`Collected +${target.d.amount} ${target.d.resource}.`);if(op.destination){op.paused=true;op.status='Resources collected. Continue or return to HQ.';}}
  return state;
}
function move(run:ExpeditionRun,to:Point){run.position={...to};run.lastPath=[{...to}];run.energy=Math.max(0,run.energy-1);const op=run.operation!;if(op.patrols.some(p=>same(p.position,to))&&!same(to,op.world.dock)){run.energy=Math.max(0,run.energy-3);mark(run,'hazard','Crossed a patrol! Battery interference.');}if(!op.visited.some(p=>same(p,to)))op.visited.push({...to});discover(run);}

/** Advances only from trusted server time. Inactive tabs never accrue offline losses. */
export function advanceOperation(state:ExpeditionState,now=Date.now()):ExpeditionState {
  if(!Number.isFinite(now)||now<0)throw new Error('Invalid clock.');
  if(!state.run?.operation)return state;
  const next=structuredClone(state),op=next.run!.operation!;
  if(now<op.lastTickAt)return state;
  if(op.paused){if(now===op.lastTickAt)return state;op.lastTickAt=now;return next;}
  const elapsed=now-op.lastTickAt;
  if(elapsed>10000){op.paused=true;op.lastTickAt=now;op.status='Operation paused while you were away. Review orders and resume.';next.revision++;return next;}
  const ticks=Math.min(3,Math.floor(elapsed/1000));if(!ticks)return state;
  let result=next;
  for(let i=0;i<ticks&&result.run?.operation&&!result.run.operation.paused;i++)result=tick(result,now);
  if(result.run?.operation)result.run.operation.lastTickAt=ticks===3?now:op.lastTickAt+ticks*1000;
  result.revision=state.revision+1;return result;
}
const destinationFocus=(destination:Destination)=>destination==='safe'?'scrap':destination==='medium'?'cells':'gpu';
function validateDestination(destination:Destination,rig:number){if(destination==='dangerous'&&rig<1)throw new Error('Install the Recovery Rig to reach the GPU Vault.');}

export function applyOperationCommand(state:ExpeditionState,input:OperationCommand,now=Date.now()):ExpeditionState {
  const parsed=operationCommandSchema.safeParse(input);if(!parsed.success)throw new Error('Invalid expedition command.');
  if(!Number.isFinite(now)||now<0)throw new Error('Invalid clock.');
  const command=parsed.data;
  if(command.type==='launch'){
    if(state.run)throw new Error('Pixel is already exploring.');
    if(command.destination)validateDestination(command.destination,state.rigLevel);
    const next=structuredClone(state),seed=((Math.trunc(now)>>>0)^Math.imul(state.completedRuns+1,2654435761)^state.revision)>>>0,operation=makeOperation(seed,now,command.destination);
    next.run={id:`operation-${state.revision+1}-${now}`,position:{...operation.world.dock},energy:rigStats(state.rigLevel).energy,cargo:empty(),remaining:Object.fromEntries(operation.world.deposits.map(d=>[d.id,d.charges])),readyAt:now,lastPath:[],recharged:false,operation};next.lastResult=null;next.revision++;return next;
  }
  // Old manual expeditions can adopt high-level autonomy without restarting or
  // changing their balances, original deposit layout, or already spent charges.
  if(command.type==='destination')validateDestination(command.destination,state.rigLevel);
  if(state.run&&!state.run.operation&&(command.type==='destination'||command.type==='headHome')){
    if(now<state.run.readyAt)throw new Error('Pixel is still moving or collecting.');
    state=structuredClone(state);
    state.run!.operation=makeOperation(0,now);
    state.run!.operation.world=structuredClone(WORLD);
    state.run!.operation.world.hazards=[];
    state.run!.operation.discovered=WORLD.deposits.map(d=>d.id);
    state.run!.operation.visited=[{...state.run!.position}];
  }
  if(!state.run?.operation)throw new Error('Launch an operation first.');
  const advanced=advanceOperation(state,now);if(command.type==='sync')return advanced;
  if(!advanced.run) return advanced;
  const next=structuredClone(advanced),op=next.run!.operation!;
  if(command.type==='headHome'){
    op.order='return';op.risk='safe';op.paused=false;op.targetId=null;op.status='Returning to HQ with your resources.';
    if(same(next.run!.position,op.world.dock))return bank(next,now);
  }
  else if(command.type==='destination'){
    op.destination=command.destination;op.focus=destinationFocus(command.destination);op.risk=command.destination==='dangerous'?'bold':'safe';op.order='gather';op.paused=false;op.targetId=null;op.status='Pixel is collecting resources.';
  }
  else if(command.type==='pause'){op.paused=command.paused;op.status=command.paused?'Paused. Review and issue orders.':`Resumed ${op.order} order.`;}
  else {op.order=command.order;op.focus=command.focus??op.focus;op.risk=command.risk??op.risk;op.targetId=null;op.status=`${command.order[0].toUpperCase()+command.order.slice(1)} order received${op.paused?' — resume when ready':''}.`;}
  op.lastTickAt=now;next.revision=advanced.revision+1;return next;
}
