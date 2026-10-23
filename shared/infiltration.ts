import {protectedAreas,insideProtected} from './deployment-boundary';
import type {PublicBase} from './player-base';
import type {RotatableBuilding,Orientation} from './foundation';
import {BASE_IDS,craftCampusTarget} from './infiltration-bases';
import {advanceSquad,commandSquad,type SquadState} from './squad-infiltration';
import {findPath,pointClear,nearestOpen,segmentClear,type NavRect} from './navigation';
import {rivalSecurityWalls,type SecurityBarrier} from './security-walls';
/** Deterministic heist simulation. Inputs are intentions; paths, clocks and loot are server-owned. */
export type Vec = [
    number,
    number
];
export type Asset = {
    maxHealth?:number;model?:RotatableBuilding;orientation?:Orientation;level?:1|2;visualPosition?:Vec;
    id: string;
    kind: 'hq' | 'gpu' | 'lab' | 'terminal' | 'station';
    name: string;
    position: Vec;
    size: Vec;
    access?: Vec;
    hackSeconds?: number;
    compute: number;
    research: number;
    intel?: boolean;
};
export type Defense = {
    id: string;
    route: Vec[];
    radius: number;
    patrolSpeed: number;
    pursuitSpeed: number;
    warningSeconds: number;
};
export type TargetSnapshot = {
    version: 1;
    arena?:'campus-v2';
    hqLevel?:1|2;
    publicBase?:PublicBase;
    campusBounds?:{minX:number;maxX:number;minZ:number;maxZ:number};
    compound?:Vec;
    navigationVersion?:2;
    walls?:SecurityBarrier[];
    id: string;
    name: string;
    difficulty: string;
    entry: Vec;
    exit: Vec;
    assets: Asset[];
    defenses: Defense[];
    influence: number;
};
export const INFILTRATION = { stepMs: 100, operationMs: 180000, agentSpeed: 2.8, agentHealth:100, laserDamage:20, laserIntervalMs:1250, captureRadius: .65, cooldownMs: 7200000, awards: [25, 50] } as const;
export const INFILTRATION_BOUNDS={minX:-14,maxX:14,minZ:-10,maxZ:10};
export const CAMPUS_ARENA={bounds:{minX:-21,maxX:21,minZ:-17,maxZ:17},compound:[13.5,10] as Vec,outer:[20,16] as Vec};
export const targetBounds=(t:TargetSnapshot)=>t.arena==='campus-v2'?(t.campusBounds??CAMPUS_ARENA.bounds):INFILTRATION_BOUNDS;
export const DRONE_CLEARANCE=1.15;
// Full rendered robot envelope, including its arms and mechanical feet.
export const AGENT_CLEARANCE=.65;
const common: Asset[] = [{ id: 'hq', kind: 'hq', name: 'Founder HQ', position: [-1, -3], size: [7, 6], compute: 0, research: 0 }, { id: 'gpu', kind: 'gpu', name: 'Compute cache', position: [-6, 1], size: [4, 3], access: [-6, 3.2], hackSeconds: 3, compute: 20, research: 0 }, { id: 'lab', kind: 'lab', name: 'Research Lab', position: [6, 1], size: [3.8, 2.8], access: [6, 3.3], hackSeconds: 5, compute: 0, research: 12 }, { id: 'terminal', kind: 'terminal', name: 'Core terminal', position: [7, -5], size: [1.6, 1.4], access: [7, -3.5], hackSeconds: 7, compute: 10, research: 8, intel: true }];
export const INFILTRATION_TARGETS: TargetSnapshot[] = [{ version: 1, id: 'lumen-labs', name: 'Lumen Labs', difficulty: 'Startup', entry: [-10, 6], exit: [-10, 6], assets: common, defenses: [{ id: 'sentinel-1', route: [[0, 2], [4, 4], [8, 3], [8, -1]], radius: 3.1, patrolSpeed: 1.1, pursuitSpeed: 2, warningSeconds: 2.2 }], influence: 25 }, { version: 1, id: 'vector-works', name: 'Vector Works', difficulty: 'Established', entry: [-10, 6], exit: [-10, 6], assets: common.map(a => ({ ...a, position: a.id === 'gpu' ? [-6, -1] : a.id === 'lab' ? [6, -1] : a.id === 'terminal' ? [7, -6] : a.position, access: a.id === 'gpu' ? [-6, 1.2] : a.id === 'lab' ? [6, 1.3] : a.id === 'terminal' ? [7, -4.5] : a.access, hackSeconds: a.hackSeconds ? a.hackSeconds + 1 : undefined, compute: a.compute * 2, research: a.research * 2 })), defenses: [{ id: 'sentinel-1', route: [[-4, 3], [1, 4], [5, 3], [1, 2]], radius: 3.3, patrolSpeed: 1.2, pursuitSpeed: 2.2, warningSeconds: 2 }, { id: 'sentinel-2', route: [[6, 4], [9, 1], [9, -5], [5, -6]], radius: 3.2, patrolSpeed: 1.1, pursuitSpeed: 2.1, warningSeconds: 2 }], influence: 50 }];
// New operations capture the compound layout. Already saved snapshots are not rewritten.
for(const target of INFILTRATION_TARGETS){target.navigationVersion=2;target.entry=[-8,6.5];target.exit=[-10.5,6.5];target.walls=rivalSecurityWalls(target.id==='vector-works');for(const defense of target.defenses)defense.route=defense.route.map(p=>nearestOpen(p,infiltrationSolids(target),INFILTRATION_BOUNDS,DRONE_CLEARANCE,.5)??p);}
for(const id of BASE_IDS.slice(2))INFILTRATION_TARGETS.push(craftCampusTarget(id));
export const npcBaseName=(id:string)=>id==='vector-works'?'Level 2 Base':'Level 1 Base';
export type DroneState = {
    lastShotAt?:number;health?:number;acquiredAt?:number;
    targetAgentId?:string;shotPosition?:Vec;
    id: string;
    path?:Vec[];
    pathKey?:string;
    yaw?:number;
    position: Vec;
    segment: number;
    alert: number;
    lost: number;
    mode: 'patrol' | 'warning' | 'pursuit' | 'attacking' | 'disabled';
};
export type InfiltrationEvent = {
    at: number;
    type: string;
    detail?: string;
};
export type Operation = {
    breachRatingVersion?:1;
    pvp?:{attackerId:string;defenderId:string};
    squad?:SquadState;
    cipherDamageMultiplier?:number;
    unit?:{kind:'scrap';reservationId:string;status:'reserved'|'returned'|'lost'};
    ownershipRequired?:boolean;
    version: 1;
    id: string;
    target: TargetSnapshot;
    automationVersion?:1;
    defenseVersion?:2;
    createdAt: number;
    startedAt?: number;
    lastTick: number;
    finishedAt?: number;
    status: 'ready' | 'active' | 'extracted' | 'caught' | 'abandoned' | 'timeout';
    agent: {
        health?:number;
        position: Vec;
        path: Vec[];
        mode: 'idle' | 'moving' | 'hacking' | 'breaching' | 'extracting' | 'attacking';
        target?: string;
        hack: number;
        yaw: number;
    };
    drones: DroneState[];
    hacked: string[];
    carried: {
        compute: number;
        research: number;
        intel: boolean;
    };
    events: InfiltrationEvent[];
    orders?: {
        at: number;
        intent: InfiltrationCommand;
    }[];
    settlement?: {
        compute: number;
        research: number;
        influence: number;
        eligibleAt: number;
        pendingCompute: number;
        pendingResearch: number;
    };
};
export type InfiltrationCommand = {
    action: 'deploy';
    position?:Vec;
} | {
    action: 'abandon';
};
const distance = (a: Vec, b: Vec) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const event = (o: Operation, type: string, detail?: string) => { if (o.events.length < 256)
    o.events.push({ at: o.lastTick, type, detail }); };
