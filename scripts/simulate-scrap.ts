import {STATS} from '../raid/engine';
import {simulate,approaches} from '../raid/scrap-simulation';
export {simulate,approaches};
if(process.argv[1]?.endsWith('simulate-scrap.ts')){
 const cases=[[0,1],[0,3],[0,5],[0,10],[1,5],[1,10]];
 const results=cases.flatMap(([layout,count])=>Object.keys(approaches).map(a=>simulate(layout,count,a as keyof typeof approaches)));
 results.push(simulate(0,10,'north',2),simulate(1,10,'east',2));
 console.log(JSON.stringify({stats:STATS.scrap,results},null,2));
}
