/** Ranking policy: server consumes this configuration; clients only display it. */
export const INFLUENCE = {cooldownMs: 2 * 60 * 60 * 1000, awards: [25, 50]} as const;
export type InfluenceResult = {awarded:number; eligibleAt:number|null};
export type Competition = {total:number; raids:{award:number;eligibleAt:number}[]; result:InfluenceResult|null;serverTime:number};
export type Ranking = {rank:number;name:string;influence:number;current:boolean};
export type LeaderboardData = {rows:Ranking[];own:Ranking|null};
export function influenceStatus(raid:Competition['raids'][number],serverNow:number){
 if(serverNow>=raid.eligibleAt)return `+${raid.award} Influence Available`;
 const minutes=Math.max(1,Math.ceil((raid.eligibleAt-serverNow)/60000));
 return `Influence in ${minutes>=60?`${Math.floor(minutes/60)}h `:''}${minutes%60}m`;
}
