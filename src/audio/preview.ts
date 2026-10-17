import {Soundscape} from './sound';
import {MUSIC_LOOP_STEPS,musicStep,type MusicMode} from './score';
import {MusicSynth,playMusicStep} from './musicSynth';
/** Offline-only audition tool: no speakers, live AudioContext, player preferences or game state. */
export async function renderMusicPreview(mode:MusicMode){const rate=44100,steps=MUSIC_LOOP_STEPS[mode],seconds=steps*musicStep(0,mode).seconds,length=Math.round(seconds*rate),ctx=new OfflineAudioContext(1,length*3+rate,rate),bus=ctx.createGain();bus.gain.value=.22*(mode==='hq'?.55:.5);bus.connect(ctx.destination);const synth=new MusicSynth(ctx);let time=0;for(let i=0;i<steps*3;i++)time+=playMusicStep(synth,i,mode,time,bus);const result=await ctx.startRendering();return {samples:result.getChannelData(0).slice(length,length*2),sampleRate:rate,duration:seconds};}

/** Exercise the actual live crossfade scheduler in a speaker-free offline context. */
export async function renderMusicTransition(){const sampleRate=44100,duration=36,offline=new OfflineAudioContext(1,sampleRate*(duration+1),sampleRate);let time=0;
 const context=new Proxy(offline,{get(target,key){if(key==='currentTime')return time;if(key==='state')return 'running';if(key==='resume'||key==='close')return async()=>{};const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}}) as unknown as AudioContext;
 const audio=new Soundscape({createContext:()=>context});try{await audio.unlock();const scheduler=audio as unknown as {timer?:ReturnType<typeof setInterval>;schedule:()=>void};if(scheduler.timer)clearInterval(scheduler.timer);scheduler.timer=undefined;for(let i=0;i<duration*10;i++){time=i/10;if(i===80)audio.setMode('raid');if(i===260)audio.setMode('hq');scheduler.schedule();}const result=await offline.startRendering();return {samples:result.getChannelData(0).slice(0,sampleRate*duration),sampleRate,duration};}finally{audio.dispose();}}
