import type { ExpeditionWorld, Point, Resource } from './expedition';

/** Deterministic engine state; future AI planners may propose orders, never rewards. */
export type OperationOrder = 'gather' | 'scout' | 'hold' | 'return';
export type OperationFocus = 'auto' | Resource;
export type Destination = 'safe' | 'medium' | 'dangerous';
export const DESTINATIONS = [
  {id:'safe',name:'Safe',place:'Scrap Garden',resource:'scrap',reward:'Scrap electronics',risk:'Low risk',symbol:'▤'},
  {id:'medium',name:'Medium',place:'Power Station',resource:'cells',reward:'Energy cells',risk:'Moderate risk',symbol:'ϟ'},
  {id:'dangerous',name:'Dangerous',place:'GPU Vault',resource:'gpu',reward:'Rare GPU parts',risk:'High risk',symbol:'◈'},
] as const;
export interface Patrol { id:string; route:Point[]; index:number; position:Point }
export interface Operation {
  version:2; seed:number; world:ExpeditionWorld; patrols:Patrol[];
  order:OperationOrder; focus:OperationFocus; risk:'safe'|'bold'; paused:boolean;
  tick:number; lastTickAt:number; discovered:string[]; visited:Point[];
  status:string; targetId:string|null; eventId:number; event:'move'|'gather'|'hazard'|'hold'|'return'|'scout';
  destination?:Destination;
}
export type OperationCommand = {type:'launch';destination?:Destination} | {type:'destination';destination:Destination} | {type:'headHome'} | {type:'sync'} | {type:'pause';paused:boolean} | {type:'order';order:OperationOrder;focus?:OperationFocus;risk?:'safe'|'bold'};
