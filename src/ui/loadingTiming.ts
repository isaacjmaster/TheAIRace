/** Latest Ascent source: src/App.tsx and src/ascent-splash.css at 996258f. */
export const CAMPUS_LOADING_MS=2650, CAMPUS_FADE_MS=350;
export function loadingProgress(elapsed:number,ready:boolean){return Math.min(ready?1:.94,Math.max(0,elapsed/CAMPUS_LOADING_MS));}
