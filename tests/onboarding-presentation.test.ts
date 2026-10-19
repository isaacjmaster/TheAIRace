import test from 'node:test';import assert from 'node:assert/strict';
import {newAva,legacyAva,commandAva} from '../shared/ava';
import {initialFoundation} from '../shared/foundation';
import {onboardingHud} from '../src/ui/onboardingPresentation';
import {titlePixelRatio} from '../src/art/titleQuality';
import express from 'express';import {DatabaseSync} from 'node:sqlite';import {registerFoundation} from '../server/foundation-api';
import {identityHeaders} from './helpers/identity';
test('Retina title quality fills a bounded high-density drawing buffer without CSS upscaling',()=>{
 assert.equal(titlePixelRatio(430,430,3),2.5);assert.equal(titlePixelRatio(800,500,1),1);assert.equal(titlePixelRatio(800,800,3),Math.sqrt(2_400_000/640000));
 for(const [w,h,dpr]of [[390,430,3],[844,300,3],[900,700,2]]){const ratio=titlePixelRatio(w,h,dpr);assert.ok(ratio<=dpr);assert.ok(w*h*ratio*ratio<=2_400_001);assert.ok(ratio>1.5);}
});
test('new/reset reveals are claimed once without advancing Ava or changing company data; replay never adds a cinematic',()=>{
 const s=initialFoundation(),before=JSON.stringify(s),fresh=newAva();assert.equal(fresh.opening,'pending');const claimed=commandAva(fresh,'begin-opening',s,0);assert.equal(claimed.opening,'shown');assert.equal(claimed.step,0);assert.equal(claimed.revision,fresh.revision+1);assert.deepEqual(commandAva(claimed,'begin-opening',s,0),claimed);assert.deepEqual(JSON.parse(JSON.stringify(claimed)),claimed);assert.equal(JSON.stringify(s),before);
 assert.equal(commandAva(claimed,'replay',s,0).opening,undefined);assert.equal(legacyAva().opening,undefined);assert.equal(commandAva(fresh,'skip',s,0).status,'skipped');assert.equal(newAva(10).opening,'pending');
});
test('one HUD policy progressively introduces relevant controls, with no hidden-target resource arrows',()=>{
 const p={...newAva(),opening:'shown' as const};
 assert.ok(Object.values(onboardingHud(p,true)).every(v=>!v));assert.ok(Object.values(onboardingHud(p)).every(v=>!v));
 assert.equal(onboardingHud({...p,step:3}).company,true);assert.equal(onboardingHud({...p,step:3}).build,false);
 const builder=onboardingHud({...p,step:5,builderStep:1});assert.equal(builder.build,true);assert.equal(builder.builders,true);assert.equal(builder.compute,false);
 const compute=onboardingHud({...p,step:5,builderStep:4});assert.equal(compute.compute,true);assert.equal(compute.research,false);
 const research=onboardingHud({...p,step:6,builderStep:4});assert.equal(research.research,true);assert.equal(research.compute,true);
 for(const step of [7,10,11,12,15]){const h=onboardingHud({...p,step});assert.equal(h.build,true);assert.equal(h.compute,true);assert.equal(h.full,false);}
 for(const status of ['complete','skipped','legacy']as const)assert.ok(Object.values(onboardingHud({...p,status})).every(Boolean));
 assert.ok(Object.values(onboardingHud({...p,opening:undefined})).every(Boolean));
});
test('opening claim survives reload and recovery, while intentional reset starts a new reveal generation',async()=>{
 const db=new DatabaseSync(':memory:'),app=express();app.use(express.json());registerFoundation(app,db);const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const base=`http://127.0.0.1:${(server.address() as {port:number}).port}/api/foundation`;
 try{
  const response=await fetch(base),cookie=response.headers.get('set-cookie')!.split(';')[0],initial=await response.json(),headers=identityHeaders(db,cookie);
  const post=async(path:string,body:unknown,h=headers)=>{const r=await fetch(base+path,{method:'POST',headers:h,body:JSON.stringify(body)});assert.equal(r.status,200);return {data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
  const claim={command:'begin-opening',revision:initial.ava.revision,generation:0};const first=await post('/ava',claim);assert.equal(first.data.ava.opening,'shown');assert.equal((await post('/ava',claim)).data.ava.revision,first.data.ava.revision);
  const reloaded=await(await fetch(base,{headers})).json();assert.equal(reloaded.ava.opening,'shown');assert.deepEqual(reloaded.state,initial.state);
  const code=(await post('/company/recovery-code',{})).data.code;
  const guestResponse=await fetch(base),guestCookie=guestResponse.headers.get('set-cookie')!.split(';')[0],guestHeaders=identityHeaders(db,guestCookie);const ticket=(await post('/company/recover/check',{code},guestHeaders)).data.ticket;
  const restored=await post('/company/recover/confirm',{ticket,confirm:true},guestHeaders),restoredHeaders=identityHeaders(db,restored.cookie!);const recovered=await(await fetch(base,{headers:restoredHeaders})).json();assert.equal(recovered.company.playerId,initial.company.playerId);assert.equal(recovered.ava.opening,'shown');assert.deepEqual(recovered.state,initial.state);
  const reset=await post('/reset',{confirm:'RESET FOUNDATION',revision:recovered.state.revision},restoredHeaders);assert.equal(reset.data.state.generation,1);assert.equal(reset.data.ava.opening,'pending');assert.equal(reset.data.ava.step,0);
  const old=await fetch(base+'/ava',{method:'POST',headers:restoredHeaders,body:JSON.stringify(claim)});assert.equal(old.status,409);const pending=await(await fetch(base,{headers:restoredHeaders})).json();assert.equal(pending.ava.opening,'pending');assert.equal(pending.state.compute,100);
 }finally{await new Promise<void>(r=>server.close(()=>r()));db.close();}
});
