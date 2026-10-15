import type express from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import type { GameState } from '../shared/contracts.js';
import type { ExpeditionState } from '../shared/expedition.js';
import { applyExpeditionCommand, createExpeditionState, expeditionCommandSchema } from '../src/game/expedition.js';

function prepareTables(db: DatabaseSync) {
  db.exec('CREATE TABLE IF NOT EXISTS expedition_state (session TEXT PRIMARY KEY, state TEXT NOT NULL); CREATE TABLE IF NOT EXISTS expedition_commands (session TEXT NOT NULL, id TEXT NOT NULL, response TEXT NOT NULL, PRIMARY KEY(session,id));');
}

/** Separate metadata keeps legacy company saves and contract economics untouched. */
export function readExpedition(db: DatabaseSync, id: string): ExpeditionState {
  prepareTables(db);
  const row = db.prepare('SELECT state FROM expedition_state WHERE session=?').get(id);
  if (row) return JSON.parse(row.state as string) as ExpeditionState;
  const state = createExpeditionState();
  db.prepare('INSERT INTO expedition_state(session,state) VALUES (?,?)').run(id, JSON.stringify(state));
  return state;
}

const requestSchema = z.object({
  requestId: z.string().uuid(),
  revision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  command: expeditionCommandSchema,
}).strict();

export function registerExpeditions(
  app: express.Express,
  db: DatabaseSync,
  getSession: (req: express.Request, res: express.Response) => { id: string; state: GameState },
) {
  prepareTables(db);
  app.post('/api/expedition', (req, res) => {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Invalid expedition command.' }); return; }
    const player = getSession(req, res);
    const input = parsed.data;
    db.exec('BEGIN IMMEDIATE');
    try {
      // Deduplicate before revision checks: retrying a successful return cannot bank twice.
      const cached = db.prepare('SELECT response FROM expedition_commands WHERE session=? AND id=?').get(player.id, input.requestId);
      if (cached) { db.exec('COMMIT'); res.json(JSON.parse(cached.response as string)); return; }
      const state = readExpedition(db, player.id);
      if (input.revision !== state.revision) {
        db.exec('ROLLBACK');
        res.status(409).json({ error: 'Your expedition changed. Refresh and try again.' });
        return;
      }
      if ((input.command.type === 'depart' || input.command.type === 'launch') && player.state.activeJob) throw new Error('Pixel is working on a contract. Claim its result before departing.');
      const next = applyExpeditionCommand(state, input.command, Date.now());
      const response = { expedition: next };
      db.prepare('UPDATE expedition_state SET state=? WHERE session=?').run(JSON.stringify(next), player.id);
      // Heartbeats need revision protection, but not permanent response snapshots.
      // A retried sync gets a stale-revision response and refreshes current state.
      if (input.command.type !== 'sync') db.prepare('INSERT INTO expedition_commands(session,id,response) VALUES (?,?,?)').run(player.id, input.requestId, JSON.stringify(response));
      db.exec('COMMIT');
      res.json(response);
    } catch (error) {
      db.exec('ROLLBACK');
      res.status(400).json({ error: error instanceof Error ? error.message : 'Expedition action could not be completed.' });
    }
  });
}
