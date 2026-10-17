import {initialFoundation,startBotRaid} from '../shared/foundation';
import {deploy,tick,destruction,STEP,STATS,type Raid,type Point} from '../raid/engine';
export const approaches={north:{x:9,y:2},east:{x:23,y:9},south:{x:17,y:16},west:{x:3,y:9}};
export function simulate(layout:number,count:number,approach:keyof typeof approaches,spacing=0){
 const s=initialFoundation();s.bots=count;startBotRaid(s,'simulation',layout,0);const r=s.botRaid!.simulation;
 let deployed=0;const seen=new Set<number>(),defenses:Record<number,number>={};
 for(let frame=0;frame<1802&&!r.ended;frame++){
  while(deployed<count&&r.time+1e-8>=deployed*spacing){deploy(r,'scrap',approaches[approach]);deployed++;}
  tick(r);for(const e of r.effects){if(seen.has(e.id))continue;seen.add(e.id);if(e.source<100&&e.target>=100)defenses[e.source]=(defenses[e.source]||0)+e.damage;}
 }
 return {layout,count,approach,spacing,won:r.reason==='Network cleared',survivors:r.units.filter(u=>u.hp>0).length,destroyed:destruction(r),seconds:+r.time.toFixed(2),reason:r.reason,defenses};
}
if(process.argv[1]?.endsWith('simulate-scrap.ts')){
 const cases=[[0,1],[0,3],[0,5],[0,10],[1,5],[1,10]];
 const results=cases.flatMap(([layout,count])=>Object.keys(approaches).map(a=>simulate(layout,count,a as keyof typeof approaches)));
 results.push(simulate(0,10,'north',2),simulate(1,10,'east',2));
 console.log(JSON.stringify({stats:STATS.scrap,results},null,2));
}
