import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {createServer} from 'node:net';
const folder=await mkdtemp(join(tmpdir(),'airace-production-'));
const listener=createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const port=listener.address().port;await new Promise(r=>listener.close(r));
const env={...process.env,NODE_ENV:'production',PORT:String(port),GAME_DB_PATH:join(folder,'nested','game.sqlite')};
let child,output='';const url=`http://127.0.0.1:${port}`;
async function start(){output='';child=spawn(process.execPath,['--import','tsx','server/index.ts'],{env,stdio:['ignore','pipe','pipe']});child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);for(let i=0;i<100;i++){if(child.exitCode!==null)throw new Error(output);try{const r=await fetch(url+'/healthz');if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw new Error('Startup timeout: '+output);}
async function stop(){if(child&&child.exitCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill();await ended;}}
try{
 await start();const health=await fetch(url+'/healthz');assert.equal(health.headers.get('set-cookie'),null);assert.equal((await health.json()).status,'ok');
 const html=await (await fetch(url)).text();assert.match(html,/assets\/index-/);const asset=html.match(/src="([^"]+\.js)"/)[1];assert.equal((await fetch(url+asset)).status,200);
 const first=await fetch(url+'/api/foundation');const cookie=first.headers.get('set-cookie');assert.match(cookie,/HttpOnly/i);assert.match(cookie,/Secure/i);const initial=await first.json();assert.equal(initial.state.compute,100);
 const headers={'content-type':'application/json','X-Company-ID':initial.company.playerId,cookie:cookie.split(';')[0]};
 const station=await fetch(url+'/api/foundation/bots',{method:'POST',headers,body:JSON.stringify({requestId:crypto.randomUUID(),generation:0,command:{action:'establish-station',position:[3,5]}})});assert.equal(station.status,200);
 const purchase=await fetch(url+'/api/foundation/rig',{method:'POST',headers,body:JSON.stringify({action:'build',position:[6,0],requestId:crypto.randomUUID(),generation:0})});assert.equal(purchase.status,200);assert.equal((await purchase.json()).state.compute,50);
 await stop();await start();const saved=await(await fetch(url+'/api/foundation',{headers})).json();assert.equal(saved.state.compute,50);assert.deepEqual(saved.state.rig.position,[6,0]);
 const duplicate=await fetch(url+'/api/foundation/rig',{method:'POST',headers,body:JSON.stringify({action:'build',position:[12,0],requestId:crypto.randomUUID(),generation:0})});assert.equal(duplicate.status,400);
 console.log('Production smoke passed: assigned PORT, frontend/assets/API, health, secure cookie, nested SQLite path, persisted GPU purchase across process restart, duplicate blocked.');
}finally{await stop();await rm(folder,{recursive:true,force:true});}