export function newOperation(id: string, targetId: string, now: number): Operation { const target = INFILTRATION_TARGETS.find(t => t.id === targetId); if (!target)
    throw new Error('Choose an available company.'); return operationFromSnapshot(id, target, now); }
export function operationFromSnapshot(id: string, target: TargetSnapshot, now: number): Operation { return { version: 1, id, target: structuredClone(target), automationVersion:1, defenseVersion:2, createdAt: now, lastTick: now, status: 'ready', orders: [], agent: { health:INFILTRATION.agentHealth, position: [...target.entry], path: [], mode: 'idle', hack: 0, yaw: 0 }, drones: target.defenses.map(d => ({ id: d.id, position: [...d.route[0]], segment: 1, alert: 0, lost: 0, mode: 'patrol' })), hacked: [], carried: { compute: 0, research: 0, intel: false }, events: [{ at: now, type: 'prepared' }] }; }
export function infiltrationSolids(t:TargetSnapshot):NavRect[]{return [...t.assets.map(a=>({x:a.position[0],z:a.position[1],w:a.size[0],d:a.size[1]})),...(t.walls??[])];}
export function navigable(t: TargetSnapshot, p: Vec) { if(t.navigationVersion===2)return pointClear(p,infiltrationSolids(t),targetBounds(t),AGENT_CLEARANCE);return p.every(Number.isFinite) && Math.abs(p[0]) <= 11.5 && Math.abs(p[1]) <= 7.5 && !t.assets.some(a => Math.abs(p[0] - a.position[0]) < a.size[0] / 2 + .3 && Math.abs(p[1] - a.position[1]) < a.size[1] / 2 + .3); }
/** The same perimeter predicate drives server validation and the continuous deployment lawn. */
export function deploymentGround(t:TargetSnapshot,p:Vec){if(t.publicBase){const b=targetBounds(t);return p.every(Number.isFinite)&&p[0]>=b.minX+.8&&p[0]<=b.maxX-.8&&p[1]>=b.minZ+.8&&p[1]<=b.maxZ-.8&&!insideProtected(p,protectedAreas(t))&&navigable(t,p);}if(t.arena==='campus-v2'&&t.compound){const b=targetBounds(t);return p.every(Number.isFinite)&&p[0]>=b.minX+.8&&p[0]<=b.maxX-.8&&p[1]>=b.minZ+.8&&p[1]<=b.maxZ-.8&&(Math.abs(p[0])>=t.compound[0]||Math.abs(p[1])>=t.compound[1])&&navigable(t,p);}if(t.arena==='campus-v2')return p.every(Number.isFinite)&&Math.abs(p[0])<=CAMPUS_ARENA.outer[0]&&Math.abs(p[1])<=CAMPUS_ARENA.outer[1]&&(Math.abs(p[0])>=14.2||p[1]<=-10.4||p[1]>=7.4)&&navigable(t,p);return p.every(Number.isFinite)&&Math.abs(p[0])<=13.2&&Math.abs(p[1])<=9.2&&(Math.abs(p[0])>=11.8||Math.abs(p[1])>=8.3||p[1]>=5.8&&Math.abs(p[0])<=10.5&&p[1]<=7.2)&&navigable(t,p);}
export function validDeployment(t:TargetSnapshot,p:Vec){return deploymentGround(t,p)&&infiltrationPath(t,p,t.exit).length>0;}
/** Reservation is already removed from stock; count it only until it is deployed. */
export function deploymentCount(stock:number,o:Operation){return o.squad?.undeployed!==undefined?Math.max(0,Math.min(stock,o.squad.undeployed)):Math.max(0,stock)+(o.status==='ready'&&o.unit?.status==='reserved'?1:0);}

