import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {CompanyStatus} from '../src/ui/CompanyStatus';
import {establishedFoundation as initialFoundation} from './helpers/established-foundation';
test('company HUD reads saved level and builder availability without exposing custom name',()=>{
 const initial=initialFoundation();const render=(state:typeof initial)=>renderToStaticMarkup(React.createElement(CompanyStatus,{state}));
 const start=render(initial);assert.match(start,/Level 1 — Company/);assert.match(start,/1\/1 Builders/);assert.doesNotMatch(start,/Garage Intelligence|input/);
 const working=render({...initial,level:4,builders:2,buildersBusy:1});assert.match(working,/Level 4 — Company/);assert.match(working,/1\/2 Builders/);
 assert.match(render({...initial,buildersBusy:1}),/0\/1 Builders/);
 assert.match(render({...initial,builders:3,buildersBusy:0}),/3\/3 Builders/);
 assert.match(render({...initial,buildersBusy:5}),/0\/1 Builders/);
});

test('new company HUD accurately shows zero builders before the free station',async()=>{const {initialFoundation}=await import('../shared/foundation');const html=renderToStaticMarkup(React.createElement(CompanyStatus,{state:initialFoundation(),xp:{total:35,level:1,nextLevel:2,nextThreshold:100}}));assert.match(html,/0\/0 Builders/);assert.match(html,/Company Level 1, view XP/);assert.match(html,/company-emblem/);});
