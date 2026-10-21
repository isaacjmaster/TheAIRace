/** Original stylized daytime air, leaves and birds. No downloaded recordings. */
export const HQ_AUDIO={musicScale:.6,airGain:.025,birdGain:.025,leafGain:.035} as const;
export class HQAmbience{
 private fading?:AudioBufferSourceNode;private air?:AudioBufferSourceNode;private airBus?:GainNode;private noise?:AudioBuffer;
 private voices=new Set<AudioScheduledSourceNode>();private seed=8731;private nextBird=0;private nextLeaf=0;
 constructor(private ctx:BaseAudioContext,private output:AudioNode){}
 private random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 private buffer(){if(!this.noise){const n=this.noise=this.ctx.createBuffer(1,this.ctx.sampleRate*12,this.ctx.sampleRate),a=n.getChannelData(0);let last=0;for(let i=0;i<a.length;i++){last=last*.985+(this.random()*2-1)*.015;a[i]=last*3;}const edge=a[0]-a[a.length-1];for(let i=0;i<128;i++)a[a.length-128+i]+=edge*i/127;}return this.noise;}
 get active(){return !!this.air;}get detailVoices(){return this.voices.size;}
 start(){if(this.air)return;if(this.fading){try{this.fading.stop(this.ctx.currentTime);}catch{}this.fading=undefined;}const t=this.ctx.currentTime,source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),gain=this.ctx.createGain();source.buffer=this.buffer();source.loop=true;filter.type='lowpass';filter.frequency.value=1100;gain.gain.value=0;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(HQ_AUDIO.airGain,t+1.2);source.connect(filter).connect(gain).connect(this.output);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};source.start(t);this.air=source;this.airBus=gain;this.nextBird=t+7+this.random()*7;this.nextLeaf=t+12+this.random()*10;}
 tick(t=this.ctx.currentTime){if(!this.air)return;
  if(t>=this.nextBird){this.nextBird=t+11+this.random()*15;if(this.voices.size<=2)this.bird(t);}
  if(t>=this.nextLeaf){this.nextLeaf=t+19+this.random()*17;if(this.voices.size<=2)this.leaf(t);}
 }
 private bird(t:number){const count=this.random()>.55?3:2,base=1450+this.random()*950;
  for(let i=0;i<count;i++){const osc=this.ctx.createOscillator(),gain=this.ctx.createGain(),at=t+i*(.16+this.random()*.06),duration=.10+this.random()*.09;
   osc.type='sine';osc.frequency.setValueAtTime(base*(1+i*.09),at);osc.frequency.exponentialRampToValueAtTime(base*(1.35+this.random()*.2),at+duration*.45);osc.frequency.exponentialRampToValueAtTime(base*.92,at+duration);
   gain.gain.value=0;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(HQ_AUDIO.birdGain*(.7+this.random()*.3),at+.018);gain.gain.linearRampToValueAtTime(0,at+duration);osc.connect(gain).connect(this.output);this.voices.add(osc);osc.onended=()=>{osc.disconnect();gain.disconnect();this.voices.delete(osc);};osc.start(at);osc.stop(at+duration+.01);
  }
 }
 private leaf(t:number){const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),gain=this.ctx.createGain();source.buffer=this.buffer();filter.type='bandpass';filter.frequency.value=850+this.random()*700;const duration=1.6+this.random()*1.4;gain.gain.value=0;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(HQ_AUDIO.leafGain,t+.6);gain.gain.linearRampToValueAtTime(0,t+duration);source.connect(filter).connect(gain).connect(this.output);this.voices.add(source);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();this.voices.delete(source);};source.start(t,this.random()*6,duration);}
 stop(fade=.6){const t=this.ctx.currentTime;if(this.fading){try{this.fading.stop(t);}catch{}this.fading=undefined;}if(this.air){this.airBus!.gain.cancelScheduledValues(t);this.airBus!.gain.setValueAtTime(this.airBus!.gain.value,t);this.airBus!.gain.linearRampToValueAtTime(0,t+fade);this.air.stop(t+fade);this.fading=this.air;this.air=undefined;this.airBus=undefined;}for(const voice of this.voices){try{voice.stop(t);}catch{}}this.voices.clear();}
 dispose(){this.stop(0);this.noise=undefined;}
}
