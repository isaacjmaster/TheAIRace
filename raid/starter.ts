import {createRaid,type Raid,type Squad} from './engine';
export const STARTER_NETWORKS=[
 {name:'First Contact',difficulty:'Introductory',hint:'Group your bots near the north gate. Remove the laser tower early.'},
 {name:'Stronger Network',difficulty:'Challenging',hint:'Two overlapping laser towers. Choose an edge and take out one tower first.'},
] as const;
/** Only newly started foundation raids opt into the new balance contract. */
export function createStarterRaid(layout:number,squad:Squad):Raid{
 if(layout!==0&&layout!==1)throw new Error('Choose a starter network.');
 const r=createRaid(layout,squad);r.starter=true;r.combatVersion=2;r.defenseDamage={};
 for(const b of r.buildings){b.hp=b.maxHp=b.kind==='wall'?40:b.kind==='core'?300:b.kind==='vault'?120:180;}
 const tower=r.buildings.find(b=>b.kind==='turret')!;
 if(layout===0){tower.x=9;tower.y=7;const vault=r.buildings.find(b=>b.kind==='vault')!;vault.x=15;vault.y=11;}
 else {tower.x=10;tower.y=8;const id=r.buildings.length;r.buildings.push({id,kind:'turret',x:16,y:10,hp:180,maxHp:180,cooldown:0});}
 return r;
}
