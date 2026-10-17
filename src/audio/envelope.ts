/** Start and stop at exact silence; a short linear tail avoids a residual DC step. */
export function voiceEnvelope(param:AudioParam,time:number,duration:number,volume:number,attack:number){
 // GainNodes default to unity. Source/event rounding can expose one full-gain
 // sample before a future zero event, so silence the node from creation.
 param.value=0;
 const rise=Math.min(duration/3,Math.max(.006,attack)),release=Math.min(.018,duration/4);
 param.setValueAtTime(0,time);
 param.linearRampToValueAtTime(volume,time+rise);
 param.exponentialRampToValueAtTime(.0001,time+duration-release);
 param.linearRampToValueAtTime(0,time+duration);
}
