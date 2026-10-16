import type express from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import type { GameState } from '../shared/contracts';
import { advanceCampus, startUpgrade, buildingLevel, moveBuilding, clearObstacle } from '../shared/progression';
export function registerProgression(app:express.Express,db:DatabaseSync,session:(req:express.Request,res:express.Response)=>{id:string;state:GameState}) {
 db.exec('CREATE TABLE IF NOT EXISTS campus_commands (session TEXT NOT NULL,id TEXT NOT NULL,building TEXT NOT NULL,PRIMARY KEY(session,id))');
 if(!db.prepare('PRAGMA table_info(campus_commands)').all().some(column=>column.name==='payload'))db.exec('ALTER TABLE campus_commands ADD COLUMN payload TEXT');
 const read=(id:string):GameState=>JSON.parse(db.prepare('SELECT state FROM sessions WHERE id=?').get(id)!.state as string);
 const save=(id:string,state:GameState)=>db.prepare('UPDATE sessions SET state=? WHERE id=?').run(JSON.stringify(state),id);
 const importHistory=(id:string,state:GameState)=>{
  const c=state.campus!;if(c.raidHistoryImported)return;
  const wins:Record<string,number>={},claims:Record<string,number>={};
  if(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='raids'").get()){
   const rows=db.prepare('SELECT run,outcome FROM raids WHERE session=? AND outcome IS NOT NULL').all(id);
   for(const row of rows){
    try {
     const run=JSON.parse(row.run as string),outcome=JSON.parse(row.outcome as string);
     if(!Number.isInteger(run.layout)||run.layout<0||run.layout>7)continue;
     const key=String(run.layout);
     if(outcome.victory===true){wins[key]=(wins[key]||0)+1;c.highestRaid=Math.max(c.highestRaid,run.layout);}
     if((Number(outcome.rewards?.credits)||0)>0||(Number(outcome.rewards?.compute)||0)>0)claims[key]=(claims[key]||0)+1;
    }catch { /* An unreadable historic record must not reset the player's company. */ }
   }
  }
  c.raidClaims ||= {};
  for(const [layout,count] of Object.entries(wins))c.raidWins[layout]=Math.max(c.raidWins[layout]||0,count);
  for(const [layout,count] of Object.entries(claims))c.raidClaims[layout]=Math.max(c.raidClaims[layout]||0,count);
  c.raidHistoryImported=true;
 };
 app.get('/api/campus',(req,res)=>{const {id}=session(req,res);const now=Date.now();db.exec('BEGIN IMMEDIATE');try {const state=read(id);const before=JSON.stringify(state);advanceCampus(state,now);importHistory(id,state);if(JSON.stringify(state)!==before){state.revision++;save(id,state);}db.exec('COMMIT');res.json({state,serverTime:now});}catch(e){db.exec('ROLLBACK');res.status(400).json({error:(e as Error).message});}});
 app.post('/api/campus/upgrade',(req,res)=>{
  const input=z.object({building:z.enum(['hq','compute','revenue','training','gpu','research','defense']),requestId:z.string().uuid(),expectedLevel:z.number().int().min(0).max(10).optional()}).strict().safeParse(req.body);
  if(!input.success){res.status(400).json({error:'Choose a valid building upgrade.'});return;}
  const {id}=session(req,res);const now=Date.now();db.exec('BEGIN IMMEDIATE');
  try {const state=read(id);advanceCampus(state,now);importHistory(id,state);const cached=db.prepare('SELECT building,payload FROM campus_commands WHERE session=? AND id=?').get(id,input.data.requestId);
   const payload=JSON.stringify({action:'upgrade',building:input.data.building,expectedLevel:input.data.expectedLevel});
   if(cached && (cached.building!==input.data.building || (cached.payload && cached.payload!==payload)))throw new Error('Request ID already used for a different building.');
   if(!cached){if(input.data.expectedLevel!==undefined && buildingLevel(state,input.data.building)!==input.data.expectedLevel)throw new Error('Building changed. Review its next upgrade.');startUpgrade(state,input.data.building,now,input.data.requestId);db.prepare('INSERT INTO campus_commands(session,id,building,payload) VALUES (?,?,?,?)').run(id,input.data.requestId,input.data.building,payload);}
   state.revision++;save(id,state);db.exec('COMMIT');res.json({state,serverTime:now});
  }catch(e){db.exec('ROLLBACK');res.status(400).json({error:(e as Error).message});}
 });
 const building=z.enum(['hq','compute','revenue','training','gpu','research','defense']);
 const schemas={move:z.object({building,position:z.tuple([z.number().int(),z.number().int()]),requestId:z.string().uuid()}).strict(),clear:z.object({obstacleId:z.string().min(1).max(80),requestId:z.string().uuid()}).strict()};
 for(const action of ['move','clear'] as const)app.post(`/api/campus/${action}`,(req,res)=>{
  const input=schemas[action].safeParse(req.body);if(!input.success){res.status(400).json({error:'Choose a valid campus action.'});return;}
  const {id}=session(req,res),now=Date.now();db.exec('BEGIN IMMEDIATE');
  try{
   const state=read(id);advanceCampus(state,now);importHistory(id,state);
   const payload=JSON.stringify({action,...input.data});
   const cached=db.prepare('SELECT payload FROM campus_commands WHERE session=? AND id=?').get(id,input.data.requestId);
   if(cached&&cached.payload!==payload)throw new Error('Request ID already used for a different action.');
   if(!cached){
    if('building' in input.data)moveBuilding(state,input.data.building,input.data.position,now);else clearObstacle(state,input.data.obstacleId,now);
    db.prepare('INSERT INTO campus_commands(session,id,building,payload) VALUES (?,?,?,?)').run(id,input.data.requestId,action,payload);
   }
   state.revision++;save(id,state);db.exec('COMMIT');res.json({state,serverTime:now});
  }catch(e){db.exec('ROLLBACK');res.status(400).json({error:(e as Error).message});}
 });

}


