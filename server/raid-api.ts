import type express from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { GameState } from '../shared/contracts';
import { raidLoadout, type RaidRun } from '../shared/raid';
import { replayRaid } from './raid-replay';
const transcript = z.object({ steps: z.number().int().min(0).max(1801), retreat: z.boolean(), deployments: z.array(z.object({ step: z.number().int().min(0).max(1801), kind: z.enum(['scout','tank','breaker']), point: z.object({x:z.number().finite(),y:z.number().finite()}).strict() }).strict()).max(12) }).strict();
export function registerRaids(app: express.Express, db: DatabaseSync, session: (req: express.Request,res: express.Response)=>{id:string;state:GameState}) {
 db.exec('CREATE TABLE IF NOT EXISTS raids (id TEXT PRIMARY KEY, session TEXT NOT NULL, run TEXT NOT NULL, outcome TEXT); CREATE UNIQUE INDEX IF NOT EXISTS active_raid ON raids(session) WHERE outcome IS NULL;');
 app.post('/api/raid/start', (req,res)=>{
  const input=z.object({layout:z.number().int().min(0).max(1)}).strict().safeParse(req.body);
  if(!input.success){res.status(400).json({error:'Choose a raid.'});return;}
  const player=session(req,res);
  const active=db.prepare('SELECT run FROM raids WHERE session=? AND outcome IS NULL').get(player.id);
  if(active){res.json({run:JSON.parse(active.run as string)});return;}
  const run: RaidRun={id:randomUUID(),layout:Number(db.prepare('SELECT COUNT(*) AS n FROM raids WHERE session=? AND outcome IS NOT NULL').get(player.id)!.n)%2,...raidLoadout(player.state)};
  db.prepare('INSERT INTO raids(id,session,run) VALUES (?,?,?)').run(run.id,player.id,JSON.stringify(run));res.json({run});
 });
 app.post('/api/raid/claim',(req,res)=>{
  const input=z.object({id:z.string().uuid(),log:transcript}).strict().safeParse(req.body);
  if(!input.success){res.status(400).json({error:'Invalid raid record.'});return;}
  const player=session(req,res);db.exec('BEGIN IMMEDIATE');
  try {
   const row=db.prepare('SELECT run,outcome FROM raids WHERE id=? AND session=?').get(input.data.id,player.id);
   if(!row) throw new Error('Unknown raid.');
   const outcome=row.outcome?JSON.parse(row.outcome as string):replayRaid(JSON.parse(row.run as string),input.data.log);
   const state:GameState=JSON.parse(db.prepare('SELECT state FROM sessions WHERE id=?').get(player.id)!.state as string);
   if(!row.outcome){state.credits+=outcome.rewards.credits;state.raidCompute=(state.raidCompute||0)+outcome.rewards.compute;state.revision++;
    db.prepare('UPDATE sessions SET state=? WHERE id=?').run(JSON.stringify(state),player.id);
    db.prepare('UPDATE raids SET outcome=? WHERE id=?').run(JSON.stringify(outcome),input.data.id);
   }
   db.exec('COMMIT');res.json({state,outcome});
  }catch(e){db.exec('ROLLBACK');res.status(400).json({error:(e as Error).message});}
 });
}
