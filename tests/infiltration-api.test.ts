import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { registerFoundation } from '../server/foundation-api';
import { initialFoundation, startBotRaid, deployScrap, type FoundationState } from '../shared/foundation';
import { RESEARCH } from '../shared/research';
import { identityHeaders, saveIdForCookie } from './helpers/identity';
type Player = {
    cookie: string;
    id: string;
};
async function fixture(path = ':memory:', initialTime = Date.now()) {
    const db = new DatabaseSync(path);
    let now = initialTime;
    const app = express();
    app.use(express.json());
    registerFoundation(app, db, { clock: () => now });
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>(r => server.once('listening', r));
    const url = `http://127.0.0.1:${(server.address() as {
        port: number;
    }).port}`;
    const get = async (p?: Player, route = '') => { const r = await fetch(url + '/api/foundation' + route, { headers: p ? { cookie: p.cookie } : {} }); return { status: r.status, data: await r.json(), cookie: r.headers.get('set-cookie')?.split(';')[0] || '' }; };
    const fresh = async (bots=1) => { const r = await get(); if(bots){r.data.state.bots=bots;db.prepare('UPDATE foundation_saves SET state=? WHERE id=?').run(JSON.stringify(r.data.state),saveIdForCookie(db,r.cookie));}return { cookie: r.cookie, id: r.data.company.playerId } as Player; };
    const post = async (p: Player, route: string, body: unknown) => { const r = await fetch(url + '/api/foundation' + route, { method: 'POST', headers: identityHeaders(db, p.cookie), body: JSON.stringify(body) }); return { status: r.status, data: await r.json(), cookie: r.headers.get('set-cookie')?.split(';')[0] || '' }; };
    const command = (p: Player, c: unknown, requestId = randomUUID()) => post(p, '/bots', { generation: 0, requestId, command: c });
    const read = (p: Player) => JSON.parse(db.prepare('SELECT state FROM foundation_saves WHERE id=?').get(saveIdForCookie(db, p.cookie))!.state as string) as FoundationState;
    const save = (p: Player, s: FoundationState) => db.prepare('UPDATE foundation_saves SET state=? WHERE id=?').run(JSON.stringify(s), saveIdForCookie(db, p.cookie));
    async function battle(p: Player, layout = 0, count = 10, finish = true) { const s = read(p); s.bots = count; save(p, s); const start = await command(p, { action: 'start', layout }); assert.equal(start.status, 200); const id = start.data.state.botRaid.id; for (let i = 0; i < count; i++)
        assert.equal((await command(p, { action: 'deploy', raidId: id, position: { x: 9, y: 2 } })).status, 200); if (finish) {
        now += 91000;
        return (await get(p)).data;
    } return { id }; }
    return { db, get, fresh, post, command, read, save, battle, time: () => now, setTime: (n: number) => now = n, close: () => new Promise<void>(r => server.close(() => { db.close(); r(); })) };
}
async function operation(f: Awaited<ReturnType<typeof fixture>>, p: Player, targetId = 'lumen-labs') { let r = await f.command(p, { action: 'infiltration-start', targetId, tool: 'jammer' }); assert.equal(r.status, 200); const id = r.data.state.infiltration.id; assert.equal((await f.command(p, { action: 'infiltration-command', operationId: id, intent: { action: 'deploy' } })).status, 200); assert.equal((await f.command(p, { action: 'infiltration-command', operationId: id, intent: { action: 'hack', assetId: 'gpu' } })).status, 200); f.setTime(f.time() + 12000); r = await f.get(p); assert.ok(r.data.state.infiltration.carried.compute > 0); assert.equal((await f.command(p, { action: 'infiltration-command', operationId: id, intent: { action: 'extract' } })).status, 200); f.setTime(f.time() + 12000); return { id, result: (await f.get(p)).data }; }
test('server settles extraction atomically once, preserves identity/old progression, and uses independent persistent cooldowns', async () => { const f = await fixture(); try {
    const p = await f.fresh();
    const old = f.read(p);
    let { id, result } = await operation(f, p);
    assert.equal(result.state.compute, old.compute + 20);
    assert.equal(result.state.infiltration.settlement.influence, 25);
    assert.equal(result.competition.total, 25);
    assert.equal(result.company.playerId, p.id);
    const expiry = result.state.infiltration.settlement.eligibleAt;
    const outcomes = await Promise.all([f.get(p), f.get(p), f.command(p, { action: 'infiltration-command', operationId: id, intent: { action: 'extract' } })]);
    assert.equal(outcomes[2].status, 400);
    assert.equal(f.read(p).compute, 120);
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM infiltration_results').get()!.n, 1);
    result = (await operation(f, p)).result;
    assert.equal(result.competition.total, 25);
    assert.equal(result.state.infiltration.settlement.influence, 0);
    result = (await operation(f, p, 'vector-works')).result;
    assert.equal(result.competition.total, 75);
    f.setTime(expiry + 1);
    result = (await operation(f, p)).result;
    assert.equal(result.competition.total, 100);
    assert.equal(result.state.level, old.level);
    assert.deepEqual(result.state.raidRecord, old.raidRecord);
    assert.equal(result.state.founderHqLevel, old.founderHqLevel);
}
finally {
    await f.close();
} });
test('forged rewards, stale operation IDs and duplicate preparation requests cannot create rewards or extra agents', async () => { const f = await fixture(); try {
    const p = await f.fresh(), requestId = randomUUID();
    const [a, b] = await Promise.all([f.command(p, { action: 'infiltration-start', targetId: 'lumen-labs', tool: 'probe' }, requestId), f.command(p, { action: 'infiltration-start', targetId: 'lumen-labs', tool: 'probe' }, requestId)]);
    assert.equal(a.status, 200);
    assert.equal(a.data.state.infiltration.id, b.data.state.infiltration.id);
    const id = a.data.state.infiltration.id;
    assert.equal((await f.command(p, { action: 'infiltration-command', operationId: id, intent: { action: 'extract', compute: 999, success: true } })).status, 400);
    assert.equal((await f.command(p, { action: 'infiltration-command', operationId: randomUUID(), intent: { action: 'deploy' } })).status, 400);
    assert.equal((await f.command(p, { action: 'infiltration-start', targetId: 'vector-works', tool: 'jammer' })).status, 400);
    assert.equal(f.read(p).compute, 100);
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM infiltration_results').get()!.n, 0);
}
finally {
    await f.close();
} });
test('Research build/collect retries, busy builder, offline cap and full storage preserve exact balances', async () => { const f = await fixture(); try {
    const p = await f.fresh(), s = f.read(p);
    Object.assign(s, { compute: 600, builders: 1, starterStation: 'placed', landscape: { version: 1, epoch: 'test', sequence: 0, nextSpawnAt: f.time() + 1e9, items: [], pendingCompute: 0 } });
    f.save(p, s);
    const command = { action: 'build-lab', position: [6, -10], orientation: 1 }, key = randomUUID();
    const replies = await Promise.all([f.command(p, command, key), f.command(p, command, key)]);
    assert.ok(replies.every(r => r.status === 200));
    assert.equal(f.read(p).compute, 450);
    assert.equal((await f.command(p, { action: 'build', position: [12, -10] })).status, 400);
    f.setTime(f.time() + 660000);
    const read = (await f.get(p)).data;
    assert.equal(read.state.lab.stored, 20);
    assert.equal(read.state.buildersBusy, 0);
    const collect = randomUUID();
    await Promise.all([f.command(p, { action: 'collect-research' }, collect), f.command(p, { action: 'collect-research' }, collect)]);
    assert.equal(f.read(p).research, 20);
    assert.equal(f.read(p).lab!.stored, 0);
    assert.equal(f.read(p).lab!.orientation, 1);
}
finally {
    await f.close();
} });
test('company recovery and process restart retain research, active operation, rewards and cooldowns', async () => { const dir = mkdtempSync(join(tmpdir(), 'infiltration-')), path = join(dir, 'save.sqlite'); let f = await fixture(path); try {
    const p = await f.fresh(), guest = await f.fresh();
    const won = await operation(f, p);
    await f.command(p,{action:'infiltration-tutorial',operationId:won.id,result:'complete'});
    const s = f.read(p);
    s.research = 42;
    f.save(p, s);
    const code = (await f.post(p, '/company/recovery-code', {})).data.code;
    const ticket = (await f.post(guest, '/company/recover/check', { code })).data.ticket;
    const restored = await f.post(guest, '/company/recover/confirm', { ticket, confirm: true });
    assert.equal(restored.status, 200);
    const player = { id: p.id, cookie: restored.cookie };
    let r = (await f.get(player)).data;
    assert.equal(r.state.research, 42);assert.equal(r.state.infiltrationTutorial,'complete');assert.equal(r.state.bots,1);assert.equal(r.state.infiltration.unit.status,'returned');
    assert.equal(r.state.infiltration.id, won.id);
    const time = f.time();
    await f.close();
    f = await fixture(path, time);
    r = (await f.get(player)).data;
    assert.equal(r.competition.total, 25);
    assert.equal(r.state.research, 42);assert.equal(r.state.infiltrationTutorial,'complete');assert.equal(r.state.bots,1);assert.equal(r.state.infiltration.unit.status,'returned');
    assert.equal(r.state.infiltration.settlement.influence, 25);
    assert.equal(r.infiltrationCooldowns[0].eligibleAt, won.result.state.infiltration.settlement.eligibleAt);
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM foundation_saves').get()!.n, 2);
}
finally {
    await f.close();
    rmSync(dir, { recursive: true, force: true });
} });
test('full resource storage retains validated loot in reserve and releases it once space is available', async () => { const f = await fixture(); try {
    const p = await f.fresh(), s = f.read(p);
    s.compute = s.capacity;
    f.save(p, s);
    const { result } = await operation(f, p);
    assert.equal(result.state.compute, 1000);
    assert.equal(result.state.infiltrationReserve.compute, 20);
    const next = f.read(p);
    next.compute -= 50;
    f.save(p, next);
    await Promise.all([f.get(p), f.get(p)]);
    assert.equal(f.read(p).compute, 970);
    assert.equal(f.read(p).infiltrationReserve!.compute, 0);
}
finally {
    await f.close();
} });
test('settlement and cooldown writes roll back together on a storage failure', async () => { const f = await fixture(); try {
    const p = await f.fresh();
    let r = await f.command(p, { action: 'infiltration-start', targetId: 'lumen-labs', tool: 'probe' });
    const id = r.data.state.infiltration.id;
    await f.command(p, { action: 'infiltration-command', operationId: id, intent: { action: 'deploy' } });
    await f.command(p, { action: 'infiltration-command', operationId: id, intent: { action: 'hack', assetId: 'gpu' } });
    f.setTime(f.time() + 12000);
    await f.command(p, { action: 'infiltration-command', operationId: id, intent: { action: 'extract' } });
    f.setTime(f.time() + 12000);
    f.db.exec("CREATE TRIGGER reject_infiltration BEFORE INSERT ON infiltration_results BEGIN SELECT RAISE(ABORT,'test interruption'); END");
    assert.equal((await f.get(p)).status, 503);
    assert.equal(f.read(p).compute, 100);
    assert.equal(f.read(p).infiltration!.status, 'active');assert.equal(f.read(p).bots,0);assert.equal(f.read(p).infiltration!.unit!.status,'reserved');
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM infiltration_cooldowns').get()!.n, 0);
    f.db.exec('DROP TRIGGER reject_infiltration');
    assert.equal((await f.get(p)).data.state.compute, 120);
}
finally {
    await f.close();
} });
test('genuine pre-Research saves gain only resource defaults; buildings, XP, recovery identity and historic Influence survive', async () => { const f = await fixture(); try {
    const p = await f.fresh(), s = f.read(p);
    delete s.research;
    delete s.researchCapacity;
    Object.assign(s, { compute: 777, founderHqLevel: 2, builders: 1, starterStation: 'placed', bots: 6, training: [f.time() + 60000], rig: { position: [6, 0], orientation: 3, startedAt: 0, completesAt: 0, lastProducedAt: f.time() + 60000, stored: 7 }, rig2: { position: [12, 0], orientation: 2, startedAt: 0, completesAt: 0, lastProducedAt: f.time() + 60000, stored: 12 }, raidRecord: { wins: [0, 1], completeHistory: true }, decorations: [{ id: randomUUID(), kind: 'flowers', position: [-15, 14], orientation: 2 }] });
    f.save(p, s);
    f.db.prepare('INSERT INTO company_influence VALUES(?,?)').run(p.id, 73);
    const r = (await f.get(p)).data;
    assert.equal(r.company.playerId, p.id);
    assert.equal(r.state.research, 0);
    assert.equal(r.state.researchCapacity, 500);
    for (const key of ['compute', 'founderHqLevel', 'builders', 'bots', 'training', 'rig', 'rig2', 'raidRecord', 'decorations'] as const)
        assert.deepEqual(r.state[key], s[key], key);
    assert.equal(r.competition.total, 73);
    assert.equal(r.state.lab, undefined);
}
finally {
    await f.close();
} });
test('closing and reopening during a hack preserves the operation, but unextracted loot is never credited', async () => { const dir = mkdtempSync(join(tmpdir(), 'infiltration-active-')), path = join(dir, 'save.sqlite'); let f = await fixture(path); try {
    const p = await f.fresh();
    const start = await f.command(p, { action: 'infiltration-start', targetId: 'lumen-labs', tool: 'probe' }), id = start.data.state.infiltration.id;
    await f.command(p, { action: 'infiltration-command', operationId: id, intent: { action: 'deploy' } });
    await f.command(p, { action: 'infiltration-command', operationId: id, intent: { action: 'hack', assetId: 'gpu' } });
    f.setTime(f.time() + 3500);
    const before = (await f.get(p)).data.state.infiltration, time = f.time();
    assert.equal(before.status, 'active');
    await f.close();
    f = await fixture(path, time);
    assert.deepEqual((await f.get(p)).data.state.infiltration, before);assert.equal(f.read(p).bots,0);assert.equal(f.read(p).infiltration!.unit!.status,'reserved');
    f.setTime(time + 8000);
    let r = (await f.get(p)).data;
    assert.equal(r.state.infiltration.carried.compute, 20);
    assert.equal(r.state.compute, 100);
    f.setTime(time + 86400000);
    r = (await f.get(p)).data;
    assert.equal(r.state.infiltration.status, 'timeout');
    assert.equal(r.state.compute, 100);
    assert.equal(r.competition.total, 0);
}
finally {
    await f.close();
    rmSync(dir, { recursive: true, force: true });
} });
test('Research extraction, independent companies and stale result replay retain exact authoritative rewards', async () => { const f = await fixture(); try {
    const p = await f.fresh(), other = await f.fresh();
    const start = await f.command(p, { action: 'infiltration-start', targetId: 'lumen-labs', tool: 'jammer' }), id = start.data.state.infiltration.id, t = f.time();
    await f.command(p, { action: 'infiltration-command', operationId: id, intent: { action: 'deploy' } });
    await f.command(p, { action: 'infiltration-command', operationId: id, intent: { action: 'hack', assetId: 'lab' } });
    f.setTime(t + 5600);
    assert.equal((await f.command(p, { action: 'infiltration-command', operationId: id, intent: { action: 'tool' } })).status, 200);
    f.setTime(t + 12000);
    assert.equal((await f.get(p)).data.state.infiltration.carried.research, 12);
    await f.command(p, { action: 'infiltration-command', operationId: id, intent: { action: 'extract' } });
    f.setTime(t + 24000);
    const r = (await f.get(p)).data;
    assert.equal(r.state.research, 12);
    assert.equal(r.state.infiltration.settlement.research, 12);
    assert.equal(r.competition.total, 25);
    assert.equal((await f.get(other)).data.competition.total, 0);
    assert.equal((await operation(f, other)).result.competition.total, 25);
    f.setTime(r.state.infiltration.settlement.eligibleAt + 1);
    assert.equal((await f.command(p, { action: 'infiltration-command', operationId: id, intent: { action: 'extract' } })).status, 400);
    assert.equal((await f.get(p)).data.competition.total, 25);
    assert.equal(f.read(p).research, 12);
}
finally {
    await f.close();
} });

