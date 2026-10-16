import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requestLandscape} from '../src/ui/mobile';
test('orientation lock is optional and permission failures never prevent play',async()=>{
 await requestLandscape();await requestLandscape({});
 await requestLandscape({lock:async()=>{throw new Error('NotSupportedError');}});
 let requested='';await requestLandscape({lock:async(value:string)=>{requested=value;}});
 assert.equal(requested,'landscape');
});

import {viewportBox,SCREEN_BACKGROUNDS} from '../src/ui/viewport';
import {readFileSync} from 'node:fs';
test('Safari browser chrome changes use available visual viewport without subtracting safe areas',()=>{
 for(const [width,height] of [[390,664],[390,745],[844,290],[844,342],[932,350]]){
  assert.deepEqual(viewportBox(false,true,width,844,{width,height,offsetTop:0,offsetLeft:0,scale:1}),{width,height,top:0,left:0});
 }
 assert.deepEqual(viewportBox(false,true,844,390,{width:844,height:300,offsetTop:20,offsetLeft:0,scale:1}),{width:844,height:300,top:20,left:0});
});
test('standalone uses full dynamic CSS viewport; old browsers fall back; zoom is not canceled',()=>{
 assert.equal(viewportBox(true,true,844,390,{width:844,height:369,offsetTop:0,offsetLeft:0,scale:1}),null);
 assert.deepEqual(viewportBox(true,false,390,844),{width:390,height:844,top:0,left:0});
 assert.deepEqual(viewportBox(false,true,844,390,{width:422,height:195,offsetTop:20,offsetLeft:20,scale:2}),{width:844,height:390,top:0,left:0});
});
test('initial HTML paints the same startup background as the manifest before JavaScript',()=>{
 const html=readFileSync('index.html','utf8'),manifest=JSON.parse(readFileSync('public/manifest.webmanifest','utf8'));
 assert.ok(html.includes(`--app-background:${SCREEN_BACKGROUNDS.splash}`));assert.equal(manifest.background_color,SCREEN_BACKGROUNDS.splash);assert.equal(manifest.theme_color,SCREEN_BACKGROUNDS.splash);
 assert.match(html,/viewport-fit=cover/);assert.equal(manifest.display,'standalone');assert.equal(manifest.orientation,'landscape');
});
