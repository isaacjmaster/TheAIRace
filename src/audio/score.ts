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
export const MUSIC_BPM={hq:112,raid:128} as const;
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
/** Original raid composition: “Network Overdrive”. E-minor synth arcade groove.
 * Sixteenth-note syncopation, independent harmony/melody, sixteen-bar form.
 */
export const RAID_CHORDS=[[52,59,62,66],[52,59,62,66],[48,55,59,64],[48,55,59,64],[50,57,62,66],[50,57,60,64],[47,54,57,62],[47,54,59,62]];
const RAID_HOOK=[
 [76,null,null,79,83,null,81,null,79,null,78,null,76,null,null,74],
 [76,null,79,null,83,null,null,86,83,null,81,79,78,null,null,null],
 [79,null,null,76,83,null,81,null,79,null,76,null,74,null,76,null],
 [76,null,79,null,84,null,83,null,81,null,79,76,74,null,null,null],
 [78,null,null,81,86,null,83,null,81,null,78,null,76,null,78,null],
 [81,null,83,null,86,null,null,88,86,null,83,81,78,null,null,null],
 [78,null,null,74,81,null,78,null,76,null,74,null,71,null,74,null],
 [78,null,81,null,83,null,81,null,78,null,76,null,74,null,null,null],
];
export const MUSIC_LOOP_STEPS={hq:64,raid:256} as const;
export function musicStep(step:number,mode:MusicMode){
 if(mode==='raid'){
  const index=((Math.floor(step)%256)+256)%256,beat=index%16,bar=Math.floor(index/16),chord=RAID_CHORDS[bar%8];
  const base=RAID_HOOK[bar%8][beat],melody=base===null?null:base+(bar>=8&&beat===6?3:0);
  return {chord,melody,beat,seconds:60/MUSIC_BPM.raid/4,
   bass:[0,3,6,8,11,14].includes(beat)?chord[0]-12+(beat===14?7:0):null,
   pluck:chord[1+([0,1,2,1][Math.floor(beat/2)%4])]+12,
   kick:[0,6,8,14].includes(beat),snare:beat===4||beat===12,hat:beat%2===1,
   arp:beat%2===0?chord[1+(beat/2)%3]+12:null};
 }
 const index=((Math.floor(step)%64)+64)%64,beat=index%8,chord=CHORDS[Math.floor(index/8)];
 return {chord,melody:MELODY[index],beat,seconds:60/MUSIC_BPM.hq/2,
  bass:beat===0?chord[0]-12:beat===4?chord[0]-5:null,
  pluck:chord[1+([0,1,2,1][beat%4])]+(beat%2?12:0),
  kick:beat===0||beat===4,snare:beat===2||beat===6,hat:beat%2===1,arp:null};
}
/** Results, menus and abandoned views use the HQ theme; only an open unsettled raid uses combat music. */
export function musicModeFor(phase:string,panel:string|null,raid?:{settled:boolean}|null):MusicMode{return phase==='game'&&panel==='raid'&&raid&&!raid.settled?'raid':'hq';}
export function readMuted(storage?:Pick<Storage,'getItem'>){try{return storage?.getItem(MUTE_KEY)==='true';}catch{return false;}}
export function writeMuted(storage:Pick<Storage,'setItem'>|undefined,value:boolean){try{storage?.setItem(MUTE_KEY,String(value));}catch{}}
