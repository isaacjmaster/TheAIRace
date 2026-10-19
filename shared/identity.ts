export type CompanyIdentity={playerId:string;username:string|null;usernameChangedAt:number|null;usernameAvailableAt:number|null;serverTime:number;/** Compatibility alias: contains only a username, never a legacy company name. */name:string|null;level:number;nameDeferred:boolean;secured:boolean;recoveryUpdatedAt:number|null};
export const USERNAME_COOLDOWN_MS=14*24*60*60*1000;
export const USERNAME_RESERVED=['admin','administrator','system','moderator','support','official','masterstudios','theairace','ava'];
export function cleanUsername(value:unknown){
 if(typeof value!=='string')throw Error('Enter a username.');
 const username=value.trim();
 if(username.length<3||username.length>16)throw Error('Use 3–16 characters.');
 if(!/^[A-Za-z0-9_]+$/.test(username))throw Error('Use letters, numbers and underscores.');
 if(USERNAME_RESERVED.includes(username.toLowerCase().replaceAll('_','')))throw Error('Please choose another username.');
 return username;
}
