import { createInitialState } from '../src/game';
import { ensureCampus, campusEffects, unlockedAgents } from '../shared/progression';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRaid, deploy, tick, rewards, KINDS, objectives, type Squad, type Raid } from './engine';
import { LEVELS, LEVELS_V2 } from './level';
const advance=(s:Raid,n:number)=>{for(let i=0;i<n;i++)tick(s);};
test('eight distinct layouts scale loot and keep all structures in navigable bounds',()=>{
 assert.equal(LEVELS.length,8);const signatures=new Set<string>();let loot=0;
 for(let i=0;i<LEVELS.length;i++){const s=createRaid(i);assert.ok(s.buildings.length<100);assert.equal(new Set(s.buildings.map(b=>`${b.x},${b.y}`)).size,s.buildings.length);signatures.add(JSON.stringify(s.buildings.map(b=>[b.kind,b.x,b.y])));for(const b of s.buildings){assert.ok(b.x>0&&b.x<26&&b.y>0&&b.y<18);b.hp=0;}const value=rewards(s).credits;assert.ok(value>=loot);loot=value;}
 assert.equal(signatures.size,8);
});
test('Medics heal allies without resurrecting or exceeding maximum health',()=>{
 const s=createRaid(0,{scout:0,tank:1,breaker:0,medic:1});deploy(s,'tank',{x:3,y:9});deploy(s,'medic',{x:3,y:10});s.units[0].hp=370;tick(s);assert.equal(s.units[0].hp,390);assert.ok(s.effects.some(e=>e.damage===-20));s.units[0].hp=0;advance(s,25);assert.equal(s.units[0].hp,0);
});
test('Disruptors disable firing and shield auras until their timer expires',()=>{
 const s=createRaid(3,{scout:0,tank:0,breaker:0,disruptor:1});deploy(s,'disruptor',{x:21,y:7});const u=s.units[0], turret=s.buildings[2];u.x=17;u.y=9;u.objective=turret.id;tick(s);assert.ok(turret.disabledUntil!>s.time);assert.equal(u.hp,u.maxHp);u.cooldown=10;advance(s,41);assert.ok(u.hp<u.maxHp);
});
test('Shield generators mitigate nearby structure hits and stop when disabled',()=>{
 const damage=(disabled:boolean)=>{const s=createRaid(3,{scout:0,tank:0,breaker:0,striker:1});const core=s.buildings[0],shield=s.buildings.find(b=>b.kind==='shield')!;shield.disabledUntil=disabled?100:0;deploy(s,'striker',{x:13,y:16});s.units[0].x=14;s.units[0].y=12;tick(s);return core.maxHp-core.hp;};assert.ok(damage(false)<damage(true));assert.equal(damage(true),58);
});
test('Repair stations restore damaged surviving buildings; missiles hit clustered agents at long range',()=>{
 const s=createRaid(4);const repair=s.buildings.find(b=>b.kind==='repair')!,turret=s.buildings[2];turret.hp-=100;tick(s);assert.equal(turret.hp,turret.maxHp-72);repair.disabledUntil=100;advance(s,25);assert.equal(turret.hp,turret.maxHp-72);
 const r=createRaid(4);deploy(r,'tank',{x:21,y:11});deploy(r,'tank',{x:21,y:12});tick(r);assert.ok(r.units.every(u=>u.hp===348));
});
test('expanded squads validate capacity, normalize legacy stock, and remain deterministic',()=>{
 assert.equal(createRaid().stock.medic,0);assert.throws(()=>createRaid(0,{scout:25,tank:0,breaker:0}));assert.throws(()=>createRaid(0,{scout:1,tank:0,breaker:0},NaN));
 const run=()=>{const s=createRaid(7,{scout:4,tank:4,breaker:4,striker:4,medic:4,disruptor:4},2.5);let n=0;for(const kind of KINDS)for(let i=0;i<4;i++)deploy(s,kind,{x:21+(n++%3),y:6+i*2});advance(s,1801);return s;};const a=run();assert.deepEqual(a,run());assert.ok(a.ended);assert.ok(a.time<=90);assert.ok(a.buildings.filter(b=>b.kind==='wall'&&b.hp>0).length>0);
});
test('all expanded networks are winnable with a trained combined squad and retain walls',()=>{
 const reports=[];for(let layout=2;layout<8;layout++){const s=createRaid(layout,{scout:3,tank:6,breaker:5,striker:5,medic:2,disruptor:3},2.5);const order=['tank','breaker','disruptor','striker','medic','scout'] as const;for(const kind of order){const count=s.stock[kind];for(let i=0;i<count;i++)deploy(s,kind,{x:21+(kind==='tank'?0:2),y:6+i%6});}advance(s,1801);reports.push([LEVELS[layout].name,s.reason,Math.ceil(s.time)]);assert.equal(s.reason,'Network cleared',LEVELS[layout].name);assert.ok(objectives(s).every(b=>b.hp===0));}console.log('Expanded network balance',reports);
});

test('independent health and damage powers preserve old defaults and affect their intended stats',()=>{
 const legacy=createRaid(0,{scout:1,tank:0,breaker:0},1.3);deploy(legacy,'scout',{x:3,y:9});assert.equal(legacy.units[0].maxHp,85*1.3);
 const s=createRaid(0,{scout:0,tank:0,breaker:0,striker:1},1.5,2);deploy(s,'striker',{x:13,y:16});assert.equal(s.units[0].maxHp,220);s.units[0].x=13;s.units[0].y=11;tick(s);assert.equal(s.damage.striker,87);
});

