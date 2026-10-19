"""Original HQ composition: Small Campus, Big Dreams. 16 bars at 96 BPM.
Offline sampled piano/marimba and original soft synthesis; no borrowed tune or loop.
Uses the existing pinned CC0 sample provenance in ../v1/sources.json.
"""
from pathlib import Path
import importlib.util,json,hashlib,subprocess
import numpy as np
from scipy import signal
ROOT=Path(__file__).resolve().parents[3]
spec=importlib.util.spec_from_file_location('mix_helpers',Path(__file__).parent.parent/'v1/render.py');b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
OUT=ROOT/'data/hq-campus-music';OUT.mkdir(parents=True,exist_ok=True);b.OUT=OUT;b.ART=OUT;b.RNG=np.random.default_rng(2026101903)
# F major / D minor with warm added-sixth and ninth voicings. A/A'/B/A'' form.
CHORDS=[[41,57,60,64,67],[48,55,60,64,69],[38,57,60,65,69],[46,53,57,60,65],
 [41,57,60,64,67],[45,57,60,64,67],[43,55,58,62,65],[48,55,58,62,67],
 [46,53,57,60,65],[41,53,57,60,64],[43,55,58,62,65],[48,55,58,62,69],
 [38,57,60,65,69],[46,53,57,60,65],[48,55,58,62,67],[41,57,60,64,67]]
MELODY=[[(.25,69,.55),(1,72,.4),(1.75,74,.6),(3,72,.55)],
 [(.5,67,.6),(1.5,69,.4),(2.25,72,.75)],
 [(.25,69,.5),(1,65,.6),(2,64,.4),(2.75,65,.65)],
 [(.5,67,.55),(1.5,65,.5),(2.5,62,.75)],
 [(.25,69,.55),(1,72,.4),(1.75,74,.55),(2.75,76,.5),(3.5,72,.3)],
 [(.5,69,.6),(1.5,67,.5),(2.5,64,.7)],
 [(.5,65,.55),(1.5,69,.4),(2.25,67,.7)],
 [(.25,64,.5),(1,62,.6),(2.5,60,.8)],
 [(.5,65,.9),(2,69,.55),(3,67,.5)],
 [(.25,64,.7),(1.5,65,.5),(2.75,60,.7)],
 [(.5,62,.6),(1.5,65,.65),(3,69,.55)],
 [(.25,67,.65),(1.5,64,.55),(2.75,62,.6)],
 [(.25,69,.55),(1,72,.4),(1.75,74,.7),(3,72,.5)],
 [(.5,70,.55),(1.5,69,.6),(2.75,65,.7)],
 [(.25,67,.55),(1.25,64,.5),(2.25,62,.6),(3.25,60,.35)],
 [(.25,65,.8),(1.75,69,.5),(2.75,67,.4)]]

def mallet(note,duration,pan):
 a=b.sample('Marimba_hit_Outrigger_C4_loud_01.wav');factor=2**((note-60)/12);n=min(int((duration+.45)*b.SR),int(len(a)/factor));x=np.arange(n)*factor
 a=np.column_stack([np.interp(x,np.arange(len(a)),a[:,c]) for c in [0,1]])
 mono=a.mean(axis=1);mono=signal.sosfilt(signal.butter(2,3400,fs=b.SR,output='sos'),mono)
 return b.pan(mono*b.env(n,duration,.009,.45,1.1),pan)
class CampusSong(b.Song):
 def __init__(self):
  super().__init__('hq');self.bpm=96;self.beat=60/96;self.n=round(64*self.beat*b.SR);self.stems={k:np.zeros((self.n,2)) for k in self.stems}
 def compose(self):
  for bar,chord in enumerate(CHORDS):
   at=bar*4
   # Soft, lightly rolled piano voicings leave air around the main motif.
   for j,n in enumerate(chord[1:]):self.note('keys',at+.04+j*.025,n,2.8,'piano',.07,(j-1.5)*.13)
   for j,n in enumerate(chord[1:4]):self.note('pad',at+.08,n,3.5,'pad',.025,(j-1)*.35)
   for offset,n,length in MELODY[bar]:
    self.add('lead',at+offset,mallet(n,length*self.beat,-.12),.22)
    self.notes.append({'stem':'lead','beat':at+offset,'midi':n,'durationBeats':length,'instrument':'CC0 marimba','volume':.22})
    if offset<1:self.note('detail',at+offset+.02,n-12,length,'piano',.048,.18)
   for offset in [0,2.25]:self.note('bass',at+offset,chord[0],1.35,'bass',.085)
   # Tiny electronic replies, never an incessant beep/arpeggio.
   if bar%2: 
    for j,offset in enumerate([2.75,3.5]):self.note('arp',at+offset,chord[2+j]+12,.26,'keys',.028,(-1 if j else 1)*.35)
   if bar not in [8,9]:
    for j,offset in enumerate([.5,1.5,2.5,3.5]):self.add('drums',at+offset,b.drum('hat',.009 if j%2 else .006))
    for offset in [1,3]:self.add('drums',at+offset+.015,b.drum('rim',.025,bar))
   if bar in [3,7,11]:self.note('detail',at+3.5,chord[3]+12,.2,'keys',.035,.35)
  return self
if __name__=='__main__':
 manifest=json.loads((Path(__file__).parent.parent/'v1/sources.json').read_text())
 for item in manifest['files']:assert hashlib.sha256((b.SAMPLES/item['local']).read_bytes()).hexdigest()==item['sha256']
 raid=ROOT/'public/audio/raid-approved-ab2683c155eb.wav';before=hashlib.sha256(raid.read_bytes()).hexdigest()
 song=CampusSong().compose();report=song.finish();report['name']='Small Campus, Big Dreams';report['revision']=3
 wav=OUT/'hq-candidate-v1.wav';digest=hashlib.sha256(wav.read_bytes()).hexdigest();name='hq-campus-'+digest[:12]
 target=ROOT/'public/audio';(target/(name+'.wav')).write_bytes(wav.read_bytes())
 subprocess.run([b.imageio_ffmpeg.get_ffmpeg_exe(),'-v','error','-y','-i',str(wav),'-c:a','flac',str(target/(name+'.flac'))],check=True)
 report['sha256Wav']=digest;report['flac']='/audio/'+name+'.flac';report['wav']='/audio/'+name+'.wav';report['compressedBytes']=(target/(name+'.flac')).stat().st_size
 (Path(__file__).parent/'measurements.json').write_text(json.dumps(report,indent=2));(Path(__file__).parent/'score.json').write_text(json.dumps({'chords':CHORDS,'melody':MELODY,'events':song.notes},indent=2))
 assert hashlib.sha256(raid.read_bytes()).hexdigest()==before
 print(json.dumps(report,indent=2))
