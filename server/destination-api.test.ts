import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { basename, join, resolve, sep } from 'node:path';
import { createInitialState } from '../src/game/index.js';
import type { ExpeditionState } from '../shared/expedition.js';
import { readExpedition, registerExpeditions } from './expedition-api.js';

async function fixture() {
  const folder = mkdtempSync(join(process.cwd(), '.destination-test-'));
  const path = join(folder, 'test.sqlite');
  const db = new DatabaseSync(path), game = createInitialState();
  const app = express(); app.use(express.json());
  registerExpeditions(app, db, () => ({ id: 'destination-founder', state: game }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  let stopped = false;
  return {
    db, path, game,
    save(state: ExpeditionState) {
      db.prepare('UPDATE expedition_state SET state=? WHERE session=?').run(JSON.stringify(state), 'destination-founder');
    },
    read: () => readExpedition(db, 'destination-founder'),
    async post(command: unknown, revision: number, requestId = randomUUID()) {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/expedition`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ command, revision, requestId }),
      });
      return { status: response.status, body: await response.json() as { expedition: ExpeditionState; error?: string }, requestId };
    },
    async stop() {
      if (stopped) return;
      stopped = true;
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      db.close();
    },
    clean() {
      if (!resolve(folder).startsWith(resolve(process.cwd()) + sep) || !basename(folder).startsWith('.destination-test-')) throw new Error('Unexpected test directory');
      rmSync(folder, { recursive: true, force: true });
    },
  };
}

test('destination API rejects invalid locations, forged values and locked GPU launches without changing saves', async t => {
  const f = await fixture(); t.mock.method(Date, 'now', () => 100000);
  try {
    const original = f.read(), game = structuredClone(f.game);
    for (const command of [
      { type: 'launch', destination: 'unlimited' }, { type: 'launch', destination: 'safe', cargo: 999 },
      { type: 'destination', destination: 'safe', risk: 'bold' },
      { type: 'destination', destination: 'dangerous' }, { type: 'launch', destination: 'dangerous' },
      { type: 'headHome', resources: { scrap: 999 } },
    ]) {
      assert.equal((await f.post(command, original.revision)).status, 400);
      assert.deepEqual(f.read(), original);
    }
    assert.deepEqual(f.game, game);
  } finally { await f.stop(); f.clean(); }
});

test('selected location gathers automatically, pauses at a decision and resumes when another destination is chosen', async t => {
  const f = await fixture(); let clock = 100000;
  t.mock.method(Date, 'now', () => clock);
  try {
    let state = f.read();
    async function send(command: unknown) {
      const response = await f.post(command, state.revision);
      assert.equal(response.status, 200, JSON.stringify(response.body));
      state = response.body.expedition;
    }
    await send({ type: 'launch', destination: 'safe' });
    assert.equal(state.run?.operation?.destination, 'safe');
    assert.equal(state.run?.operation?.order, 'gather');
    const beforeLocked = structuredClone(state);
    assert.equal((await f.post({ type: 'destination', destination: 'dangerous' }, state.revision)).status, 400);
    assert.deepEqual(f.read(), beforeLocked);
    for (let i = 0; i < 80 && !state.run?.operation?.paused; i++) { clock += 1000; await send({ type: 'sync' }); }
    assert.ok(state.run?.cargo.scrap, 'Safe destination must autonomously collect common resources');
    assert.equal(state.run?.operation?.paused, true, 'Player gets a clear continue-or-return decision after collection');
    const cargo = structuredClone(state.run.cargo), position = structuredClone(state.run.position);
    clock += 4000; await send({ type: 'sync' });
    assert.deepEqual(state.run?.cargo, cargo);
    assert.deepEqual(state.run?.position, position);
    await send({ type: 'destination', destination: 'medium' });
    assert.equal(state.run?.operation?.destination, 'medium');
    assert.equal(state.run?.operation?.paused, false);
    assert.equal(state.run?.operation?.order, 'gather');
    assert.deepEqual(state.run?.cargo, cargo);
    assert.deepEqual(f.read(), state);
    await send({ type: 'headHome' });
    for (let i = 0; i < 80 && state.run; i++) { clock += 1000; await send({ type: 'sync' }); }
    assert.equal(state.run, null, 'Return action autonomously traverses the world and banks');
    assert.deepEqual(state.resources, cargo);
    assert.equal(state.completedRuns, 1);
  } finally { await f.stop(); f.clean(); }
});

test('return from a paused operation banks exact cargo once, persists and retains existing upgrade costs', async t => {
  const f = await fixture(); let clock = 100000;
  t.mock.method(Date, 'now', () => clock);
  try {
    const initial = f.read();
    const launched = await f.post({ type: 'launch', destination: 'safe' }, initial.revision);
    assert.equal(launched.status, 200);
    let state = launched.body.expedition;
    assert.ok(state.run?.operation);
    state.resources = { scrap: 5, gpu: 3, cells: 4 };
    state.run.position = { ...state.run.operation.world.dock };
    state.run.cargo = { scrap: 6, gpu: 0, cells: 2 };
    state.run.operation.paused = true;
    f.save(state);
    const returning = await f.post({ type: 'headHome' }, state.revision);
    assert.equal(returning.status, 200);
    state = returning.body.expedition;
    assert.deepEqual((await f.post({ type: 'headHome' }, launched.body.expedition.revision, returning.requestId)).body, returning.body);
    if (state.run) {
      assert.equal(state.run.operation?.paused, false);
      clock += 1000;
      const banked = await f.post({ type: 'sync' }, state.revision);
      assert.equal(banked.status, 200); state = banked.body.expedition;
    }
    assert.equal(state.run, null);
    assert.deepEqual(state.resources, { scrap: 11, gpu: 3, cells: 6 });
    assert.deepEqual(state.lastResult?.resources, { scrap: 6, gpu: 0, cells: 2 });
    assert.equal(state.completedRuns, 1);
    assert.deepEqual(f.read(), state);
    const upgraded = await f.post({ type: 'upgrade' }, state.revision);
    assert.equal(upgraded.status, 200);
    assert.equal(upgraded.body.expedition.rigLevel, 1);
    assert.deepEqual(upgraded.body.expedition.resources, { scrap: 5, gpu: 3, cells: 4 });
    await f.stop();
    const reopened = new DatabaseSync(f.path);
    try { assert.deepEqual(readExpedition(reopened, 'destination-founder'), upgraded.body.expedition); }
    finally { reopened.close(); }
  } finally { await f.stop(); f.clean(); }
});

test('old autonomous saves accept destinations and retain collected cargo, energy and depleted deposits', async t => {
  const f = await fixture(); t.mock.method(Date, 'now', () => 100000);
  try {
    const original = f.read();
    const launched = await f.post({ type: 'launch' }, original.revision);
    assert.equal(launched.status, 200);
    const legacy = launched.body.expedition;
    assert.ok(legacy.run?.operation);
    delete legacy.run.operation.destination;
    legacy.run.operation.order = 'hold'; legacy.run.operation.paused = true;
    legacy.run.cargo = { scrap: 3, gpu: 0, cells: 1 };
    legacy.run.energy = 19; legacy.run.remaining['scrap-pile'] = 1;
    f.save(legacy);
    const response = await f.post({ type: 'destination', destination: 'medium' }, legacy.revision);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.expedition.run?.cargo, legacy.run.cargo);
    assert.equal(response.body.expedition.run?.energy, 19);
    assert.deepEqual(response.body.expedition.run?.remaining, legacy.run.remaining);
    assert.equal(response.body.expedition.run?.operation?.destination, 'medium');
    assert.equal(response.body.expedition.run?.operation?.paused, false);
    assert.deepEqual(response.body.expedition.resources, legacy.resources);
  } finally { await f.stop(); f.clean(); }
});

test('old tap-to-move saves adopt destination autonomy without losing cargo, energy or depleted deposits', async t => {
  const f = await fixture(); t.mock.method(Date, 'now', () => 100000);
  try {
    const original = f.read();
    const departed = await f.post({ type: 'depart' }, original.revision);
    assert.equal(departed.status, 200);
    const legacy = departed.body.expedition;
    assert.ok(legacy.run); assert.equal(legacy.run.operation, undefined);
    legacy.run.cargo = { scrap: 6, gpu: 0, cells: 1 }; legacy.run.energy = 17;
    legacy.run.remaining['scrap-pile'] = 0; legacy.resources = { scrap: 10, gpu: 2, cells: 4 };
    f.save(legacy);
    const adopted = await f.post({ type: 'destination', destination: 'medium' }, legacy.revision);
    assert.equal(adopted.status, 200, JSON.stringify(adopted.body));
    assert.deepEqual(adopted.body.expedition.run?.cargo, legacy.run.cargo);
    assert.equal(adopted.body.expedition.run?.energy, legacy.run.energy);
    assert.deepEqual(adopted.body.expedition.run?.remaining, legacy.run.remaining);
    assert.deepEqual(adopted.body.expedition.resources, legacy.resources);
    assert.equal(adopted.body.expedition.run?.operation?.destination, 'medium');
    assert.equal(adopted.body.expedition.run?.operation?.paused, false);
  } finally { await f.stop(); f.clean(); }
});
