import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requestLandscape} from '../src/ui/mobile';
test('orientation lock is optional and permission failures never prevent play',async()=>{
 await requestLandscape();await requestLandscape({});
 await requestLandscape({lock:async()=>{throw new Error('NotSupportedError');}});
 let requested='';await requestLandscape({lock:async(value:string)=>{requested=value;}});
 assert.equal(requested,'landscape');
});

import {fallbackViewportHeight,SCREEN_BACKGROUNDS,setPresentationBackground} from '../src/ui/viewport';
import {readFileSync} from 'node:fs';
test('modern Safari and standalone leave viewport sizing to CSS; legacy height tracks resize',()=>{
 assert.equal(fallbackViewportHeight(true,664),null);
 for(const h of [568,664,745,844,390])assert.equal(fallbackViewportHeight(false,h),h);
 assert.equal(fallbackViewportHeight(false,0),null);
});

test('launch paint stays charcoal while the installed chrome fallback matches the game',()=>{
 const html=readFileSync('index.html','utf8'),manifest=JSON.parse(readFileSync('public/manifest.webmanifest','utf8'));
 assert.ok(html.includes(`--app-background:${SCREEN_BACKGROUNDS.splash}`));assert.equal(manifest.background_color,SCREEN_BACKGROUNDS.splash);assert.equal(manifest.theme_color,SCREEN_BACKGROUNDS.game);
 assert.match(html,/viewport-fit=cover/);assert.match(html,/color-scheme:light/);assert.equal(SCREEN_BACKGROUNDS.splash,'#07090c');assert.equal(SCREEN_BACKGROUNDS.menu,'#081d30');assert.equal(SCREEN_BACKGROUNDS.game,'#b5eafa');assert.match(html,/apple-mobile-web-app-status-bar-style" content="black-translucent"/);assert.match(html,/data-presentation="splash"/);assert.equal(manifest.display,'standalone');assert.equal(manifest.orientation,'portrait');
});
import {portraitCampusSpan} from '../src/art/portraitCamera';
test('portrait campus has a readable horizontal frame and keeps the world explorable',()=>{
 for(const [w,h] of [[320,568],[375,667],[390,664],[390,844],[430,932]]){
  const span=portraitCampusSpan(w/h);assert.ok(span>=24&&span<=28);assert.ok(span/(w/h)>span);
 }
 assert.equal(portraitCampusSpan(844/390),36*17/30*(844/390));
});
test('active portrait game keeps rotation unrestricted and uses only the new Scrap Bot screen',()=>{
 const app=readFileSync('src/ui/FoundationApp.tsx','utf8');
 assert.doesNotMatch(app,/rotation-screen|rotation-blocked|requestLandscape|PORTRAIT_GAME|IntegratedRaid/);
 assert.match(app,/ScrapRaid/);assert.match(app,/FoundationWorld/);
});

test('presentation paint distinguishes studio, simple title and HQ without changing status-bar metadata',()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
 const properties=new Map<string,string>(),meta:string[]=[],queries:string[]=[],dataset:Record<string,string>={};
 const doc={body:{style:{backgroundColor:''}},documentElement:{dataset,style:{backgroundColor:'',colorScheme:'',setProperty:(key:string,value:string)=>properties.set(key,value)}},querySelector:(selector:string)=>{queries.push(selector);return {setAttribute:(_key:string,value:string)=>meta.push(value)};}};
 Object.defineProperty(globalThis,'document',{configurable:true,value:doc});
 try{for(const phase of ['splash','menu','game','menu','splash'] as const){setPresentationBackground(phase);assert.equal(dataset.presentation,phase);assert.equal(doc.documentElement.style.backgroundColor,SCREEN_BACKGROUNDS[phase]);assert.equal(doc.body.style.backgroundColor,SCREEN_BACKGROUNDS[phase]);assert.equal(doc.documentElement.style.colorScheme,phase==='splash'?'dark':'light');assert.equal(properties.get('--app-background'),SCREEN_BACKGROUNDS[phase]);assert.equal(properties.get('--title-sky-color'),'#081d30');assert.equal(meta.at(-1),SCREEN_BACKGROUNDS[phase]);}assert.ok(queries.every(q=>q==='meta[name="theme-color"]'));}
 finally{if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');}
});
