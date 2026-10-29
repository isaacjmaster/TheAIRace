/** Render-only review: no API, account, inventory or simulation writes. */
import * as THREE from 'three';
import {lightCampus} from '../src/art/CampusFinish';
import {WorldKit,lightWorld} from '../src/art/world';
import * as current from '../src/art/SecurityWalls';
import {CAMPUS_CAMERA_OFFSET} from '../src/art/campusCamera';
const before=new URLSearchParams(location.search).has('before');
const api=before?await import(/* @vite-ignore */'/output/Spatial_Review/baseline/src/art/SecurityWalls.ts'):current;
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true}),scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(),host=document.getElementById('view')!;
host.append(renderer.domElement);lightCampus(renderer,scene,lightWorld(renderer,scene));scene.background=new THREE.Color('#c4d7bf');scene.fog=null;renderer.setPixelRatio(1);
let kit:WorldKit|undefined,models:THREE.Group[]=[],walls:any,mode='lineup',alive=true,time=0,animate=false,reduced=false;
function clear(){for(const m of models)m.removeFromParent();walls?.dispose();walls=undefined;kit?.dispose();kit=undefined;models=[];}
function render(){const width=host.clientWidth,height=host.clientHeight;renderer.setSize(width,height,false);renderer.setScissorTest(true);const itemW=mode==='lineup'?width/models.length:width;
 for(let i=0;i<models.length;i++){models.forEach((m,n)=>m.visible=n===i);renderer.setViewport(i*itemW,0,itemW,height);renderer.setScissor(i*itemW,0,itemW,height);const span=mode==='lineup'?4.4:mode==='single'?4.1:mode==='isolated'?2.5:mode==='stress'?25:46;
 camera.left=-span/2;camera.right=span/2;camera.top=span*height/itemW/2;camera.bottom=-camera.top;camera.near=.1;camera.far=500;
 const center=new THREE.Vector3(0,mode==='stress'||mode==='connections'?.5:.8,0);camera.position.copy(center).add(mode==='stress'?CAMPUS_CAMERA_OFFSET:new THREE.Vector3(27,24,33));camera.lookAt(center);camera.updateProjectionMatrix();renderer.render(scene,camera);
 }renderer.setScissorTest(false);models.forEach(m=>m.visible=true);}
function setup(next='lineup',level=5){clear();mode=next;kit=new WorldKit('campus');if(next==='lineup'||next==='single'||next==='isolated'){
 models=(next==='lineup'?[1,2,3,4,5]:[level]).map(l=>api.securityWallModel(kit!,next==='isolated'?1:3,1.2,l));
 }else{const cells=new Map<string,any>();const add=(x:number,z:number,l:number)=>cells.set(`${x},${z}`,{id:`${x},${z}`,x,z,w:1,d:1,height:1.2,level:l});
 if(next==='stress'){for(let x=-10;x<10;x++)for(let z=-5;z<5;z++)add(x+.5,z+.5,level);}
 else{const axes=[-12.5,-4.5,3.5,11.5];for(const a of axes)for(let n=-12.5;n<=11.5;n++){add(n,a,1+Math.floor((n+12.5)/5)%5);add(a,n,1+Math.floor((a+12.5)/5)%5);}for(const sign of [-1,1])for(let n=0;n<4;n++){add(sign<0?-13.5-n:12.5+n,-12.5,3);add(sign<0?-13.5-n:12.5+n,11.5,3);}}
 walls=new api.SecurityWalls([...cells.values()]);models=[walls.group];}
 for(const model of models)scene.add(model);document.getElementById('caption')!.textContent=`${before?'Before':'Spatial refinement'} · ${next}${next==='single'||next==='isolated'||next==='stress'?' · Level '+level:''}`;render();return{bounds:models.map(m=>new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3()).toArray()),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};}
function update(t:number){time=t;walls?.update?.(t,reduced);if(kit)(api as any).updateWallEnergy?.(kit,t,reduced);const fn=(api as any).animateSecurityWall;if(fn)models.forEach(m=>fn(m,t,reduced));render();}
let last=performance.now();function frame(now:number){if(!alive)return;if(animate){time+=(now-last)/1000;update(time);}last=now;requestAnimationFrame(frame);}requestAnimationFrame(frame);
Object.assign(window,{wallReady:true,wallSetup:setup,wallPng:()=>renderer.domElement.toDataURL(),wallUpdate:update,wallAnimate:(v:boolean,r=false)=>{animate=v;reduced=r;},wallStats:()=>({calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures}),wallCleanup:()=>{alive=false;clear();scene.traverse(o=>{if(o instanceof THREE.DirectionalLight)o.shadow.dispose();});renderer.dispose();renderer.forceContextLoss();}});setup();

