/** Shared spatial contract: simulation, deployment and rendering use these bounds. */
export const MAP = {
  width: 27, height: 19, center: { x: 13, y: 9 },
  walls: { left: 7, right: 19, top: 5, bottom: 13 },
  deployment: { minX: .5, maxX: 25.5, minY: .5, maxY: 17.5, innerLeft: 5.7, innerRight: 20.3, innerTop: 3.7, innerBottom: 14.3 },
} as const;
export type DefenseKind = 'turret' | 'missile' | 'shield' | 'repair' | 'vault';
export type ExtraStructure = { kind: DefenseKind; x: number; y: number; hp: number };
export type Level = { name: string; level: number; gate: number; core: {x:number;y:number}; vault:{x:number;y:number}; turret:{x:number;y:number}; rewardScale?:number; strength?:number; extras?:ExtraStructure[]; partitions?:{x:number;y:number}[]; walls?:{left:number;right:number;top:number;bottom:number}; openings?:{x:number;y:number}[]; tactic?:string };
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

/** Immutable v1 maps above remain the replay contract for raids started before 0.9. */
export const LEVELS_V2: readonly Level[] = LEVELS.map((level, index) => {
 if(index<2) return {...level,tactic:index===0?'The north gate bypasses the perimeter.':'Approach from the west to isolate the laser tower.'};
 const walls={left:6,right:20,top:4,bottom:14};
 const variants: Partial<Level>[] = [
  {core:{x:13,y:10},vault:{x:9,y:6},turret:{x:9,y:12},gate:13,extras:[{kind:'turret',x:18,y:7,hp:900}],partitions:[{x:11,y:6},{x:11,y:7},{x:11,y:8},{x:15,y:10},{x:15,y:11},{x:15,y:12}],tactic:'Two laser wings leave the north service road exposed.'},
  {core:{x:15,y:10},vault:{x:9,y:7},turret:{x:18,y:6},gate:9,extras:[{kind:'shield',x:15,y:7,hp:850},{kind:'turret',x:10,y:12,hp:900}],partitions:[{x:12,y:5},{x:12,y:6},{x:12,y:7},{x:12,y:8},{x:12,y:10},{x:12,y:11},{x:12,y:12}],tactic:'The western vault sits outside the shield. Disable the generator before the core.'},
  {core:{x:9,y:11},vault:{x:18,y:6},turret:{x:9,y:6},gate:17,extras:[{kind:'missile',x:18,y:12,hp:1100},{kind:'repair',x:12,y:6,hp:700}],partitions:[{x:14,y:7},{x:14,y:8},{x:14,y:9},{x:14,y:10},{x:14,y:11},{x:14,y:12}],openings:[{x:6,y:10}],tactic:'The west maintenance breach leads to the core. Spread agents against missiles.'},
  {core:{x:13,y:12},vault:{x:9,y:6},turret:{x:9,y:12},gate:13,extras:[{kind:'vault',x:18,y:6,hp:1100},{kind:'missile',x:18,y:12,hp:1150},{kind:'shield',x:13,y:9,hp:1000}],partitions:[{x:11,y:5},{x:11,y:6},{x:11,y:7},{x:11,y:8},{x:15,y:5},{x:15,y:6},{x:15,y:7},{x:15,y:8}],tactic:'Split resource wings flank an open central lane. Break the shield from the north.'},
  {core:{x:17,y:11},vault:{x:9,y:6},turret:{x:9,y:12},gate:9,extras:[{kind:'repair',x:15,y:6,hp:1000},{kind:'missile',x:18,y:6,hp:1300},{kind:'turret',x:12,y:9,hp:1100},{kind:'shield',x:15,y:11,hp:1100}],partitions:[{x:13,y:5},{x:13,y:6},{x:13,y:7},{x:13,y:8},{x:10,y:10},{x:11,y:10},{x:12,y:10}],openings:[{x:20,y:10}],tactic:'An eastern service breach exposes the shield; the northern repair hub sustains missiles.'},
  {core:{x:13,y:9},vault:{x:8,y:6},turret:{x:8,y:12},gate:13,extras:[{kind:'vault',x:18,y:6,hp:1500},{kind:'missile',x:18,y:12,hp:1500},{kind:'shield',x:10,y:9,hp:1300},{kind:'repair',x:16,y:9,hp:1100},{kind:'turret',x:13,y:5,hp:1300}],partitions:[{x:11,y:5},{x:11,y:6},{x:11,y:7},{x:11,y:11},{x:11,y:12},{x:11,y:13},{x:15,y:5},{x:15,y:6},{x:15,y:7},{x:15,y:11},{x:15,y:12},{x:15,y:13}],openings:[{x:6,y:9},{x:20,y:9}],tactic:'Two side breaches expose support hubs. Disable shields west, repair east, then converge.'},
 ];
 return {...level,...variants[index-2],walls};
});
export function raidLevel(layout:number,version=1): Level { return (version>=2?LEVELS_V2:LEVELS)[layout]; }
