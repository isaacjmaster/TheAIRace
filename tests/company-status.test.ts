import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {CompanyStatus} from '../src/ui/CompanyStatus';
import {initialFoundation} from '../shared/foundation';
test('company HUD reads saved level and builder availability without exposing custom name',()=>{
 const initial=initialFoundation();const render=(state:typeof initial)=>renderToStaticMarkup(React.createElement(CompanyStatus,{state}));
 const start=render(initial);assert.match(start,/Level 1 — Company/);assert.match(start,/1\/1 Builders/);assert.doesNotMatch(start,/Garage Intelligence|input|button/);
 const working=render({...initial,level:4,builders:2,buildersBusy:1});assert.match(working,/Level 4 — Company/);assert.match(working,/1\/2 Builders/);
 assert.match(render({...initial,buildersBusy:1}),/0\/1 Builders/);
 assert.match(render({...initial,builders:3,buildersBusy:0}),/3\/3 Builders/);
 assert.match(render({...initial,buildersBusy:5}),/0\/1 Builders/);
});
