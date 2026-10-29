/** Competitive PvP policy. Influence is an independent progression system. */
export const INFILTRATION_RATING={cooldownMs:6*60*60*1000,rewards:[-12,8,18,30]} as const;
export const INFILTRATION_RANKS=[
 {id:'prototype',name:'Prototype',minRating:0,maxRating:99},
 {id:'circuit',name:'Circuit',minRating:100,maxRating:249},
 {id:'alloy',name:'Alloy',minRating:250,maxRating:499},
 {id:'prism',name:'Prism',minRating:500,maxRating:899},
 {id:'quantum',name:'Quantum',minRating:900,maxRating:1399},
 {id:'singularity',name:'Singularity',minRating:1400,maxRating:2199},
 {id:'ascendant',name:'Ascendant',minRating:2200,maxRating:null},
] as const;
export type InfiltrationRankId=typeof INFILTRATION_RANKS[number]['id'];
export function infiltrationRank(rating:number){return [...INFILTRATION_RANKS].reverse().find(r=>rating>=r.minRating)??INFILTRATION_RANKS[0];}
export type RatingSettlement={before:number;after:number;delta:number;eligible:boolean;reason?:string;nextEligibleAt:number;beforeRank:InfiltrationRankId;afterRank:InfiltrationRankId};
export type RatingRow={companyId:string;name:string;rating:number;rank:InfiltrationRankId;position:number;current:boolean};
export type RatingLeaderboard={rows:RatingRow[];own:RatingRow|null};
export function ratingAfter(before:number,tokens:number){if(!Number.isInteger(tokens)||tokens<0||tokens>3)throw Error('Invalid authoritative Breach Token result.');return Math.max(0,before+INFILTRATION_RATING.rewards[tokens]);}
