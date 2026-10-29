import type {DatabaseSync} from 'node:sqlite';

/** Startup-only restoration. Never rebase future wins/losses on Influence. */
export function restoreInfluenceRating(db:DatabaseSync, now=Date.now()) {
 db.exec(`CREATE TABLE IF NOT EXISTS rating_restoration_versions(version TEXT PRIMARY KEY,completed_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS rating_restoration_audit(company_id TEXT PRIMARY KEY,influence INTEGER NOT NULL,rating_before INTEGER NOT NULL,rating_after INTEGER NOT NULL,restored_at INTEGER NOT NULL);`);
 db.exec('BEGIN IMMEDIATE');
 try {
  if(db.prepare("SELECT 1 FROM rating_restoration_versions WHERE version='influence-v1'").get()){db.exec('COMMIT');return 0;}
  const hasInfluence=!!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='company_influence'").get();
  const rows=db.prepare(`SELECT p.id,COALESCE(r.total,0) rating,${hasInfluence?'COALESCE(i.total,0)':'0'} influence FROM company_players p LEFT JOIN company_infiltration_ratings r ON r.company_id=p.id ${hasInfluence?'LEFT JOIN company_influence i ON i.company_id=p.id':''}`).all();
  const audit=db.prepare('INSERT INTO rating_restoration_audit VALUES(?,?,?,?,?)');
  const save=db.prepare('INSERT INTO company_infiltration_ratings VALUES(?,?) ON CONFLICT(company_id) DO UPDATE SET total=excluded.total');
  let changed=0;
  for(const row of rows){
   const before=Number(row.rating),influence=Number(row.influence),after=Math.max(before,influence);
   audit.run(row.id,influence,before,after,now);save.run(row.id,after);if(after>before)changed++;
  }
  db.prepare('INSERT INTO rating_restoration_versions VALUES(?,?)').run('influence-v1',now);
  db.exec('COMMIT');
  console.log(`Influence rating restoration v1: ${rows.length} accounts audited, ${changed} scores restored.`);
  return changed;
 } catch(error){db.exec('ROLLBACK');throw error;}
}
