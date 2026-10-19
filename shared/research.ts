import { advanceFoundation, validFoundationPosition, hasBuilderStation, type FoundationState, type RigPosition, type Orientation, type GpuRig } from './foundation';
export const RESEARCH = { capacity: 500, lab: { cost: 150, buildSeconds: 60, perMinute: 2, storage: 20, maxCount: 1 } } as const;
export type ResearchLab = GpuRig;
/** Additive defaults only; no legacy record or unrelated progression is replaced. */
export function advanceResearch(s: FoundationState, now: number) { s.research ??= 0; s.researchCapacity ??= RESEARCH.capacity; const l = s.lab; if (!l)
    return; const cursor = Math.max(l.completesAt, l.lastProducedAt); if (now > cursor) {
    l.stored = Math.min(RESEARCH.lab.storage, l.stored + (now - cursor) * RESEARCH.lab.perMinute / 60000);
    l.lastProducedAt = now;
} }
export function buildResearchLab(s: FoundationState, p: RigPosition, now: number, orientation: Orientation = 0) { advanceFoundation(s, now); if (s.lab)
    throw new Error('Research Lab — 1/1 Built'); if (!hasBuilderStation(s) || s.builders < 1)
    throw new Error('Place your Builder Station first.'); if (s.buildersBusy)
    throw new Error('Your Builder Bot is busy.'); const reason = validFoundationPosition(s, p, 'lab', orientation); if (reason)
    throw new Error(reason); if (s.compute < RESEARCH.lab.cost)
    throw new Error('You need 150 Compute.'); s.compute -= RESEARCH.lab.cost; s.lab = { position: [...p], orientation, startedAt: now, completesAt: now + RESEARCH.lab.buildSeconds * 1000, lastProducedAt: now + RESEARCH.lab.buildSeconds * 1000, stored: 0 }; s.buildersBusy = (s.buildersBusy || 0) + 1; }
export function collectResearch(s: FoundationState, now: number) { advanceFoundation(s, now); if (!s.lab || now < s.lab.completesAt)
    throw new Error('Your Research Lab is not ready.'); const amount = Math.min(Math.floor(s.lab.stored + 1e-9), Math.max(0, (s.researchCapacity ?? RESEARCH.capacity) - (s.research ?? 0))); s.lab.stored = Math.max(0, s.lab.stored - amount); s.research = (s.research ?? 0) + amount; return amount; }
