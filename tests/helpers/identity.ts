import {createHash} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
export function identityHeaders(db:DatabaseSync,cookie:string){const value=cookie.split('=')[1],digest=createHash('sha256').update(value).digest('hex');const row=db.prepare('SELECT player_id FROM company_sessions WHERE token_hash=?').get(digest);return {cookie,'content-type':'application/json','X-Company-ID':row?.player_id as string||''};}
export function saveIdForCookie(db:DatabaseSync,cookie:string){const headers=identityHeaders(db,cookie);return db.prepare('SELECT save_id FROM company_players WHERE id=?').get(headers['X-Company-ID'])!.save_id as string;}
