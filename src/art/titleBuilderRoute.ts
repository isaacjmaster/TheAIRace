// Same 4.04-unit walk and .30-.64 progress window as the original diagonal.
// The developed campus leaves a clear front service aisle, including both loop endpoints.
export const TITLE_BUILDER_START={x:-10,z:10.2};
const distance=Math.hypot(3,2.7);
export function titleBuilderPose(progress:number){
 const t=Math.max(0,Math.min(1,(progress-.3)/(.64-.3))),walk=t*t*(3-2*t);
 return {x:TITLE_BUILDER_START.x+walk*distance,z:TITLE_BUILDER_START.z,yaw:walk<1&&progress>.3?Math.PI/2:.2};
}
