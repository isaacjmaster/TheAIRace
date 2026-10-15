import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { join, resolve, sep, basename } from 'node:path';
import { createInitialState } from '../src/game/index.js';
import type { ExpeditionCommand, ExpeditionState } from '../shared/expedition.js';
import { readExpedition, registerExpeditions } from './expedition-api.js';

async function fixture() {
  // Keep test artifacts inside the project; never touch the user's real save.
  const folder = mkdtempSync(join(process.cwd(), '.expedition-test-'));
  const path = join(folder, 'test.sqlite');
  const db = new DatabaseSync(path);
  const game = createInitialState();
  const app = express();
  app.use(express.json());
  registerExpeditions(app, db, () => ({ id: 'test-founder', state: game }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  async function post(input: unknown) {
    const response = await fetch(`${base}/api/expedition`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input),
    });
    return { status: response.status, body: await response.json() as { expedition: ExpeditionState; error?: string } };
  }
  return { db, path, game, post, async stop() { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); db.close(); }, clean() { if(!resolve(folder).startsWith(resolve(process.cwd())+sep)||!basename(folder).startsWith('.expedition-test-'))throw new Error('Unexpected test directory'); rmSync(folder, { recursive: true, force: true }); } };
}

test('expedition API banks, upgrades and persists without changing legacy company state', async t => {
  const f = await fixture();
  let clock = 100000;
  t.mock.method(Date, 'now', () => clock);
  let state = readExpedition(f.db, 'test-founder');
  const initialGame = structuredClone(f.game);
  let returnRequest: unknown;
  let returnResponse: unknown;
  async function command(command: ExpeditionCommand) {
    clock += 10000;
    const request = { requestId: randomUUID(), revision: state.revision, command };
    const response = await f.post(request);
    assert.equal(response.status, 200, JSON.stringify(response.body));
    state = response.body.expedition;
    return { request, response };
  }
  try {
    assert.deepEqual(state.resources, { scrap: 0, gpu: 0, cells: 0 });
    await command({ type: 'depart' });
    await command({ type: 'move', to: { x: 0, y: 4 } });
    await command({ type: 'gather', depositId: 'scrap-pile' });
    await command({ type: 'gather', depositId: 'scrap-pile' });
    await command({ type: 'move', to: { x: 0, y: 2 } });
    await command({ type: 'move', to: { x: 1, y: 2 } });
    await command({ type: 'gather', depositId: 'cell-cache' });
    await command({ type: 'gather', depositId: 'cell-cache' });
    assert.deepEqual(state.resources, { scrap: 0, gpu: 0, cells: 0 });
    await command({ type: 'move', to: { x: 0, y: 2 } });
    await command({ type: 'move', to: { x: 0, y: 5 } });
    const returned = await command({ type: 'return' });
    returnRequest = returned.request; returnResponse = returned.response.body;
    assert.deepEqual(state.resources, { scrap: 6, gpu: 0, cells: 2 });
    assert.deepEqual((await f.post(returnRequest)).body, returnResponse);
    assert.deepEqual(readExpedition(f.db, 'test-founder'), state);
    await command({ type: 'upgrade' });
    assert.equal(state.rigLevel, 1);
    assert.deepEqual(state.resources, { scrap: 0, gpu: 0, cells: 0 });
    await command({ type: 'depart' });
    assert.equal(state.run?.energy, 40);
    await command({ type: 'move', to: { x: 5, y: 4 } });
    assert.equal(state.run?.position.x, 5);
    assert.deepEqual(f.game, initialGame);
    await f.stop();
    const reopened = new DatabaseSync(f.path);
    try {
      assert.deepEqual(readExpedition(reopened, 'test-founder'), state);
      const cached = reopened.prepare('SELECT response FROM expedition_commands WHERE session=? AND id=?').get('test-founder', (returnRequest as { requestId: string }).requestId);
      assert.ok(cached);
      assert.deepEqual(JSON.parse(cached.response as string), returnResponse);
    } finally { reopened.close(); }
  } catch (error) { await f.stop(); throw error; }
  finally { f.clean(); }
});

test('expedition API rejects stale revisions, forged resources, invalid coordinates, cooldowns and contract conflicts', async t => {
  const f = await fixture();
  t.mock.method(Date, 'now', () => 100000);
  const input = (command: unknown, revision = 0) => ({ requestId: randomUUID(), revision, command });
  try {
    const initial = readExpedition(f.db, 'test-founder');
    for (const command of [
      { type: 'depart', resources: { scrap: 999 } },
      { type: 'move', to: { x: 7, y: 0 } },
      { type: 'move', to: { x: 1.5, y: 0 } },
      { type: 'move', to: { x: 0, y: 0, energy: 999 } },
      { type: 'hack' },
    ]) assert.equal((await f.post(input(command))).status, 400);
    assert.equal((await f.post({ ...input({ type: 'depart' }), requestId: 'invalid' })).status, 400);
    assert.deepEqual(readExpedition(f.db, 'test-founder'), initial);
    f.game.activeJob = { id: 'job', contractId: 'inbox', startedAt: 0, completesAt: 999999, plan: { strategy: 'balanced', checks: [], needsClarification: false, explanation: '' }, allocation: { execution: 1, verification: 1 } };
    const conflict = await f.post(input({ type: 'depart' }));
    assert.equal(conflict.status, 400); assert.match(conflict.body.error!, /contract/i);
    f.game.activeJob = null;
    const depart = input({ type: 'depart' });
    const response = await f.post(depart);
    assert.equal(response.status, 200);
    assert.deepEqual((await f.post(depart)).body, response.body);
    assert.equal((await f.post(input({ type: 'evacuate' }, 0))).status, 409);
    const move = await f.post(input({ type: 'move', to: { x: 0, y: 4 } }, 1));
    assert.equal(move.status, 200);
    const cooldown = await f.post(input({ type: 'gather', depositId: 'scrap-pile' }, 2));
    assert.equal(cooldown.status, 400); assert.match(cooldown.body.error!, /still moving|collecting/i);
    assert.deepEqual(readExpedition(f.db, 'test-founder'), move.body.expedition);
    assert.equal((await f.post(input({ type: 'evacuate' }, 2))).status, 200);
  } finally { await f.stop(); f.clean(); }
});
