import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

test('company API preserves legacy fields and keeps Pixel in only one activity',async()=>{
  process.env.GAME_DB_PATH=':memory:';process.env.AI_MODE='demo';
  const {app,closeDatabase}=await import('./index.js');
  const server=app.listen(0,'127.0.0.1');
  await new Promise<void>(r=>server.once('listening',r));
  const address=server.address();assert.ok(address&&typeof address!=='string');
  const base=`http://127.0.0.1:${address.port}`;let cookie='';
  async function call(path:string,body?:unknown,origin?:string){
    const response=await fetch(base+path,{method:body?'POST':'GET',headers:{cookie,...(body?{'Content-Type':'application/json'}:{}),...(origin?{origin}:{})},body:body?JSON.stringify(body):undefined});
    if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie')!.split(';')[0];
    return {status:response.status,body:await response.json() as any};
  }
  try{
    const initial=(await call('/api/game')).body;
    assert.equal(initial.expedition.rigLevel,0);assert.equal(initial.expedition.run,null);
    const departed=await call('/api/expedition',{requestId:randomUUID(),revision:0,command:{type:'depart'}});assert.equal(departed.status,200);
    const reloaded=(await call('/api/game')).body;assert.deepEqual(reloaded.state,initial.state);assert.deepEqual(reloaded.onboarding,initial.onboarding);assert.ok(reloaded.expedition.run);
    const start={requestId:randomUUID(),revision:initial.state.revision,command:{type:'start',contractId:'inbox',plan:{strategy:'accuracy',checks:['review_uncertain'],needsClarification:false,explanation:'test'},allocation:{execution:2,verification:1}}};
    assert.equal((await call('/api/command',start)).status,400);
    assert.equal((await call('/api/expedition',{requestId:randomUUID(),revision:1,command:{type:'evacuate'}},'https://untrusted.example')).status,403);
    const returned=await call('/api/expedition',{requestId:randomUUID(),revision:1,command:{type:'evacuate'}});assert.equal(returned.status,200);
    assert.equal((await call('/api/command',start)).status,200);
    const conflict=await call('/api/expedition',{requestId:randomUUID(),revision:2,command:{type:'depart'}});assert.equal(conflict.status,400);
    const final=(await call('/api/game')).body;assert.ok(final.state.activeJob);assert.equal(final.expedition.run,null);assert.deepEqual(final.expedition.resources,{scrap:0,gpu:0,cells:0});
  }finally{await new Promise<void>((r,j)=>server.close(e=>e?j(e):r()));closeDatabase();}
});
