import type {DatabaseSync} from 'node:sqlite';
import type {FoundationState} from '../shared/foundation';
import {CATALYSTS} from '../shared/catalyst-config';
import {catalystJobs,completeCatalystJob} from '../shared/catalyst-jobs';
/** A separate account wallet: progress resets and ordinary save writes cannot mint or erase Catalysts. */
export function catalystStore(db:DatabaseSync,now:number){
 db.exec(`CREATE TABLE IF NOT EXISTS catalyst_wallets(save_id TEXT PRIMARY KEY REFERENCES foundation_saves(id),balance INTEGER NOT NULL CHECK(balance>=0 AND balance<=9007199254740991),created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS catalyst_events(id INTEGER PRIMARY KEY,save_id TEXT NOT NULL REFERENCES catalyst_wallets(save_id),event_key TEXT NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('introductory-grant','preserved-opening-balance','instant-completion')),delta INTEGER NOT NULL,balance_after INTEGER NOT NULL CHECK(balance_after>=0),at INTEGER NOT NULL,job_id TEXT,metadata TEXT NOT NULL,UNIQUE(save_id,event_key));`);
 function sync(saveId:string,s:FoundationState,time:number){
  let row=db.prepare('SELECT balance FROM catalyst_wallets WHERE save_id=?').get(saveId);
  if(!row){const exists=s.catalysts!==undefined,value=exists?s.catalysts!:CATALYSTS.startingBalance;
   if(!Number.isSafeInteger(value)||value<0)throw Error('Existing Catalyst balance requires manual reconciliation.');
   db.prepare('INSERT INTO catalyst_wallets VALUES(?,?,?)').run(saveId,value,time);
   db.prepare('INSERT INTO catalyst_events(save_id,event_key,kind,delta,balance_after,at,metadata) VALUES(?,?,?,?,?,?,?)').run(saveId,'opening-v1',exists?'preserved-opening-balance':'introductory-grant',value,value,time,JSON.stringify({version:1,source:exists?'existing-saved-balance':'introductory-entitlement'}));row={balance:value};
  }
  s.catalysts=Number(row.balance);return s.catalysts;
 }
 // Validate every legacy balance before granting any account. Full original saves are not rewritten here.
 db.exec('BEGIN IMMEDIATE');let granted=0,preserved=0;try{const pending=db.prepare('SELECT s.id,s.state FROM foundation_saves s LEFT JOIN catalyst_wallets w ON w.save_id=s.id WHERE w.save_id IS NULL').all();for(const row of pending){const s=JSON.parse(String(row.state)) as FoundationState;if(s.catalysts!==undefined&&(!Number.isSafeInteger(s.catalysts)||s.catalysts<0))throw Error('Existing Catalyst balance requires manual reconciliation.');}for(const row of pending){const s=JSON.parse(String(row.state)) as FoundationState;if(s.catalysts===undefined)granted++;else preserved++;sync(String(row.id),s,now);}db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
 console.log('Catalyst wallets verified',JSON.stringify({introductoryGrants:granted,preservedBalances:preserved}));
 function spend(saveId:string,s:FoundationState,jobId:string,maxCost:number,requestId:string,time:number){
  const balance=sync(saveId,s,time),job=catalystJobs(s,time).find(j=>j.id===jobId);
  if(!job)return 0; // Natural expiration or a retry never charges for the next queued job.
  if(job.cost>maxCost)throw Error('The price changed. Review the current quote before finishing.');
  if(balance<job.cost)throw Error(`You need ${job.cost} Catalysts; your balance is ${balance}.`);
  const completed=completeCatalystJob(s,jobId,time);if(!completed.completed)return 0;
  if(completed.cost!==job.cost)throw Error('Completion quote changed. Please review the task again.');
  const result=db.prepare('UPDATE catalyst_wallets SET balance=balance-? WHERE save_id=? AND balance>=?').run(job.cost,saveId,job.cost);if(result.changes!==1)throw Error('Your Catalyst balance changed. Please retry.');
  s.catalysts=balance-job.cost;
  db.prepare('INSERT INTO catalyst_events(save_id,event_key,kind,delta,balance_after,at,job_id,metadata) VALUES(?,?,?,?,?,?,?,?)').run(saveId,'finish:'+requestId,'instant-completion',-job.cost,s.catalysts,time,job.id,JSON.stringify({generation:s.generation??0,kind:job.kind,target:job.target,label:job.label,remainingMs:job.completesAt-time,approvedMaximum:maxCost}));return job.cost;
 }
 return {sync,spend};
}
