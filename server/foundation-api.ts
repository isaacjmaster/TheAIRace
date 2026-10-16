import type express from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { initialFoundation, type FoundationState } from '../shared/foundation';
/** Separate table and cookie: foundation resets never touch any previous game save. */
export function registerFoundation(app:express.Express,db:DatabaseSync){
 db.exec('CREATE TABLE IF NOT EXISTS foundation_saves(id TEXT PRIMARY KEY,state TEXT NOT NULL)');
 function session(req:express.Request,res:express.Response){
  const candidate=/(?:^|;\s*)airace_foundation_session=([a-f0-9-]{36})(?:;|$)/.exec(req.headers.cookie||'')?.[1];
  const row=candidate?db.prepare('SELECT state FROM foundation_saves WHERE id=?').get(candidate):undefined;
  if(row)return {id:candidate!,state:JSON.parse(row.state as string) as FoundationState};
  const id=randomUUID(),state=initialFoundation();db.prepare('INSERT INTO foundation_saves VALUES (?,?)').run(id,JSON.stringify(state));
  res.cookie('airace_foundation_session',id,{httpOnly:true,sameSite:'strict',secure:req.secure,maxAge:365*86400000,path:'/'});return {id,state};
 }
 // A foundation player cannot invoke retired gameplay through a stale tab or old URL.
 app.use('/api',(req,res,next)=>{if(/(?:^|;\s*)airace_foundation_session=/.test(req.headers.cookie||'')&&!req.path.startsWith('/foundation')){res.status(410).json({error:'This gameplay belongs to an archived version. Return to the foundation.'});return;}next();});
 app.get('/api/foundation',(req,res)=>res.json({state:session(req,res).state}));
 app.post('/api/foundation/reset',(req,res)=>{
  const input=z.object({confirm:z.literal('RESET FOUNDATION'),revision:z.number().int().min(0)}).strict().safeParse(req.body);
  if(!input.success){res.status(400).json({error:'Confirm the reset before continuing.'});return;}
  const {id,state}=session(req,res);if(state.revision!==input.data.revision){res.status(409).json({error:'Progress changed. Reopen Settings and try again.'});return;}
  const next=initialFoundation(state.revision+1);db.prepare('UPDATE foundation_saves SET state=? WHERE id=?').run(JSON.stringify(next),id);res.json({state:next});
 });
}
