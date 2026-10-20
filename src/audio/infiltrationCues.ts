/** Original short procedural voices. No samples or third-party audio. */
export const INFILTRATION_CUES={
 'cipher-deploy':[{note:49,at:0,duration:.1,gain:.18,type:'triangle',end:61},{note:78,at:.07,duration:.13,gain:.14,type:'square',end:89},{note:85,at:.18,duration:.18,gain:.12,type:'triangle',end:73}],
 'cipher-hacking':[{note:86,at:0,duration:.055,gain:.075,type:'sine',end:91},{note:98,at:.09,duration:.055,gain:.055,type:'triangle',end:93},{note:89,at:.2,duration:.08,gain:.065,type:'sine',end:96}],
 'drone-laser':[{note:99,at:0,duration:.19,gain:.18,type:'sawtooth',end:48},{note:82,at:.015,duration:.14,gain:.14,type:'triangle',end:43},{note:45,at:.13,duration:.1,gain:.08,type:'sine',end:33}],
} as const;
export type InfiltrationCue=keyof typeof INFILTRATION_CUES;
