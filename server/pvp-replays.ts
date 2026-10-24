import type {DatabaseSync} from 'node:sqlite';
import {gzipSync,gunzipSync} from 'node:zlib';
import {beginReplayRecording,captureReplayFrame,takeReplayFrames,type BattleReplay,type ReplayFrame} from '../shared/pvp-replay';
import type {Operation} from '../shared/infiltration';

export const REPLAY_RETENTION_DAYS=30,REPLAY_LIMIT=20;
export function replayStore(db:DatabaseSync){
 db.exec(`CREATE TABLE IF NOT EXISTS pvp_replays(id TEXT PRIMARY KEY,initial BLOB NOT NULL,final BLOB,finished_at INTEGER);
 CREATE TABLE IF NOT EXISTS pvp_replay_chunks(battle_id TEXT NOT NULL,sequence INTEGER NOT NULL,payload BLOB NOT NULL,PRIMARY KEY(battle_id,sequence));
 CREATE TABLE IF NOT EXISTS pvp_replay_seen(company_id TEXT PRIMARY KEY,finished_at INTEGER NOT NULL,battle_id TEXT NOT NULL);`);
 const pack=(v:unknown)=>gzipSync(JSON.stringify(v));
 const unpack=<T>(v:unknown):T=>JSON.parse(gunzipSync(v as Uint8Array,{maxOutputLength:32*1024*1024}).toString());
 function start(o:Operation){db.prepare('INSERT OR IGNORE INTO pvp_replays(id,initial) VALUES(?,?)').run(o.id,pack(o));beginReplayRecording(o);captureReplayFrame(o);}
 function record(o?:Operation){if(o?.pvp&&db.prepare('SELECT 1 FROM pvp_replays WHERE id=? AND final IS NULL').get(o.id))beginReplayRecording(o);}
 function flush(o:Operation){captureReplayFrame(o);const frames=takeReplayFrames(o);if(!frames.length)return;
 const sequence=Number(db.prepare('SELECT COALESCE(MAX(sequence),-1)+1 n FROM pvp_replay_chunks WHERE battle_id=?').get(o.id)?.n);
 db.prepare('INSERT INTO pvp_replay_chunks VALUES(?,?,?)').run(o.id,sequence,pack(frames));
 if(o.status==='ready'||o.status==='active')beginReplayRecording(o);
 }
 function finish(o:Operation){flush(o);if(o.startedAt===undefined)return;db.prepare('UPDATE pvp_replays SET final=?,finished_at=? WHERE id=? AND final IS NULL').run(pack(o),o.finishedAt??o.lastTick,o.id);}
 function prune(now:number){
 const cutoff=now-REPLAY_RETENTION_DAYS*86400000;
 const rows=db.prepare(`SELECT r.id FROM pvp_replays r JOIN pvp_battles b ON b.id=r.id WHERE b.created_at<? OR (r.finished_at IS NOT NULL AND (SELECT COUNT(*) FROM pvp_replays n JOIN pvp_battles nb ON nb.id=n.id WHERE nb.defender_id=b.defender_id AND n.finished_at IS NOT NULL AND (n.finished_at>r.finished_at OR (n.finished_at=r.finished_at AND n.id>r.id)))>=?)`).all(cutoff,REPLAY_LIMIT);
 for(const r of rows){db.prepare('DELETE FROM pvp_replay_chunks WHERE battle_id=?').run(String(r.id));db.prepare('DELETE FROM pvp_replays WHERE id=?').run(String(r.id));}
 }
 function available(id:string){return !!db.prepare('SELECT 1 FROM pvp_replays WHERE id=? AND final IS NOT NULL').get(id);}
 function read(id:string,company:string):BattleReplay|undefined{
 const row=db.prepare('SELECT r.*,b.attacker_name,b.defender_name FROM pvp_replays r JOIN pvp_battles b ON b.id=r.id WHERE r.id=? AND r.final IS NOT NULL AND (b.attacker_id=? OR b.defender_id=?)').get(id,company,company);if(!row)return;
 const frames=db.prepare('SELECT payload FROM pvp_replay_chunks WHERE battle_id=? ORDER BY sequence').all(id).flatMap(r=>unpack<ReplayFrame[]>(r.payload));
 if(!frames.length)return;return {version:1,initial:unpack(row.initial),final:unpack(row.final),frames,attacker:String(row.attacker_name),defender:String(row.defender_name),finishedAt:Number(row.finished_at)};
 }
 function notification(company:string){return db.prepare(`SELECT b.id,b.attacker_name name,b.finished_at FROM pvp_battles b JOIN pvp_replays r ON r.id=b.id LEFT JOIN pvp_replay_seen s ON s.company_id=b.defender_id WHERE b.defender_id=? AND r.final IS NOT NULL AND (s.company_id IS NULL OR b.finished_at>s.finished_at OR (b.finished_at=s.finished_at AND b.id>s.battle_id)) ORDER BY b.finished_at DESC,b.id DESC LIMIT 1`).get(company);}
 function acknowledge(company:string,id:string){const row=db.prepare('SELECT finished_at FROM pvp_battles WHERE id=? AND defender_id=? AND finished_at IS NOT NULL').get(id,company);if(!row)return false;db.prepare(`INSERT INTO pvp_replay_seen VALUES(?,?,?) ON CONFLICT(company_id) DO UPDATE SET finished_at=excluded.finished_at,battle_id=excluded.battle_id WHERE excluded.finished_at>finished_at OR (excluded.finished_at=finished_at AND excluded.battle_id>battle_id)`).run(company,Number(row.finished_at),id);return true;}
 return {start,record,flush,finish,prune,available,read,notification,acknowledge};
}
