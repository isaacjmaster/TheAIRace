/** Visual units only; combat radius, troop capacity and training rules are unchanged. */
export const CAMPUS_BOT_SCALE=.7;
export function hangarBay(slot:number,expanded=false):[number,number,number]{const x=-1.46+(slot%5)*.73,z=slot<5?-.65:.65;return [x*(expanded?1.4:1),.44*(expanded?1.08:1),z*(expanded?1.4:1)];}
