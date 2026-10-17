import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
if(process.env.NODE_ENV==='production')throw new Error('This launcher is for local development only.');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
process.env.NODE_ENV='development';
process.env.PORT='3015';
process.env.GAME_DB_PATH=resolve(root,'data/identity-preview.sqlite');
// Cookies ignore port numbers. Keep this preview separate from the older LAN game.
process.env.GAME_SESSION_COOKIE='airace_identity_preview_session';
// Read-only, credential-verified import of this project's known earlier local bases.
process.env.GAME_LEGACY_DB_PATHS=JSON.stringify(['ava-preview.sqlite','scrap-bot-preview.sqlite','integrated-game.sqlite'].map(name=>resolve(root,'data',name)));
const {start}=await import('../server/index');
start();
