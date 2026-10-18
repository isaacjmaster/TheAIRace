export const COMPANY_XP={thresholds:[0,100],construction:10,clearing:3,raid:[15,25]} as const;
export type CompanyXP={total:number;level:number;nextLevel:number|null;nextThreshold:number|null};
export function xpProgress(total:number,floor=1):CompanyXP{const level=Math.max(floor,total>=COMPANY_XP.thresholds[1]?2:1);return {total,level,nextLevel:level<2?2:null,nextThreshold:level<2?100:null};}
