import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCommand, CONTRACTS, createInitialState, HARDWARE, projectContract } from '../src/game/index.js';
import type { AgentPlan } from '../shared/contracts.js';

const plan: AgentPlan = { strategy: 'balanced', checks: [], needsClarification: false, explanation: 'Complete the job.' };
const allocation = { execution: 1, verification: 0 };

test('required privacy filtering prevents the documented quality penalty', () => {
  const state = createInitialState();
  const contract = CONTRACTS.find(item => item.privacyRequired)!;
  const unfiltered = projectContract(state, contract.id, plan, allocation);
  const filtered = projectContract(state, contract.id, { ...plan, checks: ['privacy_filter'] }, allocation);
  assert.equal(filtered.quality - unfiltered.quality, 30);
  assert.ok(filtered.credits > unfiltered.credits);
  assert.equal(filtered.durationSeconds, unfiltered.durationSeconds + 1);
});

test('hardware speeds identical work and unlocks larger legal allocations', () => {
  const initial = { ...createInitialState(), credits: HARDWARE[1].cost };
  const upgraded = applyCommand(initial, { type: 'upgrade' });
  const id = CONTRACTS[0].id;
  const before = projectContract(initial, id, plan, allocation);
  const after = projectContract(upgraded, id, plan, allocation);
  assert.equal(after.quality, before.quality);
  assert.equal(after.credits, before.credits);
  assert.ok(after.durationSeconds < before.durationSeconds);
  const larger = { execution: HARDWARE[0].capacity + 1, verification: 0 };
  assert.throws(() => projectContract(initial, id, plan, larger), /capacity/);
  assert.doesNotThrow(() => projectContract(upgraded, id, plan, larger));
});

test('duplicated checks and unresolved instructions cannot start jobs', () => {
  const state = createInitialState();
  for (const invalid of [
    { ...plan, checks: ['review_uncertain', 'review_uncertain'] } as AgentPlan,
    { ...plan, needsClarification: true },
  ]) {
    assert.throws(() => applyCommand(state, { type: 'start', contractId: CONTRACTS[0].id, plan: invalid, allocation }, 1000));
    assert.equal(state.activeJob, null);
    assert.equal(state.revision, 0);
  }
});

test('hardware cannot change while a contract outcome is pending', () => {
  const funded = { ...createInitialState(), credits: 1000 };
  const running = applyCommand(funded, { type: 'start', contractId: CONTRACTS[0].id, plan, allocation }, 1000);
  assert.throws(() => applyCommand(running, { type: 'upgrade' }, running.activeJob!.completesAt + 1), /Collect/);
  assert.equal(running.hardwareLevel, 0);
  assert.equal(running.credits, 1000);
});

test('commands preserve prior states and do not retain mutable plan references', () => {
  const initial = createInitialState();
  const initialSnapshot = structuredClone(initial);
  const supplied: AgentPlan = { ...plan, checks: ['review_uncertain'] };
  const suppliedAllocation = { ...allocation };
  const running = applyCommand(initial, { type: 'start', contractId: CONTRACTS[0].id, plan: supplied, allocation: suppliedAllocation }, 1000);
  const runningSnapshot = structuredClone(running);
  supplied.checks.length = 0;
  suppliedAllocation.execution = 99;
  assert.deepEqual(initial, initialSnapshot);
  assert.deepEqual(running, runningSnapshot);
  const claimed = applyCommand(running, { type: 'claim' }, running.activeJob!.completesAt);
  assert.deepEqual(running, runningSnapshot);
  assert.equal(claimed.revision, running.revision + 1);
  assert.notEqual(claimed.claimedJobIds, running.claimedJobIds);
  assert.equal(claimed.activeJob, null);
});
