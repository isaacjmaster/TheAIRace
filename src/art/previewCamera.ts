import * as THREE from 'three';
/** Fit complete model bounds, including the base, with the same margin for every card. */
export function fitPreviewCamera(camera:THREE.OrthographicCamera,objects:THREE.Object3D[],aspect=5/3){
 const bounds=new THREE.Box3();for(const o of objects){o.updateMatrixWorld(true);bounds.union(new THREE.Box3().setFromObject(o));}
 const center=bounds.getCenter(new THREE.Vector3());camera.position.copy(center).add(new THREE.Vector3(12,12,18));camera.lookAt(center);camera.updateMatrixWorld(true);
 let halfX=0,halfY=0;for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const p=new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);halfX=Math.max(halfX,Math.abs(p.x));halfY=Math.max(halfY,Math.abs(p.y));}
 const height=Math.max(halfY,halfX/aspect)*1.15;camera.left=-height*aspect;camera.right=height*aspect;camera.top=height;camera.bottom=-height;camera.updateProjectionMatrix();return bounds;
}
