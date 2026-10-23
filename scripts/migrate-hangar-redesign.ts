import {DatabaseSync} from 'node:sqlite';
import {migrateHangars} from '../server/hangar-redesign';
const file=process.env.GAME_DB_PATH;if(!file)throw Error('Set GAME_DB_PATH explicitly.');
const apply=process.argv.includes('--apply'),db=new DatabaseSync(file,{readOnly:!apply});
try{console.log(JSON.stringify(migrateHangars(db,apply),null,2));}finally{db.close();}
