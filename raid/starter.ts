import {createRaid,type Raid,type Squad} from './engine';
export const STARTER_NETWORKS=[
 {name:'First Contact',difficulty:'Introductory',hint:'Group your bots near the north gate. Remove the laser tower early.'},
 {name:'Stronger Network',difficulty:'Challenging',hint:'Two overlapping laser towers. Choose an edge and take out one tower first.'},
] as const;
/** Only newly started foundation raids opt into the new balance contract. */
export function createStarterRaid(layout:number,squad:Squad,layoutVersion=2):Raid{
 if(layout!==0&&layout!==1)throw new Error('Choose a starter network.');
 const r=createRaid(layout,squad);r.starter=true;r.combatVersion=2;r.defenseDamage={};
 for(const b of r.buildings){b.hp=b.maxHp=b.kind==='wall'?40:b.kind==='core'?300:b.kind==='vault'?120:180;}
 const tower=r.buildings.find(b=>b.kind==='turret')!;
 if(layout===0){tower.x=9;tower.y=7;const vault=r.buildings.find(b=>b.kind==='vault')!;vault.x=15;vault.y=11;}
 else {tower.x=10;tower.y=8;const id=r.buildings.length;r.buildings.push({id,kind:'turret',x:16,y:10,hp:180,maxHp:180,cooldown:0});}
 if(layoutVersion>=2){
  // A separate layout revision: saved in-flight raids keep their serialized geometry.
  r.starterLayout=2;
  const core=r.buildings.find(b=>b.kind==='core')!,vault=r.buildings.find(b=>b.kind==='vault')!;
  if(layout===0){core.x=17;core.y=9;vault.x=9;vault.y=12;}
  else {core.x=17;core.y=11;vault.x=8;vault.y=12;tower.x=9;tower.y=7;const second=r.buildings.filter(b=>b.kind==='turret')[1];second.x=18;second.y=5;}
  const structures=r.buildings.filter(b=>b.kind!=='wall');r.buildings=structures;
  const cells=new Map<string,{x:number;y:number}>();const add=(x:number,y:number)=>cells.set(`${x},${y}`,{x,y});
  for(let x=8;x<=18;x++){if(x!==9&&x!==10)add(x,4);if(x!==16&&x!==17)add(x,14);}
  for(let y=6;y<=12;y++){if(y!==9)add(6,y);if(y!==9)add(20,y);}
  for(const [x,y] of [[7,4],[7,5],[6,5],[19,4],[19,5],[20,5],[6,13],[7,13],[7,14],[20,13],[19,13],[19,14]])add(x,y);
  for(const [x,y] of layout===0?[[12,10],[13,10],[14,10],[14,11]]:[[12,7],[12,8],[12,9],[14,9],[15,9],[16,9]])add(x,y);
  // Recessed north-east courtyard gives the perimeter a pronounced stepped silhouette.
  for(const [key,p] of cells)if(p.y<=5&&p.x>=14||p.x>=19&&p.y<=7)cells.delete(key);
  for(const [x,y]of [[14,4],[14,5],[14,6],[15,7],[16,7],[17,7],[18,7],[19,7],[20,7]])add(x,y);
  for(const p of cells.values())r.buildings.push({id:0,kind:'wall',...p,hp:40,maxHp:40,cooldown:0});
  r.buildings.forEach((b,id)=>b.id=id);
 }
 return r;
}