test('stale clients cannot start new destruction raids, but existing legacy battles remain resumable',async()=>{const f=await fixture();try{const p=await f.fresh();let s=f.read(p);s.bots=2;f.save(p,s);assert.equal((await f.command(p,{action:'start',layout:0})).status,400);s=f.read(p);const raidId=randomUUID();startBotRaid(s,raidId,0,f.time());s.botRaid!.companyId=p.id;f.save(p,s);assert.equal((await f.command(p,{action:'infiltration-start',targetId:'lumen-labs',tool:'probe'})).status,400);assert.equal((await f.command(p,{action:'deploy',raidId,position:{x:9,y:2}})).status,200);assert.equal((await f.command(p,{action:'retreat',raidId})).status,200);assert.equal(f.read(p).botRaid!.id,raidId);assert.equal((await f.command(p,{action:'infiltration-start',targetId:'lumen-labs',tool:'probe'})).status,200);}finally{await f.close();}});

test('zero-bot companies cannot start or forge deployment; real training supplies one reserved agent',async()=>{const f=await fixture();try{const p=await f.fresh(0),before=f.read(p);assert.equal((await f.command(p,{action:'infiltration-start',targetId:'lumen-labs',tool:'jammer'})).status,400);assert.equal((await f.command(p,{action:'infiltration-command',operationId:randomUUID(),intent:{action:'deploy'}})).status,400);assert.equal(f.read(p).compute,before.compute);assert.equal(f.read(p).infiltration,undefined);assert.equal(f.read(p).fabricator,undefined);
assert.equal((await f.command(p,{action:'establish-station',position:[3,5]})).status,200);assert.equal((await f.command(p,{action:'build',position:[6,-6]})).status,200);f.setTime(f.time()+15000);assert.equal((await f.command(p,{action:'build-hangar',position:[13,-6]})).status,200);f.setTime(f.time()+15000);assert.equal((await f.command(p,{action:'train',count:1})).status,200);assert.equal((await f.command(p,{action:'infiltration-start',targetId:'lumen-labs',tool:'probe'})).status,400);f.setTime(f.time()+5000);const requestId=randomUUID(),start={action:'infiltration-start',targetId:'lumen-labs',tool:'probe'};const replies=await Promise.all([f.command(p,start,requestId),f.command(p,start,requestId)]);assert.ok(replies.every(r=>r.status===200));let s=f.read(p);assert.equal(s.bots,0);assert.equal(s.infiltration!.unit!.status,'reserved');assert.equal(s.compute,45);const id=s.infiltration!.id;
assert.equal((await f.command(p,{action:'train',count:9})).status,200);const next=f.read(p);next.compute=100;f.save(p,next);assert.equal((await f.command(p,{action:'train',count:1})).status,400);f.setTime(f.time()+45000);await f.get(p);assert.equal(f.read(p).bots,9);const cancelId=randomUUID();await Promise.all([f.command(p,{action:'infiltration-command',operationId:id,intent:{action:'abandon'}},cancelId),f.command(p,{action:'infiltration-command',operationId:id,intent:{action:'abandon'}},cancelId)]);s=f.read(p);assert.equal(s.bots,10);assert.equal(s.infiltration!.unit!.status,'returned');assert.equal((await f.get(p)).data.state.bots,10);
}finally{await f.close();}});

