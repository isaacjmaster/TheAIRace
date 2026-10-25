/** Cell edges are integer world coordinates; positions are footprint centers.
 * Half-integer centers are valid for odd tile counts, never fractional cells. */
export const PLACEMENT_GRID={originX:0,originZ:0,tileSize:1} as const;
export const worldToCell=(value:number)=>Math.floor(value);
export const cellToWorld=(cell:number,tiles=1)=>cell+tiles/2;
export function snapFootprint(p:readonly number[],w:number,d:number):[number,number]{return [Math.round(p[0]-w/2)+w/2,Math.round(p[1]-d/2)+d/2];}
export function onFootprintGrid(p:readonly number[],w:number,d:number){return p.length===2&&p.every(Number.isFinite)&&Number.isInteger(p[0]-w/2)&&Number.isInteger(p[1]-d/2);}
export function occupiedCells(p:readonly number[],w:number,d:number){const out:string[]=[];for(let x=p[0]-w/2;x<p[0]+w/2;x++)for(let z=p[1]-d/2;z<p[1]+d/2;z++)out.push(x+','+z);return out;}
