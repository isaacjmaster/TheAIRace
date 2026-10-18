import { MAP, LEVELS, raidLevel } from './level';
export type Kind = 'scout' | 'tank' | 'breaker' | 'striker' | 'medic' | 'disruptor' | 'scrap';
export type Squad = Record<'scout'|'tank'|'breaker',number> & Partial<Record<'striker'|'medic'|'disruptor'|'scrap',number>>;
export type Point = { x: number; y: number };
export type Building = Point & { id: number; kind: 'core' | 'vault' | 'turret' | 'wall' | 'missile' | 'shield' | 'repair'; disabledUntil?: number; hp: number; maxHp: number; cooldown: number; target?: number };
export type Unit = Point & { id: number; kind: Kind; hp: number; maxHp: number; cooldown: number; target?: number; objective?: number; waypoint?: Point };
export type Effect = { id: number; from: Point; to: Point; ttl: number; color: string; damage: number; source: number; target: number; destroyed: boolean };
export type Raid = { scrapSpeedVersion?:2; starterLayout?:number; starter?:boolean; combatVersion?:number; defenseDamage?:Record<number,number>; layout: number; version?: number; time: number; buildings: Building[]; units: Unit[]; stock: Record<Kind, number>; effects: Effect[]; ended: boolean; reason: string; damage: Record<Kind, number>; lost: number; nextId: number; power: number; healthPower: number };
export const STATS = {
  scrap: {name:'Scrap Bot',hp:62,speed:1.4375,damage:9,range:.85,interval:1,color:'#ffc05e',role:'Melee - 1 housing'},
  scout: { name: 'Scout', hp: 85, speed: 1.55, damage: 16, range: .85, interval: .7, color: '#52e6d2', role: 'Fast · targets compute' },
  tank: { name: 'Tank', hp: 390, speed: .68, damage: 24, range: .95, interval: 1.15, color: '#8da9ff', role: 'Armored · absorbs fire' },
  breaker: { name: 'Breaker', hp: 135, speed: 1.05, damage: 38, range: 1.05, interval: .9, color: '#ffb868', role: 'Targets defenses · breaches walls' },
  striker: { name:'Striker',hp:110,speed:1.1,damage:58,range:2.7,interval:1.05,color:'#fa83b1',role:'Ranged precision - targets the core' },
  medic: { name:'Medic',hp:125,speed:1.15,damage:8,range:2.4,interval:.9,color:'#90efab',role:'Repairs nearby wounded allies' },
  disruptor: { name:'Disruptor',hp:145,speed:.95,damage:17,range:2.6,interval:1.4,color:'#bd9cff',role:'Disables defenses for 2 seconds' },
} as const;
const PREVIOUS_SCRAP={...STATS.scrap,speed:1.15};
const LEGACY_SCRAP={...STATS.scrap,hp:110,speed:1.25,damage:18,interval:.8};
export const unitStats=(s:Raid,kind:Kind)=>kind==='scrap'&&s.starter&&s.combatVersion!==2?LEGACY_SCRAP:kind==='scrap'&&s.starter&&s.combatVersion===2&&s.scrapSpeedVersion!==2?PREVIOUS_SCRAP:STATS[kind];
export const KINDS = Object.keys(STATS) as Kind[];
export const STEP = .05;
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export const objectives = (s: Raid) => s.buildings.filter(b => b.kind !== 'wall');
export const DEFAULT_SQUAD: Readonly<Squad> = Object.freeze({ scout: 2, tank: 2, breaker: 2 });
export function createRaid(layout = 0, squad: Readonly<Squad> = DEFAULT_SQUAD, power = 1, healthPower = power, version = 1): Raid {
  if (!LEVELS[layout]) throw new Error('Unknown raid layout');
  if (Object.values(squad).some(n => !Number.isInteger(n) || n < 0 || n > 24) || Object.values(squad).reduce((a, b) => a + b, 0) < 1 || Object.values(squad).reduce((a, b) => a + b, 0) > 24) throw new Error('Squad must contain 1 to 24 agents');
  if (Object.keys(squad).some(k => !KINDS.includes(k as Kind)) || !Number.isFinite(power) || power < 1 || power > 10 || !Number.isFinite(healthPower) || healthPower<1 || healthPower>10) throw new Error('Invalid squad power');
  const level = raidLevel(layout, version), bounds = level.walls ?? MAP.walls;
  const buildings: Building[] = [];
  const add = (kind: Building['kind'], x: number, y: number, hp: number) => { if(kind==='wall' && level.openings?.some(p=>p.x===x&&p.y===y)) return; buildings.push({ id: buildings.length, kind, x, y, hp, maxHp: hp, cooldown: 0 }); };
  add('core', level.core.x, level.core.y, 2200); add('vault', level.vault.x, level.vault.y, 750); add('turret', level.turret.x, level.turret.y, 850);
  for (let x: number = bounds.left; x <= bounds.right; x++) { if (x !== level.gate) add('wall', x, bounds.top, 150); add('wall', x, bounds.bottom, 150); }
  for (let y: number = bounds.top + 1; y < bounds.bottom; y++) { add('wall', bounds.left, y, 150); add('wall', bounds.right, y, 150); }
  if (layout > 1) {
    for (const b of buildings) { b.hp = Math.round(b.hp * (level.strength ?? 1)); b.maxHp=b.hp; }
    for (const b of level.extras ?? []) add(b.kind,b.x,b.y,b.hp);
    for (const p of level.partitions ?? []) add('wall',p.x,p.y,Math.round(180*(level.strength??1)));
  }
  return { power, healthPower, layout, version, time: 0, buildings, units: [], stock: Object.fromEntries(KINDS.map(k=>[k,squad[k]??0])) as Record<Kind,number>, effects: [], ended: false, reason: '', damage: { scout: 0, tank: 0, breaker: 0, striker:0,medic:0,disruptor:0,scrap:0 }, lost: 0, nextId: 100 };
}
export function validDeployment(p: Point) {
  const b = MAP.deployment;
  return Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= b.minX && p.y >= b.minY && p.x <= b.maxX && p.y <= b.maxY && (p.x < b.innerLeft || p.y < b.innerTop || p.x > b.innerRight || p.y > b.innerBottom);
}
export function deploy(s: Raid, kind: Kind, p: Point) {
  if (s.ended || !s.stock[kind] || !validDeployment(p)||(s.combatVersion===2&&!validDeployment({x:Math.round(p.x),y:Math.round(p.y)}))) return false;
  // Snap to a cell center so the first path step cannot clip a corner.
  s.stock[kind]--; s.units.push({ x: Math.round(p.x), y: Math.round(p.y), id: s.nextId++, kind, hp: unitStats(s,kind).hp * s.healthPower, maxHp: unitStats(s,kind).hp * s.healthPower, cooldown: 0 }); return true;
}
const cell = (p: Point) => Math.round(p.y) * MAP.width + Math.round(p.x);
const point = (n: number): Point => ({ x: n % MAP.width, y: Math.floor(n / MAP.width) });
type Route = { path: Point[]; cost: number };
// Minimize travel time + breach time, rather than distance to an arbitrary wall.
function route(s: Raid, u: Unit, target: Building): Route {
  const start = cell(u), goal = cell(target), count = MAP.width * MAP.height;
  const costs = new Float64Array(count).fill(Infinity), previous = new Int16Array(count).fill(-1);
  const occupied = new Map(s.buildings.filter(b => b.hp > 0 && b.id !== target.id).map(b => [cell(b), b]));
  // A binary heap avoids scanning the whole enlarged map for each path step.
  const heap: { n: number; cost: number }[] = [];
  const before = (a: { n: number; cost: number }, b: { n: number; cost: number }) => a.cost < b.cost || (a.cost === b.cost && a.n < b.n);
  const push = (entry: { n: number; cost: number }) => { heap.push(entry); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (!before(heap[i], heap[p])) break; [heap[i], heap[p]] = [heap[p], heap[i]]; i = p; } };
  const pop = () => { const first = heap[0], last = heap.pop()!; if (heap.length) { heap[0] = last; let i = 0; for (;;) { let best = i; for (const j of [i * 2 + 1, i * 2 + 2]) if (j < heap.length && before(heap[j], heap[best])) best = j; if (best === i) break; [heap[i], heap[best]] = [heap[best], heap[i]]; i = best; } } return first; };
  costs[start] = 0; push({ n: start, cost: 0 });
  while (heap.length) {
    const { n: best, cost: current } = pop(); if (current !== costs[best]) continue;
    if (best === goal) { const path: Point[] = []; for (let n = goal; n !== start; n = previous[n]) path.unshift(point(n)); return { path, cost: costs[goal] }; }
    const p = point(best), stats = unitStats(s,u.kind);
    for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
      const x = p.x + dx, y = p.y + dy; if (x < 0 || y < 0 || x >= MAP.width || y >= MAP.height) continue;
      const n = y * MAP.width + x, obstacle = occupied.get(n);
      if (obstacle && obstacle.kind !== 'wall') continue;
      const breach = obstacle ? Math.ceil(obstacle.hp / (stats.damage * (u.kind === 'breaker' ? 2 : 1))) * stats.interval : 0;
      const cost = current + 1 / stats.speed + breach;
      if (cost < costs[n]) { costs[n] = cost; previous[n] = best; push({ n, cost }); }
    }
  }
  return { path: [], cost: Infinity };
}
const defense = (b: Building) => ['turret','missile','shield','repair'].includes(b.kind);
const priority = (u: Unit, b: Building) => u.kind==='disruptor' ? (defense(b)?0:1) : u.kind==='striker' ? (b.kind==='core'?0:1) : u.kind === 'scout' ? (b.kind === 'vault' ? 0 : b.kind === 'core' ? 1 : 2) : u.kind === 'breaker' ? (defense(b) ? 0 : b.kind === 'core' ? 1 : 2) : 0;
function choose(s: Raid, u: Unit) {
  return objectives(s).filter(b => b.hp > 0).map(b => ({ b, route: route(s, u, b) })).filter(c => Number.isFinite(c.route.cost))
    .sort((a, b) => priority(u, a.b) - priority(u, b.b) || a.route.cost - b.route.cost || a.b.id - b.b.id)[0];
}
export function destruction(s: Raid) { const meaningful = objectives(s); return meaningful.length ? Math.round(100 * meaningful.filter(b => b.hp <= 0).length / meaningful.length) : 100; }
export function rewards(s: Raid) { const scale=LEVELS[s.layout].rewardScale??1; return { compute: Math.floor(((s.buildings.some(b => b.kind === 'vault' && b.hp <= 0) ? 120 : 0) + Math.floor(destruction(s) * .8))*scale), credits: Math.floor((destruction(s) * 3 + (s.buildings.some(b => b.kind === 'core' && b.hp <= 0) ? 200 : 0))*scale) }; }
export function finish(s: Raid, reason: string) { s.ended = true; s.reason = reason; }
function hit(s: Raid, from: Point, target: Building | Unit, damage: number, source: number, color: string) {
  if (target.id < 100 && (target as Building).kind!=='wall' && (target as Building).kind!=='shield' && s.buildings.some(b=>b.kind==='shield'&&b.hp>0&&(b.disabledUntil??0)<=s.time&&distance(b,target)<=4)) damage*=.55;
  const dealt = Math.min(target.hp, damage);
  if(s.combatVersion===2&&source<100&&target.id>=100){s.defenseDamage??={};s.defenseDamage[source]=(s.defenseDamage[source]||0)+dealt;} target.hp = Math.max(0, target.hp - damage);
  s.effects.push({ id: s.nextId++, from: { x: from.x, y: from.y }, to: { x: target.x, y: target.y }, ttl: .3, color, damage: dealt, source, target: target.id, destroyed: !target.hp });
  return dealt;
}
export function tick(s: Raid) {
  if (s.ended) return;
  if (objectives(s).every(b => b.hp <= 0)) { finish(s, 'Network cleared'); return; }
  s.time = Math.min(90, s.time + STEP); s.effects = s.effects.filter(e => (e.ttl -= STEP) > 0);
  for (const u of s.units.filter(u => u.hp > 0)) {
    const stats = unitStats(s,u.kind); u.cooldown -= STEP;
    if (u.kind==='medic' && u.cooldown<=0) {
      const ally=s.units.filter(a=>a.id!==u.id&&a.hp>0&&a.hp<a.maxHp&&distance(a,u)<=3.5).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||a.id-b.id)[0];
      if(ally){ const amount=Math.min(32*s.power,ally.maxHp-ally.hp);ally.hp+=amount;u.cooldown=stats.interval;s.effects.push({id:s.nextId++,from:{x:u.x,y:u.y},to:{x:ally.x,y:ally.y},ttl:.3,color:stats.color,damage:-amount,source:u.id,target:ally.id,destroyed:false});continue; }
    }
    // Finish one grid edge before replanning; never cut an occupied corner.
    if (u.waypoint) { const d = distance(u, u.waypoint), move = Math.min(d, stats.speed * STEP); if (d) { u.x += (u.waypoint.x - u.x) / d * move; u.y += (u.waypoint.y - u.y) / d * move; } if (d <= move + 1e-8) { u.x = u.waypoint.x; u.y = u.waypoint.y; u.waypoint = undefined; } continue; }
    let objective = s.buildings.find(b => b.id === u.objective && b.kind !== 'wall' && b.hp > 0);
    let planned: Route;
    if (!objective) { const choice = choose(s, u); objective = choice?.b; planned = choice?.route ?? { path: [], cost: Infinity }; u.objective = objective?.id; }
    else planned = route(s, u, objective);
    if (!objective) { u.target = undefined; continue; }
    // Only a wall on the chosen objective's best path may become an attack target.
    const next = planned.path[0];
    const wall = next && s.buildings.find(b => b.kind === 'wall' && b.hp > 0 && b.x === next.x && b.y === next.y);
    const target = wall ?? objective; u.target = target.id;
    if (distance(u, target) <= stats.range) {
      if (u.cooldown <= 0) { const damage = stats.damage * s.power * (u.kind === 'breaker' && target.kind === 'wall' ? 2 : 1); s.damage[u.kind] += hit(s, u, target, damage, u.id, stats.color); if(u.kind==='disruptor'&&defense(target))target.disabledUntil=s.time+2; u.cooldown = stats.interval; }
    } else if (next && !wall && distance(u, objective) > 1.01) { u.waypoint = next; }
    // Approach the target's attack radius without entering its occupied cell.
    else if (distance(u, target) > stats.range) { const d = distance(u, target), move = Math.min(Math.max(0, d - stats.range + .001), stats.speed * STEP); if (d) { u.x += (target.x - u.x) / d * move; u.y += (target.y - u.y) / d * move; } }
    if (objectives(s).every(b => b.hp <= 0)) { finish(s, 'Network cleared'); return; }
  }
  for (const b of s.buildings.filter(b => (b.kind === 'turret'||b.kind==='missile'||b.kind==='repair') && b.hp > 0)) {
    if((b.disabledUntil??0)>s.time) {b.target=undefined;continue;}
    b.cooldown -= STEP;
    if(b.kind==='repair') { const ally=s.buildings.filter(a=>a.id!==b.id&&a.kind!=='wall'&&a.hp>0&&a.hp<a.maxHp&&distance(a,b)<=5).sort((a,c)=>a.hp/a.maxHp-c.hp/c.maxHp||a.id-c.id)[0]; if(ally&&b.cooldown<=0){const amount=Math.min(28,ally.maxHp-ally.hp);ally.hp+=amount;b.cooldown=1;s.effects.push({id:s.nextId++,from:{x:b.x,y:b.y},to:{x:ally.x,y:ally.y},ttl:.3,color:'#90efab',damage:-amount,source:b.id,target:ally.id,destroyed:false});}continue; }
    const target = s.units.filter(u => u.hp > 0 && distance(u, b) <= (s.starter&&s.combatVersion===2?(s.layout===0?6:6.5):b.kind==='missile'?8:5)).sort((a, c) => distance(a, b) - distance(c, b) || a.id - c.id)[0];
    b.target = target?.id;
    if (target && b.cooldown <= 0) { const targets=b.kind==='missile'?s.units.filter(u=>u.hp>0&&distance(u,target)<=1.4):[target]; for(const victim of targets){hit(s,b,victim,s.starter?(s.combatVersion===2?(s.layout===0?16:20):8):b.kind==='missile'?42:26,b.id,b.kind==='missile'?'#ffb868':'#ff6487');if(!victim.hp)s.lost++;} b.cooldown=s.starter?(s.combatVersion===2?.85:1.2):b.kind==='missile'?2.1:.65; }
  }
  if (s.time >= 90) finish(s, 'Time expired');
  else if (Object.values(s.stock).every(n => !n) && s.units.every(u => !u.hp)) finish(s, 'Squad eliminated');
}
