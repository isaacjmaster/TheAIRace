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
  const folder = mkdtempSync(join(process.cwd(), '.operation-test-'));
  const path = join(folder, 'test.sqlite');
  const db = new DatabaseSync(path);
  const game = createInitialState();
  const app = express(); app.use(express.json());
  registerExpeditions(app, db, () => ({ id: 'operation-founder', state: game }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  async function post(command: unknown, revision: number, requestId = randomUUID()) {
    const request = { requestId, revision, command };
    const response = await fetch(`${base}/api/expedition`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request),
    });
    return { status: response.status, body: await response.json() as { expedition: ExpeditionState; error?: string }, requestId };
  }
  let stopped = false;
  return { db, path, game, post, async stop() {
    if (stopped) return;
    stopped = true;
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); db.close();
  }, clean() {
    if (!resolve(folder).startsWith(resolve(process.cwd()) + sep) || !basename(folder).startsWith('.operation-test-')) throw new Error('Unexpected test directory');
    rmSync(folder, { recursive: true, force: true });
  } };
}

test('operation API advances from server time, freezes while paused, accepts revised orders and persists', async t => {
  const f = await fixture();
  let clock = 100000;
  t.mock.method(Date, 'now', () => clock);
  let state = readExpedition(f.db, 'operation-founder');
  const originalGame = structuredClone(f.game);
  async function send(command: unknown) {
    const response = await f.post(command, state.revision);
    assert.equal(response.status, 200, JSON.stringify(response.body));
    state = response.body.expedition;
    return response;
  }
  try {
    await send({ type: 'launch' });
    assert.equal(state.run?.operation?.version, 2);
    assert.equal(state.run?.operation?.tick, 0);
    const started = structuredClone(state.run);
    clock += 3000;
    await send({ type: 'sync' });
    assert.equal(state.run?.operation?.tick, 3);
    assert.notDeepEqual(state.run?.position, started?.position);
    await send({ type: 'pause', paused: true });
    const frozen = structuredClone(state.run);
    clock += 6000;
    await send({ type: 'sync' });
    assert.deepEqual(state.run, { ...frozen, operation: { ...frozen?.operation, lastTickAt: clock } });
    await send({ type: 'order', order: 'scout', risk: 'bold', focus: 'cells' });
    assert.equal(state.run?.operation?.order, 'scout');
    assert.equal(state.run?.operation?.paused, true);
    assert.equal(state.run?.operation?.focus, 'cells');
    await send({ type: 'pause', paused: false });
    clock += 2000;
    await send({ type: 'sync' });
    assert.equal(state.run?.operation?.tick, 5);
    assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM expedition_commands').get()?.count, 4, 'Only launch, pause, order and resume are cached; sync heartbeats add no rows');
    assert.deepEqual(readExpedition(f.db, 'operation-founder'), state);
    assert.deepEqual(f.game, originalGame);
    await f.stop();
    const reopened = new DatabaseSync(f.path);
    try { assert.deepEqual(readExpedition(reopened, 'operation-founder'), state); }
    finally { reopened.close(); }
  } finally { await f.stop(); f.clean(); }
});

test('operation API rejects forged simulation values, stale commands, legacy movement and active contracts', async t => {
  const f = await fixture();
  t.mock.method(Date, 'now', () => 100000);
  try {
    const original = readExpedition(f.db, 'operation-founder');
    for (const command of [
      { type: 'launch', seed: 42 }, { type: 'launch', resources: { scrap: 999 } },
      { type: 'sync', now: 9999999 }, { type: 'sync', elapsed: 3600 },
      { type: 'order', order: 'teleport' }, { type: 'order', order: 'gather', risk: 'invincible' },
      { type: 'order', order: 'gather', focus: 'credits' }, { type: 'pause', paused: 'true' },
    ]) assert.equal((await f.post(command, original.revision)).status, 400);
    assert.deepEqual(readExpedition(f.db, 'operation-founder'), original);
    f.game.activeJob = { id: 'job', contractId: 'inbox', startedAt: 0, completesAt: 999999, plan: { strategy: 'balanced', checks: [], needsClarification: false, explanation: '' }, allocation: { execution: 1, verification: 1 } };
    const conflict = await f.post({ type: 'launch' }, 0);
    assert.equal(conflict.status, 400); assert.match(conflict.body.error!, /contract/i);
    f.game.activeJob = null;
    const launch = await f.post({ type: 'launch' }, 0);
    assert.equal(launch.status, 200);
    const state = launch.body.expedition;
    assert.deepEqual((await f.post({ type: 'launch' }, 0, launch.requestId)).body, launch.body);
    assert.equal((await f.post({ type: 'sync' }, 0)).status, 409);
    for (const command of [
      { type: 'move', to: { x: 0, y: 4 } }, { type: 'gather', depositId: 'scrap-pile' },
      { type: 'recharge' }, { type: 'return' }, { type: 'depart' },
    ]) assert.equal((await f.post(command, state.revision)).status, 400);
    assert.deepEqual(readExpedition(f.db, 'operation-founder'), state);
  } finally { await f.stop(); f.clean(); }
});

test('safe autonomous return banks cargo exactly once even when request is retried', async t => {
  const f = await fixture();
  let clock = 100000;
  t.mock.method(Date, 'now', () => clock);
  try {
    readExpedition(f.db, 'operation-founder');
    const launch = await f.post({ type: 'launch' }, 0);
    assert.equal(launch.status, 200);
    const state = launch.body.expedition;
    assert.ok(state.run?.operation);
    // Isolate the return transaction from pathfinding (covered by engine tests).
    state.run.position = { ...state.run.operation.world.dock };
    state.run.cargo = { scrap: 6, gpu: 0, cells: 2 };
    f.db.prepare('UPDATE expedition_state SET state=? WHERE session=?').run(JSON.stringify(state), 'operation-founder');
    const ordered = await f.post({ type: 'order', order: 'return' }, state.revision);
    assert.equal(ordered.status, 200);
    clock += 1000;
    const returned = await f.post({ type: 'sync' }, ordered.body.expedition.revision);
    assert.equal(returned.status, 200);
    assert.equal(returned.body.expedition.run, null);
    assert.deepEqual(returned.body.expedition.resources, { scrap: 6, gpu: 0, cells: 2 });
    assert.equal(returned.body.expedition.completedRuns, 1);
    const retry = await f.post({ type: 'sync' }, ordered.body.expedition.revision, returned.requestId);
    assert.equal(retry.status, 409);
    assert.deepEqual(readExpedition(f.db, 'operation-founder'), returned.body.expedition);
    const upgrade = await f.post({ type: 'upgrade' }, returned.body.expedition.revision);
    assert.equal(upgrade.status, 200);
    assert.equal(upgrade.body.expedition.rigLevel, 1);
    assert.deepEqual(upgrade.body.expedition.resources, { scrap: 0, gpu: 0, cells: 0 });
  } finally { await f.stop(); f.clean(); }
});
