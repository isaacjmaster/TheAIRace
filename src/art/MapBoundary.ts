import * as THREE from 'three';

// Decorative only: the nearest rim is four units beyond the editable campus.
// The duplicate closing vertex and indexed strips keep every corner watertight.
export const BOUNDARY={center:[2,2.5] as const,inner:[30,25.5] as const,segments:80,mistExtent:1200};
/** Orthographic pullback keeps screen composition identical and gives the outer scenery front clipping room. */
export function boundaryView(offset:THREE.Vector3){return {offset:offset.clone().multiplyScalar(3),fogShift:offset.length()*2};}
function perimeter(t:number,hx:number,hz:number):[number,number]{
 const side=Math.floor(t*4)%4,u=(t*4)%1;
 return side===0?[-hx+2*hx*u,-hz]:side===1?[hx,-hz+2*hz*u]:side===2?[hx-2*hx*u,hz]:[-hx,hz-2*hz*u];
}
export function rimGeometry(){
 const positions:number[]=[],colors:number[]=[],indices:number[]=[],n=BOUNDARY.segments;
 const rings=[{pad:0,y:-.14,color:'#a9bca0'},{pad:2.5,y:.7,color:'#c3c8b7'},{pad:6.5,y:1.5,color:'#9faeb0'},{pad:10,y:.2,color:'#c0d0cc'},{pad:13,y:-3.5,color:'#a9c1c5'}];
 for(let r=0;r<rings.length;r++)for(let i=0;i<=n;i++){const t=(i%n)/n,ring=rings[r],jitter=r===0?0:Math.sin(t*Math.PI*18)*Math.min(1.2,ring.pad*.18),p=perimeter(t,BOUNDARY.inner[0]+ring.pad+jitter,BOUNDARY.inner[1]+ring.pad+jitter),wave=Math.sin(t*Math.PI*14+.7)*.5+Math.cos(t*Math.PI*26)*.25;
  const height=r===0?ring.y:ring.y+(.7+wave)*(r===2?1.5:.45);positions.push(p[0]+2,height,p[1]+2.5);const color=new THREE.Color(ring.color);color.multiplyScalar(.96+.04*Math.sin(t*Math.PI*22+r));colors.push(color.r,color.g,color.b);
 }
 for(let r=0;r<rings.length-1;r++)for(let i=0;i<n;i++){const a=r*(n+1)+i,b=a+n+1;indices.push(a,b,a+1,a+1,b,b+1);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();return geometry;
}
export function mistGeometry(){
 // A world-space annulus, not a screen overlay. Its center is a real hole.
 const positions:number[]=[],indices:number[]=[],rings=[[33,28.5,.15],[43,38.5,1],[BOUNDARY.mistExtent,BOUNDARY.mistExtent,-24]],n=80;
 for(const [hx,hz,y] of rings)for(let i=0;i<=n;i++){const p=perimeter((i%n)/n,hx,hz);positions.push(p[0]+2,y,p[1]+2.5);}
 for(let r=0;r<2;r++)for(let i=0;i<n;i++){const a=r*(n+1)+i,b=a+n+1;indices.push(a,b,a+1,a+1,b,b+1);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeBoundingSphere();return geometry;
}
function cloudTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#202020';ctx.fillRect(0,0,256,256);
 // Wrap the soft puffs at every edge, so drifting never reveals texture seams.
 for(let i=0;i<22;i++){const x=(i*73+19)%256,y=(i*113+47)%256,r=24+(i%5)*9;for(const dx of [-256,0,256])for(const dy of [-256,0,256]){const gradient=ctx.createRadialGradient(x+dx,y+dy,0,x+dx,y+dy,r);gradient.addColorStop(0,'rgba(255,255,255,.46)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(x+dx-r,y+dy-r,r*2,r*2);}}
 const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;return texture;
}
/** Three draw calls, no shadow passes, no particles or volumetric render targets. */
export class MapBoundary{
 readonly group=new THREE.Group();private time=0;private texture:THREE.Texture;private rim:THREE.Mesh;private boulders:THREE.InstancedMesh;private mist:THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>;
 constructor(texture?:THREE.Texture){
  this.texture=texture??cloudTexture();this.group.name='decorative-map-boundary';
  this.rim=new THREE.Mesh(rimGeometry(),new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.88,metalness:.03,side:THREE.DoubleSide}));this.rim.name='continuous-mountain-rim';this.rim.receiveShadow=false;this.group.add(this.rim);
  this.boulders=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),new THREE.MeshStandardMaterial({roughness:.82,metalness:.03,flatShading:true}),64);const dummy=new THREE.Object3D();
  for(let i=0;i<64;i++){const t=i/64,[x,z]=perimeter(t,37+(i%3)*.4,32.5+(i%3)*.4);dummy.position.set(x+2,1.4+(i%4)*.2,z+2.5);dummy.scale.set(1.4+(i%4)*.35,.65+(i%5)*.22,1.3+(i%3)*.4);dummy.rotation.set(.08*Math.sin(i),i*1.17,.09*Math.cos(i));dummy.updateMatrix();this.boulders.setMatrixAt(i,dummy.matrix);this.boulders.setColorAt(i,new THREE.Color(['#bec8be','#9faeb4','#cdd0ba','#aebebd'][i%4]));}
  this.boulders.instanceMatrix.needsUpdate=true;this.boulders.computeBoundingSphere();this.boulders.name='outer-rim-boulders';this.group.add(this.boulders);
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,forceSinglePass:true,side:THREE.DoubleSide,toneMapped:false,uniforms:{clouds:{value:this.texture},time:{value:0},sky:{value:new THREE.Color('#b5eafa')},shade:{value:new THREE.Color('#c4e0e5')},light:{value:new THREE.Color('#f0f7f2')}},vertexShader:`varying vec3 worldPoint;void main(){vec4 world=modelMatrix*vec4(position,1.);worldPoint=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,fragmentShader:`uniform sampler2D clouds;uniform float time;uniform vec3 sky,shade,light;varying vec3 worldPoint;
 void main(){vec2 p=worldPoint.xz-vec2(2.,2.5);float edge=max(abs(p.x)-33.,abs(p.y)-28.5);vec2 uv=p*.023+vec2(time*.0011,time*.0006);float puff=texture2D(clouds,uv).r*.67+texture2D(clouds,uv*1.73+vec2(.2,-time*.0008)).r*.33;float alpha=smoothstep(0.,9.,edge)*( .72+.28*puff);alpha=mix(alpha,1.,smoothstep(9.,15.,edge));vec3 color=mix(shade,light,smoothstep(.15,.85,puff));color=mix(color,sky,smoothstep(25.,110.,edge));gl_FragColor=vec4(color,alpha);
 #include <colorspace_fragment>
 }`});
  this.mist=new THREE.Mesh(mistGeometry(),material);this.mist.name='outer-cloud-sea';this.mist.renderOrder=2;this.mist.frustumCulled=false;this.group.add(this.mist);
  // Never join the gameplay hit lists; also opt out of generic raycasters.
  this.group.traverse(o=>{o.raycast=()=>{};o.castShadow=false;});
 }
 update(dt:number,reduced=false){if(!reduced)this.time+=Math.min(.05,Math.max(0,dt));this.mist.material.uniforms.time.value=this.time;}
 dispose(){this.group.removeFromParent();this.rim.geometry.dispose();(this.rim.material as THREE.Material).dispose();this.boulders.geometry.dispose();(this.boulders.material as THREE.Material).dispose();this.boulders.dispose();this.mist.geometry.dispose();this.mist.material.dispose();this.texture.dispose();}
}
