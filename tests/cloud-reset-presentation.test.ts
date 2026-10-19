import test from 'node:test';import assert from 'node:assert/strict';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {CloudCurtain,CLOUD_REVEAL_MS} from '../src/ui/CloudCurtain';
import {ResetConfirmation} from '../src/ui/ResetConfirmation';
test('cinematic cloud banks have distinct moving depth layers, no controls and a short deliberate duration',()=>{
 const html=renderToStaticMarkup(React.createElement(CloudCurtain,{animating:true}));assert.ok(CLOUD_REVEAL_MS>=5000&&CLOUD_REVEAL_MS<=6000);assert.equal((html.match(/<img /g)||[]).length,6);for(const depth of ['rear','front','wisp'])for(const side of ['left','right'])assert.ok(html.includes(`cloud-${depth} cloud-${side}`));assert.doesNotMatch(html,/<button|Skip Tutorial|opening-mist/);assert.match(html,/cloud-bank-v1.webp/);
});
test('reset confirmation is minimal, uses actual accessible SVG controls, and disables both while processing',()=>{
 const props={busy:false,error:'',onCancel:()=>{},onConfirm:()=>{}};const html=renderToStaticMarkup(React.createElement(ResetConfirmation,props));assert.match(html,/Are you sure\?/);assert.equal((html.match(/<button/g)||[]).length,2);assert.equal((html.match(/<svg/g)||[]).length,2);assert.match(html,/aria-label="Cancel"/);assert.match(html,/aria-label="Reset progress"/);assert.doesNotMatch(html,/<p(?:\s|>)|Compute|XP|Influence/);
 const busy=renderToStaticMarkup(React.createElement(ResetConfirmation,{...props,busy:true}));assert.equal((busy.match(/disabled=""/g)||[]).length,2);assert.match(busy,/Resetting…/);const failed=renderToStaticMarkup(React.createElement(ResetConfirmation,{...props,error:"Couldn't reset. Please try again."}));assert.match(failed,/role="alert"/);assert.doesNotMatch(failed,/disabled/);
});
