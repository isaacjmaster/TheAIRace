import test from 'node:test';import assert from 'node:assert/strict';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {CloudCurtain,CLOUD_REVEAL_MS} from '../src/ui/CloudCurtain';
import {ResetConfirmation} from '../src/ui/ResetConfirmation';
test('cinematic cloud banks have distinct moving depth layers, no controls and a short deliberate duration',()=>{
 const html=renderToStaticMarkup(React.createElement(CloudCurtain,{animating:true}));assert.ok(CLOUD_REVEAL_MS>=6000&&CLOUD_REVEAL_MS<=7000);assert.equal((html.match(/<img /g)||[]).length,10);for(const depth of [0,1,2])assert.ok(html.includes(`mist-depth-${depth}`));assert.doesNotMatch(html,/<button|Skip Tutorial|cloud-left|cloud-right|cloud-bank/);assert.match(html,/stylized-mist-1.svg/);assert.match(html,/--dy:-65vh/);assert.match(html,/--dy:60vh/);

});
test('reset confirmation is minimal, uses actual accessible SVG controls, and disables both while processing',()=>{
 const props={busy:false,error:'',onCancel:()=>{},onConfirm:()=>{}};const html=renderToStaticMarkup(React.createElement(ResetConfirmation,props));assert.match(html,/Are you sure\?/);assert.equal((html.match(/<button/g)||[]).length,2);assert.equal((html.match(/<svg/g)||[]).length,2);assert.match(html,/aria-label="Cancel"/);assert.match(html,/aria-label="Reset progress"/);assert.doesNotMatch(html,/<p(?:\s|>)|Compute|XP|Influence/);
 const busy=renderToStaticMarkup(React.createElement(ResetConfirmation,{...props,busy:true}));assert.equal((busy.match(/disabled=""/g)||[]).length,2);assert.match(busy,/Resetting…/);const failed=renderToStaticMarkup(React.createElement(ResetConfirmation,{...props,error:"Couldn't reset. Please try again."}));assert.match(failed,/role="alert"/);assert.doesNotMatch(failed,/disabled/);
});
