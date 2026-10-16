/** Original procedural composition: “Small Signals”, The AI Race, 2026.
 * Authored for this prototype. No recordings, samples, or borrowed melodies.
 */
export type MusicMode='hq'|'raid';
export type Cue='tap'|'deploy'|'laser'|'impact'|'destroy'|'win'|'resources'|'upgrade';
export const MUTE_KEY='airace-audio-muted-v1';
export const frequency=(midi:number)=>440*2**((midi-69)/12);
export const CHORDS=[[50,57,62,66],[47,54,59,62],[43,50,55,59],[45,52,57,64]];
export const MELODY=[74,null,69,78,null,76,69,null,71,null,74,69,null,66,69,null];
export function readMuted(storage?:Pick<Storage,'getItem'>){try{return storage?.getItem(MUTE_KEY)==='true';}catch{return false;}}
export function writeMuted(storage:Pick<Storage,'setItem'>|undefined,value:boolean){try{storage?.setItem(MUTE_KEY,String(value));}catch{}}
