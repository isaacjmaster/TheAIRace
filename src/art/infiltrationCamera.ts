import * as THREE from 'three';
/** Fit the playable compound in the unobscured region; draw scenery behind the entire viewport. */
export function frameInfiltration(camera:THREE.OrthographicCamera,width:number,height:number,reserved:{right:number;top:number;bottom:number;left?:number},center:THREE.Vector3,zoom=1,arena={minX:-14,maxX:14,minZ:-10,maxZ:10}){
 camera.position.copy(center).add(width<height?new THREE.Vector3(23,42,22):new THREE.Vector3(14,27,29));camera.lookAt(center);camera.updateMatrixWorld(true);
 const bounds=new THREE.Box2();for(const x of [arena.minX,arena.maxX])for(const z of [arena.minZ,arena.maxZ]){const p=new THREE.Vector3(x,0,z).applyMatrix4(camera.matrixWorldInverse);bounds.expandByPoint(new THREE.Vector2(p.x,p.y));}for(const x of [-4,4]){const p=new THREE.Vector3(x,6,-3).applyMatrix4(camera.matrixWorldInverse);bounds.expandByPoint(new THREE.Vector2(p.x,p.y));}
 const size=bounds.getSize(new THREE.Vector2()),safeW=Math.max(150,width-reserved.right-(reserved.left??0)),safeH=Math.max(150,height-reserved.top-reserved.bottom),units=Math.max(size.x/safeW,size.y/safeH)*1.12*zoom;
 camera.left=-units*width/2;camera.right=units*width/2;camera.top=units*height/2;camera.bottom=-units*height/2;const offset=camera.position.clone().sub(center),distance=Math.max(offset.length(),units*height*1.2+40);camera.position.copy(center).add(offset.normalize().multiplyScalar(distance));camera.lookAt(center);camera.updateMatrixWorld(true);camera.near=.1;camera.far=distance+units*height*2+100;
 camera.setViewOffset(width,height,(reserved.right-(reserved.left??0))/2,(reserved.bottom-reserved.top)/2,width,height);camera.updateProjectionMatrix();
}

/** Derive close inspection and widest safe views from projected coverage, not device-specific zoom values. */
export function infiltrationZoomLimits(width:number,height:number,reserved:{right:number;top:number;bottom:number;left?:number},arena={minX:-21,maxX:21,minZ:-17,maxZ:17}){
 const c=new THREE.OrthographicCamera();frameInfiltration(c,width,height,reserved,new THREE.Vector3(),1,arena);
 const widthAtFit=c.right-c.left,heightAtFit=c.top-c.bottom;
 const plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),ray=new THREE.Raycaster();let extent=1;
 for(const x of [-1,1])for(const y of [-1,1]){ray.setFromCamera(new THREE.Vector2(x,y),c);const p=ray.ray.intersectPlane(plane,new THREE.Vector3());if(p)extent=Math.max(extent,Math.abs(p.x),Math.abs(p.z));}
 // Close view: twelve units across the short dimension. Far view: every visible
 // ground corner remains inside the shared 220-unit lawn, including maximum pan.
 const min=Math.min(.5,12/Math.min(widthAtFit,heightAtFit)),max=Math.min(.95,88/extent);
 return{min,max:Math.max(min,max),default:Math.max(min,Math.min(.62,max*.88))};
}