test('deployment is zone validated, reservations are company-scoped and repeated commands cannot duplicate a unit',async()=>{const f=await fixture();try{const p=await f.fresh(),other=await f.fresh();const r=await f.command(p,{action:'infiltration-start',targetId:'lumen-labs',tool:'probe'}),id=r.data.state.infiltration.id;assert.equal(f.read(p).bots,0);assert.equal((await f.command(other,{action:'infiltration-command',operationId:id,intent:{action:'deploy'}})).status,400);for(const position of [[0,-3],[1000,1000],[-10.8,0]])assert.equal((await f.command(p,{action:'infiltration-command',operationId:id,intent:{action:'deploy',position}})).status,400);assert.equal(f.read(p).infiltration!.status,'ready');const key=randomUUID(),cmd={action:'infiltration-command',operationId:id,intent:{action:'deploy',position:[-8,6.5]}};const replies=await Promise.all([f.command(p,cmd,key),f.command(p,cmd,key)]);assert.ok(replies.every(r=>r.status===200));assert.equal((await f.command(p,cmd)).status,400);assert.equal(f.read(p).bots,0);assert.equal(f.read(p).infiltration!.events.filter(e=>e.type==='deployed').length,1);assert.equal((await f.command(p,{action:'infiltration-command',operationId:id,intent:{action:'abandon'}})).status,200);assert.equal(f.read(p).infiltration!.unit!.status,'lost');assert.equal(f.read(p).bots,0);await f.get(p);assert.equal(f.read(p).bots,0);assert.equal(f.read(other).bots,1);}finally{await f.close();}});

