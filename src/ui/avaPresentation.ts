import {builderLesson,type AvaProgress} from '../../shared/ava';
/** Presentation targets never mutate authoritative onboarding progress. */
export function avaHudTarget(p:AvaProgress){
 if(builderLesson(p))return null;
 return p.step===5?'.compute-hud:not(.research-hud) > svg':p.step===6?'.research-hud > svg':null;
}
export const avaReadTime=(text:string)=>Math.max(4000,Math.min(12000,1500+text.split(/\s+/).length*280));
export function viewportAnchor(point:{x:number;y:number;z:number},rect:{left:number;top:number;width:number;height:number},viewport:{width:number;height:number},occlusions:readonly {left:number;right:number;top:number;bottom:number}[]=[]){
 const x=rect.left+point.x,y=rect.top+point.y;
 // Never clamp a world target to the viewport: that points at unrelated ground.
 return point.z>=-1&&point.z<=1&&point.x>=0&&point.x<=rect.width&&point.y>=0&&point.y<=rect.height&&x>=24&&x<=viewport.width-24&&y>=80&&y<=viewport.height-12&&!occlusions.some(r=>x+24>r.left&&x-24<r.right&&y>r.top&&y-70<r.bottom)?{x,y}:null;
}
