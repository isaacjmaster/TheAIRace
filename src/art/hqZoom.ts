/** Pointer capability, not portrait/landscape, determines desktop-only zoom tuning. */
export function hqZoomLimits(finePointer:boolean){return finePointer?{min:.58,max:1.65}:{min:.65,max:2};}
