import type {FoundationState} from './foundation';
export type AvaProgress={status:'active'|'skipped'|'complete'|'legacy';step:number;revision:number;collected:boolean};
export const newAva=(revision=0):AvaProgress=>({status:'active',step:0,revision,collected:false});
export const legacyAva=():AvaProgress=>({status:'legacy',step:16,revision:0,collected:false});
/** Observe authoritative state only. Never construct, collect, or award anything. */
export function reconcileAva(progress:AvaProgress,state:FoundationState,now:number):AvaProgress{
 const next={...progress};
 if(next.status!=='active')return next;
 if(next.step>=7&&next.step<=10&&state.rig){next.step=now>=state.rig.completesAt?11:10;}
 if(next.step===12&&next.collected)next.step=13;
 if(next.step!==progress.step)next.revision++;
 return next;
}
export type AvaCommand='continue'|'build-menu'|'rig-selected'|'skip'|'replay';
export function commandAva(progress:AvaProgress,command:AvaCommand,state:FoundationState,now:number):AvaProgress{
 if(command==='replay')return newAva(progress.revision+1);
 let next=reconcileAva(progress,state,now);
 if(next.status!=='active')return next;
 if(command==='skip')return {...next,status:'skipped',revision:next.revision+1};
 const step=next.step;
 if(command==='continue'&&(step<=6||step===11||step>=13)){
  next={...next,step:step+1,revision:next.revision+1};
  if(next.step>=16)next.status='complete';
 }else if(command==='build-menu'&&step===7)next={...next,step:8,revision:next.revision+1};
 else if(command==='rig-selected'&&(step===7||step===8))next={...next,step:9,revision:next.revision+1};
 return reconcileAva(next,state,now);
}
export function avaLine(p:AvaProgress,s:FoundationState,now:number,panel:string|null,placing:string|null):string{
 const lines=[
 "Hey, Founder! I'm Ava, your AI cofounder.",
 "Welcome to 2028. We're starting an AI company. Right now, it's just us, a little headquarters, and some very big ambitions.",
 "Ready to build something extraordinary?",
 "See that little house? That's our Founder HQ. It's where everything begins.",
 "As our company grows, we'll upgrade it and unlock better technology.",
 "To build an AI company, we need Compute. Think of it as the fuel behind everything we create.",
 "Let's start producing some of our own.",
 "Tap Build and choose a GPU Rig. It'll help us generate Compute.",
 "Choose the GPU Rig card under Resources. It generates Compute that we'll collect ourselves.",
 "Find some open ground. Drag or tap to position the rig, then Confirm. Pinch to zoom, or switch to Pan camera to look around.",
 "Nice! Our Builder Bot is on it. Every great company needs someone who knows how to put things together. Its Builder Station is home between jobs. Construction takes 15 seconds—you can explore while we wait.",
 "Look at that! Our first GPU Rig. Now we're producing Compute.",
 "When at least 1 Compute is ready, tap the rig or its collection badge. It produces 5 per minute, so the first one takes about 12 seconds. You can explore while we wait.",
 "This is just the beginning.",
 "We'll build more technology, manufacture robots, and raid rival AI networks to grow our company.",
 "Someday, this little headquarters could become something incredible. Let's get to work!"
 ];
 if(p.step>=7&&p.step<=9&&!s.rig){
  if(s.buildersBusy)return "Our Builder Bot is finishing another job. Once it's free, open Build and choose GPU Rig. You can explore or skip the tutorial for now.";
  if(s.compute<50)return "A GPU Rig costs 50 Compute. We don't have enough yet. You can earn more from raids if you have bots, or skip for now and replay from Settings whenever you're ready.";
  if(placing==='build')return lines[9];
  if(placing!=='build'&&p.step===9)return "Open Build and choose GPU Rig again when you're ready to place it. Nothing is charged until you Confirm.";
  if(panel!=='build'&&p.step===8)return lines[7];
 }
 if(p.step===12&&s.compute>=s.capacity)return "Our Compute storage is full. Spend some Compute before collecting, or skip for now and replay from Settings.";
 if(p.step===12&&s.rig&&now<s.rig.completesAt)return lines[10];
 return lines[p.step]||lines[15];
}
