/** Portrait gets its own horizontal composition, while tall screens reveal more campus depth. */
export function portraitCampusSpan(aspect:number){
 return aspect<1?Math.max(24,Math.min(28,42*aspect)):Math.max(36,36*17/30*aspect);
}
