import {frequency,musicStep,type MusicMode} from './score';
import {voiceEnvelope} from './envelope';
/** Shared live/offline synthesis, entirely original and sample-free. */
export class MusicSynth{private noise?:AudioBuffer;constructor(private ctx:BaseAudioContext){}
 note(midi:number,time:number,duration:number,volume:number,bus:AudioNode,type:OscillatorType='sine',attack=.015,slide?:number,cutoff?:number){
  const ctx=this.ctx,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(frequency(midi),time);if(slide!==undefined)osc.frequency.exponentialRampToValueAtTime(frequency(slide),time+duration);
  voiceEnvelope(gain.gain,time,duration,volume,attack);let filter:BiquadFilterNode|undefined;if(cutoff){filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.setValueAtTime(cutoff,time);filter.frequency.exponentialRampToValueAtTime(cutoff*.55,time+duration);osc.connect(filter);filter.connect(gain);}else osc.connect(gain);gain.connect(bus);osc.start(time);osc.stop(time+duration+.02);osc.onended=()=>{osc.disconnect();filter?.disconnect();gain.disconnect();};
 }
 /** Short synthesized drum strokes; shared deterministic noise, never external samples. */
 drum(time:number,bus:AudioNode,hat:boolean,volume:number){
  const ctx=this.ctx;
  if(!this.noise){this.noise=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.3),ctx.sampleRate);const a=this.noise.getChannelData(0);let seed=37;for(let i=0;i<a.length;i++){seed=(seed*1664525+1013904223)>>>0;a[i]=seed/2147483648-1;}}
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),duration=hat?.045:.11;
  source.buffer=this.noise;filter.type=hat?'highpass':'bandpass';filter.frequency.value=hat?6500:1800;
  voiceEnvelope(gain.gain,time,duration,volume,.008);
  source.connect(filter);filter.connect(gain);gain.connect(bus);source.start(time);source.stop(time+duration+.01);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
 }
}
export function playMusicStep(synth:MusicSynth,step:number,mode:MusicMode,t:number,bus:AudioNode){
 const score=musicStep(step,mode);
 if(mode==='hq'){
  synth.note(score.pluck,t,.15,.05,bus,'triangle',.004);
  if(score.bass!==null)synth.note(score.bass,t,.28,.10,bus,'triangle',.008);
  if(score.melody!==null){const duration=score.seconds*(score.beat===0?1.65:.85);synth.note(score.melody,t,duration,.065,bus,'triangle',.025);synth.note(score.melody-12,t,duration,.025,bus,'sine',.035);}
  if(score.beat===0||score.beat===4)for(const n of score.chord.slice(1))synth.note(n,t,.17,.018,bus,'triangle',.012);
  if(score.kick)synth.note(43,t,.18,.075,bus,'sine',.012,26);
  if(score.snare)synth.drum(t,bus,false,.025);if(score.hat)synth.drum(t,bus,true,.009);
 }else{
  // Rounded saw bass, filtered pulse lead, glassy arpeggios and a broken electronic beat.
  if(score.bass!==null){synth.note(score.bass,t,.19,.085,bus,'sawtooth',.01,undefined,420);synth.note(score.bass-12,t,.2,.05,bus,'sine',.012);}
  if(score.melody!==null){synth.note(score.melody,t,.2,.043,bus,'square',.012,undefined,1900);synth.note(score.melody-12,t,.22,.018,bus,'triangle',.015);}
  if(score.arp!==null)synth.note(score.arp,t,.11,.034,bus,'sine',.008);
  if(score.beat===0||score.beat===8)for(const n of score.chord.slice(1))synth.note(n,t,.65,.014,bus,'triangle',.04);
  if(score.kick)synth.note(50,t,.17,.13,bus,'sine',.008,25);
  if(score.snare)synth.drum(t,bus,false,.044);if(score.hat)synth.drum(t,bus,true,score.beat===15?.022:.014);
 }
 return score.seconds;
}
