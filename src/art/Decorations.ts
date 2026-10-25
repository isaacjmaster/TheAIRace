import * as THREE from 'three';
import {WorldKit,palette as c} from './world';
import {DECORATIONS,decorationFootprint,type Decoration,type DecorationKind} from '../../shared/decoration-catalog';
/** Original campus landscaping; shared shapes/materials, batched per decoration. */
export function decorationModel(k:WorldKit,kind:DecorationKind){
 const g=new THREE.Group();g.name=DECORATIONS[kind].name;
 const box=(s:[number,number,number],p:[number,number,number],color:string,r=.06)=>k.box(g,s,p,color,r);
 const foliage=(p:[number,number,number],size:[number,number,number],color:string)=>k.boulder(g,p,size,color,.3);
 if(kind==='ornamental'){
  box([2.7,.13,2.7],[0,.04,0],'#79945f',.2);box([2.35,.08,2.35],[0,.13,0],'#9eaa75',.18);
  k.cylinder(g,.18,1.65,[0,.97,0],'#9e7750');
  foliage([0,2.8,0],[1.25,1.35,1.2],'#539d69');foliage([-.65,2.25,.3],[.7,.82,.73],'#74b079');foliage([.62,2.5,-.22],[.68,.9,.73],'#65aa72');
  for(const x of [-.9,.9])foliage([x,.3,.7],[.3,.2,.35],'#749e63');
 }else if(kind==='cypress'){
  box([1.75,.13,1.75],[0,.05,0],'#79945f',.18);box([1.5,.06,1.5],[0,.15,0],'#7b946b',.16);k.cylinder(g,.13,1.3,[0,.78,0],'#997953');
  foliage([0,1.9,0],[.7,1.4,.65],'#367c61');foliage([0,2.9,0],[.52,1.2,.49],'#438d6a');foliage([0,3.65,0],[.3,.85,.29],'#5b9b70');
 }else{
  const planter=kind==='planter';box([2.8,planter?.7:.22,1.8],[0,planter?.35:.11,0],planter?'#ded9c8':'#d2bd96',.12);
  box([2.48,.08,1.48],[0,planter?.73:.25,0],'#786951',.08);
  if(planter){box([2.55,.045,.035],[0,.4,.92],'#b8ac90',.01);for(const x of [-.8,0,.8]){foliage([x,1.03,0],[.48,.48,.6],x===0?'#659b69':'#448e6c');for(const z of [-.37,.28])k.cylinder(g,.035,.7,[x,1.1,z],'#91b57a');}}
  else for(let i=0;i<8;i++){const x=-1.05+(i%4)*.7,z=i<4?-.42:.42,y=.62+(i%3)*.1;k.cylinder(g,.035,y-.2,[x,(y+.2)/2,z],'#5a8d5f');foliage([x+.11,.4,z],[.2,.12,.12],'#739f66');foliage([x,y,z],[.19,.11,.19],['#f1c65f','#d9989d','#a5bdd8','#f0d9ad'][i%4]);foliage([x,y+.04,z],[.065,.05,.065],'#f5df8b');}
 }
 k.batchStatic(g,'decoration-'+kind);return g;
}
export class DecorationModels{
 readonly group=new THREE.Group();private kit=new WorldKit('campus');private key='';private hits:THREE.Object3D[]=[];private models=new Map<string,THREE.Group>();
 sync(items:Decoration[]){const key=JSON.stringify(items);if(key===this.key)return;this.key=key;this.group.clear();this.hits=[];this.models.clear();for(const o of items){const m=decorationModel(this.kit,o.kind);m.position.set(o.position[0],0,o.position[1]);m.rotation.y=o.orientation*Math.PI/2;m.userData.decorationId=o.id;m.traverse(n=>{if(n instanceof THREE.Mesh)n.userData.decorationId=o.id;});this.models.set(o.id,m);this.group.add(m);this.hits.push(m);}}
 hit(ray:THREE.Raycaster){return ray.intersectObjects(this.hits,true).find(h=>h.object.parent?.visible!==false);}
 pick(ray:THREE.Raycaster){return this.hit(ray)?.object.userData.decorationId as string|undefined;}
 show(id:string,visible:boolean){const g=this.models.get(id);if(g)g.visible=visible;}
 screenPosition(id:string){return this.models.get(id)?.position;}
 dispose(){this.group.removeFromParent();this.kit.dispose();}
}
