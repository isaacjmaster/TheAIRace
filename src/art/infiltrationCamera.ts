import * as THREE from 'three';
/** Fit the playable compound in the unobscured region; draw scenery behind the entire viewport. */
export function frameInfiltration(camera:THREE.OrthographicCamera,width:number,height:number,reserved:{right:number;top:number;bottom:number;left?:number},center:THREE.Vector3,zoom=1){
 camera.position.copy(center).add(width<height?new THREE.Vector3(23,42,22):new THREE.Vector3(14,27,29));camera.lookAt(center);camera.updateMatrixWorld(true);
 const bounds=new THREE.Box2();for(const x of [-14,14])for(const z of [-10,10]){const p=new THREE.Vector3(x,0,z).applyMatrix4(camera.matrixWorldInverse);bounds.expandByPoint(new THREE.Vector2(p.x,p.y));}for(const x of [-4,4]){const p=new THREE.Vector3(x,6,-3).applyMatrix4(camera.matrixWorldInverse);bounds.expandByPoint(new THREE.Vector2(p.x,p.y));}
 const size=bounds.getSize(new THREE.Vector2()),safeW=Math.max(150,width-reserved.right-(reserved.left??0)),safeH=Math.max(150,height-reserved.top-reserved.bottom),units=Math.max(size.x/safeW,size.y/safeH)*1.12*zoom;
 camera.left=-units*width/2;camera.right=units*width/2;camera.top=units*height/2;camera.bottom=-units*height/2;camera.near=.1;camera.far=200;
 camera.setViewOffset(width,height,(reserved.right-(reserved.left??0))/2,(reserved.bottom-reserved.top)/2,width,height);camera.updateProjectionMatrix();
}