test('each network is winnable at its actual HQ unlock with server-allocated squads and modest facility levels',()=>{
 const reports=[];
 for(let layout=0;layout<LEVELS.length;layout++){
  const player=createInitialState(),campus=ensureCampus(player),hq=LEVELS[layout].level;campus.hq=hq;
  campus.buildings.training=Math.max(0,hq-2);campus.buildings.gpu=hq>=3?1:0;
  campus.buildings.research=hq>=4?Math.max(1,hq-4):0;campus.buildings.defense=hq>=5?Math.max(1,hq-5):0;
  const effects=campusEffects(player),agents=unlockedAgents(player),squad:Squad={scout:0,tank:0,breaker:0};
  for(let i=0;i<effects.troopCapacity;i++){const k=agents[i%agents.length];squad[k]=(squad[k]||0)+1;}
  const s=createRaid(layout,squad,effects.damageMultiplier,effects.healthMultiplier);const started=performance.now();
  for(const kind of ['tank','breaker','disruptor','striker','medic','scout'] as const){const n=s.stock[kind];for(let i=0;i<n;i++)deploy(s,kind,{x:layout===1?(kind==='tank'?5:3):(kind==='tank'?21:23),y:7+i%5});}
  advance(s,1801);reports.push({network:LEVELS[layout].name,hq,troops:effects.troopCapacity,seconds:Math.ceil(s.time),simulationMs:Math.round(performance.now()-started)});
  assert.equal(s.reason,'Network cleared',`${LEVELS[layout].name} must be achievable at HQ ${hq}`);
 }
 console.log('Actual unlock-level balance',reports);
});

test('0.9 compounds remain winnable at unlock with server squads and modest facilities',()=>{
 const reports=[];
 for(let layout=0;layout<LEVELS.length;layout++){
  const player=createInitialState(),campus=ensureCampus(player),hq=LEVELS[layout].level;campus.hq=hq;
  campus.buildings.training=Math.max(0,hq-2);campus.buildings.gpu=hq>=3?1:0;
  campus.buildings.research=hq>=4?Math.max(1,hq-4):0;campus.buildings.defense=hq>=5?Math.max(1,hq-5):0;
  const effects=campusEffects(player),agents=unlockedAgents(player),squad:Squad={scout:0,tank:0,breaker:0};
  for(let i=0;i<effects.troopCapacity;i++){const k=agents[i%agents.length];squad[k]=(squad[k]||0)+1;}
  const s=createRaid(layout,squad,effects.damageMultiplier,effects.healthMultiplier,2);const started=performance.now();
  for(const kind of ['tank','breaker','disruptor','striker','medic','scout'] as const){const n=s.stock[kind];for(let i=0;i<n;i++)deploy(s,kind,{x:layout===1?(kind==='tank'?5:3):(kind==='tank'?21:23),y:7+i%5});}
  advance(s,1801);reports.push({network:LEVELS[layout].name,hq,troops:effects.troopCapacity,seconds:Math.ceil(s.time),simulationMs:Math.round(performance.now()-started)});
  assert.equal(s.reason,'Network cleared',`${LEVELS[layout].name} must be achievable at HQ ${hq}`);
 }
 console.log('0.9 unlock-level balance',reports);
});


test('0.9 map version preserves existing raid positions, IDs, hitpoints and original two layouts',()=>{
 for(let layout=0;layout<8;layout++) {
  assert.deepEqual(createRaid(layout),createRaid(layout,undefined,1,1,1));
  const old=createRaid(layout),updated=createRaid(layout,undefined,1,1,2);
  if(layout<2)assert.deepEqual(old.buildings,updated.buildings);
  else assert.notDeepEqual(old.buildings,updated.buildings);
  assert.equal(new Set(updated.buildings.map(b=>`${b.x},${b.y}`)).size,updated.buildings.length);
  assert.ok(updated.buildings.length<100);
  assert.ok(updated.buildings.every(b=>b.x>=6&&b.x<=20&&b.y>=4&&b.y<=14));
  assert.equal(LEVELS[layout].rewardScale,LEVELS_V2[layout].rewardScale);
  for(const b of old.buildings)b.hp=0;for(const b of updated.buildings)b.hp=0;
  assert.deepEqual(rewards(old),rewards(updated));
 }
});
test('0.9 service gates are traversable and wall partitions retain deterministic replay',()=>{
 for(let layout=2;layout<8;layout++) {
  const run=()=>{const s=createRaid(layout,{scout:4,tank:4,breaker:4,striker:4,medic:4,disruptor:4},2.5,2.5,2);for(const p of LEVELS_V2[layout].openings??[])assert.ok(!s.buildings.some(b=>b.x===p.x&&b.y===p.y));for(const kind of KINDS)for(let i=0;i<4;i++)deploy(s,kind,{x:23,y:6+i*2});advance(s,1801);return s;};
  const a=run();assert.deepEqual(a,run());assert.equal(a.reason,'Network cleared');assert.ok(a.buildings.some(b=>b.kind==='wall'&&b.hp>0));
 }
});
