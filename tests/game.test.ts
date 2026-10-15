import test from 'node:test';
import assert from 'node:assert/strict';
import { CONTRACTS, HARDWARE, createInitialState, projectContract, applyCommand } from '../src/game/index.js';
import type { AgentPlan, Allocation } from '../shared/contracts.js';
const plan: AgentPlan = {strategy:'accuracy',checks:['review_uncertain'],needsClarification:false,explanation:'Review uncertain labels.'};
const allocation: Allocation = {execution:1,verification:1};
test('full contract, reward, upgrade and persisted state loop',()=>{
 let state=createInitialState();
 state=applyCommand(state,{type:'rename',name:'Tiny Orbit'},1000);
 const contract=CONTRACTS[0];
 const capacity=HARDWARE[0].capacity;
 const alloc=capacity>=2?allocation:{execution:1,verification:0};
 const prediction=projectContract(state,contract.id,plan,alloc);
 state=applyCommand(state,{type:'start',contractId:contract.id,plan,allocation:alloc},1000);
 assert.ok(state.activeJob);
 assert.throws(()=>applyCommand(state,{type:'claim'},1000));
 const finish=state.activeJob!.completesAt;
 const before=state.credits;
 state=applyCommand(state,{type:'claim'},finish+1);
 assert.equal(state.credits,before+prediction.credits);
 assert.equal(state.completedContracts,1);
 assert.throws(()=>applyCommand(state,{type:'claim'},finish+2));
 for(let i=0;state.credits<HARDWARE[1].cost && i<10;i++){
   state=applyCommand(state,{type:'start',contractId:contract.id,plan,allocation:alloc},finish+100+i*100000);
   state=applyCommand(state,{type:'claim'},state.activeJob!.completesAt+1);
 }
 const balance=state.credits;
 state=applyCommand(state,{type:'upgrade'},finish+2000000);
 assert.equal(state.hardwareLevel,1);
 assert.equal(state.credits,balance-HARDWARE[1].cost);
 assert.ok(HARDWARE[1].capacity>HARDWARE[0].capacity);
 assert.deepEqual(JSON.parse(JSON.stringify(state)),state);
});
test('invalid allocations and invented plans are rejected',()=>{
 const state=createInitialState(); const id=CONTRACTS[0].id;
 for(const alloc of [{execution:-1,verification:1},{execution:0,verification:0},{execution:999,verification:0},{execution:1.5,verification:0}]) assert.throws(()=>projectContract(state,id,plan,alloc));
 assert.throws(()=>projectContract(state,id,{...plan,strategy:'free_money'} as any,allocation));
 assert.throws(()=>projectContract(state,id,{...plan,checks:['award_credits']} as any,allocation));
 assert.throws(()=>applyCommand(state,{type:'start',contractId:'invented',plan,allocation}));
});
test('resource and strategy decisions alter projections',()=>{
 const state=createInitialState(); const id=CONTRACTS[0].id;
 const alloc={execution:1,verification:0};
 const quick=projectContract(state,id,{...plan,strategy:'speed',checks:[]},alloc);
 const careful=projectContract(state,id,plan,alloc);
 assert.ok(careful.quality>quick.quality || careful.durationSeconds>quick.durationSeconds);
});
test('cannot start overlapping work or upgrade without funds',()=>{
 let state=createInitialState();
 state={...state,credits:0};
 assert.throws(()=>applyCommand(state,{type:'upgrade'}));
 state=applyCommand(state,{type:'start',contractId:CONTRACTS[0].id,plan,allocation:{execution:1,verification:0}},1000);
 assert.throws(()=>applyCommand(state,{type:'start',contractId:CONTRACTS[0].id,plan,allocation:{execution:1,verification:0}},1001));
});
