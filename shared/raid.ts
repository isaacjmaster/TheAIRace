import type { Kind, Point, Squad } from '../raid/engine';
export type Deployment = { step: number; kind: Kind; point: Point };
export type Transcript = { deployments: Deployment[]; steps: number; retreat: boolean };
export type RaidRun = { id: string; version?: number; layout: number; squad: Squad; power: number; rewardMultiplier?: number; healthPower?: number };
export function raidLoadout(state: { hardwareLevel: number; agentLevel?: number }) {
  const count = 2 + state.hardwareLevel;
  return { squad: { scout: count, tank: count, breaker: count }, power: 1 + (state.agentLevel || 0) * .15 };
}
