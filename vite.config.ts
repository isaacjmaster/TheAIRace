import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {readFileSync} from 'node:fs';
export default defineConfig({plugins:[react(),{name:'local-display-diagnostics',configureServer(server){
 server.middlewares.use('/diagnostics.webmanifest',(_req,res)=>{const manifest=JSON.parse(readFileSync('public/manifest.webmanifest','utf8'));res.setHeader('Content-Type','application/manifest+json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({...manifest,id:'/diagnostics',name:'AI Race Display Test',short_name:'Display Test',start_url:'/diagnostics'}));});
}}],server:{proxy:{'/api':process.env.AI_RACE_DEV_API||'http://127.0.0.1:3001'}}});
