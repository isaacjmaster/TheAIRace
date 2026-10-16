import { createRaid, deploy, tick, finish } from '../raid/engine';
import { summarizeRaid } from '../raid/outcome';
import type { RaidRun, Transcript } from '../shared/raid';
export function replayRaid(run: RaidRun, log: Transcript) {
  const s = createRaid(run.layout, run.squad, run.power, run.healthPower);
  let index = 0;
  for (let step = 0; step <= log.steps; step++) {
    while (index < log.deployments.length && log.deployments[index].step === step) {
      const d = log.deployments[index++];
      if (!deploy(s, d.kind, d.point)) throw new Error('Invalid deployment.');
    }
    if (step < log.steps) { if (s.ended) throw new Error('Raid already ended.'); tick(s); }
  }
  if (index !== log.deployments.length) throw new Error('Invalid deployment order.');
  if (log.retreat && !s.ended) finish(s, 'Retreated');
  return summarizeRaid(s);
}
