import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {establishedFoundation} from './helpers/established-foundation';
import {advanceFoundation,buildRig,builderBusyAt} from '../shared/foundation';
import {clearObstacle,clearingJobs,clearingPosition,ensureLandscape} from '../shared/landscape';
import {builderAssignments} from '../shared/builder-jobs';
import {HeadquartersScene} from '../src/art/HeadquartersScene';
const now=100000;
function state(){const s=establishedFoundation();s.founderHqLevel=2;s.builders=2;s.compute=500;ensureLandscape(s,now,'builder-reliability');return s;}
test('two clearing jobs own distinct stable builder slots, share construction capacity, and release independently',()=>{
 const s=state();const [a,b,c]=s.landscape!.items;clearObstacle(s,a.id,now);clearObstacle(s,b.id,now+1000);
 assert.equal(builderBusyAt(s,now+1000),2);assert.deepEqual(clearingJobs(s).map(j=>j.builderIndex),[0,1]);assert.throws(()=>clearObstacle(s,c.id,now+1000),/busy/);assert.throws(()=>buildRig(s,[6,0],now+1000),/busy/);
 const saved=JSON.parse(JSON.stringify(s));advanceFoundation(saved,now+15000);assert.equal(saved.buildersBusy,1);assert.equal(builderAssignments(saved,now+15000)[0].builderIndex,1);
 buildRig(saved,[6,0],now+15000);advanceFoundation(saved,now+15000);assert.deepEqual(builderAssignments(saved,now+15000).map(j=>[j.kind,j.builderIndex]),[['rig',0],['clearing',1]]);
});
test('second builder accepts a new clear from its returning position while first builder stays assigned',()=>{
 const s=state();buildRig(s,[6,0],now);s.rig!.completesAt=now+60000;
 clearObstacle(s,s.landscape!.items[0].id,now);const first=structuredClone(clearingJobs(s)[0]);assert.equal(first.builderIndex,1);
 const at=first.clearedAt+100;const origin=clearingPosition(first,at);clearObstacle(s,s.landscape!.items[1].id,at);const next=clearingJobs(s).find(j=>j.builderIndex===1)!;
 assert.deepEqual(next.route[0],origin);assert.equal(builderBusyAt(s,at),2);assert.equal(builderAssignments(s,at).find(j=>j.kind==='rig')?.builderIndex,0);
});
test('rendered returning builders redirect independently without teleporting to station',()=>{
 const s=state();clearObstacle(s,s.landscape!.items[0].id,now);clearObstacle(s,s.landscape!.items[1].id,now);const jobs=structuredClone(clearingJobs(s));const at=now+15100;
 const builders=jobs.map(j=>{const group=new THREE.Group(),p=clearingPosition(j,at);group.position.set(p[0],.12,p[1]);return {group,spark:new THREE.Object3D()};});
 const scene=Object.assign(Object.create(HeadquartersScene.prototype),{builders,renderer:{domElement:{dataset:{}}},cleanupVisuals:new Map(),cleanupParticles:[],landscapeKey:'existing',obstacles:new Map(),lifeClock:0,reduced:false,returning:true,workPause:0}) as any;
 advanceFoundation(s,at);clearObstacle(s,s.landscape!.items[0].id,at);clearObstacle(s,s.landscape!.items[1].id,at);scene.landscapeKey=JSON.stringify(s.landscape!.items);const before=builders.map(b=>b.group.position.clone());scene.syncLandscape(s,at);
 for(let i=0;i<2;i++){assert.equal(builders[i].group.position.distanceTo(before[i]),0);assert.deepEqual(scene.cleanupVisuals.get(i).route[0],[before[i].x,before[i].z]);}
 scene.animateCleanup(.016);for(let i=0;i<2;i++){assert.ok(builders[i].group.position.distanceTo(before[i])<.3);assert.equal(scene.renderer.domElement.dataset['builderPhase'+i],'traveling');}
});
