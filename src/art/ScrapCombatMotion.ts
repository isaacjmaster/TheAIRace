/** Read-only pose clock. Hit events drive extension; cooldown only prepares a valid in-range target. */
export function punchExtension(secondsSinceHit:number){
 if(secondsSinceHit<0||secondsSinceHit>=.32)return 0;
 if(secondsSinceHit<=.055)return 1;
 const t=Math.min(1,(secondsSinceHit-.055)/.265);return 1-t*t*(3-2*t);
}
export function punchWindup(cooldown:number,inRange:boolean,stationary:boolean){
 if(!inRange||!stationary||cooldown<=0||cooldown>.18)return 0;
 const t=1-cooldown/.18;return t*t*(3-2*t);
}
