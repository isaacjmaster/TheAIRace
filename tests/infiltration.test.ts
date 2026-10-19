import test from 'node:test';
import assert from 'node:assert/strict';
import { newOperation, commandOperation, advanceOperation, INFILTRATION_TARGETS, operationFromSnapshot, infiltrationPath, navigable, type Operation } from '../shared/infiltration';
import { initialFoundation, advanceFoundation, validFoundationPosition, moveBuilding, type FoundationState } from '../shared/foundation';
import { buildResearchLab, collectResearch, RESEARCH } from '../shared/research';
const make = (target = 'lumen-labs') => newOperation('test-operation', target, 'jammer', 10000);
function wait(o: Operation, seconds: number) { advanceOperation(o, o.lastTick + seconds * 1000); }
function hack(o: Operation, id: string) { commandOperation(o, { action: 'hack', assetId: id }, o.lastTick); for (let i = 0; i < 400 && o.status === 'active' && !o.hacked.includes(id); i++)
    wait(o, .1); }
test('Research is additive, capped, offline-produced, collectible without overflow loss, and uses the existing builder', () => { const s = initialFoundation(); Object.assign(s, { compute: 500, builders: 1, starterStation: 'placed' }); const old = structuredClone(s); buildResearchLab(s, [6, -10], 1000); assert.equal(s.compute, 350); assert.equal(s.buildersBusy, 1); assert.throws(() => buildResearchLab(s, [12, -10], 2000)); advanceFoundation(s, 61000); assert.equal(s.buildersBusy, 0); assert.equal(s.lab!.stored, 0); advanceFoundation(s, 661000); assert.equal(s.lab!.stored, 20); s.research = 499; assert.equal(collectResearch(s, 661000), 1); assert.equal(s.lab!.stored, 19); assert.equal(collectResearch(s, 661000), 0); s.research = 480; assert.equal(collectResearch(s, 661000), 19); assert.equal(s.research, 499); assert.equal(s.level, old.level); assert.equal(s.founderHqLevel, old.founderHqLevel); assert.ok(validFoundationPosition(s, [6, -10], 'rig')); const location = structuredClone(s.lab!.position); moveBuilding(s, 'lab', [12, -10], 1, 661000); assert.notDeepEqual(s.lab!.position, location); assert.equal(s.lab!.orientation, 1); assert.equal(s.lab!.stored, 0); });
test('both handcrafted companies navigate around actual footprints, hack through time, and bank only at extraction', () => { for (const t of INFILTRATION_TARGETS) {
    const o = make(t.id), snapshot = JSON.stringify(o.target);
    assert.throws(() => commandOperation(o, { action: 'hack', assetId: 'gpu' }, 10000));
    commandOperation(o, { action: 'deploy' }, 10000);
    commandOperation(o, { action: 'hack', assetId: 'gpu' }, 10000);
    assert.equal(o.carried.compute, 0);
    wait(o, .1);
    assert.equal(o.carried.compute, 0);
    while (!o.hacked.includes('gpu') && o.status === 'active')
        wait(o, .1);
    assert.equal(o.status, 'active');
    assert.equal(o.carried.compute, t.assets.find(a => a.id === 'gpu')!.compute);
    assert.equal(JSON.stringify(o.target), snapshot, 'no structure damage or mutation');
    assert.throws(() => commandOperation(o, { action: 'hack', assetId: 'gpu' }, o.lastTick));
    commandOperation(o, { action: 'extract' }, o.lastTick);
    wait(o, 20);
    assert.equal(o.status, 'extracted');
    assert.ok(o.finishedAt);
    assert.equal(JSON.stringify(o.target), snapshot);
    assert.ok(o.events.some(e => e.type === 'hacked'));
} });
test('snapshots route to every asset, reject solid and off-campus destinations, and remain independent of configuration', () => { for (const t of INFILTRATION_TARGETS) {
    const o = make(t.id);
    for (const a of t.assets.filter(a => a.access)) {
        const path = infiltrationPath(t, t.entry, a.access!);
        assert.ok(path.length, a.id);
        assert.ok(path.every(p => navigable(t, p)), a.id);
    }
    assert.equal(infiltrationPath(t, t.entry, t.assets[0].position).length, 0);
    assert.equal(infiltrationPath(t, t.entry, [999, 999]).length, 0);
    o.target.name = 'snapshot-only';
    assert.notEqual(t.name, o.target.name);
} });
test('warning precedes pursuit and interception; jammer is limited/range checked; capture discards all unbanked loot', () => { const o = make(); commandOperation(o, { action: 'deploy' }, o.lastTick); assert.throws(() => commandOperation(o, { action: 'tool' }, o.lastTick), /range/); assert.equal(o.toolUsed, false); o.agent.position = [0, 2]; o.carried = { compute: 20, research: 5, intel: true }; wait(o, .1); assert.equal(o.status, 'active'); assert.equal(o.drones[0].mode, 'warning'); commandOperation(o, { action: 'tool' }, o.lastTick); assert.equal(o.toolUsed, true); wait(o, 1); assert.equal(o.drones[0].mode, 'jammed'); assert.throws(() => commandOperation(o, { action: 'tool' }, o.lastTick)); wait(o, 25); assert.equal(o.status, 'caught'); assert.deepEqual(o.carried, { compute: 0, research: 0, intel: false }); });
test('probe reveals patrols temporarily; refresh yields deterministic results; no device-side success command exists', () => { const o = newOperation('probe', 'vector-works', 'probe', 1000); commandOperation(o, { action: 'deploy' }, 1000); commandOperation(o, { action: 'tool' }, 1000); assert.equal(o.probeUntil, 13000); commandOperation(o, { action: 'hack', assetId: 'gpu' }, 1000); const restored = JSON.parse(JSON.stringify(o)) as Operation; advanceOperation(o, 16000); advanceOperation(restored, 16000); assert.equal(JSON.stringify(o), JSON.stringify(restored)); assert.equal(o.target.assets.some(a => 'hp' in a), false); });
test('abandonment and time limit do not bank resources; finished operations reject stale commands', () => { for (const status of ['abandoned', 'timeout']) {
    const o = make();
    commandOperation(o, { action: 'deploy' }, 10000);
    hack(o, 'gpu');
    assert.ok(o.carried.compute);
    if (status === 'abandoned')
        commandOperation(o, { action: 'abandon' }, o.lastTick);
    else
        wait(o, 200);
    assert.equal(o.status, status);
    assert.equal(o.carried.compute, 0);
    assert.throws(() => commandOperation(o, { action: 'extract' }, o.lastTick));
} });
test('recorded tactical orders deterministically replay against the saved target snapshot', () => { const o = make(); commandOperation(o, { action: 'deploy' }, o.lastTick); commandOperation(o, { action: 'move', position: [-10, 4] }, o.lastTick); wait(o, 1); commandOperation(o, { action: 'hack', assetId: 'gpu' }, o.lastTick); wait(o, 12); commandOperation(o, { action: 'extract' }, o.lastTick); wait(o, 12); const replay = operationFromSnapshot(o.id, o.target, o.tool, o.createdAt); for (const order of o.orders!)
    commandOperation(replay, order.intent, order.at); advanceOperation(replay, o.lastTick); assert.equal(JSON.stringify(o), JSON.stringify(replay)); });
