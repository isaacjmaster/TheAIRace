import type {Operation} from './infiltration';
/** Ratings count only hackable structures, never walls, terrain, scenery or particles. */
export function breachRating(o:Operation){
 const eligible=o.target.assets.filter(a=>a.hackSeconds&&a.access),hacked=eligible.filter(a=>o.hacked.includes(a.id));
 const all=eligible.length>0&&hacked.length===eligible.length,hq=hacked.some(a=>a.kind==='hq'),half=eligible.length>0&&hacked.length*2>=eligible.length;
 const tokens=[hq,half,all] as const;
 return {tokens,count:tokens.filter(Boolean).length,destruction:eligible.length?Math.floor(100*hacked.length/eligible.length):0};
}
