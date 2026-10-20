import {GPU_RIG,hasBuilderStation,type FoundationState} from './foundation';
export type AvaProgress={opening?:'pending'|'shown';builderStep?:number;status:'active'|'skipped'|'complete'|'legacy';step:number;revision:number;collected:boolean};
export const newAva=(revision=0,opening=true):AvaProgress=>({... (opening?{opening:'pending' as const}:{}),status:'active',builderStep:0,step:0,revision,collected:false});
export const legacyAva=():AvaProgress=>({status:'legacy',step:16,revision:0,collected:false});
/** Observe authoritative state only. Never construct, collect, or award anything. */
export function reconcileAva(progress:AvaProgress,state:FoundationState,now:number):AvaProgress{
 const next={...progress};
 if(next.status!=='active')return next;
 if(next.step===5&&(next.builderStep??4)<3&&hasBuilderStation(state)){next.builderStep=next.builderStep===0?4:3;next.revision++;}
 if(next.step>=7&&next.step<=10&&state.rig){next.step=now>=state.rig.completesAt?11:10;}
 if(next.step===12&&next.collected)next.step=13;
 if(next.step!==progress.step)next.revision++;
 return next;
}
export const builderLesson=(p:AvaProgress)=>p.step===5&&(p.builderStep??4)<4;
export type AvaCommand='continue'|'build-menu'|'rig-selected'|'station-selected'|'skip'|'replay'|'begin-opening';
export function commandAva(progress:AvaProgress,command:AvaCommand,state:FoundationState,now:number):AvaProgress{
 if(command==='replay')return newAva(progress.revision+1,false);
 if(command==='begin-opening')return progress.opening==='pending'?{...progress,opening:'shown',revision:progress.revision+1}:progress;
 let next=reconcileAva(progress,state,now);
 if(next.status!=='active')return next;
 if(command==='skip')return {...next,status:'skipped',revision:next.revision+1};
 if(builderLesson(next)){const b=next.builderStep!;if(command==='continue'&&(b===0||b===3))return {...next,builderStep:b===0?1:4,revision:next.revision+1};if((command==='build-menu'||command==='station-selected')&&(b===1||b===2))return {...next,builderStep:2,revision:next.revision+1};return next;}
 const step=next.step;
 if(command==='continue'&&(step<=6||step===11||step>=13)){
  next={...next,step:step+1,revision:next.revision+1};
  if(next.step>=16)next.status='complete';
 }else if(command==='build-menu'&&step===7)next={...next,step:8,revision:next.revision+1};
 else if(command==='rig-selected'&&(step===7||step===8))next={...next,step:9,revision:next.revision+1};
 return reconcileAva(next,state,now);
}
export function avaLine(p:AvaProgress,s:FoundationState,now:number,panel:string|null,placing:string|null):string{
 if(builderLesson(p))return p.builderStep===0?"Every company needs someone who can turn ideas into reality. Let's get our first Builder Bot!":p.builderStep===3?"Meet our Builder Bot! Its station is home and charging dock between jobs. Now let's put it to work.":placing==='station'?"Choose an open spot for the Builder Station, then Confirm. Our first station is free and ready immediately.":panel==='build'?"Choose Builder Station. It's our little robot's home and charging dock.":"Tap Build and choose Builder Station. We'll choose where our first builder lives.";
 const lines=[
 "Hey, Founder! I'm Ava, your AI cofounder.",
 "Welcome to 2028. We're starting an AI company, and I have a feeling we're going to build something incredible.",
 "Ready to build something extraordinary?",
 "See that little house? That's our Founder HQ. It's where everything begins.",
 "As our company grows, we'll upgrade it and unlock better technology.",
 "Compute powers our company — we'll use it to build and grow.",
 "Research is the valuable technology we develop — and what rival companies want to steal. Let's build our first GPU Rig!",
 "Tap Build and choose a GPU Rig. It'll help us generate Compute.",
 "Choose the GPU Rig card under Resources. It generates Compute that we'll collect ourselves.",
 "Find some open ground. Drag or tap to position the rig, then Confirm. Pinch to zoom, or switch to Pan camera to look around.",
 "Nice! Our Builder Bot is on it. Feel free to explore while it builds.",
 "Look at that! Our first GPU Rig. Now we're producing Compute.",
 `Our rig produces ${GPU_RIG.perMinute} Compute per minute. When Compute is ready, tap the rig or its badge to collect it.`,
 "This is just the beginning.",
 "We'll build more technology, manufacture robots, and infiltrate rival AI networks to grow our company.",
 "Someday, this little headquarters could become something incredible. Let's get to work!"
 ];
 if(p.step>=7&&p.step<=9&&!s.rig){
  if(s.buildersBusy)return "Our Builder Bot is finishing another job. Once it's free, open Build and choose GPU Rig. You can explore or skip the tutorial for now.";
  if(s.compute<50)return "A GPU Rig costs 50 Compute. We don't have enough yet. You can extract more from rival companies, or skip for now and replay from Settings whenever you're ready.";
  if(placing==='build')return lines[9];
  if(placing!=='build'&&p.step===9)return "Open Build and choose GPU Rig again when you're ready to place it. Nothing is charged until you Confirm.";
  if(panel!=='build'&&p.step===8)return lines[7];
 }
 if(p.step===12&&s.compute>=s.capacity)return "Our Compute storage is full. Spend some Compute before collecting, or skip for now and replay from Settings.";
 if(p.step===12&&s.rig&&now<s.rig.completesAt)return lines[10];
 if(p.step===12&&Math.floor((s.rig?.stored??0)+1e-9)>=1)return 'Compute is ready! Tap the blue chip or GPU Rig to collect it.';
 return lines[p.step]||lines[15];
}

/** Presentation only; pose selection never changes onboarding progression or dialogue. */
export type AvaPose='welcome'|'tablet'|'encourage'|'thinking';
export function avaPose(step:number):AvaPose{
 if(step===4)return 'thinking';
 if(step===5||step===6||step===12)return 'tablet';
 if(step===10||step===11||step===13||step===15)return 'encourage';
 return 'welcome';
}
