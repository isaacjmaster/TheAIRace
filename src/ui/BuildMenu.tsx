import {useEffect,useState} from 'react';
import * as THREE from 'three';
import {WorldKit,lightWorld} from '../art/world';
import {gpuRigModel} from '../art/GpuRig';
import {fabricatorModel} from '../art/BotBuildings';
import {GPU_RIG,FABRICATOR,type FoundationState} from '../../shared/foundation';
type Category='All'|'Resources'|'Robotics';
const catalog=[{id:'rig',name:'GPU Rig',category:'Resources',...GPU_RIG,description:'Generate Compute · collect manually'}, {id:'fabricator',name:'Bot Fabricator',category:'Robotics',...FABRICATOR,description:'Train Scrap Bots · free 10-bot Hangar included'}] as const;
const thumbnails=new Map<string,string>();
function BuildingImage({id,name}:{id:'rig'|'fabricator';name:string}){
 const [url,setUrl]=useState(thumbnails.get(id));
 useEffect(()=>{if(thumbnails.has(id)){setUrl(thumbnails.get(id));return;}let renderer:THREE.WebGLRenderer|undefined;const kit=new WorldKit(),scene=new THREE.Scene();
 try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});lightWorld(renderer,scene);renderer.setPixelRatio(1);renderer.setSize(300,180);scene.background=null;scene.fog=null;
 const model=id==='rig'?gpuRigModel(kit):fabricatorModel(kit);scene.add(model);kit.box(scene,[4.5,.08,3.5],[0,-.07,0],'#d1ded8',.08);
 const camera=new THREE.OrthographicCamera(-3.8,3.8,2.28,-2.28,.1,40);camera.position.set(6,6,9);camera.lookAt(0,1.35,0);renderer.render(scene,camera);const image=renderer.domElement.toDataURL('image/png');thumbnails.set(id,image);setUrl(image);
 }catch{/* A named image fallback keeps the catalog usable without WebGL. */}finally{scene.traverse(o=>{if(o instanceof THREE.DirectionalLight)o.shadow.dispose();});kit.dispose();renderer?.dispose();renderer?.forceContextLoss();}},[id]);
 return url?<img src={url} alt={`${name} in-game model`} width="300" height="180"/>:<span className="build-image-fallback">{name}</span>;
}
export function BuildMenu({state,busy,onPlace}:{state:FoundationState;busy:boolean;onPlace:(kind:'build'|'fabricator')=>void}){
 const [category,setCategory]=useState<Category>('All');
 return <><h2 id="foundation-dialog-title">Build</h2><div className="build-tabs" role="tablist" aria-label="Building categories">{(['All','Resources','Robotics'] as const).map((tab,i)=><button key={tab} role="tab" id={`build-tab-${tab}`} aria-controls="build-catalog" aria-selected={tab===category} tabIndex={tab===category?0:-1} onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const next=(i+(e.key==='ArrowRight'?1:2))%3;setCategory((['All','Resources','Robotics'] as const)[next]);e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus();}}} onClick={()=>setCategory(tab)}>{tab}</button>)}</div>
 <div className="build-catalog" id="build-catalog" role="tabpanel" aria-labelledby={`build-tab-${category}`}>{catalog.filter(b=>category==='All'||b.category===category).map(b=>{
 const built=!!(b.id==='rig'?state.rig:state.fabricator),affordable=state.compute>=b.cost,disabled=busy||built||!affordable||!!state.buildersBusy;
 return <article className={`build-card ${!affordable&&!built?'unaffordable':''}`} key={b.id}><button className="build-card-choice" aria-label={`Place ${b.name}`} disabled={disabled} onClick={()=>onPlace(b.id==='rig'?'build':'fabricator')}><div className="build-card-image"><BuildingImage id={b.id} name={b.name}/><span className="build-limit">{built?'1/1 Built':'0/1 Built'}</span></div><div className="build-card-copy"><h3>{b.name}</h3><p>{b.description}</p><div className="build-card-stats"><strong>▣ {b.cost} Compute</strong><span>◷ {b.buildSeconds}s</span></div><small>{built?'Already built':state.buildersBusy?'Builder is working':!affordable?`Need ${b.cost-state.compute} more Compute`:'Tap to place'}</small></div></button></article>;
 })}</div></>;
}
