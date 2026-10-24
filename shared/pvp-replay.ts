import type {Operation} from './infiltration';

export type ReplayFrame=Pick<Operation,'lastTick'|'startedAt'|'finishedAt'|'status'|'agent'|'squad'|'drones'|'sentinels'|'hacked'|'carried'>;
export type BattleReplay={version:1;initial:Operation;final:Operation;frames:ReplayFrame[];attacker:string;defender:string;finishedAt:number};
// Only server callers opt in. Client prediction never builds a recording.
const recordings=new WeakMap<Operation,ReplayFrame[]>();
export function beginReplayRecording(o:Operation){if(o.pvp&&!recordings.has(o))recordings.set(o,[]);}
export function captureReplayFrame(o:Operation){const frames=recordings.get(o);if(!frames)return;
 const {lastTick,startedAt,finishedAt,status,agent,squad,drones,sentinels,hacked,carried}=o;
 const frame=structuredClone({lastTick,startedAt,finishedAt,status,agent,squad,drones,sentinels,hacked,carried});
 // Navigation is not re-simulated during playback; paths need only preserve moving/idle presentation.
 frame.agent.path=[];for(const a of frame.squad?.agents??[])a.path=a.path.length?[a.path[0]]:[];for(const d of frame.drones)d.path=[];
 if(frames.at(-1)?.lastTick===lastTick)frames[frames.length-1]=frame;else frames.push(frame);
}
export function takeReplayFrames(o:Operation){const frames=recordings.get(o)??[];recordings.delete(o);return frames;}
export function replayOperationAt(replay:BattleReplay,at:number):Operation{
 let lo=0,hi=replay.frames.length-1,index=-1;while(lo<=hi){const mid=(lo+hi)>>1;if(replay.frames[mid].lastTick<=at){index=mid;lo=mid+1;}else hi=mid-1;}
 const frame=replay.frames[index],o=structuredClone({...replay.initial,...frame});
 o.events=replay.final.events.filter(e=>e.at<=at);o.settlement=at>=replay.finishedAt?replay.final.settlement:undefined;
 return o;
}
