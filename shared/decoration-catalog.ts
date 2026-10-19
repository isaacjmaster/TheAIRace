import type {BuildingLayout} from './foundation';
export const DECORATIONS={
 ornamental:{name:'Ornamental Tree',cost:25,width:3,depth:3},
 cypress:{name:'Cypress Tree',cost:35,width:2,depth:2},
 flowers:{name:'Flower Garden',cost:40,width:3,depth:2},
 planter:{name:'Modern Planter',cost:50,width:3,depth:2},
} as const;
export type DecorationKind=keyof typeof DECORATIONS;
export type Decoration=BuildingLayout&{id:string;kind:DecorationKind};
export function decorationFootprint(o:Pick<Decoration,'kind'|'position'|'orientation'>){const c=DECORATIONS[o.kind],turned=o.orientation%2;return{x:o.position[0],z:o.position[1],w:turned?c.depth:c.width,d:turned?c.width:c.depth};}
export const overlapsRect=(a:{x:number;z:number;w:number;d:number},b:{x:number;z:number;w:number;d:number},gap=0)=>Math.abs(a.x-b.x)<(a.w+b.w)/2+gap&&Math.abs(a.z-b.z)<(a.d+b.d)/2+gap;
