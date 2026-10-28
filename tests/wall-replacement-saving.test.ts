import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {initialFoundation} from '../shared/foundation';
import {prepareWallRebuild} from '../shared/wall-rebuild';
import {commitLayout,layoutFingerprint,layoutInventory,type LayoutPlacement} from '../shared/layout-draft';
import {worldFixture} from './helpers/player-world-fixture';
import {replacementDefense} from '../server/replacement-defense';
import {validWallPosition} from '../shared/cybersecurity';
function pending(){const s=initialFoundation();delete s.wallRebuild;s.landscape={items:[]} as any;s.walls=Array.from({length:100},(_,i)=>({id:'w'+i,position:[-25.5+i%20,15.5+Math.floor(i/20)] as [number,number],orientation:0 as const}));s.buildingLevels=Object.fromEntries(s.walls.map((w,i)=>['wall:'+w.id,i%5+1])) as any;prepareWallRebuild(s,100);return s;}
function placements(s:ReturnType<typeof pending>,count:number):LayoutPlacement[]{return layoutInventory(s).filter(i=>i.kind!=='wall'||Number(i.id.slice(1))<count).map(i=>({id:i.id,position:[...i.layout.position],orientation:i.layout.orientation}));}
test('one, partial and full replacement commits conserve 100 identities and mixed levels across reloads',()=>{
 let s=pending();const levels=structuredClone(s.buildingLevels);
 for(const count of [1,60,100]){const expected=layoutFingerprint(s);commitLayout(s,expected,placements(s,count),200+count);assert.equal(s.walls!.length,count);assert.equal(s.wallRebuild!.inventory.length,100-count);assert.equal(new Set([...s.walls!,...s.wallRebuild!.inventory].map(w=>w.id)).size,100);assert.deepEqual(s.buildingLevels,levels);assert.equal(s.wallRebuild!.firstCommittedAt,201);assert.equal(s.buildingUpdate!.pending,count<100);s=JSON.parse(JSON.stringify(s));}
 assert.equal(s.wallRebuild!.completedAt,300);
});
test('duplicate, unknown, stale, overlap and missing nonwall requests leave the entire state unchanged',()=>{
 const s=pending(),before=structuredClone(s),p=placements(s,1),fingerprint=layoutFingerprint(s);
 for(const invalid of [[...p,p.at(-1)!],[...p,{...p.at(-1)!,id:'unowned'}],p.filter(x=>x.id!=='hq'),[...p,{id:'w1',position:[...p.at(-1)!.position] as [number,number],orientation:0 as const}]]){assert.throws(()=>commitLayout(s,fingerprint,invalid));assert.deepEqual(s,before);}
 commitLayout(s,fingerprint,p,200);const committed=structuredClone(s);assert.throws(()=>commitLayout(s,fingerprint,p),/changed/);assert.deepEqual(s,committed);
});
test('real layout API retries are idempotent and stale tabs cannot overwrite a partial save',async()=>{
 const f=await worldFixture();try{const owner=await f.fresh('WallSaver'),s=pending();s.companyName='WallSaver';f.save(owner,s);const requestId=randomUUID(),command={action:'commit-layout',expected:layoutFingerprint(s),placements:placements(s,60)};
 const first=await f.command(owner,command,requestId);assert.equal(first.status,200,JSON.stringify(first.data));
 const retry=await f.command(owner,command,requestId);assert.equal(retry.status,200,JSON.stringify(retry.data));assert.equal(f.read(owner).walls!.length,60);assert.equal(f.read(owner).wallRebuild!.inventory.length,40);
 const stale=await f.command(owner,{...command,placements:placements(s,1)});assert.notEqual(stale.status,200);assert.equal(f.read(owner).walls!.length,60);assert.equal(f.read(owner).wallRebuild!.inventory.length,40);
 }finally{await f.close();}
});
test('migration defense uses exact original snapshot then switches on first committed replacement without extending shields',async()=>{
 const f=await worldFixture();try{const owner=await f.fresh('WallDefense'),s=pending(),original=structuredClone(s);original.walls=structuredClone(s.wallRebuild!.inventory);delete original.wallRebuild;delete original.buildingUpdate;
 f.db.exec('CREATE TABLE IF NOT EXISTS wall_rebuild_v1_snapshots(save_id TEXT PRIMARY KEY,state TEXT NOT NULL,inventory_audit TEXT NOT NULL,created_at INTEGER NOT NULL)');
 f.db.prepare('INSERT INTO wall_rebuild_v1_snapshots VALUES(?,?,?,?)').run(owner.saveId,JSON.stringify(original),'[]',100);
 assert.deepEqual(replacementDefense(f.db,owner.saveId,s,1e12).state,original);assert.equal(replacementDefense(f.db,owner.saveId,s,1e12).protected,false);
 commitLayout(s,layoutFingerprint(s),placements(s,1),200);assert.equal(replacementDefense(f.db,owner.saveId,s,201).state.walls!.length,1);
 const missing=pending();assert.equal(replacementDefense(f.db,'missing',missing,101).protected,true);assert.equal(replacementDefense(f.db,'missing',missing,100+86400000).protected,false);
 }finally{await f.close();}
});
test('failed database write rolls back layout and receipt together, allowing a safe same-request retry',async()=>{
 const f=await worldFixture();try{const owner=await f.fresh('AtomicWalls'),s=pending();f.save(owner,s);const before=JSON.stringify(f.read(owner)),requestId=randomUUID(),command={action:'commit-layout',expected:layoutFingerprint(s),placements:placements(s,60)};
 f.db.exec("CREATE TRIGGER reject_layout BEFORE UPDATE ON foundation_saves BEGIN SELECT RAISE(ABORT,'test disk failure'); END");
 const failed=await f.command(owner,command,requestId);assert.notEqual(failed.status,200);assert.equal(JSON.stringify(f.read(owner)),before);assert.equal(f.db.prepare('SELECT 1 FROM foundation_actions WHERE session=? AND id=?').get(owner.saveId,requestId),undefined);
 f.db.exec('DROP TRIGGER reject_layout');assert.equal((await f.command(owner,command,requestId)).status,200);assert.equal(f.read(owner).walls!.length,60);assert.equal(f.read(owner).wallRebuild!.inventory.length,40);
 }finally{await f.close();}
});
test('public campus serves the backed-up defenses until the authoritative partial commit',async()=>{
 const f=await worldFixture();try{const viewer=await f.fresh('DefenseViewer'),owner=await f.fresh('DefenseOwner','developed'),original=f.read(owner),s=structuredClone(original);s.landscape!.legacyRocksRegistered=true;delete s.wallRebuild;prepareWallRebuild(s,f.time());f.save(owner,s);
 f.db.exec('CREATE TABLE IF NOT EXISTS wall_rebuild_v1_snapshots(save_id TEXT PRIMARY KEY,state TEXT NOT NULL,inventory_audit TEXT NOT NULL,created_at INTEGER NOT NULL)');f.db.prepare('INSERT INTO wall_rebuild_v1_snapshots VALUES(?,?,?,?)').run(owner.saveId,JSON.stringify(original),'[]',f.time());
 const before=await f.get(viewer,`/players/${owner.id}/base`);assert.equal(before.status,200);assert.equal(before.data.base.walls.length,original.walls!.length);
 const p:LayoutPlacement[]=layoutInventory(s).filter(i=>i.kind!=='wall').map(i=>({id:i.id,...i.layout}));p.push({id:s.wallRebuild!.inventory[0].id,position:[-30.5,25.5],orientation:0});commitLayout(s,layoutFingerprint(s),p,f.time());f.save(owner,s);
 const after=await f.get(viewer,`/players/${owner.id}/base`);assert.equal(after.status,200);assert.equal(after.data.base.walls.length,1);assert.equal(f.read(owner).wallRebuild!.inventory.length,original.walls!.length-1);
 }finally{await f.close();}
});
test('grid replacement preserves normal wall placement clearance around building entrances',()=>{
 const s=pending();s.landscape!.legacyRocksRegistered=true;const buildings=placements(s,0);
 for(let x=-12.5;x<=3.5;x++)for(let z=-8.5;z<=8.5;z++){
  const p:LayoutPlacement={id:'w0',position:[x,z],orientation:0};
  const ordinary=validWallPosition(s,p.position,p.orientation,p.id);
  let replacementValid=true;try{commitLayout(structuredClone(s),layoutFingerprint(s),[...buildings,p],200);}catch{replacementValid=false;}
  assert.equal(replacementValid,!ordinary,`clearance parity at ${x},${z}`);
 }
});