/** Small bounded half-unit grid, deterministic and reusable by future target snapshots. */
export function infiltrationPath(t:TargetSnapshot,from:Vec,to:Vec):Vec[]{return t.navigationVersion===2?findPath(from,to,infiltrationSolids(t),targetBounds(t),AGENT_CLEARANCE):legacyInfiltrationPath(t,from,to);}
function legacyInfiltrationPath(t: TargetSnapshot, from: Vec, to: Vec): Vec[] { if (!navigable(t, to))
    return []; const snap = (p: Vec) => p.map(v => Math.round(v * 2)) as Vec, start = snap(from), end = snap(to), key = (p: Vec) => p.join(','), queue: Vec[] = [start], prev = new Map<string, string | null>([[key(start), null]]); for (let i = 0; i < queue.length && !prev.has(key(end)); i++)
    for (const [dx, dz] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const q: Vec = [queue[i][0] + dx, queue[i][1] + dz], k = key(q);
        if (prev.has(k) || !navigable(t, [q[0] / 2, q[1] / 2]))
            continue;
        prev.set(k, key(queue[i]));
        queue.push(q);
    } if (!prev.has(key(end)))
    return []; const path: Vec[] = []; for (let k: string | null = key(end); k; k = prev.get(k) ?? null)
    path.unshift(k.split(',').map(v => Number(v) / 2) as Vec); path.push([...to]); return path; }
