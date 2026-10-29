import * as THREE from 'three';
import {FOUNDATION_BUILDINGS,buildingLayout,placementFootprint,type FoundationState} from '../../shared/foundation';
import {decorationFootprint} from '../../shared/decoration-catalog';
type Rect={x:number;z:number;w:number;d:number};
/** Presentation only: authoritative footprints, never a second occupancy model. */
export class PlacementOverlay{
 readonly group=new THREE.Group();
 private geometry=new THREE.BufferGeometry();
 private lines=new THREE.LineSegments(this.geometry,new THREE.LineBasicMaterial({color:'#438c91',transparent:true,opacity:.7,depthWrite:false}));
 private fill=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:'#34daca',transparent:true,opacity:.18,depthWrite:false,side:THREE.DoubleSide}));
 private edge=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.5,0,-.5),new THREE.Vector3(.5,0,-.5),new THREE.Vector3(.5,0,.5),new THREE.Vector3(-.5,0,.5)]),new THREE.LineBasicMaterial({color:'#34daca',depthWrite:false}));
 private key='';
 constructor(){this.group.name='authoritative-placement-footprints';this.fill.rotation.x=-Math.PI/2;this.fill.name='selected-occupied-footprint';this.group.add(this.lines,this.fill,this.edge);this.group.visible=false;this.fill.visible=this.edge.visible=false;this.group.traverse(n=>{n.raycast=()=>{};});}
 sync(s:FoundationState,placed?:Set<string>){const rects:Rect[]=[];for(const kind of FOUNDATION_BUILDINGS){if(placed&&!placed.has(kind))continue;const l=buildingLayout(s,kind);if(l)rects.push(placementFootprint(kind,l));}for(const h of s.builderHuts??[])if(!h.unplaced&&(!placed||placed.has(h.id)))rects.push(placementFootprint('station',h));for(const d of s.decorations??[])if(!placed||placed.has(d.id))rects.push(decorationFootprint(d));const key=JSON.stringify(rects);if(key===this.key)return;this.key=key;const positions:number[]=[];for(const r of rects){const x=r.x-r.w/2,z=r.z-r.d/2,X=x+r.w,Z=z+r.d;positions.push(x,.045,z,X,.045,z,X,.045,z,X,.045,Z,X,.045,Z,x,.045,Z,x,.045,Z,x,.045,z);}this.geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));this.geometry.computeBoundingSphere();}
 preview(r?:Rect,valid=true){this.fill.visible=this.edge.visible=!!r;if(!r)return;this.fill.position.set(r.x,.05,r.z);this.edge.position.set(r.x,.055,r.z);this.fill.scale.set(r.w,r.d,1);this.edge.scale.set(r.w,1,r.d);this.fill.material.color.set(valid?'#34daca':'#ed7466');this.edge.material.color.copy(this.fill.material.color);}
 dispose(){this.group.removeFromParent();this.geometry.dispose();this.lines.material.dispose();this.fill.geometry.dispose();this.fill.material.dispose();this.edge.geometry.dispose();this.edge.material.dispose();}
}
