/** Actual production HQ renderer; no accounts or simulation state. */
import * as THREE from 'three';
import {lightCampus} from '../src/art/CampusFinish';
import {WorldKit,lightWorld} from '../src/art/world';
import * as current from '../src/art/FounderHQ';
const before=new URLSearchParams(location.search).has('before');
const api=before?await import(/* @vite-ignore */'/output/Approved_HQ/FounderHQ-before.ts'):current;
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true}),scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(),host=document.getElementById('view')!;
host.append(renderer.domElement);lightCampus(renderer,scene,lightWorld(renderer,scene));scene.background=new THREE.Color('#c4d7bf');scene.fog=null;renderer.setPixelRatio(1);
let kit:WorldKit|undefined,models:THREE.Group[]=[],mode='lineup',alive=true,time=0,animate=false,reduced=false,energyOnly=false;
function clear(){for(const m of models)m.removeFromParent();kit?.dispose();kit=undefined;models=[];}
function render(){const width=host.clientWidth,height=host.clientHeight;renderer.setSize(width,height,false);renderer.setScissorTest(true);const itemW=mode==='lineup'?width/models.length:width;
 for(let i=0;i<models.length;i++){models.forEach((m,n)=>m.visible=n===i);renderer.setViewport(i*itemW,0,itemW,height);renderer.setScissor(i*itemW,0,itemW,height);const span=mode==='lineup'?14:mode==='workspace'?6:mode==='phone'?17:14;
 camera.left=-span/2;camera.right=span/2;camera.top=span*height/itemW/2;camera.bottom=-camera.top;camera.near=.1;camera.far=500;
 const center=mode==='workspace'?new THREE.Vector3(-.6,1.8,2):new THREE.Vector3(0,4,0);camera.position.copy(center).add(mode==='workspace'?new THREE.Vector3(2,1,12):new THREE.Vector3(9,8,11));camera.lookAt(center);camera.updateProjectionMatrix();renderer.render(scene,camera);
 }renderer.setScissorTest(false);models.forEach(m=>m.visible=true);}
function setup(next='lineup',level=5){clear();mode=next;kit=new WorldKit('campus');models=(next==='lineup'?[1,2,3,4,5]:[level]).map(l=>{const root=new THREE.Group();const house=api.founderHQ(kit!,root,l);house.position.set(0,0,0);root.remove(house);return house;});for(const model of models)scene.add(model);document.getElementById('caption')!.textContent=`${before?'Before':'Approved design'} · Founder HQ · ${next}${next==='lineup'?'':' · Level '+level}`;update(0);return{bounds:models.map(m=>new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3()).toArray()),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};}
function update(t:number){time=t;models.forEach(m=>{(api as any).animateFounderHQEnergy?.(m,t,reduced);api.animateFounderIdle(m,energyOnly?0:t,reduced);});render();}
let last=performance.now();function frame(now:number){if(!alive)return;if(animate){time+=(now-last)/1000;update(time);}last=now;requestAnimationFrame(frame);}requestAnimationFrame(frame);
Object.assign(window,{hqReady:true,hqEnergyOnly:(v:boolean)=>{energyOnly=v;},hqSetup:setup,hqPng:()=>renderer.domElement.toDataURL(),hqUpdate:update,hqAnimate:(v:boolean,r=false)=>{animate=v;reduced=r;},hqStats:()=>({calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures}),hqCleanup:()=>{alive=false;clear();scene.traverse(o=>{if(o instanceof THREE.DirectionalLight)o.shadow.dispose();});renderer.dispose();renderer.forceContextLoss();}});setup();

