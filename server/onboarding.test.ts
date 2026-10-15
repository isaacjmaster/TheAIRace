import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { createInitialState } from '../src/game/index.js';

test('onboarding distinguishes untouched legacy saves, persists new-player choices, and never changes game state', async()=>{
  const folder=mkdtempSync(join(tmpdir(),'airace-onboarding-'));
  const path=join(folder,'game.sqlite');
  process.env.GAME_DB_PATH=path;
  process.env.AI_MODE='demo';
  const seed=new DatabaseSync(path),legacy=randomUUID(),initial=createInitialState();
  seed.exec('CREATE TABLE sessions (id TEXT PRIMARY KEY,state TEXT NOT NULL)');
  seed.prepare('INSERT INTO sessions VALUES (?,?)').run(legacy,JSON.stringify(initial));
  seed.close();
  const {app,closeDatabase}=await import('./index.js');
  const server=app.listen(0,'127.0.0.1');
  await new Promise<void>(r=>server.once('listening',r));
  const address=server.address(); assert.ok(address&&typeof address!=='string');
  const base=`http://127.0.0.1:${address.port}`;
  let freshCookie='';
  async function call(cookie:string,body?:unknown){
    const response=await fetch(base+(body?'/api/onboarding':'/api/game'),{method:body?'POST':'GET',headers:{cookie,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    const set=response.headers.get('set-cookie');if(set)freshCookie=set.split(';')[0];
    return {status:response.status,data:await response.json() as any};
  }
  try{
    const returning=await call(`airace_session=${legacy}`);
    assert.deepEqual(returning.data.onboarding,{isNewPlayer:false,storySeen:true,tutorial:'dismissed'});
    assert.deepEqual(returning.data.state,initial);
    const fresh=await call('');assert.equal(fresh.data.onboarding.storySeen,false);assert.equal(fresh.data.onboarding.isNewPlayer,true);
    const update=await call(freshCookie,{storySeen:true,tutorial:'active'});assert.equal(update.status,200);
    const resumed=await call(freshCookie);assert.equal(resumed.data.onboarding.storySeen,true);assert.equal(resumed.data.onboarding.tutorial,'active');assert.deepEqual(resumed.data.state,initial);
    assert.equal((await call(freshCookie,{tutorial:'complete'})).status,400);
    assert.equal((await call(freshCookie,{credits:100000})).status,400);
    await call(freshCookie,{tutorial:'dismissed'});
    assert.equal((await call(freshCookie)).data.onboarding.tutorial,'dismissed');
    await call(`airace_session=${legacy}`,{storySeen:true,tutorial:'active'});
    assert.equal((await call(`airace_session=${legacy}`)).data.onboarding.isNewPlayer,false);
  }finally{await new Promise<void>((r,j)=>server.close(e=>e?j(e):r()));closeDatabase();}
  const reopened=new DatabaseSync(path);
  try{
    const saved=reopened.prepare('SELECT * FROM onboarding WHERE session=?').get(freshCookie.split('=')[1]);
    assert.equal(saved?.storySeen,1);assert.equal(saved?.tutorial,'dismissed');
    assert.equal(reopened.prepare('SELECT COUNT(*) AS n FROM onboarding WHERE session=?').get(legacy)?.n,0);
  }finally{reopened.close();if(!resolve(folder).startsWith(resolve(tmpdir())+sep))throw new Error('Unexpected test directory');rmSync(folder,{recursive:true,force:true});}
});
