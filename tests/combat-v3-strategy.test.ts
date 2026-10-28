import {historicalMission} from './fixtures/historical-missions';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newSquadOperation,commandSquad,advanceSquad} from '../shared/squad-infiltration';
import {breachRating} from '../shared/breach-rating';
import {APEX_BALANCE_CASES} from './fixtures/apex-balance-orders';
// These exercise real commands, targeting, navigation, damage, timers and outcome rules.
// No benchmark output files or patched combat constants are required at test runtime.
for(const row of APEX_BALANCE_CASES)test(`Historical v3 Apex strategy regression: ${row.name} earns ${row.tokens} tokens`,()=>{const o=historicalMission('balance','apex-compute',1000);delete o.squad!.behaviorVersion;o.squad!.undeployed=row.pulse;o.squad!.undeployedBreacher=row.heavy;o.cipherDamageMultiplier=1;let next=0;for(let now=1000;now<=181000;now+=100){while(next<row.orders.length&&row.orders[next][0]<=now&&(o.status==='ready'||o.status==='active')){const [,troop,x,z]=row.orders[next++];commandSquad(o,{action:'deploy',troop,position:[x,z]},now);}advanceSquad(o,now);if(o.status!=='ready'&&o.status!=='active')break;}assert.equal(next,row.orders.length,'every recorded deployment must execute');assert.equal(o.squad!.agents.length,row.pulse+row.heavy);assert.notEqual(o.status,'active');assert.equal(breachRating(o).count,row.tokens);});
