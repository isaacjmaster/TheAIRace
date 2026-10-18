"""Breach Protocol: independent tactical raid composition, 16 bars / 32 seconds.
Imports offline mixing helpers only. Never renders or changes the approved HQ.
"""
from pathlib import Path
import sys,json,hashlib,shutil,importlib.util
import numpy as np
from scipy import signal
ROOT=Path(__file__).resolve().parents[3]
spec=importlib.util.spec_from_file_location('candidate_v1',Path(__file__).parent.parent/'v1/render.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
OUT=ROOT/'data/soundtrack-candidates/raid-v2';OUT.mkdir(parents=True,exist_ok=True)
base.OUT=OUT;base.ART=OUT;base.RNG=np.random.default_rng(2026101802)
SR=base.SR
# E-minor tension and dominant resolution; no HQ chord sequence or melodic quotation.
CHORDS=[[52,59,62,66],[52,59,62,67],[48,55,59,64],[50,57,59,66],
 [52,59,62,66],[43,55,59,64],[45,57,60,64],[47,57,63,66],
 [48,55,59,62],[45,57,60,64],[47,59,62,64],[47,57,63,66],
 [52,59,62,66],[48,55,59,64],[45,57,60,64],[47,57,63,66]]
LEAD=[
 [(0,59,.35),(.75,64,.42),(1.5,66,.38),(2.75,62,.38),(3.5,64,.35)],
 [(.5,67,.55),(1.5,66,.35),(2.25,64,.6),(3.5,59,.3)],
 [(0,64,.35),(.75,67,.4),(1.5,71,.5),(2.75,67,.35),(3.5,64,.3)],
 [(.25,66,.4),(1.25,64,.4),(2,62,.6),(3.25,59,.35)],
 [(0,59,.35),(.75,64,.42),(1.5,66,.38),(2.75,67,.38),(3.5,64,.35)],
 [(.5,67,.45),(1.25,71,.4),(2.25,69,.45),(3.25,67,.4)],
 [(0,64,.5),(1,60,.4),(1.75,64,.4),(2.75,67,.6)],
 [(0,66,.4),(.75,63,.4),(1.75,59,.4),(2.75,63,.4),(3.5,66,.3)],
 [(0,64,1),(2.25,62,.7)],
 [(.5,60,.6),(2,64,.8)],
 [(0,59,.35),(.75,64,.4),(1.5,67,.4),(2.75,66,.4),(3.5,64,.3)],
 [(.25,63,.45),(1.25,66,.45),(2.25,69,.45),(3.25,66,.4)],
 [(0,59,.35),(.75,64,.42),(1.5,66,.38),(2.75,62,.38),(3.5,64,.35)],
 [(0,64,.4),(.75,67,.4),(1.75,71,.55),(2.75,67,.35),(3.5,64,.3)],
 [(0,69,.4),(.75,67,.35),(1.5,64,.4),(2.5,60,.4),(3.25,64,.4)],
 [(0,66,.4),(.75,63,.4),(1.5,59,.45),(2.5,63,.4),(3.25,66,.3)]]

def voice(note,duration,kind,pan=0):
 f=440*2**((note-69)/12)
 release={'command':.12,'pulse':.09,'sub':.09,'stab':.22,'wire':.16}[kind]
 t=np.arange(int((duration+release)*SR))/SR
 if kind=='command':
  # Rounded low synth-brass, brief filtered attack, no bright keyboard doubling.
  a=.45*base.osc(f,t,'saw',-4)+.45*base.osc(f,t,'saw',4)+.28*base.osc(f,t,'triangle')
  a=signal.sosfilt(signal.butter(2,2300,fs=SR,output='sos'),a)
  a*=base.env(len(t),duration,.024,release,.75)
 elif kind=='pulse':
  a=.55*base.osc(f,t,'pulse',-2)+.20*np.sin(2*np.pi*f*t)
  a=signal.sosfilt(signal.butter(2,1250,fs=SR,output='sos'),a)
  a*=base.env(len(t),duration,.006,release,5.5)
 elif kind=='sub':
  a=.78*np.sin(2*np.pi*f*t)+.22*base.osc(f,t,'saw')
  a=signal.sosfilt(signal.butter(2,330,fs=SR,output='sos'),a)
  a=np.tanh(a*1.4)*base.env(len(t),duration,.008,release,1.2)
 elif kind=='stab':
  a=.45*base.osc(f,t,'pulse',5)+.45*base.osc(f,t,'saw',-5)
  a=signal.sosfilt(signal.butter(2,1700,fs=SR,output='sos'),a)
  a*=base.env(len(t),duration,.015,release,2)
 else:
  a=np.sin(2*np.pi*f*t+1.6*np.exp(-t*16)*np.sin(2*np.pi*f*2.01*t))
  a=signal.sosfilt(signal.butter(2,1900,fs=SR,output='sos'),a)
  a*=base.env(len(t),duration,.007,release,8)
 return base.pan(a,pan)

def percussion(kind,variant=0):
 if kind=='snare':
  a=base.sample(f'Snare2-HitSN_v3_rr{1+variant%2}_Sum.wav')[:int(.22*SR)].copy()
  a=signal.sosfilt(signal.butter(2,4300,fs=SR,output='sos'),a,axis=0)
  a*=np.exp(-np.arange(len(a))/SR*8)[:,None]
 elif kind=='tom':
  t=np.arange(int(.38*SR))/SR;f=83 if variant%2 else 110
  phase=2*np.pi*(f*t+10*(1-np.exp(-t*35))/35)
  a=base.pan((np.sin(phase)+.22*np.sin(phase*1.59))*np.exp(-t*12)*np.minimum(1,t/.003),-.35 if variant%2 else .35)
 elif kind=='kick':
  t=np.arange(int(.34*SR))/SR;phase=2*np.pi*(45*t+105*(1-np.exp(-t*45))/45)
  a=base.pan((np.sin(phase)*np.exp(-t*14)+.06*np.sin(2*np.pi*180*t)*np.exp(-t*90))*np.minimum(1,t/.003),0)
 else:
  a=base.drum('hat',1,variant)
 fade=min(384,len(a)//2);a[:48]*=np.linspace(0,1,48)[:,None];a[-fade:]*=np.linspace(1,0,fade)[:,None]
 return a

class RaidSong(base.Song):
 def __init__(self):
  self.mode='raid';self.bpm=120;self.beat=.5;self.n=64*24000
  self.stems={n:np.zeros((self.n,2)) for n in ['lead','keys','pad','arp','bass','drums','detail']};self.notes=[]
 def event(self,stem,at,n,d,kind,volume,pan=0):
  self.notes.append({'stem':stem,'beat':at,'midi':n,'durationBeats':d,'instrument':kind,'volume':volume})
  self.add(stem,at,voice(n,d*self.beat,kind,pan),volume)
 def compose(self):
  for bar,chord in enumerate(CHORDS):
   at=bar*4;root=chord[0];breakdown=bar in [8,9]
   for offset,n,d in LEAD[bar]:
    self.event('lead',at+offset,n,d,'command',.19 if not breakdown else .13)
   # Offbeat, clipped chord punches replace HQ's sustained pads and flowing keys.
   for j,offset in enumerate([.5,2] if not breakdown else [0]):
    for k,n in enumerate(chord[1:]):self.event('keys',at+offset,n,.32 if not breakdown else 1.0,'stab',.045,(k-1)*.22)
   pattern=[0,.5,1.25,1.75,2.5,3.25,3.75] if not breakdown else [0,1.75,3]
   for i,offset in enumerate(pattern):
    n=root-12+(12 if i in [2,5] and bar%2 else 0)
    self.event('bass',at+offset,n,.23 if not breakdown else .65,'sub',.26 if not breakdown else .20)
   # Tactical ostinato uses fixed chord tones and deliberate rests, not a busy high arp.
   ost=[0,.75,1.5,2.25,2.75,3.5] if not breakdown else [.75,2.75]
   tones=[root+12,chord[1],root+12,chord[2],chord[1],chord[3]]
   for i,offset in enumerate(ost):self.event('arp',at+offset,tones[i],.16,'pulse',.075,(-1 if i%2 else 1)*.25)
   if bar in [3,7,11,15]:
    for i,offset in enumerate([2.5,3,3.5,3.75]):self.add('detail',at+offset,percussion('tom',i),.09+(i%2)*.025)
   # A short, composed counter-response at phrase ends; no HQ motif quotation.
   if bar in [1,5,13]:
    for i,n in enumerate([chord[2]+12,chord[1]+12]):self.event('detail',at+2.75+i*.75,n,.18,'wire',.038,(-1 if i else 1)*.45)
   kicks=[0,.75,2,2.5] if bar%2==0 else [0,1.75,2.75,3.5]
   if breakdown:kicks=[0,2.5]
   for offset in kicks:self.add('drums',at+offset,percussion('kick'),.34)
   for offset in ([2] if breakdown else [1,3]):self.add('drums',at+offset+.01,percussion('snare',bar),.20)
   hats=[.5,1,1.5,2.25,2.5,3,3.5,3.75] if not breakdown else [1.5,3.5]
   for i,offset in enumerate(hats):self.add('drums',at+offset,percussion('hat',i),.027 if i%2 else .019)
  return self

def render():
 lock=json.loads((Path(__file__).parent/'approved-hq.json').read_text())
 review=ROOT/'data/soundtrack-candidates/review'
 for name,digest in lock['files'].items():assert hashlib.sha256((review/name).read_bytes()).hexdigest()==digest,'Approved HQ changed'
 song=RaidSong().compose();report=song.finish();report['name']='Breach Protocol';report['revision']=2
 # The inherited finishing stage writes only inside the separate v2 scratch directory.
 for ext in ['wav','m4a']:
  src=OUT/('raid-candidate-v1.'+ext);dst=OUT/('raid-candidate-v2.'+ext);src.replace(dst);shutil.copyfile(dst,review/dst.name)
  export=Path(sys.argv[1]) if len(sys.argv)>1 else OUT
  export.mkdir(parents=True,exist_ok=True)
  if export.resolve()!=OUT.resolve():shutil.copyfile(dst,export/dst.name)
 (OUT/'raid-score.json').write_text(json.dumps({'chords':CHORDS,'lead':LEAD,'events':song.notes},indent=2))
 (OUT/'measurements.json').write_text(json.dumps(report,indent=2))
 for name,digest in lock['files'].items():assert hashlib.sha256((review/name).read_bytes()).hexdigest()==digest
 print(json.dumps(report,indent=2))
if __name__=='__main__':render()
