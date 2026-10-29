/** Synthetic CPU measurement; not a device FPS benchmark. Run with node --import tsx. */
import {SecurityWalls} from '../src/art/SecurityWalls.ts';
const input=[];for(let x=0;x<50;x++)for(const z of [.5,10.5,20.5,30.5])input.push({id:`${x},${z}`,x:x+.5,z,w:1,d:1,level:5});
const times={full:[],incremental:[]};let fullCalls=0,chunkCalls=0;
for(let i=0;i<8;i++){let t=performance.now();const a=new SecurityWalls(input);times.full.push(performance.now()-t);fullCalls=a.group.children.length;a.dispose();const b=new SecurityWalls([]);b.sync(input);t=performance.now();b.sync(input.map(w=>w.x===7.5&&w.z===.5?{...w,level:4}:w));times.incremental.push(performance.now()-t);chunkCalls=b.group.children.length;b.dispose();}for(const key in times)times[key]=times[key].slice(2).sort((a,b)=>a-b);console.log(JSON.stringify({times,fullCalls,chunkCalls}));