function finish(o: Operation, status: Operation['status']) { o.status = status; o.finishedAt = o.lastTick; o.agent.path = []; o.agent.mode = 'idle'; if (status !== 'extracted')
    o.carried = { compute: 0, research: 0, intel: false }; event(o, status); }
function walk(p: Vec, path: Vec[], budget: number) { const old: [
    number,
    number
] = [...p]; while (path.length && budget > 0) {
    const q = path[0], d = distance(p, q);
    if (d <= budget) {
        p[0] = q[0];
        p[1] = q[1];
        path.shift();
        budget -= d;
    }
    else {
        p[0] += (q[0] - p[0]) * budget / d;
        p[1] += (q[1] - p[1]) * budget / d;
        break;
    }
} return distance(old, p); }
/** Reuse saved snapshots and inventory reservations, without retaining retired tool effects. */
function adoptAutomatic(o:Operation){
 if(o.automationVersion===1)return;
 const old=o as Operation&{tool?:unknown;toolUsed?:unknown;probeUntil?:unknown};delete old.tool;delete old.toolUsed;delete old.probeUntil;
 for(const drone of o.drones)delete (drone as unknown as {jammedUntil?:unknown}).jammedUntil;
 o.automationVersion=1;
 if(o.status==='active'&&o.agent.mode!=='extracting'){const target=o.target.assets.find(a=>a.id===o.agent.target&&!o.hacked.includes(a.id));if(!(o.agent.mode==='hacking'&&target?.access&&distance(o.agent.position,target.access)<.6))chooseNextAsset(o);}
}
function returnHome(o:Operation){
 o.agent.target=undefined;o.agent.hack=0;o.agent.mode='extracting';o.agent.path=infiltrationPath(o.target,o.agent.position,o.target.exit);event(o,'returning');
}
/** Only plan at arrival/target changes, never run path searches for every asset each frame. */
export function chooseNextAsset(o:Operation){
 const candidates=o.target.assets.filter(a=>a.access&&a.hackSeconds&&!o.hacked.includes(a.id)).sort((a,b)=>distance(o.agent.position,a.access!)-distance(o.agent.position,b.access!)||a.id.localeCompare(b.id));
 for(const asset of candidates){const path=infiltrationPath(o.target,o.agent.position,asset.access!);if(path.length){o.agent.target=asset.id;o.agent.path=path;o.agent.hack=0;o.agent.mode='moving';event(o,'target',asset.id);return;}}
 returnHome(o);
}
export function advanceOperation(o: Operation, now: number) {
    if(o.squad){advanceSquad(o,now);return;}
    if(o.status==='ready'||o.status==='active')adoptAutomatic(o);
    if (o.status !== 'active')
        return;
    const end = Math.min(now, o.startedAt! + INFILTRATION.operationMs);
    while (o.status === 'active' && o.lastTick + INFILTRATION.stepMs <= end) {
        o.lastTick += INFILTRATION.stepMs;
        const dt = INFILTRATION.stepMs / 1000, a = o.agent, previous: Vec = [...a.position];
        walk(a.position, a.path, INFILTRATION.agentSpeed * dt);
        if (distance(previous, a.position) > .001)
            a.yaw = Math.atan2(a.position[0] - previous[0], a.position[1] - previous[1]);
        if (!a.path.length) {
            if (a.mode === 'extracting' && distance(a.position, o.target.exit) < 1.2) {
                finish(o, 'extracted');
                break;
            }
            if (a.target) {
                const asset = o.target.assets.find(x => x.id === a.target)!;
                if (asset.access && distance(a.position, asset.access) < .6) {
                    a.mode = 'hacking';
                    a.yaw=Math.atan2(asset.position[0]-a.position[0],asset.position[1]-a.position[1]);
                    a.hack += dt;
                    if (a.hack + 1e-6 >= asset.hackSeconds!) {
                        o.hacked.push(asset.id);
                        o.carried.compute += asset.compute;
                        o.carried.research += asset.research;
                        o.carried.intel ||= !!asset.intel;
                        event(o, 'hacked', asset.id);
                        chooseNextAsset(o);
                    }
                }
            }
            else if(a.mode!=='extracting')chooseNextAsset(o);
        }
        if(o.defenseVersion!==2&&a.mode!=='extracting'&&(o.carried.compute>0||o.carried.research>0)&&o.drones.some(d=>{const defense=o.target.defenses.find(x=>x.id===d.id)!;return distance(d.position,a.position)<=defense.radius+.5;}))returnHome(o);
        for (const d of o.drones) {
            const cfg = o.target.defenses.find(x => x.id === d.id)!;
            const near = distance(d.position, a.position) <= cfg.radius && (o.defenseVersion!==2||segmentClear(d.position,a.position,infiltrationSolids(o.target),INFILTRATION_BOUNDS,0));
            if(o.defenseVersion===2){
                // Patrol continues; defenses fire across clear sight lines instead of chasing.
                d.alert=near?Math.min(cfg.warningSeconds,d.alert+dt):0;
                const old=d.mode;d.mode=near?(d.alert>=cfg.warningSeconds?'pursuit':'warning'):'patrol';
                if(d.mode==='warning'&&old==='patrol')event(o,'detected',d.id);
                const solids=infiltrationSolids(o.target),goal=cfg.route[d.segment];
                if(d.pathKey!==String(d.segment)||!d.path?.length){d.path=findPath(d.position,goal,solids,INFILTRATION_BOUNDS,DRONE_CLEARANCE);d.pathKey=String(d.segment);}
                const before:Vec=[...d.position];walk(d.position,d.path??[],cfg.patrolSpeed*dt);if(distance(before,d.position)>.001)d.yaw=Math.atan2(d.position[0]-before[0],d.position[1]-before[1]);
                if(distance(d.position,goal)<.05){d.segment=(d.segment+1)%cfg.route.length;d.pathKey=undefined;}
                if(near&&distance(d.position,a.position)<=cfg.radius&&segmentClear(d.position,a.position,solids,INFILTRATION_BOUNDS,0)&&d.alert>=cfg.warningSeconds&&o.lastTick-(d.lastShotAt??-Infinity)>=INFILTRATION.laserIntervalMs){d.lastShotAt=o.lastTick;o.agent.health=Math.max(0,(o.agent.health??INFILTRATION.agentHealth)-INFILTRATION.laserDamage);event(o,'laser',d.id);if(!o.agent.health){finish(o,'caught');break;}}
                continue;
            }
            if (near) {
                d.alert = Math.min(cfg.warningSeconds, d.alert + dt);
                d.lost = 0;
            }
            else {
                d.lost += dt;
                if (d.lost > 3)
                    d.alert = Math.max(0, d.alert - dt * 2);
            }
            const oldMode = d.mode;
            d.mode = d.alert >= cfg.warningSeconds ? 'pursuit' : d.alert > 0 ? 'warning' : 'patrol';
            if (d.mode === 'warning' && oldMode === 'patrol')
                event(o, 'detected', d.id);
            if(o.target.navigationVersion===2){
                const rects=infiltrationSolids(o.target),raw=d.mode==='pursuit'?a.position:cfg.route[d.segment],goal=nearestOpen(raw,rects,INFILTRATION_BOUNDS,DRONE_CLEARANCE,.5,8),key=d.mode+':'+(d.mode==='pursuit'?a.position.map(v=>Math.round(v*2)).join(','):d.segment);
                if(d.mode==='pursuit'||d.mode==='patrol'){
                    if(!pointClear(d.position,rects,INFILTRATION_BOUNDS,DRONE_CLEARANCE)){const safe=nearestOpen(d.position,rects,INFILTRATION_BOUNDS,DRONE_CLEARANCE,.5,8);if(safe)d.position=safe;}
                    if(goal&&(key!==d.pathKey||!d.path?.length)){d.path=findPath(d.position,goal,rects,INFILTRATION_BOUNDS,DRONE_CLEARANCE);d.pathKey=key;}
                    const before:Vec=[...d.position];walk(d.position,d.path??[],(d.mode==='pursuit'?cfg.pursuitSpeed:cfg.patrolSpeed)*dt);if(distance(before,d.position)>.001)d.yaw=Math.atan2(d.position[0]-before[0],d.position[1]-before[1]);
                    if(d.mode==='patrol'&&goal&&distance(d.position,goal)<.05){d.segment=(d.segment+1)%cfg.route.length;d.pathKey=undefined;}
                    if(d.mode==='pursuit'&&distance(d.position,a.position)<INFILTRATION.captureRadius){finish(o,'caught');break;}
                }
            }else{
            if (d.mode === 'pursuit') {
                const path = infiltrationPath(o.target, d.position, a.position);
                walk(d.position, path, cfg.pursuitSpeed * dt);
                if (distance(d.position, a.position) < INFILTRATION.captureRadius) {
                    finish(o, 'caught');
                    break;
                }
            }
            else if (d.mode === 'patrol') {
                const q = cfg.route[d.segment];
                walk(d.position, [[...q]], cfg.patrolSpeed * dt);
                if (distance(d.position, q) < .05)
                    d.segment = (d.segment + 1) % cfg.route.length;
            }
            }
        }
    }
    if (o.status === 'active' && now >= o.startedAt! + INFILTRATION.operationMs) {
        o.lastTick = o.startedAt! + INFILTRATION.operationMs;
        finish(o, 'timeout');
    }
}
export function commandOperation(o:Operation,c:InfiltrationCommand,now:number){
 if(o.squad){commandSquad(o,c,now);return;}
 advanceOperation(o,now);
 const record=()=>{(o.orders??=[]).push({at:now,intent:structuredClone(c)});};
 if(c.action==='deploy'){
  if(o.status!=='ready')throw Error('Cipher Bot already deployed.');
  const position=c.position??o.target.entry;if(!validDeployment(o.target,position))throw Error('Deploy on clear ground along the highlighted campus perimeter.');
  o.agent.position=[...position];o.status='active';o.startedAt=now;o.lastTick=now;event(o,'deployed');chooseNextAsset(o);record();return;
 }
 if(c.action==='abandon'){
  if(o.status!=='ready'&&o.status!=='active')throw Error('This operation has ended.');
  finish(o,'abandoned');record();return;
 }
 throw Error('Cipher Bot handles hacking and returning automatically.');
}
