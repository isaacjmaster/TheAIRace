import {validFoundationPosition,type FoundationState,type RigPosition} from '../../shared/foundation';
export function openHangar(s:FoundationState):RigPosition{for(let z=-22;z<=28;z++)for(let x=-29;x<=32;x++)if(!validFoundationPosition(s,[x,z],'hangar'))return [x,z];throw Error('No valid test Hangar lot');}
