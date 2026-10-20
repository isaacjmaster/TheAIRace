import type { DatabaseSync } from 'node:sqlite';
import type { FoundationState } from '../shared/foundation';
import {settleOwnedUnit} from '../shared/infiltration-army';
import { INFILTRATION } from '../shared/infiltration';
/** Caller owns BEGIN IMMEDIATE, including the state write and action receipt. */
export function infiltrationStore(db: DatabaseSync) {
    db.exec(`CREATE TABLE IF NOT EXISTS infiltration_results(operation_id TEXT PRIMARY KEY,company_id TEXT NOT NULL REFERENCES company_players(id),target_id TEXT NOT NULL,finished_at INTEGER NOT NULL,status TEXT NOT NULL,compute INTEGER NOT NULL,research INTEGER NOT NULL,influence INTEGER NOT NULL,log TEXT NOT NULL);CREATE TABLE IF NOT EXISTS infiltration_cooldowns(company_id TEXT NOT NULL REFERENCES company_players(id),target_id TEXT NOT NULL,eligible_at INTEGER NOT NULL,PRIMARY KEY(company_id,target_id));`);
    const eligible = (company: string, target: string) => Number(db.prepare('SELECT eligible_at FROM infiltration_cooldowns WHERE company_id=? AND target_id=?').get(company, target)?.eligible_at || 0);
    function settle(company: string, s: FoundationState, now: number) { settleOwnedUnit(s);const o = s.infiltration; if (!o || o.status === 'active' || o.status === 'ready' || o.settlement)
        return; if (db.prepare('SELECT operation_id FROM infiltration_results WHERE operation_id=?').get(o.id))
        throw new Error('Operation receipt exists without its saved settlement.'); const success = o.status === 'extracted' && o.hacked.length > 0; const compute = success ? o.carried.compute : 0, research = success ? o.carried.research : 0; let next = eligible(company, o.target.id), influence = 0; const at = o.finishedAt!; if (success && at >= next) {
        influence = o.target.influence;
        next = at + INFILTRATION.cooldownMs;
        db.prepare('INSERT INTO company_influence VALUES(?,?) ON CONFLICT(company_id) DO UPDATE SET total=total+excluded.total').run(company, influence);
        db.prepare('INSERT INTO infiltration_cooldowns VALUES(?,?,?) ON CONFLICT(company_id,target_id) DO UPDATE SET eligible_at=excluded.eligible_at').run(company, o.target.id, next);
    } s.infiltrationReserve ??= { compute: 0, research: 0 }; s.infiltrationReserve.compute += compute; s.infiltrationReserve.research += research; releaseReserve(s); o.settlement = { compute, research, influence, eligibleAt: next, pendingCompute: s.infiltrationReserve.compute, pendingResearch: s.infiltrationReserve.research }; db.prepare('INSERT INTO infiltration_results VALUES(?,?,?,?,?,?,?,?,?)').run(o.id, company, o.target.id, at, o.status, compute, research, influence, JSON.stringify({ version: 2, target: o.target, automationVersion:o.automationVersion,defenseVersion:o.defenseVersion, createdAt: o.createdAt, orders: o.orders, events: o.events })); }
    return { settle, eligible };
}
export function releaseReserve(s: FoundationState) { const r = s.infiltrationReserve; if (!r)
    return; const c = Math.min(r.compute, Math.max(0, s.capacity - s.compute)), v = Math.min(r.research, Math.max(0, (s.researchCapacity ?? 500) - (s.research ?? 0))); s.compute += c; s.research = (s.research ?? 0) + v; r.compute -= c; r.research -= v; }
