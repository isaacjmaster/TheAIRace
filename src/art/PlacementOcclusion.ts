import * as THREE from 'three';

/** Reused ray/box scratch space. Test the wall's ground area, never all campus buildings. */
export class GroundOcclusionProbe {
 private bounds=new THREE.Box3();private point=new THREE.Vector3();private hit=new THREE.Vector3();private ndc=new THREE.Vector2();private caster=new THREE.Raycaster();
 obscures(model:THREE.Object3D,ground:THREE.Box3,camera:THREE.Camera){
  if(!model.visible||ground.isEmpty())return false;
  this.bounds.setFromObject(model);if(this.bounds.isEmpty()||this.bounds.max.y<=.2)return false;
  // Exclude ground slabs: hiding those doesn't expose the tile behind a building.
  this.bounds.min.y=Math.max(.2,this.bounds.min.y);
  for(let x=0;x<3;x++)for(let z=0;z<3;z++){
   this.point.set(THREE.MathUtils.lerp(ground.min.x,ground.max.x,x/2),.08,THREE.MathUtils.lerp(ground.min.z,ground.max.z,z/2));
   this.hit.copy(this.point).project(camera);this.ndc.set(this.hit.x,this.hit.y);this.caster.setFromCamera(this.ndc,camera);
   if(this.caster.ray.intersectBox(this.bounds,this.hit)&&this.caster.ray.origin.distanceToSquared(this.hit)<this.caster.ray.origin.distanceToSquared(this.point)-.01)return true;
  }
  return false;
 }
}