test('Research Lab requires sufficient Compute and a free real builder; its rotated visual shell stays inside its footprint', async () => { const s = initialFoundation(); assert.throws(() => buildResearchLab(s, [6, -10], 1000), /Builder Station/); Object.assign(s, { builders: 1, starterStation: 'placed' }); assert.throws(() => buildResearchLab(s, [6, -10], 1000), /150 Compute/); s.compute = 500; s.buildersBusy = 1; assert.throws(() => buildResearchLab(s, [6, -10], 1000), /busy/); const THREE = await import('three'), { WorldKit } = await import('../src/art/world'), { researchLabModel } = await import('../src/art/ResearchLab'); const k = new WorldKit(); try {
    const model = researchLabModel(k);
    for (let i = 0; i < 4; i++) {
        model.rotation.y = i * Math.PI / 2;
        model.updateMatrixWorld(true);
        const b = new THREE.Box3().setFromObject(model);
        assert.ok(b.max.x - b.min.x <= (i % 2 ? 3 : 4) + .01);
        assert.ok(b.max.z - b.min.z <= (i % 2 ? 4 : 3) + .01);
    }
}
finally {
    k.dispose();
} });

test('repeating the active hack intention cannot reset elapsed progress or create extra loot',()=>{const o=make();commandOperation(o,{action:'deploy'},o.lastTick);commandOperation(o,{action:'hack',assetId:'gpu'},o.lastTick);while(o.status==='active'&&o.agent.hack<1)wait(o,.1);const progress=o.agent.hack;commandOperation(o,{action:'hack',assetId:'gpu'},o.lastTick);assert.equal(o.agent.hack,progress);wait(o,5);assert.equal(o.hacked.filter(id=>id==='gpu').length,1);assert.equal(o.carried.compute,20);});
