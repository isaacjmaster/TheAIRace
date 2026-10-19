import test from 'node:test';
import assert from 'node:assert/strict';
import {avaHudTarget,avaReadTime,viewportAnchor} from '../src/ui/avaPresentation';
import {newAva,commandAva,reconcileAva} from '../shared/ava';
import {initialFoundation} from '../shared/foundation';
test('explicit HUD targets separate Research from Compute and builder instructions',()=>{
 const p={...newAva(),builderStep:4};
 assert.equal(avaHudTarget({...p,step:5}),'.compute-hud:not(.research-hud) > svg');
 assert.equal(avaHudTarget({...p,step:6}),'.research-hud > svg');
 for(const step of [0,3,7,9,10,11,12,13])assert.equal(avaHudTarget({...p,step}),null);
 assert.equal(avaHudTarget({...p,step:5,builderStep:1}),null);
});
test('world anchors include canvas offsets, track projected motion and hide outside the view',()=>{
 const rect={left:30,top:40,width:360,height:700},viewport={width:430,height:844};
 assert.deepEqual(viewportAnchor({x:100,y:200,z:0},rect,viewport),{x:130,y:240});
 assert.deepEqual(viewportAnchor({x:200,y:300,z:0},rect,viewport),{x:230,y:340});
 assert.equal(viewportAnchor({x:100,y:200,z:0},rect,viewport,[{left:100,right:160,top:150,bottom:220}]),null);
 for(const point of [{x:-1,y:200,z:0},{x:361,y:200,z:0},{x:100,y:701,z:0},{x:100,y:200,z:2},{x:100,y:200,z:-2},{x:100,y:-20,z:0}])assert.equal(viewportAnchor(point,rect,viewport),null);
});
test('read intervals fit text; no presentation timer can complete construction or collection',()=>{
 assert.ok(avaReadTime('Nice! Our Builder Bot is on it.')>=4000);
 assert.ok(avaReadTime('word '.repeat(100))<=12000);
 const s=initialFoundation(),now=100000;s.rig={position:[6,0],orientation:0,startedAt:now,completesAt:now+15000,lastProducedAt:now+15000,stored:0};
 const p={...newAva(),step:10,builderStep:4};
 assert.equal(commandAva(p,'continue',s,now+12000).step,10);
 assert.equal(reconcileAva(p,s,now+15000).step,11);
 assert.equal(commandAva({...p,step:12},'continue',s,now+100000).step,12);
 assert.equal(reconcileAva({...p,step:12,collected:true},s,now).step,13);
 for(const status of ['complete','legacy','skipped'] as const)assert.deepEqual(reconcileAva({...p,status},s,now+100000),{...p,status});
});
