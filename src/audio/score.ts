/** Original procedural composition: “Little Company, Big Plans”, The AI Race, 2026.
 * A buoyant adventure march: plucked strings, warm horn-like lead and light drums.
 * All notes and synthesis are original; no recordings, samples or borrowed melodies.
 */
export type MusicMode='hq'|'raid';
export const BUILDING_SOUNDS={
 'building-hq':{notes:[60,67],type:'sine',duration:.22,gap:.07},
 'building-rig':{notes:[84,91,88],type:'sine',duration:.09,gap:.045},
 'building-fabricator':{notes:[45,52,57],type:'triangle',duration:.11,gap:.06},
 'building-hangar':{notes:[62,69,64],type:'triangle',duration:.14,gap:.055},
 'building-station':{notes:[55,79],type:'triangle',duration:.1,gap:.075},
} as const;
export type Cue='clear-tree'|'clear-scrap'|keyof typeof BUILDING_SOUNDS|'tap'|'deploy'|'laser'|'impact'|'destroy'|'win'|'resources'|'upgrade';
export const MUTE_KEY='airace-audio-muted-v1';
export const frequency=(midi:number)=>440*2**((midi-69)/12);
export const MUSIC_BPM={hq:112,raid:124} as const;
// Eight bars, eight eighth-notes per bar; each phrase has a breath before its answer.
export const CHORDS=[[48,55,60,64],[48,55,60,64],[45,52,57,60],[41,48,53,57],[48,55,60,64],[50,57,62,65],[43,50,55,59],[48,55,60,64]];
export const MELODY=[
 72,null,67,69,76,74,72,null,
 67,72,76,null,74,72,69,null,
 69,null,72,76,79,76,72,69,
 77,null,76,72,69,72,74,null,
 76,79,84,null,79,76,74,72,
 74,null,77,81,79,77,74,null,
 71,74,79,null,77,74,71,67,
 72,null,76,74,72,null,null,null,
];
export function musicStep(step:number,mode:MusicMode){
 const index=((Math.floor(step)%64)+64)%64,beat=index%8,chord=CHORDS[Math.floor(index/8)];
 return {chord,melody:MELODY[index],beat,seconds:60/MUSIC_BPM[mode]/2,
  bass:beat===0?chord[0]-12:beat===4?chord[0]-5:null,
  pluck:chord[1+([0,1,2,1][beat%4])]+(beat%2?12:0),
  kick:beat===0||beat===4,snare:beat===2||beat===6,hat:beat%2===1};
}
export function readMuted(storage?:Pick<Storage,'getItem'>){try{return storage?.getItem(MUTE_KEY)==='true';}catch{return false;}}
export function writeMuted(storage:Pick<Storage,'setItem'>|undefined,value:boolean){try{storage?.setItem(MUTE_KEY,String(value));}catch{}}
