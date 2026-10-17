import {buildFabricator,type FoundationState,type RigPosition,type Orientation} from '../../shared/foundation';
/** Explicit old-format fixture for compatibility tests; no client API exposes paired purchases. */
export const buildLegacyFabricator=(s:FoundationState,p:RigPosition,now:number,orientation:Orientation=0)=>buildFabricator(s,p,now,orientation,false);
