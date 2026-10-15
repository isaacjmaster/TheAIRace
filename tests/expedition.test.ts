import test from 'node:test';
import assert from 'node:assert/strict';
import {applyExpeditionCommand as apply,createExpeditionState as fresh,findPath,WORLD,rigStats,cargoCount} from '../src/game/expedition';
import type {ExpeditionCommand,ExpeditionState} from '../shared/expedition';

function session(initial=fresh()) {
  let state=initial;
  return {get state(){return state;},act(command:ExpeditionCommand){state=apply(state,command,Math.max(1000,state.run?.readyAt??1000));return state;}};
}
function starterCargo() {
  const game=session();game.act({type:'depart'});
  game.act({type:'move',to:{x:0,y:4}});game.act({type:'gather',depositId:'scrap-pile'});
  game.act({type:'move',to:{x:0,y:2}});game.act({type:'move',to:{x:1,y:2}});
  game.act({type:'gather',depositId:'cell-cache'});game.act({type:'gather',depositId:'cell-cache'});
  game.act({type:'move',to:{x:3,y:3}});game.act({type:'gather',depositId:'circuit-bin'});
  return game;
}
test('starter expedition banks rig cost, upgrades, and unlocks GPU collection',()=>{
  const game=starterCargo();assert.deepEqual(game.state.run!.cargo,{scrap:6,cells:2,gpu:0});
  game.act({type:'move',to:WORLD.dock});assert.ok(game.state.run!.energy>=0);
  game.act({type:'return'});assert.deepEqual(game.state.resources,{scrap:6,cells:2,gpu:0});
  game.act({type:'upgrade'});assert.equal(game.state.rigLevel,1);assert.equal(cargoCount(game.state.resources),0);
  game.act({type:'depart'});assert.equal(game.state.run!.energy,40);
  game.act({type:'move',to:{x:5,y:3}});game.act({type:'gather',depositId:'gpu-vault'});
  game.act({type:'move',to:WORLD.dock});game.act({type:'return'});assert.equal(game.state.resources.gpu,2);
});
test('cooldowns reject rapid move, gather, return, and recharge without spending',()=>{
  let state=apply(fresh(),{type:'depart'},1000);
  state=apply(state,{type:'move',to:{x:0,y:4}},1000);
  const before=structuredClone(state);
  for(const command of [{type:'gather',depositId:'scrap-pile'},{type:'move',to:WORLD.dock},{type:'return'},{type:'recharge'}] as ExpeditionCommand[]) assert.throws(()=>apply(state,command,1001),/still moving/);
  assert.deepEqual(state,before);
  state=apply(state,{type:'gather',depositId:'scrap-pile'},1180);
  assert.throws(()=>apply(state,{type:'gather',depositId:'scrap-pile'},1200),/still moving/);
});
test('pathfinder rejects malformed, blocked, gated and out of bounds coordinates',()=>{
  for(const to of [{x:-1,y:0},{x:7,y:0},{x:1.2,y:0},{x:NaN,y:0},{x:Infinity,y:0},{x:1,y:4},{x:1,y:1},{x:5,y:3}]) assert.equal(findPath(WORLD.dock,to,0),null);
  assert.ok(findPath(WORLD.dock,{x:5,y:3},1));
  assert.equal(findPath({x:-1,y:0},WORLD.dock,1),null);
  assert.deepEqual(findPath(WORLD.dock,WORLD.dock,0),[]);
  const state=apply(fresh(),{type:'depart'},1000);
  for(const command of [{type:'move',to:{x:0.5,y:2}},{type:'move',to:{x:0,y:2,z:1}},{type:'depart',reward:9000},{type:'gather',depositId:5},{type:'return',resources:{scrap:9000}},{type:'unknown'},null]) assert.throws(()=>apply(state,command as ExpeditionCommand,2000),/Invalid expedition command/);
});
test('deposits are finite, capacity and energy are authoritative',()=>{
  const game=session();game.act({type:'depart'});game.act({type:'move',to:{x:0,y:4}});
  for(let i=0;i<3;i++)game.act({type:'gather',depositId:'scrap-pile'});
  assert.throws(()=>game.act({type:'gather',depositId:'scrap-pile'}),/depleted/);
  game.act({type:'move',to:{x:2,y:4}});game.act({type:'gather',depositId:'circuit-bin'});
  assert.equal(cargoCount(game.state.run!.cargo),12);
  assert.throws(()=>game.act({type:'gather',depositId:'circuit-bin'}),/Cargo full/);
  const low=structuredClone(game.state);low.run!.energy=1;low.run!.cargo={scrap:0,gpu:0,cells:0};
  assert.throws(()=>apply(low,{type:'gather',depositId:'circuit-bin'},100000),/Not enough energy/);
  assert.throws(()=>apply(low,{type:'move',to:WORLD.dock},100000),/Not enough energy/);
});
test('hazards cost four energy and routing can avoid them',()=>{
  const game=session();game.act({type:'depart'});game.act({type:'move',to:{x:0,y:3}});
  const energy=game.state.run!.energy;
  game.act({type:'move',to:{x:1,y:3}});assert.equal(game.state.run!.energy,energy-4);
  const path=findPath({x:0,y:3},{x:1,y:2},0)!;
  assert.equal(path.length,2);
  assert.ok(path.some(p=>p.x===1&&p.y===3));
  // Explicit waypoints avoid the shortest-path tie through the hazard.
  assert.deepEqual(findPath({x:0,y:3},{x:0,y:2},0),[{x:0,y:2}]);
});
test('evacuation rescues floor half cargo even during movement or at zero energy',()=>{
  const game=starterCargo();const before=structuredClone(game.state);
  const saved=apply(before,{type:'evacuate'},before.run!.readyAt-1);
  assert.deepEqual(saved.resources,{scrap:3,gpu:0,cells:1});assert.equal(saved.lastResult!.evacuated,true);assert.equal(saved.run,null);
  const drained=structuredClone(before);drained.run!.energy=0;
  assert.equal(apply(drained,{type:'evacuate'},1000).run,null);
  assert.deepEqual(game.state,before);
});
test('no duplicate return, upgrade, departure or remote collection',()=>{
  const game=session();assert.throws(()=>game.act({type:'return'}),/Depart/);
  assert.throws(()=>game.act({type:'upgrade'}),/Collect/);game.act({type:'depart'});
  assert.throws(()=>game.act({type:'depart'}),/already exploring/);
  assert.throws(()=>game.act({type:'upgrade'}),/Return to HQ/);
  assert.throws(()=>game.act({type:'gather',depositId:'gpu-vault'}),/Recovery Rig/);
  assert.throws(()=>game.act({type:'gather',depositId:'cell-cache'}),/next to/);
  game.act({type:'return'});assert.throws(()=>game.act({type:'return'}),/Depart/);
  const rich:ExpeditionState={...fresh(),resources:{scrap:12,gpu:0,cells:4}};
  const upgraded=apply(rich,{type:'upgrade'},1000);assert.throws(()=>apply(upgraded,{type:'upgrade'},1000),/already installed/);
  assert.deepEqual(rich.resources,{scrap:12,gpu:0,cells:4});
});
test('charger uses a collected cell once, caps energy, and resets each expedition',()=>{
  const game=starterCargo();game.act({type:'move',to:WORLD.charger});
  const before=game.state.run!.energy;game.act({type:'recharge'});
  assert.equal(game.state.run!.energy,Math.min(26,before+8));assert.equal(game.state.run!.cargo.cells,1);
  assert.throws(()=>game.act({type:'recharge'}),/already used/);
  game.act({type:'evacuate'});game.act({type:'depart'});
  assert.equal(game.state.run!.recharged,false);assert.equal(game.state.run!.remaining['scrap-pile'],3);
  assert.deepEqual(rigStats(0),{energy:26,capacity:12});assert.deepEqual(rigStats(1),{energy:40,capacity:20});
});
