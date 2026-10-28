import {readFileSync} from 'node:fs';
import type {Operation} from '../../shared/infiltration';
const snapshots=JSON.parse(readFileSync(new URL('./pre-expansion-missions.json',import.meta.url),'utf8')).operations as Record<string,Operation>;
/** Frozen released mission snapshots; new map design cannot rewrite historical regression inputs. */
export function historicalMission(id:string,target:string,now:number):Operation{const o=structuredClone(snapshots[target]);if(!o)throw Error('Unknown historical mission');o.id=id;o.createdAt=now;o.lastTick=now;o.events=[{at:now,type:'prepared'}];return o;}