test('extraction returns its real agent once; timeout/interception lose it without banking unextracted loot',async()=>{const f=await fixture();try{const p=await f.fresh();const won=await operation(f,p);assert.equal(won.result.state.bots,1);assert.equal(won.result.state.infiltration.unit.status,'returned');await Promise.all([f.get(p),f.get(p)]);assert.equal(f.read(p).bots,1);for(const outcome of ['timeout','caught']){const r=await f.command(p,{action:'infiltration-start',targetId:'lumen-labs',tool:'probe'}),id=r.data.state.infiltration.id;await f.command(p,{action:'infiltration-command',operationId:id,intent:{action:'deploy'}});if(outcome==='caught'){const s=f.read(p);s.infiltration!.agent.position=[0,2];s.infiltration!.agent.path=[];f.save(p,s);}f.setTime(f.time()+(outcome==='timeout'?181000:30000));const done=(await f.get(p)).data;assert.equal(done.state.infiltration.status,outcome);assert.equal(done.state.infiltration.unit.status,'lost');assert.equal(done.state.bots,0);assert.equal(done.state.compute,120);const s=f.read(p);s.bots=1;f.save(p,s);}}finally{await f.close();}});

test('legacy unbacked operations cancel without charging inventory, even after expiry; tutorial choice persists',async()=>{const f=await fixture();try{const {newOperation}=await import('../shared/infiltration');const p=await f.fresh(0),s=f.read(p);s.infiltration=newOperation(randomUUID(),'lumen-labs','probe',f.time());f.save(p,s);let r=(await f.get(p)).data;assert.equal(r.state.infiltration.status,'abandoned');assert.equal(r.state.infiltration.ownershipRequired,true);assert.equal(r.state.bots??0,0);assert.equal(r.state.compute,100);const other=await f.fresh(2),old=f.read(other);old.infiltration=newOperation(randomUUID(),'vector-works','probe',f.time());f.save(other,old);r=(await f.get(other)).data;assert.equal(r.state.bots,2);assert.equal(r.state.infiltration.status,'abandoned');assert.equal((await f.get(other)).data.state.bots,2);r=(await f.command(other,{action:'infiltration-start',targetId:'vector-works',tool:'probe'})).data;assert.equal(r.state.bots,1);const id=r.state.infiltration.id;assert.equal((await f.command(other,{action:'infiltration-tutorial',operationId:id,result:'skipped'})).status,200);assert.equal((await f.get(other)).data.state.infiltrationTutorial,'skipped');await f.command(other,{action:'infiltration-command',operationId:id,intent:{action:'abandon'}});r=(await f.command(other,{action:'infiltration-start',targetId:'lumen-labs',tool:'probe'})).data;assert.equal(r.state.infiltrationTutorial,'skipped');assert.equal(r.state.bots,1);}finally{await f.close();}});

test('expired pre-ownership active operations never confiscate saved trained bots or bank unsupported loot',async()=>{const f=await fixture();try{const p=await f.fresh(3),s=f.read(p),{newOperation,commandOperation}=await import('../shared/infiltration');s.infiltration=newOperation(randomUUID(),'lumen-labs','probe',f.time());commandOperation(s.infiltration,{action:'deploy'},f.time());s.infiltration.carried={compute:20,research:12,intel:false};s.infiltration.hacked=['gpu','lab'];f.save(p,s);f.setTime(f.time()+86400000);const r=(await f.get(p)).data;assert.equal(r.state.bots,3);assert.equal(r.state.compute,100);assert.equal(r.state.research,0);assert.equal(r.state.infiltration.status,'abandoned');assert.equal(r.state.infiltration.ownershipRequired,true);assert.equal(r.competition.total,0);assert.equal((await f.get(p)).data.state.bots,3);}finally{await f.close();}});
