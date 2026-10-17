import {randomBytes,createHash,scrypt} from 'node:crypto';
export const RECOVERY_ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
/** Twelve independent uniform base32 symbols: 60 bits, never a truncated legacy token. */
export function newShortRecoveryCode(){return [...randomBytes(12)].map(byte=>RECOVERY_ALPHABET[byte&31]).join('').match(/.{4}/g)!.join('-');}
let pending=0;
/** Slow deterministic verifier permits lookup without storing a fast hash of a 60-bit code. */
export async function recoveryVerifier(value:unknown):Promise<string>{
 if(typeof value!=='string'||value.length>100)return createHash('sha256').update('invalid').digest('hex');
 const normalized=value.trim().toUpperCase().replace(/[\s-]/g,'');
 // Preserve the exact V1 long-code verifier; no migration changes existing credentials.
 if(/^AIR[A-F0-9]{40}$/.test(normalized))return createHash('sha256').update(normalized).digest('hex');
 if(!/^[A-HJ-NP-Z2-9]{12}$/.test(normalized))return createHash('sha256').update('invalid').digest('hex');
 if(pending>=16)throw new Error('Recovery service busy');pending++;
 try{return 's1:'+await new Promise<string>((resolve,reject)=>scrypt(normalized,'The AI Race recovery short v1',32,{N:32768,r:8,p:1,maxmem:64*1024*1024},(err,key)=>err?reject(err):resolve(key.toString('hex'))));}finally{pending--;}
}
