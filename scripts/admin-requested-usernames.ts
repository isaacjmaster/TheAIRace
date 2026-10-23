import {DatabaseSync} from 'node:sqlite';import {adjustTestUsernames} from '../server/admin-usernames';
const [tigerId,renameId,flag]=process.argv.slice(2);if(!tigerId||!renameId||!process.env.GAME_DB_PATH)throw Error('Require GAME_DB_PATH and both verified permanent account IDs; add --apply after reviewing dry run.');
const db=new DatabaseSync(process.env.GAME_DB_PATH);try{console.log(JSON.stringify(adjustTestUsernames(db,{tigerId,renameId},flag==='--apply')));}finally{db.close();}
