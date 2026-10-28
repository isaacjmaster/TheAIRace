import * as THREE from 'three';
import {lightCampus} from '../src/art/CampusFinish';
import {WorldKit,lightWorld} from '../src/art/world';
import {animateGenerationEnergy} from '../src/art/GenerationEnergy';
import * as current from '../src/art/BuildingLevels';
const before=new URLSearchParams(location.search).has('before');
const api=before?await import(/* @vite-ignore */'/output/Unified_Progression/baseline/src/art/BuildingLevels.ts'):current;
const Kit=before?(await import(/* @vite-ignore */'/output/Unified_Progression/baseline/src/art/world.ts')).WorldKit:WorldKit;
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true}),scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(),host=document.getElementById('view')!;
host.append(renderer.domElement);lightCampus(renderer,scene,lightWorld(renderer,scene));scene.background=new THREE.Color('#c4d7bf');scene.fog=null;renderer.setPixelRatio(1);
let kit:WorldKit|undefined,models:THREE.Group[]=[],mode='lineup',kind='sentinel',alive=true,time=0,animate=false,reduced=false;
const spans:Record<string,number>={sentinel:6,arcSpire:6,rig:7,lab:7.5,computeStorage:6,researchStorage:6,fabricator:7,hangar:11,droneStation:5.5};
function clear(){for(const m of models)m.removeFromParent();kit?.dispose();models=[];}
function render(){const width=host.clientWidth,height=host.clientHeight;renderer.setSize(width,height,false);renderer.setScissorTest(true);const itemW=mode==='lineup'?width/5:width;
 for(let i=0;i<models.length;i++){models.forEach((m,n)=>m.visible=n===i);renderer.setViewport(i*itemW,0,itemW,height);renderer.setScissor(i*itemW,0,itemW,height);const span=spans[kind]*(mode==='phone'?1.4:1);
 camera.left=-span/2;camera.right=span/2;camera.top=span*height/itemW/2;camera.bottom=-camera.top;camera.near=.1;camera.far=500;
 const center=new THREE.Vector3(0,kind==='hangar'?1.3:kind==='droneStation'?1:kind==='rig'?1.6:2,0);camera.position.copy(center).add(new THREE.Vector3(9,8,11));camera.lookAt(center);camera.updateProjectionMatrix();renderer.render(scene,camera);
 }renderer.setScissorTest(false);models.forEach(m=>m.visible=true);}
function setup(family='sentinel',next='lineup',level=5){clear();kind=family;mode=next;kit=new Kit('campus');models=(next==='lineup'?[1,2,3,4,5]:[level]).map(l=>api.progressionModel(kit!,family,l));for(const model of models)scene.add(model);update(0);return{bounds:models.map(m=>new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3()).toArray()),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};}
function update(t:number){time=t;if(!before)models.forEach(m=>animateGenerationEnergy(m,t,reduced));render();}
let last=performance.now();function frame(now:number){if(!alive)return;if(animate){time+=(now-last)/1000;update(time);}last=now;requestAnimationFrame(frame);}requestAnimationFrame(frame);
Object.assign(window,{progressionReady:true,progressionSetup:setup,progressionPng:()=>renderer.domElement.toDataURL(),progressionUpdate:update,progressionAnimate:(v:boolean,r=false)=>{animate=v;reduced=r;},progressionStats:()=>({calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries}),progressionCleanup:()=>{alive=false;clear();scene.traverse(o=>{if(o instanceof THREE.DirectionalLight)o.shadow.dispose();});renderer.dispose();renderer.forceContextLoss();}});setup();
