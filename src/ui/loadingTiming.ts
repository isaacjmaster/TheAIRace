/** Ascent-inspired sequence, extended by the owner by two seconds; fade unchanged. */
export const CAMPUS_LOADING_MS=4650, CAMPUS_FADE_MS=350;
export function loadingProgress(elapsed:number,ready:boolean){return Math.min(ready?1:.94,Math.max(0,elapsed/CAMPUS_LOADING_MS));}
