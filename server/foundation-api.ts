import {migrateBuildingUpdate} from './building-update';
import {prepareBuildingUpdate} from '../shared/building-update';
import {commitLayout} from '../shared/layout-draft';
import {buildSentinel,buildArcSpire} from '../shared/cybersecurity';
import {developmentInfluenceStore} from './development-influence';
import {playerWorldStore} from './player-world';
import {purchaseTechnology,TECHNOLOGY_IDS} from '../shared/technology';
import {BASE_IDS,chooseInfiltrationBase} from '../shared/infiltration-bases';
import {newSquadOperation} from '../shared/squad-infiltration';
import type {Operation} from '../shared/infiltration';
import {buyWall,moveWall,moveWallRow,buildDroneStation} from '../shared/cybersecurity';
import {infiltrationStore,releaseReserve} from './infiltration';
import {commandOperation} from '../shared/infiltration';
import {startOwnedOperation,commandOwnedOperation,settleOwnedUnit} from '../shared/infiltration-army';
import {buildResearchLab,collectResearch} from '../shared/research';
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
import {setGuardPosition} from '../shared/security';
import { buildStorage,upgradeBuildings,reconcileBuilderHuts,moveBuilderHut,placeOwnedHangar,acknowledgeHangar,upgradeFounderHQ,establishBuilderStation,moveBuilding,rotateBuilding,buildFabricator,buildHangar,trainTroop,startBotRaid,deployScrap,retreatBots,initialFoundation, advanceFoundation, buildRig, moveRig, collectRig, type FoundationState } from '../shared/foundation';
/** Separate table and cookie: foundation resets never touch any previous game save. */
export function registerFoundation(app:express.Express,db:DatabaseSync,options:{buildingGrid?:boolean;legacyRaids?:boolean;cookieName?:string;legacyPaths?:string[];clock?:()=>number;operationFactory?:(id:string,target:string,now:number)=>Operation}={}){
 db.exec('CREATE TABLE IF NOT EXISTS foundation_saves(id TEXT PRIMARY KEY,state TEXT NOT NULL); CREATE TABLE IF NOT EXISTS foundation_actions(session TEXT,id TEXT,payload TEXT,amount INTEGER,PRIMARY KEY(session,id))');
 db.exec('CREATE TABLE IF NOT EXISTS foundation_ava(session TEXT PRIMARY KEY,progress TEXT NOT NULL)');
 if(options.buildingGrid)migrateBuildingUpdate(db);
 const readAva=(id:string):AvaProgress=>{const row=db.prepare('SELECT progress FROM foundation_ava WHERE session=?').get(id);return row?JSON.parse(row.progress as string):legacyAva();};
 const saveAva=(id:string,p:AvaProgress)=>db.prepare('INSERT INTO foundation_ava VALUES(?,?) ON CONFLICT(session) DO UPDATE SET progress=excluded.progress').run(id,JSON.stringify(p));
 const observeAva=(id:string,state:FoundationState,now:number)=>{const old=readAva(id),next=reconcileAva(old,state,now);if(next.revision!==old.revision)saveAva(id,next);return next;};
 const identities=identityStore(db,options.cookieName,options.clock);
 registerIdentity(app,db,identities);
 const influence=influenceStore(db),infiltrations=infiltrationStore(db),clock=options.clock??Date.now,xp=companyXPStore(db,clock());
 const development=developmentInfluenceStore(db,clock());
 const competitionSnapshot=(company:string,state:FoundationState,time:number)=>({...influence.snapshot(company,state,time),development:development.snapshot(company)});
 const players=playerWorldStore(db,clock,id=>influence.leaderboard(id));
 players.register(app,(req,res)=>{const p=identities.authenticate(req,res);if(!p){res.status(401).json({error:'Open your company before viewing the shared world.'});return;}if(req.method!=='GET'&&!identities.guard(req,res,p,true))return;if(req.method==='POST'&&!identities.rate(req,p,'player-search',120)){res.status(429).json({error:'Please wait a moment before searching again.'});return;}return {companyId:p.id,saveId:p.save_id};});
 function session(req:express.Request,res:express.Response){
  let player=identities.authenticate(req,res);
  if(!player&&req.method==='GET'&&identities.hasCookie(req)){try{player=restoreLocalLegacy(req,res,db,identities,options.legacyPaths||[]);}catch{res.status(503).json({code:'SESSION_RESTORE_UNAVAILABLE',error:'We could not safely restore this local session. Your saved companies have not been replaced. Please retry or open the original preview.'});return;}}
  if(!player){
   if(req.method!=='GET'||identities.hasCookie(req)){const reason=identities.status(req);res.status(401).json({code:reason==='expired'?'SESSION_EXPIRED':reason==='invalid'?'SESSION_INVALID':'SESSION_UNRECOGNIZED',error:reason==='expired'?'This company session has expired. Recover Company restores access without changing your base.':reason==='invalid'?'This browser has an invalid company session. Your saved companies have not been changed.':'This preview does not recognize the company session in this browser. Your saved companies have not been changed.'});return;}
   const id=randomUUID(),state=initialFoundation();if(options.buildingGrid)prepareBuildingUpdate(state);db.exec('BEGIN IMMEDIATE');
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
  db.exec('BEGIN IMMEDIATE');try{const id=randomUUID(),state=initialFoundation();if(options.buildingGrid)prepareBuildingUpdate(state);db.prepare('INSERT INTO foundation_saves VALUES(?,?)').run(id,JSON.stringify(state));saveAva(id,newAva());const enrolled=identities.enroll(id,res,req);db.exec('COMMIT');identities.cookie(res,req,enrolled.credential);res.json({started:true});}catch{db.exec('ROLLBACK');res.status(503).json({error:'Your new company could not be saved. Please retry.'});}
 });
 // Acknowledge persisted completion notices against the latest save; never accept client state.
 app.post('/api/foundation/upgrades/seen',(req,res)=>{
  const parsed=z.object({ids:z.array(z.string().min(1).max(160)).max(40)}).strict().safeParse(req.body);if(!parsed.success){res.status(400).json({error:'Invalid upgrade notices.'});return;}
  const player=session(req,res);if(!player)return;db.exec('BEGIN IMMEDIATE');try{const state=JSON.parse(String(db.prepare('SELECT state FROM foundation_saves WHERE id=?').get(player.id)!.state)) as FoundationState;let changed=false;for(const n of state.completedUpgradeNotices??[])if(!n.acknowledged&&parsed.data.ids.includes(n.id)){n.acknowledged=true;changed=true;}if(changed){state.revision++;save(player.id,state);}db.exec('COMMIT');res.json({ok:true});}catch(e){db.exec('ROLLBACK');res.status(503).json({error:'Could not acknowledge upgrade notices.'});}
 });
 app.post('/api/foundation/development/seen',(req,res)=>{
  const input=z.object({through:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER)}).strict().safeParse(req.body);if(!input.success){res.status(400).json({error:'Invalid development notice.'});return;}
  const player=session(req,res);if(!player)return;development.acknowledge(player.company.playerId,input.data.through);res.json({ok:true});
 });
 app.get('/api/foundation/leaderboard',(req,res)=>{const player=session(req,res);if(!player)return;res.set('Cache-Control','private, no-store').json(influence.leaderboard(player.company.playerId));});
 app.get('/api/foundation',(req,res)=>{try{
  const player=session(req,res);if(!player)return;const {id,company}=player,now=clock();
  db.exec('BEGIN IMMEDIATE');
  try{const state=JSON.parse(db.prepare('SELECT state FROM foundation_saves WHERE id=?').get(id)!.state as string) as FoundationState,before=JSON.stringify(state);
   ensureLandscape(state,now,randomUUID());players.record(state);advanceFoundation(state,now);reconcileBuilderHuts(state);influence.settle(company.playerId,state,now);players.settle(company.playerId,state,now);infiltrations.settle(company.playerId,state,now);releaseReserve(state);xp.settle(company.playerId,state,now);development.settle(company.playerId,state,now);
   if(JSON.stringify(state)!==before){state.revision++;save(id,state);}
   company.level=xp.snapshot(company.playerId).level;const ava=observeAva(id,state,now),competition=competitionSnapshot(company.playerId,state,now);db.exec('COMMIT');
   res.set('Cache-Control','private, no-store').json({state,company,serverTime:now,ava,competition,companyXp:xp.snapshot(company.playerId),infiltrationCooldowns:BASE_IDS.map(targetId=>({targetId,eligibleAt:infiltrations.eligible(company.playerId,targetId)}))});
  }catch(e){db.exec('ROLLBACK');throw e;}
 }catch{res.status(503).json({code:'BACKEND_UNAVAILABLE',error:'The save service is temporarily unavailable. Your saved companies have not been replaced. Please retry.'});}});
 app.post('/api/foundation/ava',(req,res)=>{
  const parsed=z.object({command:z.enum(['continue','build-menu','rig-selected','station-selected','skip','replay','begin-opening']),revision:z.number().int().min(0),generation:z.number().int().min(0)}).strict().safeParse(req.body);
  if(!parsed.success){res.status(400).json({error:'Invalid Ava action.'});return;}
  const player=session(req,res);if(!player)return;const {id,state}=player,old=readAva(id),input=parsed.data;
  if(input.generation!==(state.generation||0)){res.status(409).json({error:'Progress changed. Reload the game.'});return;}
  // Stale retries cannot advance two dialogue moments or restart a newer replay.
  const next=input.revision===old.revision?commandAva(old,input.command,state,clock()):old;
  if(next.revision!==old.revision)saveAva(id,next);
  res.json({ava:next});
 });
 const actionSchema=z.discriminatedUnion('action',[
  z.object({action:z.literal('build'),position:z.tuple([z.number().finite(),z.number().finite()]),orientation:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)]).optional(),rig:z.enum(['rig','rig2']).optional(),requestId:z.string().uuid(),generation:z.number().int().min(0)}).strict(),
  z.object({action:z.literal('move'),position:z.tuple([z.number().finite(),z.number().finite()]),orientation:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)]).optional(),rig:z.enum(['rig','rig2']).optional(),requestId:z.string().uuid(),generation:z.number().int().min(0)}).strict(),
  z.object({action:z.literal('collect'),rig:z.enum(['rig','rig2']).optional(),requestId:z.string().uuid(),generation:z.number().int().min(0)}).strict()
 ]);
 app.post('/api/foundation/rig',(req,res)=>{
  const parsed=actionSchema.safeParse(req.body);if(!parsed.success){res.status(400).json({error:'Choose a valid rig action.'});return;}
  const player=session(req,res);if(!player)return;const {id}=player,input=parsed.data,now=clock();db.exec('BEGIN IMMEDIATE');
  try{const state=JSON.parse(db.prepare('SELECT state FROM foundation_saves WHERE id=?').get(id)!.state as string) as FoundationState;
   if(input.generation!==(state.generation||0))throw new Error('Progress was reset. Reopen the building menu.');
   const payload=JSON.stringify(input),cached=db.prepare('SELECT payload,amount FROM foundation_actions WHERE session=? AND id=?').get(id,input.requestId);
   if(cached&&cached.payload!==payload)throw new Error('Request already used for another action.');
   ensureLandscape(state,now,randomUUID());players.record(state);advanceFoundation(state,now);reconcileBuilderHuts(state);influence.settle(player.company.playerId,state,now);players.settle(player.company.playerId,state,now);infiltrations.settle(player.company.playerId,state,now);releaseReserve(state);xp.settle(player.company.playerId,state,now);development.settle(player.company.playerId,state,now);let amount=Number(cached?.amount||0);
   if(!cached){if(input.action==='build')buildRig(state,input.position,now,input.orientation);else if(input.action==='move')moveRig(state,input.position,now,input.orientation,input.rig);else amount=collectRig(state,now,input.rig);db.prepare('INSERT INTO foundation_actions VALUES(?,?,?,?)').run(id,input.requestId,payload,amount);}
   influence.settle(player.company.playerId,state,now);players.settle(player.company.playerId,state,now);infiltrations.settle(player.company.playerId,state,now);releaseReserve(state);xp.settle(player.company.playerId,state,now);development.settle(player.company.playerId,state,now);state.revision++;save(id,state);let ava=observeAva(id,state,now);if(!cached&&input.action==='collect'&&amount>0&&ava.status==='active'&&ava.step>=7){ava=reconcileAva({...ava,collected:true,revision:ava.revision+1},state,now);saveAva(id,ava);}db.exec('COMMIT');res.json({state,serverTime:now,amount,ava,competition:competitionSnapshot(player.company.playerId,state,now),companyXp:xp.snapshot(player.company.playerId),infiltrationCooldowns:BASE_IDS.map(targetId=>({targetId,eligibleAt:infiltrations.eligible(player.company.playerId,targetId)}))});
  }catch(e){db.exec('ROLLBACK');res.status(400).json({error:(e as Error).message});}
 });
 const botAction=z.discriminatedUnion('action',[
  z.object({action:z.literal('commit-layout'),expected:z.string().max(100000),placements:z.array(z.object({id:z.string().min(1).max(100),position:z.tuple([z.number().finite(),z.number().finite()]),orientation:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)])}).strict()).max(800)}).strict(),
  z.object({action:z.literal('set-drone-guard'),drone:z.number().int().min(0).max(1).optional(),position:z.tuple([z.number().finite(),z.number().finite()])}).strict(),
  z.object({action:z.literal('acknowledge-building-update')}).strict(),
  z.object({action:z.literal('acknowledge-hq'),id:z.string().min(1).max(100)}).strict(),
  z.object({action:z.literal('buy-wall'),position:z.tuple([z.number().finite(),z.number().finite()]),orientation:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)])}).strict(),
  z.object({action:z.literal('move-wall'),id:z.string().uuid(),position:z.tuple([z.number().finite(),z.number().finite()]),orientation:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)])}).strict(),
  z.object({action:z.literal('move-wall-row'),id:z.string().min(1).max(100),position:z.tuple([z.number().finite(),z.number().finite()])}).strict(),
  z.object({action:z.literal('move-builder-hut'),id:z.string().min(1).max(100),position:z.tuple([z.number().finite(),z.number().finite()]),orientation:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)])}).strict(),
  z.object({action:z.literal('build-drone-station'),position:z.tuple([z.number().finite(),z.number().finite()]),orientation:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)]).optional()}).strict(),
  z.object({action:z.literal('build-arc-spire'),position:z.tuple([z.number().finite(),z.number().finite()]),orientation:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)]).optional()}).strict(),
  z.object({action:z.literal('build-sentinel'),position:z.tuple([z.number().finite(),z.number().finite()]),orientation:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)]).optional()}).strict(),
  z.object({action:z.literal('infiltration-tutorial'),operationId:z.string().uuid(),result:z.enum(['complete','skipped'])}).strict(),
  z.object({action:z.literal('infiltration-search')}).strict(),
  z.object({action:z.literal('pvp-start'),scoutId:z.string().uuid()}).strict(),
  z.object({action:z.literal('infiltration-start'),targetId:z.enum(BASE_IDS)}).strict(),
  z.object({action:z.literal('infiltration-command'),operationId:z.string().uuid(),intent:z.discriminatedUnion('action',[z.object({action:z.literal('deploy'),troop:z.enum(['pulsewheel','breacher','disruptor']).optional(),position:z.tuple([z.number().finite(),z.number().finite()]).optional()}).strict(),z.object({action:z.literal('abandon')}).strict()])}).strict(),
  z.object({action:z.literal('upgrade-building'),ids:z.array(z.string().min(1).max(120)).min(1).max(140),expectedLevels:z.record(z.string(),z.number().int().min(1).max(5))}).strict(),
  z.object({action:z.literal('build-storage'),kind:z.enum(['computeStorage','researchStorage']),position:z.tuple([z.number().finite(),z.number().finite()]),orientation:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)]).optional()}).strict(),
  z.object({action:z.literal('build-lab'),position:z.tuple([z.number().finite(),z.number().finite()]),orientation:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)]).optional()}).strict(),
  z.object({action:z.literal('collect-research')}).strict(),
  z.object({action:z.literal('upgrade-technology'),technology:z.enum(TECHNOLOGY_IDS),expectedLevel:z.number().int().min(0).max(2)}).strict(),
  z.object({action:z.literal('buy-decoration'),kind:z.enum(['ornamental','cypress','flowers','planter']),position:z.tuple([z.number().finite(),z.number().finite()]),orientation:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)])}).strict(),
  z.object({action:z.literal('move-decoration'),id:z.string().uuid(),position:z.tuple([z.number().finite(),z.number().finite()]),orientation:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)])}).strict(),
  z.object({action:z.literal('remove-decoration'),id:z.string().uuid()}).strict(),
  z.object({action:z.literal('upgrade-hq')}).strict(),
  z.object({action:z.literal('establish-station'),position:z.tuple([z.number().finite(),z.number().finite()]),orientation:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)]).optional()}).strict(),
  z.object({action:z.literal('clear-obstacle'),obstacleId:z.string().min(1).max(100)}).strict(),
  z.object({action:z.literal('acknowledge-hangar')}).strict(),
  z.object({action:z.literal('place-owned-hangar'),position:z.tuple([z.number().finite(),z.number().finite()]),orientation:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)]).optional()}).strict(),
  z.object({action:z.literal('build-hangar'),position:z.tuple([z.number().finite(),z.number().finite()]),orientation:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)]).optional()}).strict(),
  z.object({action:z.literal('build'),position:z.tuple([z.number().finite(),z.number().finite()]),orientation:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)]).optional()}).strict(),
  z.object({action:z.literal('rotate'),building:z.enum(['hq','station','rig','rig2','fabricator','hangar','lab','droneStation','sentinel','arcSpire','computeStorage','researchStorage']),orientation:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)])}).strict(),
  z.object({action:z.literal('move'),building:z.enum(['hq','station','rig','rig2','fabricator','hangar','lab','droneStation','sentinel','arcSpire','computeStorage','researchStorage']),position:z.tuple([z.number().finite(),z.number().finite()]),orientation:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3)])}).strict(),
  z.object({action:z.literal('train'),troop:z.enum(['pulsewheel','breacher','disruptor']).optional(),count:z.number().int().min(1).max(10)}).strict(),
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
   const payload='bots:'+JSON.stringify(input),cached=db.prepare('SELECT payload,amount FROM foundation_actions WHERE session=? AND id=?').get(id,input.requestId);
   if(cached&&cached.payload!==payload)throw new Error('Request already used for another action.');
   ensureLandscape(state,now,randomUUID());players.record(state);advanceFoundation(state,now);reconcileBuilderHuts(state);influence.settle(player.company.playerId,state,now);players.settle(player.company.playerId,state,now);infiltrations.settle(player.company.playerId,state,now);releaseReserve(state);xp.settle(player.company.playerId,state,now);development.settle(player.company.playerId,state,now);
   let amount=Number(cached?.amount??0);if(!cached){const c=input.command;
    if(c.action==='commit-layout'){if(db.prepare("SELECT 1 FROM pvp_battles WHERE defender_id=? AND status='active' AND finished_at IS NULL").get(player.company.playerId))throw Error('Your campus is under attack. Keep this draft and save after the battle.');commitLayout(state,c.expected,c.placements);}
    else if(c.action==='set-drone-guard')setGuardPosition(state,c.position,c.drone??0);
    else if(c.action==='acknowledge-building-update'){if(state.buildingUpdate)state.buildingUpdate.acknowledged=true;}
    else if(c.action==='acknowledge-hq'){if(state.hqNotification?.id===c.id)state.hqNotification.acknowledged=true;}
    else if(c.action==='buy-wall')buyWall(state,c.position,c.orientation,input.requestId);
    else if(c.action==='move-builder-hut')moveBuilderHut(state,c.id,c.position,c.orientation);
    else if(c.action==='move-wall-row')moveWallRow(state,c.id,c.position);
    else if(c.action==='move-wall')moveWall(state,c.id,c.position,c.orientation);
    else if(c.action==='build-arc-spire')buildArcSpire(state,c.position,now,c.orientation);
    else if(c.action==='build-sentinel')buildSentinel(state,c.position,now,c.orientation);
    else if(c.action==='build-drone-station')buildDroneStation(state,c.position,now,c.orientation);
    else if(c.action==='pvp-start')players.start(state,player.company.playerId,c.scoutId,now);
    else if(c.action==='infiltration-start'){startOwnedOperation(state,randomUUID(),c.targetId,now,options.operationFactory??newSquadOperation);}
    else if(c.action==='infiltration-search'){const operationId=randomUUID(),targetId=chooseInfiltrationBase(state,parseInt(operationId.slice(0,8),16),Number(db.prepare("SELECT COUNT(*) n FROM infiltration_results WHERE company_id=? AND status='extracted'").get(player.company.playerId)?.n??0));startOwnedOperation(state,operationId,targetId,now,options.operationFactory??newSquadOperation);}
    else if(c.action==='infiltration-tutorial'){if(state.infiltration?.id!==c.operationId)throw new Error('This operation is no longer active.');state.infiltrationTutorial??=c.result;}
    else if(c.action==='infiltration-command'){if(state.infiltration?.id!==c.operationId)throw new Error('This operation is no longer active.');if(c.intent.action==='deploy')players.validateDeployment(state,now);commandOwnedOperation(state,c.intent,now);}
    else if(c.action==='upgrade-building')upgradeBuildings(state,c.ids,c.expectedLevels,now,input.requestId);
    else if(c.action==='build-storage')buildStorage(state,c.kind,c.position,now,c.orientation);
    else if(c.action==='build-lab')buildResearchLab(state,c.position,now,c.orientation);
    else if(c.action==='collect-research')amount=collectResearch(state,now);
    else if(c.action==='upgrade-technology')purchaseTechnology(state,c.technology,c.expectedLevel,now);
    else if(c.action==='buy-decoration')purchaseDecoration(state,c.kind,c.position,c.orientation,input.requestId);
    else if(c.action==='move-decoration')moveDecoration(state,c.id,c.position,c.orientation);
    else if(c.action==='remove-decoration')removeDecoration(state,c.id);
    else if(c.action==='upgrade-hq')upgradeFounderHQ(state,now,input.requestId);
    else if(c.action==='establish-station')establishBuilderStation(state,c.position,c.orientation);
    else if(c.action==='clear-obstacle')clearObstacle(state,c.obstacleId,now);
    else if(c.action==='build')buildFabricator(state,c.position,now,c.orientation);
    else if(c.action==='acknowledge-hangar')acknowledgeHangar(state);
    else if(c.action==='place-owned-hangar')placeOwnedHangar(state,c.position,c.orientation);
    else if(c.action==='build-hangar')buildHangar(state,c.position,now,c.orientation);
    else if(c.action==='move')moveBuilding(state,c.building,c.position,c.orientation,now);
    else if(c.action==='rotate')rotateBuilding(state,c.building,c.orientation,now);
    else if(c.action==='train')trainTroop(state,c.troop??'pulsewheel',c.count,now);
    else if(c.action==='start'){if(!options.legacyRaids)throw new Error('Raids have been replaced by Infiltration. Reopen the game. Existing raids can still be resumed.');if(state.infiltration&&['ready','active'].includes(state.infiltration.status))throw new Error('Finish your infiltration first.');startBotRaid(state,randomUUID(),c.layout,now);state.botRaid!.companyId=player.company.playerId;influence.register(player.company.playerId,state,now);}
    else if(c.action==='deploy')deployScrap(state,c.raidId,c.position,now);
    else retreatBots(state,c.raidId,now);
    db.prepare('INSERT INTO foundation_actions VALUES(?,?,?,?)').run(id,input.requestId,payload,amount);
   }
   influence.settle(player.company.playerId,state,now);players.settle(player.company.playerId,state,now);infiltrations.settle(player.company.playerId,state,now);releaseReserve(state);xp.settle(player.company.playerId,state,now);development.settle(player.company.playerId,state,now);state.revision++;save(id,state);const ava=observeAva(id,state,now);db.exec('COMMIT');res.json({state,ava,amount,serverTime:now,competition:competitionSnapshot(player.company.playerId,state,now),companyXp:xp.snapshot(player.company.playerId),infiltrationCooldowns:BASE_IDS.map(targetId=>({targetId,eligibleAt:infiltrations.eligible(player.company.playerId,targetId)}))});
  }catch(e){db.exec('ROLLBACK');res.status(400).json({error:(e as Error).message});}
 });
 app.post('/api/foundation/reset',(req,res)=>{
  const input=z.object({confirm:z.literal('RESET FOUNDATION'),revision:z.number().int().min(0)}).strict().safeParse(req.body);
  if(!input.success){res.status(400).json({error:'Confirm the reset before continuing.'});return;}
  const player=session(req,res);if(!player)return;const {id,state}=player;if(state.revision!==input.data.revision){res.status(409).json({error:'Progress changed. Reopen Settings and try again.'});return;}
  if(state.infiltration?.pvp&&['ready','active'].includes(state.infiltration.status)){res.status(409).json({error:'Finish or retreat from your PvP operation before resetting.'});return;}
  const next=initialFoundation(state.revision+1);if(options.buildingGrid){prepareBuildingUpdate(next);next.buildingUpdate!.acknowledged=state.buildingUpdate?.acknowledged??false;}next.raidRecord=state.raidRecord||{wins:[],completeHistory:false};next.generation=(state.generation||0)+1;db.prepare('UPDATE foundation_saves SET state=? WHERE id=?').run(JSON.stringify(next),id);saveAva(id,newAva(readAva(id).revision+1));res.json({state:next,ava:readAva(id),companyXp:xp.snapshot(player.company.playerId),infiltrationCooldowns:BASE_IDS.map(targetId=>({targetId,eligibleAt:infiltrations.eligible(player.company.playerId,targetId)}))});
 });
}
