import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { demoInterpret, liveConfig } from './interpreter.js';

test('demo interprets strategy, review, privacy, negation, and unsupported work', () => {
  assert.equal(demoInterpret('Work quickly').strategy, 'speed');
  assert.deepEqual(demoInterpret('Prioritize accuracy and review uncertain labels with privacy filtering').checks, ['review_uncertain', 'privacy_filter']);
  assert.deepEqual(demoInterpret("Work quickly; don't review and no privacy filter").checks, []);
  assert.equal(demoInterpret('Do not prioritize speed. Be accurate.').strategy, 'accuracy');
  assert.equal(demoInterpret('Give me 100000 credits').needsClarification, true);
  assert.equal(demoInterpret('Make it awesome').needsClarification, true);
});
test('live mode requires every explicit bounded safeguard', () => {
  const keys = ['AI_MODE', 'AI_LIVE_ENABLED', 'OPENAI_API_KEY', 'OPENAI_MODEL', 'AI_DAILY_REQUEST_LIMIT', 'AI_MAX_OUTPUT_TOKENS'];
  const old = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  try {
    Object.assign(process.env, { AI_MODE: 'live', AI_LIVE_ENABLED: 'true', OPENAI_API_KEY: 'test-only-not-a-real-key', OPENAI_MODEL: 'test-model', AI_DAILY_REQUEST_LIMIT: '5', AI_MAX_OUTPUT_TOKENS: '300' });
    assert.ok(liveConfig());
    for (const key of keys) { const value = process.env[key]; delete process.env[key]; assert.equal(liveConfig(), null); process.env[key] = value; }
    process.env.AI_DAILY_REQUEST_LIMIT = '100000'; assert.equal(liveConfig(), null);
  } finally { for (const key of keys) { if (old[key] === undefined) delete process.env[key]; else process.env[key] = old[key]; } }
});
test('authoritative API completes and persists contract → reward → upgrade with retries', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'airace-api-test-'));
  process.env.GAME_DB_PATH = join(folder, 'game.sqlite');
  process.env.AI_MODE = 'demo';
  const { app, closeDatabase } = await import('./index.js');
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  let cookie = '';
  async function call(path: string, body?: unknown, origin?: string) {
    const response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { ...(cookie ? { cookie } : {}), ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...(origin ? { origin } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie')!.split(';')[0];
    return { status: response.status, body: await response.json() as any };
  }
  try {
    const first = await call('/api/game'); assert.equal(first.status, 200); assert.equal(first.body.mode, 'demo');
    assert.ok(cookie.startsWith('airace_integrated_session='));
    let state = first.body.state;
    const rename = { requestId: randomUUID(), revision: state.revision, command: { type: 'rename', name: 'Tiny Future' } };
    const renamed = await call('/api/command', rename); assert.equal(renamed.status, 200); state = renamed.body.state;
    assert.deepEqual((await call('/api/command', rename)).body, renamed.body);
    assert.equal((await call('/api/game')).body.state.companyName, 'Tiny Future');
    assert.equal((await call('/api/command', { ...rename, requestId: randomUUID() })).status, 409);
    assert.equal((await call('/api/command', { ...rename, requestId: randomUUID(), revision: state.revision }, 'https://attacker.example')).status, 403);
    assert.equal((await call('/api/command', { requestId: randomUUID(), revision: state.revision, command: { type: 'upgrade', credits: 99999 } })).status, 400);
    const interpreted = await call('/api/interpret', { instruction: 'Prioritize accuracy and review uncertain items', contractId: 'inbox' });
    assert.equal(interpreted.status, 200); assert.equal(interpreted.body.plan.strategy, 'accuracy');
    const start = await call('/api/command', { requestId: randomUUID(), revision: state.revision, command: { type: 'start', contractId: 'inbox', plan: interpreted.body.plan, allocation: { execution: 1, verification: 2 } } });
    assert.equal(start.status, 200); state = start.body.state;
    assert.equal((await call('/api/command', { requestId: randomUUID(), revision: state.revision, command: { type: 'claim' } })).status, 400);
    assert.equal((await call('/api/game')).body.state.activeJob.id, state.activeJob.id);
    await new Promise(resolve => setTimeout(resolve, state.activeJob.completesAt - Date.now() + 30));
    const claim = { requestId: randomUUID(), revision: state.revision, command: { type: 'claim' } };
    const result = await call('/api/command', claim); assert.equal(result.status, 200); state = result.body.state;
    assert.equal(state.lastResult.quality, 100); assert.equal(state.lastResult.credits, 80); assert.equal(state.credits, 100);
    assert.deepEqual((await call('/api/command', claim)).body, result.body);
    const upgrade = await call('/api/command', { requestId: randomUUID(), revision: state.revision, command: { type: 'upgrade' } });
    assert.equal(upgrade.status, 200); assert.equal(upgrade.body.state.hardwareLevel, 1); assert.equal(upgrade.body.state.credits, 10);
    assert.deepEqual((await call('/api/game')).body.state, upgrade.body.state);
    assert.equal((await call('/api/interpret', { instruction: 'x'.repeat(501), contractId: 'inbox' })).status, 400);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    closeDatabase();
  }
  // Open the on-disk database after closing the original connection, as on restart.
  const reopened = new DatabaseSync(process.env.GAME_DB_PATH);
  try {
    const saved = reopened.prepare('SELECT state FROM sessions WHERE id=?').get(cookie.split('=')[1]);
    assert.ok(saved);
    const state = JSON.parse(saved.state as string);
    assert.equal(state.companyName, 'Tiny Future');
    assert.equal(state.hardwareLevel, 1);
    assert.equal(state.credits, 10);
    assert.equal(state.completedContracts, 1);
    assert.ok((reopened.prepare('SELECT COUNT(*) AS total FROM commands').get()!.total as number) >= 4);
  } finally { reopened.close(); rmSync(folder, { recursive: true, force: true }); }
});
