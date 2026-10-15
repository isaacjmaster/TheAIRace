import type { AgentPlan, Allocation, Contract, GameState, Hardware, PlayerCommand, Projection } from '../../shared/contracts';

export const CONTRACTS: Contract[] = [
  { id: 'inbox', title: 'Tame the inbox', description: 'Sort customer messages into useful categories. Careful review improves accuracy.', baseReward: 80, difficulty: 0, privacyRequired: false },
  { id: 'summaries', title: 'Brief the team', description: 'Turn a busy project discussion into a reliable summary. Extra verification helps.', baseReward: 100, difficulty: 10, privacyRequired: false },
  { id: 'privacy', title: 'Clean the dataset', description: 'Prepare support records for training. Filter personal details before delivery.', baseReward: 120, difficulty: 15, privacyRequired: true },
];
export const HARDWARE: Hardware[] = [
  { level: 0, name: 'Garage laptop', cost: 0, capacity: 3, description: 'Three compute units. Small beginnings, big ideas.' },
  { level: 1, name: 'Neon workstation', cost: 90, capacity: 5, description: 'Five compute units and 20% faster work.' },
  { level: 2, name: 'Mini server rack', cost: 220, capacity: 7, description: 'Seven compute units and 35% faster work.' },
];

function object(value: unknown, keys: string[], label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key)) || keys.some(key => !Object.prototype.hasOwnProperty.call(value, key))) throw new Error(`Invalid ${label}.`);
}
function validatePlan(plan: AgentPlan): void {
  object(plan, ['strategy', 'checks', 'needsClarification', 'explanation'], 'agent plan');
  if (!['balanced', 'speed', 'accuracy'].includes(plan.strategy) || !Array.isArray(plan.checks) || plan.checks.length > 2 || new Set(plan.checks).size !== plan.checks.length || plan.checks.some(check => !['review_uncertain', 'privacy_filter'].includes(check)) || typeof plan.needsClarification !== 'boolean' || typeof plan.explanation !== 'string' || plan.explanation.length > 500) throw new Error('Invalid agent plan. Choose a supported strategy and checks.');
  if (plan.needsClarification) throw new Error('Clarify your instruction before starting the contract.');
}
function hardware(state: GameState): Hardware {
  const item = HARDWARE.find(entry => entry.level === state.hardwareLevel);
  if (!item) throw new Error('Unknown hardware level.');
  return item;
}
function validateAllocation(state: GameState, allocation: Allocation): void {
  object(allocation, ['execution', 'verification'], 'compute allocation');
  if (!Number.isInteger(allocation.execution) || !Number.isInteger(allocation.verification) || allocation.execution < 1 || allocation.verification < 0 || allocation.execution + allocation.verification > hardware(state).capacity) throw new Error('Allocate at least one execution unit and stay within your compute capacity.');
}
export function createInitialState(): GameState {
  return { version: 1, revision: 0, companyName: 'Garage Intelligence', credits: 20, hardwareLevel: 0, completedContracts: 0, activeJob: null, lastResult: null, claimedJobIds: [] };
}
export function projectContract(state: GameState, contractId: string, plan: AgentPlan, allocation: Allocation): Projection {
  const contract = CONTRACTS.find(item => item.id === contractId);
  if (!contract) throw new Error('Choose an available contract.');
  validatePlan(plan);
  validateAllocation(state, allocation);
  const strategyQuality = plan.strategy === 'accuracy' ? 12 : plan.strategy === 'speed' ? -8 : 0;
  const review = plan.checks.includes('review_uncertain');
  const privacy = plan.checks.includes('privacy_filter');
  const privacyPenalty = contract.privacyRequired && !privacy ? 30 : 0;
  const quality = Math.max(0, Math.min(100, 55 - contract.difficulty + allocation.execution * 4 + allocation.verification * 12 + strategyQuality + (review ? 8 : 0) - privacyPenalty));
  const strategyTime = plan.strategy === 'accuracy' ? 2 : plan.strategy === 'speed' ? -2 : 0;
  const durationSeconds = Math.max(3, Math.ceil((12 / allocation.execution + allocation.verification * 1.5 + strategyTime + (review ? 1 : 0) + (privacy ? 1 : 0)) * [1, 0.8, 0.65][state.hardwareLevel]));
  const credits = Math.max(20, Math.floor(contract.baseReward * quality / 100));
  return { quality, credits, durationSeconds, explanation: [
    `Quality: 55 base − ${contract.difficulty} difficulty + ${allocation.execution * 4} execution + ${allocation.verification * 12} verification ${strategyQuality < 0 ? '−' : '+'} ${Math.abs(strategyQuality)} strategy + ${review ? 8 : 0} review − ${privacyPenalty} privacy penalty; capped at 100.`,
    contract.privacyRequired ? (privacy ? 'Privacy filter protects the customer records.' : 'Missing privacy filtering costs 30 quality points.') : (privacy ? 'Privacy filtering adds one second of work.' : 'This contract does not require privacy filtering.'),
    `Reward: ${contract.baseReward} × ${quality}% quality = ${credits} credits (20-credit minimum).`,
    `Time: execution speed, verification and checks produce ${durationSeconds}s on your ${hardware(state).name.toLowerCase()}. Compute is reusable capacity, not currency.`,
  ] };
}
export function applyCommand(state: GameState, command: PlayerCommand, now = Date.now()): GameState {
  if (!Number.isFinite(now)) throw new Error('Invalid game clock.');
  if (!command || typeof command !== 'object') throw new Error('Invalid command.');
  const next: GameState = structuredClone(state);
  switch (command.type) {
    case 'rename': {
      object(command, ['type', 'name'], 'rename command');
      if (typeof command.name !== 'string' || command.name.trim().length < 1 || command.name.trim().length > 28 || /[\u0000-\u001f\u007f]/.test(command.name)) throw new Error('Use a company name between 1 and 28 characters.');
      next.companyName = command.name.trim();
      break;
    }
    case 'start': {
      object(command, ['type', 'contractId', 'plan', 'allocation'], 'start command');
      if (state.activeJob) throw new Error('Finish and collect your current contract first.');
      const projection = projectContract(state, command.contractId, command.plan, command.allocation);
      next.activeJob = { id: crypto.randomUUID(), contractId: command.contractId, startedAt: now, completesAt: now + projection.durationSeconds * 1000, plan: structuredClone(command.plan), allocation: { ...command.allocation } };
      break;
    }
    case 'claim': {
      object(command, ['type'], 'claim command');
      const job = state.activeJob;
      if (!job) throw new Error('No contract is ready to collect.');
      if (now < job.completesAt) throw new Error('Your agent is still working.');
      if (state.claimedJobIds.includes(job.id)) throw new Error('This contract was already collected.');
      const result = projectContract(state, job.contractId, job.plan, job.allocation);
      next.lastResult = { ...result, id: job.id, contractId: job.contractId, title: CONTRACTS.find(item => item.id === job.contractId)!.title };
      next.credits += result.credits;
      next.completedContracts += 1;
      next.claimedJobIds = [...state.claimedJobIds, job.id];
      next.activeJob = null;
      break;
    }
    case 'upgrade': {
      object(command, ['type'], 'upgrade command');
      if (state.activeJob) throw new Error('Collect your contract before changing hardware.');
      const upgrade = HARDWARE.find(item => item.level === state.hardwareLevel + 1);
      if (!upgrade) throw new Error('Your garage hardware is fully upgraded.');
      if (state.credits < upgrade.cost) throw new Error(`You need ${upgrade.cost - state.credits} more credits for this upgrade.`);
      next.credits -= upgrade.cost;
      next.hardwareLevel = upgrade.level;
      break;
    }
    default: throw new Error('Unknown game command.');
  }
  next.revision += 1;
  return next;
}
