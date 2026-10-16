import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requestLandscape} from '../src/ui/mobile';
test('orientation lock is optional and permission failures never prevent play',async()=>{
 await requestLandscape();await requestLandscape({});
 await requestLandscape({lock:async()=>{throw new Error('NotSupportedError');}});
 let requested='';await requestLandscape({lock:async(value:string)=>{requested=value;}});
 assert.equal(requested,'landscape');
});

import {fallbackViewportHeight,SCREEN_BACKGROUNDS} from '../src/ui/viewport';
import {readFileSync} from 'node:fs';
test('modern Safari and standalone leave viewport sizing to CSS; legacy height tracks resize',()=>{
 assert.equal(fallbackViewportHeight(true,664),null);
 for(const h of [568,664,745,844,390])assert.equal(fallbackViewportHeight(false,h),h);
 assert.equal(fallbackViewportHeight(false,0),null);
});

test('initial HTML paints the same startup background as the manifest before JavaScript',()=>{
 const html=readFileSync('index.html','utf8'),manifest=JSON.parse(readFileSync('public/manifest.webmanifest','utf8'));
 assert.ok(html.includes(`--app-background:${SCREEN_BACKGROUNDS.splash}`));assert.equal(manifest.background_color,SCREEN_BACKGROUNDS.splash);assert.equal(manifest.theme_color,SCREEN_BACKGROUNDS.splash);
 assert.match(html,/viewport-fit=cover/);assert.match(html,/color-scheme:light/);assert.equal(new Set(Object.values(SCREEN_BACKGROUNDS)).size,1);assert.equal(manifest.display,'standalone');assert.equal(manifest.orientation,'portrait');
});
import {portraitCampusSpan} from '../src/art/portraitCamera';
test('portrait campus has a readable horizontal frame and keeps the world explorable',()=>{
 for(const [w,h] of [[320,568],[375,667],[390,664],[390,844],[430,932]]){
  const span=portraitCampusSpan(w/h);assert.ok(span>=24&&span<=28);assert.ok(span/(w/h)>span);
 }
 assert.equal(portraitCampusSpan(844/390),36*17/30*(844/390));
});
test('active portrait game has no rotation gate, orientation lock or revived troop interface',()=>{
 const app=readFileSync('src/ui/FoundationApp.tsx','utf8');
 assert.doesNotMatch(app,/rotation-screen|rotation-blocked|requestLandscape|PORTRAIT_GAME|IntegratedRaid/);
 assert.match(app,/Networks offline/);assert.match(app,/FoundationWorld/);
});
