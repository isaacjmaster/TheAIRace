/** Isolated HTTPS-tunnel origin. Never imports production server or its database configuration. */
import express from 'express';
import {DatabaseSync} from 'node:sqlite';
import {resolve} from 'node:path';
import {existsSync,mkdirSync} from 'node:fs';
import {registerFoundation} from '../server/foundation-api';
const dir=resolve('data/status-bar-test');
if(!existsSync(resolve(dir,'dist/index.html')))throw new Error('Run node scripts/build-status-bar-test.mjs first');
mkdirSync(dir,{recursive:true});
process.env.NODE_ENV='production'; // Secure cookies on the external HTTPS origin.
const db=new DatabaseSync(resolve(dir,'isolated-test.sqlite'));
const app=express();app.disable('x-powered-by');app.set('trust proxy','loopback');
app.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store');res.setHeader('X-AI-Race-Test','status-bar-v1');res.setHeader('X-Robots-Tag','noindex, nofollow');next();});
app.get('/healthz',(_req,res)=>res.json({status:'ok',test:'status-bar-v1',isolatedDatabase:true}));
app.use(express.json({limit:'4kb'}));
app.use('/api',(req,res,next)=>{if(req.method!=='GET'&&req.method!=='HEAD'){
 const origin=req.headers.origin;try{if(!origin||new URL(origin).host!==req.headers.host){res.status(403).json({error:'Same-origin requests only'});return;}}catch{res.sendStatus(403);return;}
 if(!req.is('application/json')){res.sendStatus(400);return;}
}next();});
registerFoundation(app,db);
app.use('/api',(_req,res)=>res.status(404).json({error:'No such test endpoint'}));
app.use(express.static(resolve(dir,'dist'),{dotfiles:'deny',index:false}));
app.get(['/', '/display-diagnostics'],(_req,res)=>res.sendFile('index.html',{root:resolve(dir,'dist')}));
app.use((_req,res)=>res.sendStatus(404));
app.use((_error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>res.status(400).json({error:'Invalid request'}));
const server=app.listen(5186,'127.0.0.1',()=>console.log('Isolated display test on 127.0.0.1:5186; database data/status-bar-test/isolated-test.sqlite'));
process.on('SIGINT',()=>server.close(()=>{db.close();process.exit(0);}));

