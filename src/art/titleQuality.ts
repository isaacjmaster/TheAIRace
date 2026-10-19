/** Bound Retina fill cost to 2.4M pixels; the title is a small 30fps decorative scene. */
export function titlePixelRatio(width:number,height:number,dpr:number){
 return Math.max(1,Math.min(Number.isFinite(dpr)?dpr:1,2.5,Math.sqrt(2_400_000/Math.max(1,width*height))));
}
