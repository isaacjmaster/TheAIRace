import * as THREE from 'three';
import {portraitCampusSpan} from './portraitCamera';
export const CAMPUS_CAMERA_OFFSET=new THREE.Vector3(13,28,30);
export function campusProjection(camera:THREE.OrthographicCamera,width:number,height:number){const aspect=width/height,span=portraitCampusSpan(aspect);camera.left=-span/2;camera.right=span/2;camera.top=span/aspect/2;camera.bottom=-span/aspect/2;camera.updateProjectionMatrix();}
