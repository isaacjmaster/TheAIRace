import type { GameState, Onboarding } from '../../shared/contracts';
export function shouldShowStory(onboarding?: Onboarding): boolean {
  return onboarding?.isNewPlayer === true && !onboarding.storySeen;
}
export type GuideStep = 'welcome'|'pick'|'precision'|'deploy'|'working'|'collect'|'upgrades'|'buy'|'complete';
export function guideStep(state: GameState, screen: string, selected: string|null, precision: boolean): GuideStep {
  if (state.hardwareLevel >= 1) return 'complete';
  if (state.activeJob) return Date.now() < state.activeJob.completesAt ? 'working' : 'collect';
  if (state.completedContracts > 0 && state.credits >= 90) return screen === 'Upgrades' ? 'buy' : 'upgrades';
  if (screen !== 'Missions') return 'welcome';
  if (selected !== 'inbox') return 'pick';
  return precision ? 'deploy' : 'precision';
}
export const guideDialogue: Record<GuideStep, string> = {
  welcome: 'Welcome, founder! I’m Pixel. Let’s earn credits on one mission, then upgrade our laptop.',
  pick: 'Start with “Tame the inbox.” A small mission with a big first payoff.',
  precision: 'Choose Precision. I’ll double-check my work for a stronger reward.',
  deploy: 'Precision predicts 76 credits on our laptop. Tap Deploy Pixel and I’ll get to work!',
  working: 'On it! This only takes a few seconds. Your credits are safe while I work.',
  collect: 'All done! Collect your reward so we can power up the garage.',
  upgrades: 'We’ve earned our upgrade! Open Upgrades to find the Neon workstation.',
  buy: 'Install the Neon workstation for 90 credits. More compute, faster missions!',
  complete: 'We did it! Our new workstation has more compute and works faster. You’re ready to lead.',
};
