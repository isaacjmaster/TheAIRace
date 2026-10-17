import test from 'node:test';
import assert from 'node:assert/strict';
import {simulate,approaches} from '../raid/scrap-simulation';
import {createStarterRaid} from '../raid/starter';
import {createRaid,deploy,tick,STEP,destruction,unitStats} from '../raid/engine';
import {initialFoundation,startBotRaid,deployScrap,advanceFoundation} from '../shared/foundation';
test('repeatable balance matrix rewards grouping and deployment position, not troop-count scripting',()=>{
 for(const approach of Object.keys(approaches) as (keyof typeof approaches)[]){assert.equal(simulate(0,1,approach).won,false);assert.equal(simulate(0,3,approach).won,false);assert.equal(simulate(0,10,approach).won,true);assert.equal(simulate(1,5,approach).won,false);}
 assert.equal(simulate(0,5,'north').won,true);assert.equal(simulate(0,5,'east').won,false);assert.equal(simulate(1,10,'north').won,true);assert.equal(simulate(1,10,'east').won,false);
 assert.ok(simulate(1,10,'north').survivors<simulate(0,10,'north').survivors);assert.deepEqual(simulate(1,10,'north'),simulate(1,10,'north'));
});
test('laser targeting, real damage, elimination and destroyed-defense silence are deterministic',()=>{
 const r=createStarterRaid(0,{scout:0,tank:0,breaker:0,scrap:1});assert.equal(deploy(r,'scrap',{x:9,y:2}),true);const tower=r.buildings.find(b=>b.kind==='turret')!;tick(r);assert.equal(tower.target,r.units[0].id);assert.equal(r.units[0].hp,46);assert.equal(r.defenseDamage![tower.id],16);
 const damage=r.defenseDamage![tower.id];tower.hp=0;for(let i=0;i<30;i++)tick(r);assert.equal(r.defenseDamage![tower.id],damage);
 const solo=createStarterRaid(0,{scout:0,tank:0,breaker:0,scrap:1});deploy(solo,'scrap',{x:9,y:2});while(!solo.ended)tick(solo);assert.equal(solo.reason,'Squad eliminated');assert.equal(solo.lost,1);assert.equal(solo.units[0].hp,0);
});
test('deployment rejects snapped enemy territory, consumes one trained slot and rejects exhausted stock',()=>{
 const r=createStarterRaid(0,{scout:0,tank:0,breaker:0,scrap:1});assert.equal(deploy(r,'scrap',{x:5.6,y:9}),false);assert.equal(r.stock.scrap,1);assert.equal(deploy(r,'scrap',{x:9,y:2}),true);assert.equal(deploy(r,'scrap',{x:9,y:2}),false);assert.equal(r.units.length,1);
});
test('saved unversioned starter raids retain original stats, maps, firing and replay outcomes',()=>{
 for(const [p,win,percent] of [[{x:9,y:2},false,67],[{x:17,y:16},true,100]] as const){const r=createRaid(0,{scout:0,tank:0,breaker:0,scrap:1});r.starter=true;for(const b of r.buildings)b.hp=b.maxHp=b.kind==='wall'?40:b.kind==='core'?300:b.kind==='vault'?120:160;
 const saved=JSON.parse(JSON.stringify(r));assert.equal(unitStats(saved,'scrap').damage,18);deploy(saved,'scrap',p);assert.equal(saved.units[0].hp,110);while(!saved.ended)tick(saved);assert.equal(saved.reason==='Network cleared',win);assert.equal(destruction(saved),percent);}
});
test('offline settlement returns only undeployed troops and verifies first/repeat victories without increasing reward ceiling',()=>{
 const s=initialFoundation();s.bots=10;startBotRaid(s,'first',1,1000);s.botRaid!.companyId='verified-company';for(let i=0;i<10;i++)deployScrap(s,'first',{x:9,y:2},1000);const restored=JSON.parse(JSON.stringify(s));advanceFoundation(restored,100000);assert.equal(restored.botRaid.result.victory,true);assert.equal(restored.botRaid.result.companyId,'verified-company');assert.equal(restored.botRaid.result.previouslyCompleted,false);assert.equal(restored.botRaid.reward,45);assert.equal(restored.bots,0);const balance=restored.compute;advanceFoundation(restored,200000);assert.equal(restored.compute,balance);
 restored.bots=10;startBotRaid(restored,'second',1,200000);for(let i=0;i<10;i++)deployScrap(restored,'second',{x:9,y:2},200000);advanceFoundation(restored,300000);assert.equal(restored.botRaid.result.previouslyCompleted,true);
 const legacy=initialFoundation();delete legacy.raidRecord;legacy.bots=10;startBotRaid(legacy,'legacy',0,1000);for(let i=0;i<10;i++)deployScrap(legacy,'legacy',{x:9,y:2},1000);advanceFoundation(legacy,100000);assert.equal(legacy.botRaid!.result!.previouslyCompleted,null);
});
