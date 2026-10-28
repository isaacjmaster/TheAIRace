import test from 'node:test';import assert from 'node:assert/strict';
import {BASE_IDS,BASE_REWARDS,MISSION_CATALOG,craftCampusTarget,chooseInfiltrationBase} from '../shared/infiltration-bases';
import {newSquadOperation} from '../shared/squad-infiltration';
import {buildingStats} from '../shared/building-levels';
import {initialFoundation} from '../shared/foundation';
import {validDeployment} from '../shared/infiltration';
test('ten mission snapshots launch with independent real layouts and matching building/weapon tiers',()=>{
 assert.equal(BASE_IDS.length,10);const hashes=new Set<string>();
 for(const [i,id] of BASE_IDS.entries()){const a=craftCampusTarget(id),o=newSquadOperation('check-'+id,id,1000),m=MISSION_CATALOG[i];assert.equal(o.target.id,id);assert.equal(o.target.name,m.name);assert.equal(o.target.hqLevel,m.hqLevel);assert.equal(o.squad?.balanceVersion,4);assert.ok(validDeployment(o.target,o.target.entry));assert.equal(a.influence,BASE_REWARDS[i].influence);hashes.add(JSON.stringify(a.assets.map(x=>x.position)));
 for(const asset of a.assets){assert.equal(asset.level,asset.kind==='hq'?m.hqLevel:asset.model==='arcSpire'?m.arcLevel??m.buildingLevel:m.buildingLevel);assert.equal(asset.maxHealth,buildingStats(asset.model!,asset.level!).maxHealth);assert.ok(asset.access);}
 for(const tower of a.sentinels??[]){assert.equal(tower.damage,buildingStats('sentinel',m.buildingLevel).sentinelDamage);assert.ok(a.assets.some(x=>x.id===tower.id&&x.model==='sentinel'));}
 for(const arc of a.arcSpires??[]){assert.equal(arc.damage,buildingStats('arcSpire',m.arcLevel??m.buildingLevel).arcDamage);assert.ok(a.assets.some(x=>x.id===arc.id&&x.model==='arcSpire'));}
 for(const d of o.drones)assert.equal(d.health,o.target.defenses.find(v=>v.id===d.id)!.maxHealth);
 const original=JSON.stringify(a);o.target.assets[0].level=1;assert.equal(JSON.stringify(craftCampusTarget(id)),original);
 }assert.equal(hashes.size,10);
});
test('mission stages respect wall limits, contain no solid overlaps, and retain tiered wall health',()=>{for(const [i,id] of BASE_IDS.entries()){const t=craftCampusTarget(id),m=MISSION_CATALOG[i];assert.ok((t.walls?.length??0)<=[100,100,120,160,200][m.hqLevel-1]);for(const [j,a]of t.assets.entries()){for(const b of t.assets.slice(j+1))assert.ok(Math.abs(a.position[0]-b.position[0])>=(a.size[0]+b.size[0])/2||Math.abs(a.position[1]-b.position[1])>=(a.size[1]+b.size[1])/2,`${id}:${a.id}/${b.id}`);for(const w of t.walls??[])assert.ok(Math.abs(a.position[0]-w.x)>=a.size[0]/2+w.w/2||Math.abs(a.position[1]-w.z)>=a.size[1]/2+w.d/2,`${id}:${a.id}/${w.id}`);}for(const w of t.walls??[]){assert.equal(w.maxHealth,buildingStats('wall',m.buildingLevel).maxHealth);assert.ok(w.w<=1&&w.d<=1);}}assert.equal(craftCampusTarget('zenith-intelligence').walls?.length,200);});
test('automatic recommendations expand to ten at HQ5 without changing manual mission IDs',()=>{const s=initialFoundation();s.founderHqLevel=5;assert.equal(new Set(Array.from({length:100},(_,i)=>chooseInfiltrationBase(s,i))).size,10);s.founderHqLevel=1;s.bots=0;assert.equal(chooseInfiltrationBase(s,99),'lumen-labs');assert.throws(()=>craftCampusTarget('unknown'));});
