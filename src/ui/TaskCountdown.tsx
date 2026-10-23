/** Server-supplied deadlines only; never announce zero while awaiting settlement. */
export const taskSeconds=(end:number,now:number)=>Math.max(1,Math.ceil((end-now)/1000));
export function TaskCountdown({name,startedAt,completesAt,now,clock=false}:{name:string;startedAt:number;completesAt:number;now:number;clock?:boolean}){
 return <div className="task-countdown glass" role="status" aria-label={`${name}: ${taskSeconds(completesAt,now)} seconds remaining`}><strong>{clock?`${Math.floor(taskSeconds(completesAt,now)/60)}:${String(taskSeconds(completesAt,now)%60).padStart(2,'0')}`:`${taskSeconds(completesAt,now)}s`}</strong><progress aria-label={`${name} progress`} max={Math.max(1,completesAt-startedAt)} value={Math.max(0,Math.min(completesAt-startedAt,now-startedAt))}/></div>;
}
