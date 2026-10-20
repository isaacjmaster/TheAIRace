import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {frameInfiltration,infiltrationZoomLimits} from '../src/art/infiltrationCamera';
test('portrait, landscape and desktop ground corners remain in front of camera and inside finished terrain at zoom/pan limits',()=>{
 for(const [w,h]of [[390,844],[844,390],[1440,900],[900,700],[375,812]]){const reserved={left:44,right:12,top:85,bottom:140},limits=infiltrationZoomLimits(w,h,reserved);assert.ok(limits.min<limits.default&&limits.default<limits.max);assert.ok(limits.min<.4);assert.ok(limits.max<=.95);
  for(const zoom of [limits.min,limits.max])for(const x of [-15,0,15])for(const z of [-11,0,11]){const c=new THREE.OrthographicCamera();frameInfiltration(c,w,h,reserved,new THREE.Vector3(x,0,z),zoom,{minX:-21,maxX:21,minZ:-17,maxZ:17});const plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),ray=new THREE.Raycaster();for(const a of [-1,1])for(const b of [-1,1]){ray.setFromCamera(new THREE.Vector2(a,b),c);const p=ray.ray.intersectPlane(plane,new THREE.Vector3());assert.ok(p,`${w}x${h}: ground must be in front of near plane`);assert.ok(Math.abs(p!.x)<=110&&Math.abs(p!.z)<=110,`${w}x${h}: within textured ground (${p!.x},${p!.z})`);assert.ok(ray.ray.origin.distanceTo(p!)<c.far);}}
 }
});
