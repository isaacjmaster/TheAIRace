import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldShowStory, guideStep } from '../src/ui/onboarding.js';
import { createInitialState } from '../src/game/index.js';
test('automatic story is exclusively for new, unseen onboarding records',()=>{
  assert.equal(shouldShowStory(),false);
  assert.equal(shouldShowStory({isNewPlayer:false,storySeen:false,tutorial:'available'}),false);
  assert.equal(shouldShowStory({isNewPlayer:true,storySeen:false,tutorial:'available'}),true);
  assert.equal(shouldShowStory({isNewPlayer:true,storySeen:true,tutorial:'active'}),false);
});
test('guide follows real mission and hardware state, including resume and alternative navigation',()=>{
  const state=createInitialState();
  assert.equal(guideStep(state,'HQ',null,false),'welcome');
  assert.equal(guideStep(state,'Missions',null,false),'pick');
  assert.equal(guideStep(state,'Missions','inbox',false),'precision');
  assert.equal(guideStep(state,'Missions','inbox',true),'deploy');
  const earned={...state,completedContracts:1,credits:96};
  assert.equal(guideStep(earned,'HQ','inbox',true),'upgrades');
  assert.equal(guideStep(earned,'Upgrades','inbox',true),'buy');
  assert.equal(guideStep({...earned,hardwareLevel:1},'HQ',null,false),'complete');
  assert.equal(guideStep({...state,completedContracts:1,credits:60},'HQ',null,false),'welcome');
});
