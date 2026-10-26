import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WorldKit} from '../src/art/world';
import {progressionModel,applyBuildingLevel} from '../src/art/BuildingLevels';
import {gpuRigModel} from '../src/art/GpuRig';
import {sentinelModel} from '../src/art/SentinelTower';
import {initialFoundation} from '../shared/foundation';
import {constructionSignature} from '../src/art/builderWork';

test('GPU progression preserves all animated fans and the live power connector',()=>{for(const level of [2,3]){const k=new WorldKit();try{const g=gpuRigModel(k),port=g.getObjectByName('gpu-power-port'),fans=[0,1,2].map(i=>g.getObjectByName('gpu-fan-'+i));applyBuildingLevel(k,g,'rig',level);assert.equal(g.getObjectByName('gpu-power-port'),port);fans.forEach((f,i)=>assert.equal(g.getObjectByName('gpu-fan-'+i),f));assert.equal(g.getObjectByName('building-level-details')?.userData.level,level);}finally{k.dispose();}}});
test('Sentinel armor follows existing recoil pivot and does not move its authoritative muzzle',()=>{for(const level of [2,3]){const k=new WorldKit();try{const g=sentinelModel(k),parts=g.userData.sentinel,position=parts.muzzle.position.clone();applyBuildingLevel(k,g,'sentinel',level);assert.equal(g.getObjectByName('building-level-cannon')?.parent,parts.recoil);assert.deepEqual(parts.muzzle.position,position);assert.equal(g.userData.sentinel,parts);}finally{k.dispose();}}});
test('all evolved families have finite geometry and preserve wall tile dimensions',()=>{for(const kind of ['hq','rig','lab','fabricator','hangar','sentinel','droneStation','wall','computeStorage','researchStorage'] as const)for(const level of [1,2,3]){const k=new WorldKit();try{const g=progressionModel(k,kind,level),box=new THREE.Box3().setFromObject(g);assert.ok([...box.min.toArray(),...box.max.toArray()].every(Number.isFinite),kind);assert.ok(box.min.y>=-.5,kind);if(kind==='wall'){assert.ok(box.max.x-box.min.x<=1.001);assert.ok(box.max.z-box.min.z<=.5);}}finally{k.dispose();}}});
test('completed buildings with pending upgrades still assign builder work until the saved deadline',()=>{const s=initialFoundation();s.starterStation='placed';s.rig={position:[5,0],orientation:0,startedAt:0,completesAt:0,stored:0,lastProducedAt:0};s.buildingUpgrades={rig:{id:'rig',targetLevel:2,startedAt:1000,completesAt:121000}};assert.notEqual(constructionSignature(s,1100),'');assert.equal(constructionSignature(s,121000),'');});
