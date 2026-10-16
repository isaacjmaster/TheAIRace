import type express from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { GameState } from '../shared/contracts';
import { raidLoadout, type RaidRun } from '../shared/raid';
import { advanceCampus, campusEffects, unlockedAgents } from '../shared/progression';
import { LEVELS, raidLevel } from '../raid/level';
import type { Squad } from '../raid/engine';
import { replayRaid } from './raid-replay';
const transcript = z.object({ steps: z.number().int().min(0).max(1801), retreat: z.boolean(), deployments: z.array(z.object({ step: z.number().int().min(0).max(1801), kind: z.enum(['scout','tank','breaker','striker','medic','disruptor']), point: z.object({x:z.number().finite(),y:z.number().finite()}).strict() }).strict()).max(24) }).strict();
function rewardMultiplier(state:GameState,layout:number){
 if(!state.campus)return 1;
 const paid=state.campus.raidClaims?.[String(layout)]||0;
 return Math.max(.1,Math.pow(.6,paid))*(state.campus.hq>LEVELS[layout].level+2?.5:1);
}
export function registerRaids(app: express.Express, db: DatabaseSync, session: (req: express.Request,res: express.Response)=>{id:string;state:GameState}) {
 db.exec('CREATE TABLE IF NOT EXISTS raids (id TEXT PRIMARY KEY, session TEXT NOT NULL, run TEXT NOT NULL, outcome TEXT); CREATE UNIQUE INDEX IF NOT EXISTS active_raid ON raids(session) WHERE outcome IS NULL;');
 app.get('/api/raid/networks',(req,res)=>{
  const player=session(req,res), state=player.state;
  if(state.campus){advanceCampus(state,Date.now());state.revision++;db.prepare('UPDATE sessions SET state=? WHERE id=?').run(JSON.stringify(state),player.id);}
  const active=db.prepare('SELECT run FROM raids WHERE session=? AND outcome IS NULL').get(player.id);
  res.json({state,active:active?JSON.parse(active.run as string):null,networks:LEVELS.map((level,index)=>({layout:index,name:level.name,tactic:raidLevel(index,2).tactic,requiredHQ:level.level,unlocked:state.campus?level.level<=state.campus.hq:index<2,wins:state.campus?.raidWins[String(index)]||0,claims:state.campus?.raidClaims?.[String(index)]||0,multiplier:rewardMultiplier(state,index)}))});
 });
 app.post('/api/raid/start' , (req,res)=>{
  const input=z.object({layout:z.number().int().min(0).max(7)}).strict().safeParse(req.body);
  if(!input.success){res.status(400).json({error:'Choose a raid.'});return;}
  const player=session(req,res);
  const active=db.prepare('SELECT run FROM raids WHERE session=? AND outcome IS NULL').get(player.id);
  if(active){res.json({run:JSON.parse(active.run as string)});return;}
  const state=player.state;
  let loadout: {squad:Squad;power:number}=raidLoadout(state),layout=Number(db.prepare('SELECT COUNT(*) AS n FROM raids WHERE session=? AND outcome IS NOT NULL').get(player.id)!.n)%2,multiplier=1;
  if(state.campus){
   advanceCampus(state,Date.now());layout=input.data.layout;
   if(LEVELS[layout].level>state.campus.hq){res.status(400).json({error:'Upgrade your HQ to unlock this network.'});return;}
   const effects=campusEffects(state), agents=unlockedAgents(state);
   const squad:Squad={scout:0,tank:0,breaker:0};
   for(let i=0;i<effects.troopCapacity;i++){const kind=agents[i%agents.length];squad[kind]=(squad[kind]||0)+1;}
   loadout={squad,power:Math.max(1,effects.damageMultiplier)};
   multiplier=rewardMultiplier(state,layout);
   state.revision++;db.prepare('UPDATE sessions SET state=? WHERE id=?').run(JSON.stringify(state),player.id);
  }
  const run: RaidRun={id:randomUUID(),version:2,layout,...loadout,...(state.campus?{rewardMultiplier:multiplier,healthPower:campusEffects(state).healthMultiplier}: {})};
  db.prepare('INSERT INTO raids(id,session,run) VALUES (?,?,?)').run(run.id,player.id,JSON.stringify(run));res.json({run});
 });
 app.post('/api/raid/claim',(req,res)=>{
  const input=z.object({id:z.string().uuid(),log:transcript}).strict().safeParse(req.body);
  if(!input.success){res.status(400).json({error:'Invalid raid record.'});return;}
  const player=session(req,res);db.exec('BEGIN IMMEDIATE');
  try {
   const row=db.prepare('SELECT run,outcome FROM raids WHERE id=? AND session=?').get(input.data.id,player.id);
   if(!row) throw new Error('Unknown raid.');
   const run: RaidRun=JSON.parse(row.run as string);
   const raw=row.outcome?JSON.parse(row.outcome as string):replayRaid(run,input.data.log);
   const outcome=row.outcome?raw:{...raw,rewards:{credits:Math.floor(raw.rewards.credits*(run.rewardMultiplier??1)),compute:Math.floor(raw.rewards.compute*(run.rewardMultiplier??1))}};
   const state:GameState=JSON.parse(db.prepare('SELECT state FROM sessions WHERE id=?').get(player.id)!.state as string);
   if(!row.outcome){if(state.campus){advanceCampus(state,Date.now());if(outcome.rewards.credits>0||outcome.rewards.compute>0){state.campus.raidClaims![String(run.layout)]=(state.campus.raidClaims![String(run.layout)]||0)+1;}if(outcome.victory){state.campus.highestRaid=Math.max(state.campus.highestRaid,run.layout);state.campus.raidWins[String(run.layout)]=(state.campus.raidWins[String(run.layout)]||0)+1;}}state.credits+=outcome.rewards.credits;state.raidCompute=(state.raidCompute||0)+outcome.rewards.compute;state.revision++;
    db.prepare('UPDATE sessions SET state=? WHERE id=?').run(JSON.stringify(state),player.id);
    db.prepare('UPDATE raids SET outcome=? WHERE id=?').run(JSON.stringify(outcome),input.data.id);
   }
   db.exec('COMMIT');res.json({state,outcome});
  }catch(e){db.exec('ROLLBACK');res.status(400).json({error:(e as Error).message});}
 });
}
