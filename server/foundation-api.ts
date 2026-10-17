import {newAva,legacyAva,reconcileAva,commandAva,type AvaProgress} from '../shared/ava';
import type express from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { moveBuilding,rotateBuilding,buildFabricator,trainScrap,startBotRaid,deployScrap,retreatBots,initialFoundation, advanceFoundation, buildRig, moveRig, collectRig, type FoundationState } from '../shared/foundation';
/** Separate table and cookie: foundation resets never touch any previous game save. */
export function registerFoundation(app:express.Express,db:DatabaseSync){
 db.exec('CREATE TABLE IF NOT EXISTS foundation_saves(id TEXT PRIMARY KEY,state TEXT NOT NULL); CREATE TABLE IF NOT EXISTS foundation_actions(session TEXT,id TEXT,payload TEXT,amount INTEGER,PRIMARY KEY(session,id))');
 db.exec('CREATE TABLE IF NOT EXISTS foundation_ava(session TEXT PRIMARY KEY,progress TEXT NOT NULL)');
 const readAva=(id:string):AvaProgress=>{const row=db.prepare('SELECT progress FROM foundation_ava WHERE session=?').get(id);return row?JSON.parse(row.progress as string):legacyAva();};
 const saveAva=(id:string,p:AvaProgress)=>db.prepare('INSERT INTO foundation_ava VALUES(?,?) ON CONFLICT(session) DO UPDATE SET progress=excluded.progress').run(id,JSON.stringify(p));
 const observeAva=(id:string,state:FoundationState,now:number)=>{const old=readAva(id),next=reconcileAva(old,state,now);if(next.revision!==old.revision)saveAva(id,next);return next;};
 function session(req:express.Request,res:express.Response){
  const candidate=/(?:^|;\s*)airace_foundation_session=([a-f0-9-]{36})(?:;|$)/.exec(req.headers.cookie||'')?.[1];
  const row=candidate?db.prepare('SELECT state FROM foundation_saves WHERE id=?').get(candidate):undefined;
  if(row)return {id:candidate!,state:JSON.parse(row.state as string) as FoundationState};
  const id=randomUUID(),state=initialFoundation();db.prepare('INSERT INTO foundation_saves VALUES (?,?)').run(id,JSON.stringify(state));
  saveAva(id,newAva());
  res.cookie('airace_foundation_session',id,{httpOnly:true,sameSite:'strict',secure:req.secure || process.env.NODE_ENV==='production',maxAge:365*86400000,path:'/'});return {id,state};
 }
 // A foundation player cannot invoke retired gameplay through a stale tab or old URL.
 app.use('/api',(req,res,next)=>{if(/(?:^|;\s*)airace_foundation_session=/.test(req.headers.cookie||'')&&!req.path.startsWith('/foundation')){res.status(410).json({error:'This gameplay belongs to an archived version. Return to the foundation.'});return;}next();});
 const save=(id:string,state:FoundationState)=>db.prepare('UPDATE foundation_saves SET state=? WHERE id=?').run(JSON.stringify(state),id);
 app.get('/api/foundation',(req,res)=>{const {id,state}=session(req,res),before=JSON.stringify(state),now=Date.now();advanceFoundation(state,now);if(JSON.stringify(state)!==before){state.revision++;save(id,state);}res.json({state,serverTime:now,ava:observeAva(id,state,now)});});
 app.post('/api/foundation/ava',(req,res)=>{
  const parsed=z.object({command:z.enum(['continue','build-menu','rig-selected','skip','replay']),revision:z.number().int().min(0),generation:z.number().int().min(0)}).strict().safeParse(req.body);
  if(!parsed.success){res.status(400).json({error:'Invalid Ava action.'});return;}
  const {id,state}=session(req,res),old=readAva(id),input=parsed.data;
  if(input.generation!==(state.generation||0)){res.status(409).json({error:'Progress changed. Reload the game.'});return;}
  // Stale retries cannot advance two dialogue moments or restart a newer replay.
  const next=input.revision===old.revision?commandAva(old,input.command,state,Date.now()):old;
  if(next.revision!==old.revision)saveAva(id,next);
  res.json({ava:next});
 });
 const actionSchema=z.discriminatedUnion('action',[
  z.object({action:z.literal('build'),position:z.tuple([z.number().int(),z.number().int()]),orientation:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)]).optional(),requestId:z.string().uuid(),generation:z.number().int().min(0)}).strict(),
  z.object({action:z.literal('move'),position:z.tuple([z.number().int(),z.number().int()]),orientation:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)]).optional(),requestId:z.string().uuid(),generation:z.number().int().min(0)}).strict(),
  z.object({action:z.literal('collect'),requestId:z.string().uuid(),generation:z.number().int().min(0)}).strict()
 ]);
 app.post('/api/foundation/rig',(req,res)=>{
  const parsed=actionSchema.safeParse(req.body);if(!parsed.success){res.status(400).json({error:'Choose a valid rig action.'});return;}
  const {id}=session(req,res),input=parsed.data,now=Date.now();db.exec('BEGIN IMMEDIATE');
  try{const state=JSON.parse(db.prepare('SELECT state FROM foundation_saves WHERE id=?').get(id)!.state as string) as FoundationState;
   if(input.generation!==(state.generation||0))throw new Error('Progress was reset. Reopen the building menu.');
   const payload=JSON.stringify(input),cached=db.prepare('SELECT payload,amount FROM foundation_actions WHERE session=? AND id=?').get(id,input.requestId);
   if(cached&&cached.payload!==payload)throw new Error('Request already used for another action.');
   advanceFoundation(state,now);let amount=Number(cached?.amount||0);
   if(!cached){if(input.action==='build')buildRig(state,input.position,now,input.orientation);else if(input.action==='move')moveRig(state,input.position,now,input.orientation);else amount=collectRig(state,now);db.prepare('INSERT INTO foundation_actions VALUES(?,?,?,?)').run(id,input.requestId,payload,amount);}
   state.revision++;save(id,state);let ava=observeAva(id,state,now);if(!cached&&input.action==='collect'&&amount>0&&ava.status==='active'&&ava.step>=7){ava=reconcileAva({...ava,collected:true,revision:ava.revision+1},state,now);saveAva(id,ava);}db.exec('COMMIT');res.json({state,serverTime:now,amount,ava});
  }catch(e){db.exec('ROLLBACK');res.status(400).json({error:(e as Error).message});}
 });
 const botAction=z.discriminatedUnion('action',[
  z.object({action:z.literal('build'),position:z.tuple([z.number().int(),z.number().int()]),orientation:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)]).optional()}).strict(),
  z.object({action:z.literal('rotate'),building:z.enum(['hq','station','rig','fabricator','hangar']),orientation:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)])}).strict(),
  z.object({action:z.literal('move'),building:z.enum(['hq','station','rig','fabricator','hangar']),position:z.tuple([z.number().finite(),z.number().finite()]),orientation:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)])}).strict(),
  z.object({action:z.literal('train'),count:z.number().int().min(1).max(10)}).strict(),
  z.object({action:z.literal('start'),layout:z.number().int().min(0).max(1)}).strict(),
  z.object({action:z.literal('deploy'),raidId:z.string().uuid(),position:z.object({x:z.number().finite(),y:z.number().finite()}).strict()}).strict(),
  z.object({action:z.literal('retreat'),raidId:z.string().uuid()}).strict()
 ]);
 const botSchema=z.object({requestId:z.string().uuid(),generation:z.number().int().min(0),command:botAction}).strict();
 app.post('/api/foundation/bots',(req,res)=>{
  const parsed=botSchema.safeParse(req.body);if(!parsed.success){res.status(400).json({error:'Choose a valid bot action.'});return;}
  const {id}=session(req,res),input=parsed.data,now=Date.now();db.exec('BEGIN IMMEDIATE');
  try{const state=JSON.parse(db.prepare('SELECT state FROM foundation_saves WHERE id=?').get(id)!.state as string) as FoundationState;
   if(input.generation!==(state.generation||0))throw new Error('Progress was reset. Reload the game.');
   const payload='bots:'+JSON.stringify(input),cached=db.prepare('SELECT payload FROM foundation_actions WHERE session=? AND id=?').get(id,input.requestId);
   if(cached&&cached.payload!==payload)throw new Error('Request already used for another action.');
   advanceFoundation(state,now);
   if(!cached){const c=input.command;
    if(c.action==='build')buildFabricator(state,c.position,now,c.orientation);
    else if(c.action==='move')moveBuilding(state,c.building,c.position,c.orientation,now);
    else if(c.action==='rotate')rotateBuilding(state,c.building,c.orientation,now);
    else if(c.action==='train')trainScrap(state,c.count,now);
    else if(c.action==='start')startBotRaid(state,randomUUID(),c.layout,now);
    else if(c.action==='deploy')deployScrap(state,c.raidId,c.position,now);
    else retreatBots(state,c.raidId,now);
    db.prepare('INSERT INTO foundation_actions VALUES(?,?,?,?)').run(id,input.requestId,payload,0);
   }
   state.revision++;save(id,state);db.exec('COMMIT');res.json({state,serverTime:now});
  }catch(e){db.exec('ROLLBACK');res.status(400).json({error:(e as Error).message});}
 });
 app.post('/api/foundation/reset',(req,res)=>{
  const input=z.object({confirm:z.literal('RESET FOUNDATION'),revision:z.number().int().min(0)}).strict().safeParse(req.body);
  if(!input.success){res.status(400).json({error:'Confirm the reset before continuing.'});return;}
  const {id,state}=session(req,res);if(state.revision!==input.data.revision){res.status(409).json({error:'Progress changed. Reopen Settings and try again.'});return;}
  const next=initialFoundation(state.revision+1);next.generation=(state.generation||0)+1;db.prepare('UPDATE foundation_saves SET state=? WHERE id=?').run(JSON.stringify(next),id);saveAva(id,newAva(readAva(id).revision+1));res.json({state:next,ava:readAva(id)});
 });
}
