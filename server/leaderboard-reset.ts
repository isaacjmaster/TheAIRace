import type {DatabaseSync} from 'node:sqlite';

/** Owner-requested pre-launch score reset. Never change this id to repeat it. */
export const LAUNCH_SCORE_RESET='fresh-leaderboard-2026-10-22';

export function resetLaunchLeaderboard(db:DatabaseSync,now=Date.now()){
 db.exec('BEGIN IMMEDIATE');
 try{
  db.exec(`CREATE TABLE IF NOT EXISTS leaderboard_score_resets(id TEXT PRIMARY KEY,applied_at INTEGER NOT NULL,companies INTEGER NOT NULL,previous_total INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS leaderboard_score_reset_backup(reset_id TEXT NOT NULL,company_id TEXT NOT NULL,total INTEGER NOT NULL,PRIMARY KEY(reset_id,company_id));`);
  if(db.prepare('SELECT 1 FROM leaderboard_score_resets WHERE id=?').get(LAUNCH_SCORE_RESET)){db.exec('COMMIT');return null;}
  const before=db.prepare('SELECT COUNT(*) companies,COALESCE(SUM(total),0) previous_total FROM company_influence WHERE total>0').get()!;
  db.prepare('INSERT INTO leaderboard_score_reset_backup SELECT ?,company_id,total FROM company_influence WHERE total>0').run(LAUNCH_SCORE_RESET);
  db.exec('UPDATE company_influence SET total=0 WHERE total<>0');
  const result={companies:Number(before.companies),previousTotal:Number(before.previous_total)};
  db.prepare('INSERT INTO leaderboard_score_resets VALUES(?,?,?,?)').run(LAUNCH_SCORE_RESET,now,result.companies,result.previousTotal);
  db.exec('COMMIT');
  console.log(`[leaderboard] ${LAUNCH_SCORE_RESET}: reset ${result.companies} scored companies to 0; previous totals archived. Company saves and award receipts preserved.`);
  return result;
 }catch(error){db.exec('ROLLBACK');throw error;}
}
