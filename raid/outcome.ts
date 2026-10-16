import { destruction, rewards, type Kind, type Raid } from './engine';

/** Immutable handoff to a host app; this module never writes company progression. */
export type RaidOutcome = Readonly<{
  layout: number; victory: boolean; reason: string; elapsed: number; destruction: number;
  rewards: Readonly<{ compute: number; credits: number }>;
  damage: Readonly<Record<Kind, number>>; agentsLost: number;
}>;
export function summarizeRaid(s: Raid): RaidOutcome {
  if (!s.ended) throw new Error('Cannot collect an unfinished raid');
  return Object.freeze({ layout: s.layout, victory: s.reason === 'Network cleared', reason: s.reason,
    elapsed: s.time, destruction: destruction(s), rewards: Object.freeze(rewards(s)), damage: Object.freeze({ ...s.damage }), agentsLost: s.lost });
}
