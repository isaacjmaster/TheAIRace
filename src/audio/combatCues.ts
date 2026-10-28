/** Original procedural weapon sounds. Cached mono buffers avoid oscillator graphs per hit. */
export const COMBAT_CUES = {
 'disruptor-charge':{duration:.16,from:420,to:1420,gain:.10,grit:.04},
 'disruptor-fire':{duration:.24,from:1250,to:110,gain:.23,grit:.32},
 'arc-fire':{duration:.25,from:2350,to:170,gain:.28,grit:.7},
 'breacher-charge':{duration:.25,from:95,to:280,gain:.17,grit:.15},
 'breacher-impact':{duration:.33,from:155,to:32,gain:.39,grit:.65},
 'breacher-step':{duration:.13,from:90,to:38,gain:.11,grit:.4},
 'pulsewheel-charge': {duration:.12, from:440, to:980, gain:.12, grit:.04},
 'pulsewheel-fire': {duration:.16, from:1250, to:320, gain:.28, grit:.09},
 'pulsewheel-impact': {duration:.13, from:780, to:190, gain:.18, grit:.35},
 'sentinel-charge': {duration:.19, from:110, to:310, gain:.18, grit:.06},
 'sentinel-fire': {duration:.29, from:195, to:42, gain:.42, grit:.22},
 'sentinel-impact': {duration:.24, from:290, to:58, gain:.32, grit:.48},
 'drone-charge': {duration:.07, from:1150, to:1590, gain:.08, grit:.02},
 'drone-fire': {duration:.09, from:1900, to:650, gain:.18, grit:.05},
 'drone-impact': {duration:.09, from:1400, to:400, gain:.13, grit:.3},
 'unit-destroyed': {duration:.34, from:410, to:38, gain:.26, grit:.55},
 'building-shutdown': {duration:.52, from:620, to:35, gain:.32, grit:.42},
} as const;
export type CombatCue=keyof typeof COMBAT_CUES;
export const COMBAT_VOICE_LIMIT=12;
export function combatSamples(cue:CombatCue,sampleRate:number){
 const p=COMBAT_CUES[cue],samples=new Float32Array(Math.ceil(p.duration*sampleRate));
 let phase=0,seed=1979,filtered=0;
 for(let i=0;i<samples.length;i++){
  const t=i/sampleRate,u=t/p.duration;
  phase+=2*Math.PI*(p.from*Math.pow(p.to/p.from,u))/sampleRate;
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  filtered=filtered*.6+(seed/2147483648-1)*.4;
  const attack=Math.min(1,t/.006),release=Math.min(1,(p.duration-t)/.018);
  const decay=cue.endsWith('charge')?(.25+.75*u):Math.exp(-4*u);
  const digital=cue==='building-shutdown'?(.55+.45*Math.pow(Math.sin(t*85),2)):1;
  samples[i]=p.gain*attack*release*decay*digital*((Math.sin(phase)+.2*Math.sin(phase*2.01))*(1-p.grit)+filtered*p.grit);
 }
 samples[0]=0;samples[samples.length-1]=0;return samples;
}
