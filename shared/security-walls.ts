import type {NavRect} from './navigation';
export type SecurityBarrier=NavRect&{id:string;height?:number};
export function rivalSecurityWalls(established=false):SecurityBarrier[]{const out:SecurityBarrier[]=[{id:'north',x:0,z:-7.5,w:21.6,d:.3},{id:'west',x:-10.8,z:-1,w:.3,d:12.7},{id:'east',x:10.8,z:-1,w:.3,d:12.7},{id:'front-west',x:-10.1,z:5.5,w:1.4,d:.3,height:.95},{id:'front-main',x:2.5,z:5.5,w:16.6,d:.3,height:.95}];if(established)out.push({id:'research-zone',x:3,z:-2.4,w:.28,d:6.5,height:1.15});return out;}
