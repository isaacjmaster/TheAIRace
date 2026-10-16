/** Shared spatial contract: simulation, deployment and rendering use these bounds. */
export const MAP = {
  width: 27, height: 19, center: { x: 13, y: 9 },
  walls: { left: 7, right: 19, top: 5, bottom: 13 },
  deployment: { minX: .5, maxX: 25.5, minY: .5, maxY: 17.5, innerLeft: 5.7, innerRight: 20.3, innerTop: 3.7, innerBottom: 14.3 },
} as const;
export type DefenseKind = 'turret' | 'missile' | 'shield' | 'repair' | 'vault';
export type ExtraStructure = { kind: DefenseKind; x: number; y: number; hp: number };
export type Level = { name: string; level: number; gate: number; core: {x:number;y:number}; vault:{x:number;y:number}; turret:{x:number;y:number}; rewardScale?:number; strength?:number; extras?:ExtraStructure[]; partitions?:{x:number;y:number}[] };
export const LEVELS: readonly Level[] = [
  { name: 'Vault Gate', level: 1, gate: 9, core: { x: 13, y: 9 }, vault: { x: 9, y: 7 }, turret: { x: 17, y: 11 } },
  { name: 'Crossfire', level: 1, gate: 17, core: { x: 13, y: 9 }, vault: { x: 17, y: 7 }, turret: { x: 9, y: 11 } },
  { name:'Twin Array',level:3,gate:13,core:{x:13,y:10},vault:{x:10,y:7},turret:{x:9,y:11},strength:1.12,rewardScale:1.6,extras:[{kind:'turret',x:17,y:7,hp:900}] },
  { name:'Aegis Network',level:4,gate:9,core:{x:14,y:10},vault:{x:9,y:8},turret:{x:17,y:7},strength:1.22,rewardScale:2.2,extras:[{kind:'shield',x:14,y:8,hp:850},{kind:'turret',x:10,y:11,hp:900}] },
  { name:'Longbow Systems',level:5,gate:17,core:{x:10,y:10},vault:{x:17,y:7},turret:{x:9,y:7},strength:1.35,rewardScale:3,extras:[{kind:'missile',x:16,y:11,hp:1100},{kind:'repair',x:12,y:7,hp:700}],partitions:[{x:13,y:9},{x:13,y:10},{x:13,y:11},{x:13,y:12}] },
  { name:'Split Ledger',level:6,gate:13,core:{x:13,y:11},vault:{x:9,y:7},turret:{x:10,y:11},strength:1.5,rewardScale:4,extras:[{kind:'vault',x:17,y:7,hp:1100},{kind:'missile',x:17,y:11,hp:1150},{kind:'shield',x:13,y:8,hp:1000}],partitions:[{x:11,y:8},{x:11,y:9},{x:15,y:8},{x:15,y:9}] },
  { name:'Relay Foundry',level:8,gate:9,core:{x:16,y:10},vault:{x:9,y:7},turret:{x:10,y:11},strength:1.7,rewardScale:5.5,extras:[{kind:'repair',x:15,y:7,hp:1000},{kind:'missile',x:17,y:7,hp:1300},{kind:'turret',x:12,y:8,hp:1100},{kind:'shield',x:14,y:11,hp:1100}] },
  { name:'Nexus Campus',level:10,gate:13,core:{x:13,y:9},vault:{x:9,y:7},turret:{x:9,y:11},strength:2,rewardScale:7.5,extras:[{kind:'vault',x:17,y:7,hp:1500},{kind:'missile',x:17,y:11,hp:1500},{kind:'shield',x:11,y:9,hp:1300},{kind:'repair',x:15,y:9,hp:1100},{kind:'turret',x:13,y:6,hp:1300}],partitions:[{x:11,y:7},{x:11,y:8},{x:11,y:10},{x:11,y:11},{x:15,y:7},{x:15,y:8},{x:15,y:10},{x:15,y:11}] },
] as const;
