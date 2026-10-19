import {purchaseDecoration,moveDecoration,removeDecoration} from '../shared/decorations';
import {companyXPStore} from './company-xp';
import {ensureLandscape,clearObstacle} from '../shared/landscape';
import {influenceStore} from './influence';
import {restoreLocalLegacy} from './legacy-session';
import {identityStore,registerIdentity} from './identity';
import {newAva,legacyAva,reconcileAva,commandAva,type AvaProgress} from '../shared/ava';
import type express from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { upgradeFounderHQ,establishBuilderStation,moveBuilding,rotateBuilding,buildFabricator,buildHangar,trainScrap,startBotRaid,deployScrap,retreatBots,initialFoundation, advanceFoundation, buildRig, moveRig, collectRig, type FoundationState } from '../shared/foundation';
/** Separate table and cookie: foundation resets never touch any previous game save. */
export function registerFoundation(app:express.Express,db:DatabaseSync,options:{cookieName?:string;legacyPaths?:string[];clock?:()=>number}={}){
 db.exec('CREATE TABLE IF NOT EXISTS foundation_saves(id TEXT PRIMARY KEY,state TEXT NOT NULL); CREATE TABLE IF NOT EXISTS foundation_actions(session TEXT,id TEXT,payload TEXT,amount INTEGER,PRIMARY KEY(session,id))');
 db.exec('CREATE TABLE IF NOT EXISTS foundation_ava(session TEXT PRIMARY KEY,progress TEXT NOT NULL)');
 const readAva=(id:string):AvaProgress=>{const row=db.prepare('SELECT progress FROM foundation_ava WHERE session=?').get(id);return row?JSON.parse(row.progress as string):legacyAva();};
 const saveAva=(id:string,p:AvaProgress)=>db.prepare('INSERT INTO foundation_ava VALUES(?,?) ON CONFLICT(session) DO UPDATE SET progress=excluded.progress').run(id,JSON.stringify(p));
 const observeAva=(id:string,state:FoundationState,now:number)=>{const old=readAva(id),next=reconcileAva(old,state,now);if(next.revision!==old.revision)saveAva(id,next);return next;};
 const identities=identityStore(db,options.cookieName);
 registerIdentity(app,db,identities);
 const influence=influenceStore(db),clock=options.clock??Date.now,xp=companyXPStore(db,clock());
 function session(req:express.Request,res:express.Response){
  let player=identities.authenticate(req,res);
  if(!player&&req.method==='GET'&&identities.hasCookie(req)){try{player=restoreLocalLegacy(req,res,db,identities,options.legacyPaths||[]);}catch{res.status(503).json({code:'SESSION_RESTORE_UNAVAILABLE',error:'We could not safely restore this local session. Your saved companies have not been replaced. Please retry or open the original preview.'});return;}}
  if(!player){
   if(req.method!=='GET'||identities.hasCookie(req)){const reason=identities.status(req);res.status(401).json({code:reason==='expired'?'SESSION_EXPIRED':reason==='invalid'?'SESSION_INVALID':'SESSION_UNRECOGNIZED',error:reason==='expired'?'This company session has expired. Recover Company restores access without changing your base.':reason==='invalid'?'This browser has an invalid company session. Your saved companies have not been changed.':'This preview does not recognize the company session in this browser. Your saved companies have not been changed.'});return;}
   const id=randomUUID(),state=initialFoundation();db.exec('BEGIN IMMEDIATE');
   try{db.prepare('INSERT INTO foundation_saves VALUES (?,?)').run(id,JSON.stringify(state));saveAva(id,newAva());const enrolled=identities.enroll(id,res,req);player=enrolled.player;db.exec('COMMIT');identities.cookie(res,req,enrolled.credential);}catch(e){db.exec('ROLLBACK');throw e;}
  }
  if(req.method!=='GET'&&!identities.guard(req,res,player,true))return;
  const row=db.prepare('SELECT state FROM foundation_saves WHERE id=?').get(player.save_id)!;
  return {id:player.save_id,state:JSON.parse(row.state as string) as FoundationState,company:identities.profile(player)};
 }
 // A foundation player cannot invoke retired gameplay through a stale tab or old URL.
 app.use('/api',(req,res,next)=>{if(identities.hasCookie(req)&&!req.path.startsWith('/foundation')){res.status(410).json({error:'This gameplay belongs to an archived version. Return to the foundation.'});return;}next();});
 const save=(id:string,state:FoundationState)=>db.prepare('UPDATE foundation_saves SET state=? WHERE id=?').run(JSON.stringify(state),id);
 app.post('/api/foundation/start-new',(req,res)=>{
  const origin=req.get('Origin');if(!req.is('application/json')||(origin&&new URL(origin).host!==req.get('host'))){res.status(403).json({error:'Open The AI Race directly to start a company.'});return;}
  if(req.body?.confirm!=='START SEPARATE COMPANY'){res.status(400).json({error:'Confirm starting a separate company first.'});return;}
  if(identities.authenticate(req,res)){res.status(409).json({error:'A company is already available. Retry loading it instead.',code:'SESSION_ACTIVE'});return;}
  if(!identities.rate(req,undefined,'guest-start',8)){res.status(429).json({error:'Please wait 15 minutes before starting another company.'});return;}
  db.exec('BEGIN IMMEDIATE');try{const id=randomUUID(),state=initialFoundation();db.prepare('INSERT INTO foundation_saves VALUES(?,?)').run(id,JSON.stringify(state));saveAva(id,newAva());const enrolled=identities.enroll(id,res,req);db.exec('COMMIT');identities.cookie(res,req,enrolled.credential);res.json({started:true});}catch{db.exec('ROLLBACK');res.status(503).json({error:'Your new company could not be saved. Please retry.'});}
 });
 app.get('/api/foundation/leaderboard',(req,res)=>{const player=session(req,res);if(!player)return;res.set('Cache-Control','private, no-store').json(influence.leaderboard(player.company.playerId));});
 app.get('/api/foundation',(req,res)=>{try{
  const player=session(req,res);if(!player)return;const {id,company}=player,now=clock();
  db.exec('BEGIN IMMEDIATE');
  try{const state=JSON.parse(db.prepare('SELECT state FROM foundation_saves WHERE id=?').get(id)!.state as string) as FoundationState,before=JSON.stringify(state);
   ensureLandscape(state,now,randomUUID());advanceFoundation(state,now);influence.settle(company.playerId,state,now);xp.settle(company.playerId,state,now);
   if(JSON.stringify(state)!==before){state.revision++;save(id,state);}
   company.level=xp.snapshot(company.playerId).level;const ava=observeAva(id,state,now),competition=influence.snapshot(company.playerId,state,now);db.exec('COMMIT');
   res.set('Cache-Control','private, no-store').json({state,company,serverTime:now,ava,competition,companyXp:xp.snapshot(company.playerId)});
  }catch(e){db.exec('ROLLBACK');throw e;}
 }catch{res.status(503).json({code:'BACKEND_UNAVAILABLE',error:'The save service is temporarily unavailable. Your saved companies have not been replaced. Please retry.'});}});
 app.post('/api/foundation/ava',(req,res)=>{
  const parsed=z.object({command:z.enum(['continue','build-menu','rig-selected','station-selected','skip','replay']),revision:z.number().int().min(0),generation:z.number().int().min(0)}).strict().safeParse(req.body);
  if(!parsed.success){res.status(400).json({error:'Invalid Ava action.'});return;}
  const player=session(req,res);if(!player)return;const {id,state}=player,old=readAva(id),input=parsed.data;
  if(input.generation!==(state.generation||0)){res.status(409).json({error:'Progress changed. Reload the game.'});return;}
  // Stale retries cannot advance two dialogue moments or restart a newer replay.
  const next=input.revision===old.revision?commandAva(old,input.command,state,clock()):old;
  if(next.revision!==old.revision)saveAva(id,next);
  res.json({ava:next});
 });
 const actionSchema=z.discriminatedUnion('action',[
  z.object({action:z.literal('build'),position:z.tuple([z.number().int(),z.number().int()]),orientation:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)]).optional(),rig:z.enum(['rig','rig2']).optional(),requestId:z.string().uuid(),generation:z.number().int().min(0)}).strict(),
  z.object({action:z.literal('move'),position:z.tuple([z.number().int(),z.number().int()]),orientation:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)]).optional(),rig:z.enum(['rig','rig2']).optional(),requestId:z.string().uuid(),generation:z.number().int().min(0)}).strict(),
  z.object({action:z.literal('collect'),rig:z.enum(['rig','rig2']).optional(),requestId:z.string().uuid(),generation:z.number().int().min(0)}).strict()
 ]);
 app.post('/api/foundation/rig',(req,res)=>{
  const parsed=actionSchema.safeParse(req.body);if(!parsed.success){res.status(400).json({error:'Choose a valid rig action.'});return;}
  const player=session(req,res);if(!player)return;const {id}=player,input=parsed.data,now=clock();db.exec('BEGIN IMMEDIATE');
  try{const state=JSON.parse(db.prepare('SELECT state FROM foundation_saves WHERE id=?').get(id)!.state as string) as FoundationState;
   if(input.generation!==(state.generation||0))throw new Error('Progress was reset. Reopen the building menu.');
   const payload=JSON.stringify(input),cached=db.prepare('SELECT payload,amount FROM foundation_actions WHERE session=? AND id=?').get(id,input.requestId);
   if(cached&&cached.payload!==payload)throw new Error('Request already used for another action.');
   ensureLandscape(state,now,randomUUID());advanceFoundation(state,now);influence.settle(player.company.playerId,state,now);xp.settle(player.company.playerId,state,now);let amount=Number(cached?.amount||0);
   if(!cached){if(input.action==='build')buildRig(state,input.position,now,input.orientation);else if(input.action==='move')moveRig(state,input.position,now,input.orientation,input.rig);else amount=collectRig(state,now,input.rig);db.prepare('INSERT INTO foundation_actions VALUES(?,?,?,?)').run(id,input.requestId,payload,amount);}
   influence.settle(player.company.playerId,state,now);xp.settle(player.company.playerId,state,now);state.revision++;save(id,state);let ava=observeAva(id,state,now);if(!cached&&input.action==='collect'&&amount>0&&ava.status==='active'&&ava.step>=7){ava=reconcileAva({...ava,collected:true,revision:ava.revision+1},state,now);saveAva(id,ava);}db.exec('COMMIT');res.json({state,serverTime:now,amount,ava,competition:influence.snapshot(player.company.playerId,state,now),companyXp:xp.snapshot(player.company.playerId)});
  }catch(e){db.exec('ROLLBACK');res.status(400).json({error:(e as Error).message});}
 });
 const botAction=z.discriminatedUnion('action',[
  z.object({action:z.literal('buy-decoration'),kind:z.enum(['ornamental','cypress','flowers','planter']),position:z.tuple([z.number().int(),z.number().int()]),orientation:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)])}).strict(),
  z.object({action:z.literal('move-decoration'),id:z.string().uuid(),position:z.tuple([z.number().int(),z.number().int()]),orientation:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)])}).strict(),
  z.object({action:z.literal('remove-decoration'),id:z.string().uuid()}).strict(),
  z.object({action:z.literal('upgrade-hq')}).strict(),
  z.object({action:z.literal('establish-station'),position:z.tuple([z.number().int(),z.number().int()]),orientation:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)]).optional()}).strict(),
  z.object({action:z.literal('clear-obstacle'),obstacleId:z.string().min(1).max(100)}).strict(),
  z.object({action:z.literal('build-hangar'),position:z.tuple([z.number().int(),z.number().int()]),orientation:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)]).optional()}).strict(),
  z.object({action:z.literal('build'),position:z.tuple([z.number().int(),z.number().int()]),orientation:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)]).optional()}).strict(),
  z.object({action:z.literal('rotate'),building:z.enum(['hq','station','rig','rig2','fabricator','hangar']),orientation:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)])}).strict(),
  z.object({action:z.literal('move'),building:z.enum(['hq','station','rig','rig2','fabricator','hangar']),position:z.tuple([z.number().finite(),z.number().finite()]),orientation:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)])}).strict(),
  z.object({action:z.literal('train'),count:z.number().int().min(1).max(10)}).strict(),
  z.object({action:z.literal('start'),layout:z.number().int().min(0).max(1)}).strict(),
  z.object({action:z.literal('deploy'),raidId:z.string().uuid(),position:z.object({x:z.number().finite(),y:z.number().finite()}).strict()}).strict(),
  z.object({action:z.literal('retreat'),raidId:z.string().uuid()}).strict()
 ]);
 const botSchema=z.object({requestId:z.string().uuid(),generation:z.number().int().min(0),command:botAction}).strict();
 app.post('/api/foundation/bots',(req,res)=>{
  const parsed=botSchema.safeParse(req.body);if(!parsed.success){res.status(400).json({error:'Choose a valid bot action.'});return;}
  const player=session(req,res);if(!player)return;const {id}=player,input=parsed.data,now=clock();db.exec('BEGIN IMMEDIATE');
  try{const state=JSON.parse(db.prepare('SELECT state FROM foundation_saves WHERE id=?').get(id)!.state as string) as FoundationState;
   if(input.generation!==(state.generation||0))throw new Error('Progress was reset. Reload the game.');
   const payload='bots:'+JSON.stringify(input),cached=db.prepare('SELECT payload FROM foundation_actions WHERE session=? AND id=?').get(id,input.requestId);
   if(cached&&cached.payload!==payload)throw new Error('Request already used for another action.');
   ensureLandscape(state,now,randomUUID());advanceFoundation(state,now);influence.settle(player.company.playerId,state,now);xp.settle(player.company.playerId,state,now);
   if(!cached){const c=input.command;
    if(c.action==='buy-decoration')purchaseDecoration(state,c.kind,c.position,c.orientation,input.requestId);
    else if(c.action==='move-decoration')moveDecoration(state,c.id,c.position,c.orientation);
    else if(c.action==='remove-decoration')removeDecoration(state,c.id);
    else if(c.action==='upgrade-hq')upgradeFounderHQ(state,now,input.requestId);
    else if(c.action==='establish-station')establishBuilderStation(state,c.position,c.orientation);
    else if(c.action==='clear-obstacle')clearObstacle(state,c.obstacleId,now);
    else if(c.action==='build')buildFabricator(state,c.position,now,c.orientation);
    else if(c.action==='build-hangar')buildHangar(state,c.position,now,c.orientation);
    else if(c.action==='move')moveBuilding(state,c.building,c.position,c.orientation,now);
    else if(c.action==='rotate')rotateBuilding(state,c.building,c.orientation,now);
    else if(c.action==='train')trainScrap(state,c.count,now);
    else if(c.action==='start'){startBotRaid(state,randomUUID(),c.layout,now);state.botRaid!.companyId=player.company.playerId;influence.register(player.company.playerId,state,now);}
    else if(c.action==='deploy')deployScrap(state,c.raidId,c.position,now);
    else retreatBots(state,c.raidId,now);
    db.prepare('INSERT INTO foundation_actions VALUES(?,?,?,?)').run(id,input.requestId,payload,0);
   }
   influence.settle(player.company.playerId,state,now);xp.settle(player.company.playerId,state,now);state.revision++;save(id,state);const ava=observeAva(id,state,now);db.exec('COMMIT');res.json({state,ava,serverTime:now,competition:influence.snapshot(player.company.playerId,state,now),companyXp:xp.snapshot(player.company.playerId)});
  }catch(e){db.exec('ROLLBACK');res.status(400).json({error:(e as Error).message});}
 });
 app.post('/api/foundation/reset',(req,res)=>{
  const input=z.object({confirm:z.literal('RESET FOUNDATION'),revision:z.number().int().min(0)}).strict().safeParse(req.body);
  if(!input.success){res.status(400).json({error:'Confirm the reset before continuing.'});return;}
  const player=session(req,res);if(!player)return;const {id,state}=player;if(state.revision!==input.data.revision){res.status(409).json({error:'Progress changed. Reopen Settings and try again.'});return;}
  const next=initialFoundation(state.revision+1);next.raidRecord=state.raidRecord||{wins:[],completeHistory:false};next.generation=(state.generation||0)+1;db.prepare('UPDATE foundation_saves SET state=? WHERE id=?').run(JSON.stringify(next),id);saveAva(id,newAva(readAva(id).revision+1));res.json({state:next,ava:readAva(id),companyXp:xp.snapshot(player.company.playerId)});
 });
}
