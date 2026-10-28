/** Introductory economy configuration. No purchases or client-authorized balance changes. */
export const CATALYSTS={startingBalance:100,secondsPerCatalyst:150} as const;
/** Remaining server-authoritative milliseconds; an elapsed timer is free. */
export function catalystCost(remainingMs:number){
 if(!Number.isFinite(remainingMs))throw Error('Invalid completion duration.');
 return remainingMs<=0?0:Math.max(1,Math.ceil(remainingMs/(CATALYSTS.secondsPerCatalyst*1000)));
}
