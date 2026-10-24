/** Visual residents only: no movement here changes gameplay inventory. */
export const COMPOUND_BOT_LIMIT=8;
type Point=[number,number];
// A one-way circuit crosses the yard and central staging area. Rounded corners
// avoid sharp turns; all machinery and retained rooms are outside this route.
const corners:Point[]=[[-2.3,-.6],[2.3,-.6],[2.3,2.3],[.7,2.3],[.7,.7],[-.7,.7],[-.7,2.3],[-2.3,2.3]];
const route:Point[]=[];
for(let i=0;i<corners.length;i++){
 const p=corners[i],previous=corners[(i+corners.length-1)%corners.length],next=corners[(i+1)%corners.length];
 const toward=(q:Point):Point=>{const d=Math.hypot(q[0]-p[0],q[1]-p[1]);return [p[0]+(q[0]-p[0])*.3/d,p[1]+(q[1]-p[1])*.3/d];};
 const a=toward(previous),b=toward(next);
 for(let j=0;j<=10;j++){const t=j/10,u=1-t;route.push([u*u*a[0]+2*u*t*p[0]+t*t*b[0],u*u*a[1]+2*u*t*p[1]+t*t*b[1]]);}
}
const lengths=route.map((p,i)=>{const q=route[(i+1)%route.length];return Math.hypot(q[0]-p[0],q[1]-p[1]);});
const circuit=lengths.reduce((a,b)=>a+b,0);
export function compoundBay(slot:number):[number,number,number]{return compoundBotPose(slot,0).position;}
export function compoundBotPose(slot:number,time:number){
 // Spacing and small individual speed variations prevent overtaking without
 // making the whole group move in lockstep. The loop is continuous at its seam.
 const cycle=8,phase=((time+slot*.73)%cycle+cycle)%cycle;
 const offset=slot*circuit/COMPOUND_BOT_LIMIT;
 // Travel 1.45 units per cycle in a 1.7-second walk, then rest. Per-slot
 // phase offsets stay bounded and retain the original ordered spacing.
 const travel=(t:number)=>{const n=Math.floor(t/cycle),p=t-n*cycle;return n*1.45+Math.min(1.45,Math.max(0,p-3)*1.45/1.7);};
 let distance=((travel(Math.max(0,time)+slot*.73)-travel(slot*.73)+offset)%circuit+circuit)%circuit;

 for(let i=0;i<route.length;i++){
  if(distance>lengths[i]){distance-=lengths[i];continue;}
  const p=route[i],q=route[(i+1)%route.length],t=distance/lengths[i];
  return {position:[p[0]+(q[0]-p[0])*t,.28,p[1]+(q[1]-p[1])*t] as [number,number,number],yaw:Math.atan2(q[0]-p[0],q[1]-p[1])};
 }
 return {position:[route[0][0],.28,route[0][1]] as [number,number,number],yaw:0};
}
