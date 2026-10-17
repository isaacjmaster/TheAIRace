import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
if(process.env.NODE_ENV==='production')throw Error('Local combat preview only.');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
process.env.NODE_ENV='development';process.env.PORT='3016';
process.env.GAME_DB_PATH=resolve(root,'data/combat-preview.sqlite');
process.env.GAME_SESSION_COOKIE='airace_combat_preview_session';process.env.GAME_LEGACY_DB_PATHS='[]';
const {start}=await import('../server/index');start();
