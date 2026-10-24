import {sentinelModel} from '../art/SentinelTower';
import {cipherBotModel} from '../art/CipherBot';
import {droneStationModel} from '../art/DroneStation';
import {securityWallModel} from '../art/SecurityWalls';
import {researchLabModel} from '../art/ResearchLab';
import {fitPreviewCamera} from '../art/previewCamera';
import {DECORATIONS,type DecorationKind} from '../../shared/decoration-catalog';
import {decorationModel} from '../art/Decorations';
import {founderHQ} from '../art/FounderHQ';
import {useEffect,useState} from 'react';
import * as THREE from 'three';
import {WorldKit,lightWorld} from '../art/world';
import {gpuRigModel} from '../art/GpuRig';
import {builderStationModel,fabricatorModel,hangarModel} from '../art/BotBuildings';
const thumbnails=new Map<string,string>();
export function BuildingImage({id,name}:{id:'cipher'|'wall'|'droneStation'|'sentinel'|'lab'|'station'|'rig'|'fabricator'|'hangar'|'hq1'|'hq2'|DecorationKind;name:string}){
 const [url,setUrl]=useState(thumbnails.get(id));
 useEffect(()=>{if(thumbnails.has(id)){setUrl(thumbnails.get(id));return;}let renderer:THREE.WebGLRenderer|undefined;const kit=new WorldKit(),scene=new THREE.Scene();
 try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});lightWorld(renderer,scene);renderer.setPixelRatio(1);renderer.setSize(300,180);scene.background=null;scene.fog=null;
 const hq=id==='hq1'||id==='hq2';const model=id==='cipher'?cipherBotModel(kit):id==='wall'?securityWallModel(kit):id==='sentinel'?sentinelModel(kit):id==='droneStation'?droneStationModel(kit):id==='lab'?researchLabModel(kit):id in DECORATIONS?decorationModel(kit,id as DecorationKind):hq?founderHQ(kit,new THREE.Group(),id==='hq2'?2:1):id==='station'?builderStationModel(kit):id==='rig'?gpuRigModel(kit):id==='fabricator'?fabricatorModel(kit):hangarModel(kit,2,'compound');if(hq)model.position.set(0,0,0);scene.add(model);if(!hq&&id!=='cipher')kit.box(scene,[id==='rig'?5:4.5,.08,id==='rig'?3.15:3.5],[0,-.07,0],'#d1ded8',.08);
 const span=hq?7.4:3.8,camera=new THREE.OrthographicCamera(-span,span,span*.6,-span*.6,.1,60);camera.position.set(12,12,18);camera.lookAt(0,hq?2.6:1.35,0);if(id==='sentinel'||id==='cipher'||id==='hangar'||id==='fabricator'||id in DECORATIONS)fitPreviewCamera(camera,scene.children.filter(o=>o instanceof THREE.Group||o instanceof THREE.Mesh));renderer.render(scene,camera);const image=renderer.domElement.toDataURL('image/png');thumbnails.set(id,image);setUrl(image);
 }catch{/* A named image fallback keeps the catalog usable without WebGL. */}finally{scene.traverse(o=>{if(o instanceof THREE.DirectionalLight)o.shadow.dispose();});kit.dispose();renderer?.dispose();renderer?.forceContextLoss();}},[id]);
 return url?<img src={url} alt={`${name} in-game model`} width="300" height="180"/>:<span className="build-image-fallback">{name}</span>;
}
