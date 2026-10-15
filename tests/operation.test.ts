import test from 'node:test';
import assert from 'node:assert/strict';
import {applyExpeditionCommand as apply,createExpeditionState as fresh,cargoCount,RIG_UPGRADE} from '../src/game/expedition';
import {advanceOperation,operationPath} from '../src/game/operation';
import type {ExpeditionState} from '../shared/expedition';

const launch=(time=1000,rigLevel=0)=>apply({...fresh(),rigLevel},{type:'launch'},time);
function finish(initial:ExpeditionState){let state=initial;let time=state.run!.operation!.lastTickAt;for(let i=0;i<150&&state.run&&!state.run.operation!.paused;i++){time+=1000;state=apply(state,{type:'sync'},time);}return state;}
test('autonomy gathers and banks without tile inputs; first rig takes at most two outings',()=>{
  for(const start of Array.from({length:50},(_,i)=>1000+i*1237)){
    let state=finish(launch(start));assert.equal(state.run,null,`unfinished ${start}`);assert.ok(cargoCount(state.resources)>0);
    if(state.resources.scrap<6||state.resources.cells<2)state=finish(apply(state,{type:'launch'},start+200000));
    assert.ok(state.resources.scrap>=6&&state.resources.cells>=2,JSON.stringify({start,resources:state.resources}));
    const upgraded=apply(state,{type:'upgrade'},start+400000);assert.equal(upgraded.rigLevel,1);
    assert.equal(upgraded.resources.scrap,state.resources.scrap-RIG_UPGRADE.cost.scrap);
  }
});
test('pause freezes Pixel, battery and patrols; orders are editable while paused',()=>{
  let state=apply(launch(),{type:'pause',paused:true},1000);const before=structuredClone(state.run);
  state=apply(state,{type:'sync'},9000);assert.deepEqual(state.run!.position,before!.position);assert.equal(state.run!.energy,before!.energy);assert.deepEqual(state.run!.operation!.patrols,before!.operation!.patrols);
  state=apply(state,{type:'order',order:'scout',risk:'bold',focus:'gpu'},9000);assert.equal(state.run!.operation!.paused,true);assert.equal(state.run!.operation!.order,'scout');
  state=apply(state,{type:'pause',paused:false},10000);state=apply(state,{type:'sync'},11000);assert.equal(state.run!.operation!.tick,1);
});
test('world variation is deterministic, reachable and retains exact deposit yields',()=>{
  const first=launch(1000),repeat=launch(1000);assert.deepEqual(first,repeat);
  const layouts=new Set<string>();
  for(let i=0;i<15;i++){
    const state=launch(1000+i*1237),world=state.run!.operation!.world;layouts.add(JSON.stringify(world.deposits.map(d=>d.position)));
    for(const d of world.deposits){assert.equal(d.amount,d.resource==='scrap'?3:d.resource==='cells'?1:2);assert.ok([{x:d.position.x+1,y:d.position.y},{x:d.position.x-1,y:d.position.y},{x:d.position.x,y:d.position.y+1},{x:d.position.x,y:d.position.y-1}].some(p=>operationPath(world,world.dock,p,1)!==null));}
  }
  assert.ok(layouts.size>2);
});
test('Hold keeps Pixel stationary while moving patrols can drain exposed battery',()=>{
  let state=launch();state=apply(state,{type:'order',order:'hold'},1000);
  const op=state.run!.operation!,patrol=op.patrols[0];state.run!.position={...patrol.route[(patrol.index+1)%patrol.route.length]};const position={...state.run!.position};
  const energy=state.run!.energy;state=apply(state,{type:'sync'},2000);
  assert.deepEqual(state.run!.position,position);assert.equal(state.run!.energy,energy-3);assert.equal(state.run!.operation!.event,'hazard');
});
test('scouting reveals caches; changing orders returns and banks exact cargo once',()=>{
  let state=apply(launch(),{type:'order',order:'scout'},1000);let time=1000;
  for(let i=0;i<20&&state.run!.operation!.order==='scout';i++){time+=1000;state=apply(state,{type:'sync'},time);}
  assert.equal(state.run!.operation!.order,'hold');assert.equal(state.run!.operation!.discovered.length,3);
  state.run!.cargo={scrap:3,cells:1,gpu:0};state=apply(state,{type:'order',order:'return'},time);state=finish(state);
  assert.equal(state.run,null);assert.deepEqual(state.resources,{scrap:3,cells:1,gpu:0});assert.equal(state.lastResult!.evacuated,false);assert.throws(()=>apply(state,{type:'sync'},time+100000),/Launch/);
});
test('server tick catchup bounded and inactive sessions auto-pause without losses',()=>{
  const state=launch(),before=structuredClone(state);const bounded=advanceOperation(state,6000);assert.equal(bounded.run!.operation!.tick,3);assert.deepEqual(state,before);
  const inactive=advanceOperation(state,1000000);assert.equal(inactive.run!.operation!.paused,true);assert.equal(inactive.run!.operation!.tick,0);assert.equal(inactive.run!.energy,26);
});
test('invalid input and legacy coordinate commands cannot bypass autonomy or mutate save',()=>{
  const state=launch(),before=structuredClone(state);
  for(const command of [{type:'launch',seed:123},{type:'sync',elapsed:4000},{type:'order',order:'dance'},{type:'pause',paused:1},{type:'move',to:{x:0,y:4}},{type:'gather',depositId:'scrap-pile'},{type:'return'},{type:'recharge'}])assert.throws(()=>apply(state,command as never,2000));
  assert.deepEqual(state,before);
});
test('serialized operations resume deterministically and old expedition runs stay valid',()=>{
  const state=apply(launch(),{type:'sync'},2000);assert.deepEqual(apply(JSON.parse(JSON.stringify(state)),{type:'sync'},3000),apply(state,{type:'sync'},3000));
  let old=apply(fresh(),{type:'depart'},1000);old=apply(old,{type:'move',to:{x:0,y:4}},1000);assert.equal(old.run!.operation,undefined);assert.equal(old.run!.energy,25);
});
test('upgraded autonomous GPU sorties bank valuable cargo across varied patrol phases',()=>{
  for(let i=0;i<25;i++){
    const started=apply(launch(1000+i*1237,1),{type:'order',order:'gather',focus:'gpu'},1000+i*1237);
    const state=finish(started);assert.equal(state.run,null,`unfinished GPU sortie ${i}`);assert.ok(state.resources.gpu>=2,`no GPU on sortie ${i}`);
  }
});
test('safe route avoids patrol current and predicted positions; bold takes a costly shortcut',()=>{
  const setup=()=>{const state=launch();const run=state.run!,op=run.operation!;run.position={x:0,y:3};op.patrols[0].index=5;op.patrols[0].position={...op.patrols[0].route[5]};op.world.deposits.find(d=>d.resource==='cells')!.position={x:2,y:2};op.discovered=op.world.deposits.map(d=>d.id);op.focus='cells';return state;};
  const safe=apply(setup(),{type:'sync'},2000);const boldInitial=setup();boldInitial.run!.operation!.risk='bold';const bold=apply(boldInitial,{type:'sync'},2000);
  assert.ok(!samePoint(safe.run!.position,{x:1,y:3}));assert.deepEqual(bold.run!.position,{x:1,y:3});assert.equal(bold.run!.energy,22);assert.equal(bold.run!.operation!.event,'hazard');
});
const samePoint=(a:{x:number,y:number},b:{x:number,y:number})=>a.x===b.x&&a.y===b.y;


