import test from 'node:test';
import assert from 'node:assert/strict';
import { createRaid, deploy, destruction, rewards, tick, validDeployment, type Kind, type Raid } from './engine';
import { MAP, LEVELS } from './level';
import { DeploymentGesture } from './gestures';
import { summarizeRaid } from './outcome';

const advance = (s: Raid, seconds = 90) => { for (let i = 0; i < seconds * 20 + 1; i++) tick(s); return s; };
function assault(layout: number, side: 'east' | 'west' | 'north') {
  const s = createRaid(layout);
  const orders: [number, Kind, number][] = [[0, 'tank', 11], [10, 'tank', 10], [60, 'breaker', 11], [70, 'breaker', 10], [80, 'scout', 6], [90, 'scout', 7]];
  for (let i = 0; i < 1801; i++) {
    for (const [step, kind, offset] of orders) if (i === step) {
      const x = kind === 'tank' ? 21 : 23;
      deploy(s, kind, side === 'north' ? { x: offset, y: 2 } : { x: side === 'east' ? x : 26 - x, y: offset });
    }
    tick(s);
  }
  return s;
}
test('map is three times the old area and objectives have room around them', () => {
  assert.ok(MAP.width * MAP.height >= 169 * 3);
  for (const layout of [0, 1]) {
    const s = createRaid(layout), [core, vault, turret] = s.buildings;
    assert.ok(Math.hypot(core.x - vault.x, core.y - vault.y) >= 4);
    assert.ok(Math.hypot(core.x - turret.x, core.y - turret.y) >= 4);
    assert.equal(s.buildings.some(b => b.kind === 'wall' && b.x === LEVELS[layout].gate && b.y === MAP.walls.top), false);
  }
});
test('deployment rejects interior, buffer zones, non-finite and out-of-map positions', () => {
  const s = createRaid();
  for (const p of [{x:13,y:9},{x:6,y:9},{x:13,y:4},{x:-1,y:2},{x:NaN,y:1},{x:Infinity,y:2},{x:26,y:18}]) {
    assert.equal(validDeployment(p), false); assert.equal(deploy(s, 'tank', p), false);
  }
  assert.equal(s.stock.tank, 2);
});
test('all four broad outer edges accept deployments and snap safely to the grid', () => {
  for (const p of [{x:.5,y:9},{x:25.5,y:9},{x:13,y:.5},{x:13,y:17.5},{x:3,y:9},{x:23,y:9},{x:13,y:2},{x:13,y:16}]) {
    const s = createRaid(); assert.equal(deploy(s, 'tank', p), true); assert.equal(s.stock.tank, 1);
    assert.ok(Number.isInteger(s.units[0].x) && Number.isInteger(s.units[0].y));
  }
});
test('stock is consumed exactly once and exhausted troops cannot deploy', () => {
  const s = createRaid(); assert.equal(deploy(s, 'tank', {x:3,y:9}), true); assert.equal(s.units[0].hp, 390);
  assert.equal(deploy(s, 'tank', {x:3,y:9}), true); assert.equal(deploy(s, 'tank', {x:3,y:9}), false);
});
test('fixed-step replay is deterministic and ends within the 90-second timer', () => {
  const a = assault(0, 'east'); assert.deepEqual(a, assault(0, 'east')); assert.equal(a.ended, true); assert.ok(a.time <= 90);
});
test('deployment approaches and layouts produce different outcomes', () => {
  const east = assault(0, 'east'), north = assault(0, 'north'), mirrored = assault(1, 'east');
  const metrics = (s: Raid) => [destruction(s), s.lost, s.time, s.damage];
  assert.notDeepEqual(metrics(east), metrics(north)); assert.notDeepEqual(metrics(east), metrics(mirrored));
  console.log('Landscape strategies', [east, north, mirrored].map(s => ({ layout: s.layout, destruction: destruction(s), elapsed: Math.ceil(s.time), lost: s.lost, reason: s.reason })));
});
test('Scouts use the nearby gate without damaging unrelated walls', () => {
  for (const layout of [0, 1]) { const s = createRaid(layout); s.buildings[2].hp = 0;
    deploy(s, 'scout', {x:LEVELS[layout].gate,y:2}); advance(s, 60);
    assert.equal(s.buildings[1].hp, 0); assert.ok(s.buildings.filter(b => b.kind === 'wall').every(b => b.hp === b.maxHp)); assert.ok(rewards(s).compute >= 120);
  }
});
test('Breakers open useful breaches in fully closed bases and finish objectives', () => {
  for (const layout of [0, 1]) { const s = createRaid(layout); s.buildings[2].hp = 0;
    s.buildings.push({id:99,kind:'wall',x:LEVELS[layout].gate,y:MAP.walls.top,hp:150,maxHp:150,cooldown:0});
    deploy(s, 'breaker', {x:13,y:16}); deploy(s, 'breaker', {x:14,y:16}); advance(s);
    assert.equal(s.reason, 'Network cleared'); assert.ok(s.buildings.filter(b => b.kind === 'wall' && b.hp > 0).length > 30);
  }
});
test('troops retain distinct meaningful objective priorities', () => {
  for (const layout of [0, 1]) for (const kind of ['scout','tank','breaker'] as Kind[]) {
    const s = createRaid(layout); deploy(s, kind, {x:LEVELS[layout].gate,y:2}); tick(s);
    const target = s.buildings.find(b => b.id === s.units[0].objective)!; assert.notEqual(target.kind, 'wall');
    if (kind === 'scout') assert.equal(target.kind, 'vault'); if (kind === 'breaker') assert.equal(target.kind, 'turret');
  }
});
test('live units never cross occupied structures or wall centers on either layout', () => {
  for (const layout of [0, 1]) { const s = createRaid(layout);
    for (const kind of ['scout','tank','breaker'] as Kind[]) deploy(s, kind, {x:23,y:11});
    for (let i = 0; i < 1801; i++) { tick(s); for (const u of s.units.filter(u => u.hp > 0)) for (const b of s.buildings.filter(b => b.hp > 0)) assert.ok(Math.hypot(u.x-b.x,u.y-b.y)>.45, `${u.kind} crossed ${b.kind}`); }
  }
});
test('turret defeats an exposed Scout; a destroyed turret never fires', () => {
  const s = createRaid(); deploy(s, 'scout', {x:21,y:11}); advance(s, 5); assert.equal(s.lost, 1);
  const other = createRaid(); other.buildings[2].hp = 0; deploy(other, 'tank', {x:21,y:11}); advance(other, 5); assert.equal(other.units[0].hp, 390);
});
test('walls give no destruction percentage and victory leaves standing walls intact', () => {
  for (const layout of [0, 1]) { const s = createRaid(layout); s.buildings.filter(b => b.kind === 'wall').forEach(b => {b.hp=0;}); assert.equal(destruction(s),0);
    const intact = createRaid(layout); intact.buildings[1].hp=0; assert.equal(destruction(intact),33); intact.buildings[2].hp=0; assert.equal(destruction(intact),67);
    intact.buildings[0].hp=0; intact.time=89.99; tick(intact); assert.equal(intact.reason,'Network cleared'); assert.equal(destruction(intact),100);
    assert.ok(intact.buildings.filter(b=>b.kind==='wall').every(b=>b.hp===b.maxHp)); assert.deepEqual(rewards(intact),{compute:200,credits:500});
  }
});
test('last-objective kill stops immediately before further defense fire', () => {
  const s=createRaid(); s.buildings[0].hp=0; s.buildings[1].hp=0; s.buildings[2].hp=1;
  deploy(s,'breaker',{x:21,y:11}); s.units[0].x=17; s.units[0].y=12; tick(s);
  assert.equal(s.reason,'Network cleared'); assert.equal(s.units[0].hp,135); assert.ok(s.buildings.filter(b=>b.kind==='wall').every(b=>b.hp===b.maxHp));
});
test('timeout and completed raids freeze outcomes and reject later deployment', () => {
  const s=advance(createRaid()); assert.equal(s.reason,'Time expired'); const snapshot=JSON.stringify(s); tick(s); assert.equal(JSON.stringify(s),snapshot);
  assert.equal(deploy(s,'scout',{x:3,y:9}),false);
});
test('coordinated strategies can win both spacious layouts with walls still standing', () => {
  for (const layout of [0,1]) { const s=assault(layout,layout===0?'east':'west'); assert.equal(s.reason,'Network cleared'); assert.ok(s.time>25 && s.time<90); assert.ok(s.buildings.filter(b=>b.kind==='wall'&&b.hp>0).length>30); }
});
test('host-supplied squad is copied, validated, and changes combat outcomes', () => {
  const squad={scout:6,tank:0,breaker:0}; const s=createRaid(0,squad); squad.scout=0; assert.equal(s.stock.scout,6);
  assert.throws(()=>createRaid(99)); assert.throws(()=>createRaid(0,{scout:-1,tank:2,breaker:2})); assert.throws(()=>createRaid(0,{scout:0,tank:0,breaker:0}));
  const run=(kind:Kind)=>{const counts={scout:0,tank:0,breaker:0}; counts[kind]=6; const state=createRaid(0,counts); for(let i=0;i<6;i++)deploy(state,kind,{x:21,y:10+i%2}); advance(state); return [destruction(state),state.lost,state.damage];};
  assert.notDeepEqual(run('scout'),run('tank')); assert.notDeepEqual(run('tank'),run('breaker'));
});
test('host outcome is a frozen snapshot and cannot be collected before completion', () => {
  const s=createRaid(); assert.throws(()=>summarizeRaid(s)); s.buildings.filter(b=>b.kind!=='wall').forEach(b=>{b.hp=0;}); tick(s);
  const result=summarizeRaid(s); assert.equal(result.victory,true); assert.deepEqual(result.rewards,{compute:200,credits:500});
  assert.ok(Object.isFrozen(result)&&Object.isFrozen(result.rewards)&&Object.isFrozen(result.damage)); s.damage.scout=999; assert.equal(result.damage.scout,0);
});
test('taps deploy; camera drag, canceled pointers and multi-touch do not', () => {
  const g=new DeploymentGesture(); g.begin(1,{x:10,y:10}); assert.equal(g.release(1,{x:12,y:12}),true);
  g.begin(1,{x:10,y:10}); assert.ok(g.move(1,{x:40,y:10})); assert.equal(g.release(1,{x:10,y:10}),false);
  g.begin(1,{x:10,y:10}); g.begin(2,{x:30,y:30}); assert.equal(g.release(2,{x:30,y:30}),false); assert.equal(g.release(1,{x:10,y:10}),false);
  g.begin(3,{x:0,y:0}); g.cancel(3); assert.equal(g.release(3,{x:0,y:0}),false); assert.equal(g.count,0);
});
