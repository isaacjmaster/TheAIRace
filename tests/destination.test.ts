import test from 'node:test';
import assert from 'node:assert/strict';
import {applyExpeditionCommand as apply,createExpeditionState as fresh,cargoCount,WORLD} from '../src/game/expedition';
import {operationPath} from '../src/game/operation';
import type {ExpeditionState} from '../shared/expedition';

test('old empty-battery saves already at the dock can bank their entire cargo',()=>{
  const state=apply(fresh(),{type:'depart'},1000);
  state.run!.energy=0;state.run!.cargo={scrap:3,cells:1,gpu:0};
  const returned=apply(state,{type:'headHome'},2000);
  assert.equal(returned.run,null);assert.deepEqual(returned.resources,{scrap:3,cells:1,gpu:0});
  assert.equal(returned.lastResult!.evacuated,false);
});

function nextDecision(initial:ExpeditionState){
  let state=initial,time=state.run!.operation!.lastTickAt;
  for(let i=0;i<150&&state.run&&!state.run.operation!.paused;i++)state=apply(state,{type:'sync'},time+=1000);
  return state;
}
function time(state:ExpeditionState){return state.run!.operation!.lastTickAt;}
function finish(initial:ExpeditionState){return nextDecision(apply(initial,{type:'headHome'},time(initial)));}

test('destination batches pause for continue versus return and full rig loop preserves exact costs',()=>{
  for(let i=0;i<25;i++){
    let state=apply(fresh(),{type:'launch',destination:'safe'},1000+i*1237);
    state=nextDecision(state);assert.equal(state.run!.cargo.scrap,3);assert.equal(state.run!.operation!.paused,true);
    assert.match(state.run!.operation!.status,/Continue or return/);
    state=nextDecision(apply(state,{type:'destination',destination:'safe'},time(state)));
    assert.equal(state.run!.cargo.scrap,6);
    for(let j=0;j<2;j++){
      state=nextDecision(apply(state,{type:'destination',destination:'medium'},time(state)));
      assert.ok(state.run,`unexpected return ${i}`);assert.equal(state.run!.cargo.cells,j+1);
    }
    const expected=structuredClone(state.run!.cargo);
    state=finish(state);assert.equal(state.run,null);assert.deepEqual(state.resources,expected);
    state=apply(state,{type:'upgrade'},200000);assert.equal(state.rigLevel,1);assert.deepEqual(state.resources,{scrap:0,cells:0,gpu:0});
    state=nextDecision(apply(state,{type:'launch',destination:'dangerous'},300000+i*1237));
    assert.ok(state.run!.cargo.gpu>=2);const gpu=state.run!.cargo.gpu;
    state=finish(state);assert.equal(state.run,null);assert.equal(state.resources.gpu,gpu);assert.equal(state.lastResult!.evacuated,false);
  }
});

test('invalid destination, locked vault and forged resource commands leave saves immutable',()=>{
  const state=fresh(),before=structuredClone(state);
  for(const command of [{type:'launch',destination:'dangerous'},{type:'launch',destination:'moon'},{type:'launch',destination:'safe',cargo:{scrap:999}}])assert.throws(()=>apply(state,command as never,1000));
  assert.deepEqual(state,before);
  const active=apply(state,{type:'launch',destination:'safe'},1000),copy=structuredClone(active);
  for(const command of [{type:'destination',destination:'dangerous'},{type:'destination',destination:'moon'},{type:'headHome',reward:999}])assert.throws(()=>apply(active,command as never,2000));
  assert.deepEqual(active,copy);
});

test('old manual and autonomous saves adopt destinations without changing existing cargo, charges or battery',()=>{
  for(const old of [apply(fresh(),{type:'depart'},1000),apply(fresh(),{type:'launch'},1000)]){
    old.run!.cargo={scrap:3,gpu:0,cells:1};old.run!.energy=19;old.run!.remaining['scrap-pile']=1;
    const before=structuredClone(old.run);
    const adopted=apply(old,{type:'destination',destination:'safe'},1000);
    assert.deepEqual(adopted.run!.cargo,before!.cargo);assert.equal(adopted.run!.energy,19);assert.deepEqual(adopted.run!.remaining,before!.remaining);assert.deepEqual(adopted.run!.position,before!.position);
    assert.deepEqual(adopted.run!.operation!.world.deposits,before!.operation?.world.deposits??WORLD.deposits);
    const banked=apply(adopted,{type:'headHome'},1000);assert.equal(banked.run,null);assert.deepEqual(banked.resources,before!.cargo);
  }
});

test('destination worlds vary within readable resource zones and every deposit stays reachable',()=>{
  const layouts=new Set<string>();
  for(let i=0;i<25;i++){
    const state=apply(fresh(),{type:'launch',destination:'safe'},1000+i*1237),world=state.run!.operation!.world;
    layouts.add(JSON.stringify(world.deposits.map(d=>d.position)));
    for(const d of world.deposits){
      if(d.resource==='cells')assert.ok(d.position.x<4&&d.position.y<3);
      if(d.resource==='gpu')assert.ok(d.position.x>4);
      if(d.requiredRig===0&&d.resource==='scrap')assert.ok(d.position.y>=4);
      assert.ok([{x:d.position.x+1,y:d.position.y},{x:d.position.x-1,y:d.position.y},{x:d.position.x,y:d.position.y+1},{x:d.position.x,y:d.position.y-1}].some(p=>operationPath(world,world.dock,p,1)!==null));
    }
    assert.equal(cargoCount(state.run!.cargo),0);
  }
  assert.ok(layouts.size>2);
});
