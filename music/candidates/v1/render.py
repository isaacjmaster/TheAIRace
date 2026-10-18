"""Original review-only compositions. Offline multitrack render; no game imports.
Requires numpy/scipy and ignored data/music-tools/{pyloudnorm,imageio_ffmpeg}.
Sources are pinned/checksummed in sources.json. No borrowed melodies or loops.
"""
from pathlib import Path
import sys,json,math,hashlib,subprocess,shutil
import numpy as np
from scipy import signal,ndimage
from scipy.io import wavfile
ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(ROOT/'data/music-tools'))
import pyloudnorm as pyln
import imageio_ffmpeg
SR=48000
SAMPLES=ROOT/'data/soundtrack-candidates/samples'
OUT=ROOT/'data/soundtrack-candidates/review'
OUT.mkdir(parents=True,exist_ok=True)
ART=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else OUT
ART.mkdir(parents=True,exist_ok=True)
RNG=np.random.default_rng(20261018)
cache={}
def sample(name):
 if name not in cache:
  sr,a=wavfile.read(SAMPLES/name)
  a=a.astype(np.float64)/(np.iinfo(a.dtype).max if a.dtype.kind=='i' else 1)
  if a.ndim==1:a=np.column_stack((a,a))
  a=a[:int(sr*5)]
  if sr!=SR:a=signal.resample_poly(a,SR//math.gcd(sr,SR),sr//math.gcd(sr,SR),axis=0)
  # Preserve the natural onset while rejecting DC, subsonic rumble and a truncated tail.
  a=signal.sosfilt(signal.butter(2,30,fs=SR,btype='highpass',output='sos'),a,axis=0)
  a[-min(len(a),int(.12*SR)):]*=np.linspace(1,0,min(len(a),int(.12*SR)))[:,None]
  a/=max(.001,np.max(np.abs(a)))
  cache[name]=a
 return cache[name]
def env(n,hold,attack=.014,release=.18,decay=0):
 t=np.arange(n)/SR
 a=np.minimum(1,t/max(attack,1/SR))
 a*=np.exp(-decay*t)
 a*=np.clip((hold+release-t)/max(release,1/SR),0,1)**1.8
 return a
def pan(mono,p):
 return np.column_stack((mono*np.cos((p+1)*np.pi/4),mono*np.sin((p+1)*np.pi/4)))
def osc(f,t,style='saw',cents=0):
 # Explicit harmonic band-limiting; no naive discontinuous saw/square waves.
 f=f*2**(cents/1200);result=np.zeros(len(t));limit=min(24,int(SR/2/max(f,1))-1)
 for h in range(1,limit+1):
  if style=='triangle':
   if h%2:result+=(-1)**((h-1)//2)*np.sin(2*np.pi*f*h*t)/(h*h)
  elif style=='pulse':result+=np.sin(np.pi*h*.36)*np.sin(2*np.pi*f*h*t)/h**1.25
  else:result+=np.sin(2*np.pi*f*h*t)/h**1.35
 return result

def synth(note,duration,kind,p=0,velocity=1):
 f=440*2**((note-69)/12);release={'pad':.9,'lead':.22,'battle':.14,'arp':.28,'bass':.07,'keys':.4}[kind]
 t=np.arange(int((duration+release)*SR))/SR
 if kind=='pad':
  a=(pan(osc(f,t,'saw',-6),-.65)+pan(osc(f,t,'saw',5),.65)+pan(osc(f,t,'triangle'),0))*.20
  a=signal.sosfilt(signal.butter(2,1400,fs=SR,output='sos'),a,axis=0)
  a*=env(len(t),duration,.22,release,.04)[:,None]
 elif kind in ['lead','battle']:
  if kind=='lead':
   mono=.46*osc(f,t,'triangle')+.19*osc(f,t,'saw',-3)+.19*osc(f,t,'saw',3)
   mono+=.12*np.sin(2*np.pi*f*t+1.25*np.exp(-t*8)*np.sin(2*np.pi*f*2*t))
   cutoff=3500;decay=.55
  else:
   mono=.35*osc(f,t,'saw',-5)+.35*osc(f,t,'saw',5)+.25*osc(f,t,'pulse')+.1*np.sin(np.pi*f*t)
   cutoff=3100;decay=.6
  mono=signal.sosfilt(signal.butter(2,cutoff,fs=SR,output='sos'),mono)
  mono*=env(len(t),duration,.018 if kind=='lead' else .009,release,decay)
  a=pan(mono,p)
 elif kind=='keys':
  mono=(np.sin(2*np.pi*f*t+1.7*np.exp(-t*5)*np.sin(2*np.pi*f*2*t))+.22*np.sin(2*np.pi*f*3*t)*np.exp(-t*4))
  a=pan(mono*env(len(t),duration,.008,release,1.8),p)
 elif kind=='arp':
  mono=np.sin(2*np.pi*f*t+1.1*np.exp(-t*14)*np.sin(2*np.pi*f*3*t))+.13*osc(f,t,'triangle',3)
  a=pan(mono*env(len(t),duration,.007,release,7),p)
 else:
  mono=.62*np.sin(2*np.pi*f*t)+.23*osc(f,t,'saw',-2)+.16*osc(f,t,'triangle',2)
  mono=signal.sosfilt(signal.butter(2,650,fs=SR,output='sos'),mono)
  a=pan(np.tanh(mono*1.2)*env(len(t),duration,.01,release,1),0)
 return a*velocity

def piano(note,duration,p=0,velocity=.65):
 idx=min([20,22,24,26,28,30],key=lambda i:abs((21+i*2)-note));root=21+idx*2
 a=sample(f'Player_dyn{2 if velocity<.8 else 3}_rr1_{idx:03d}.wav')
 factor=2**((note-root)/12);n=min(int((duration+.45)*SR),int(len(a)/factor))
 x=np.arange(n)*factor
 a=np.column_stack([np.interp(x,np.arange(len(a)),a[:,c]) for c in [0,1]])
 a*=env(n,duration,.003,.45,.18)[:,None]
 # Narrow sample stereo and pan within the ensemble rather than hard-panning a piano.
 mid=a.mean(axis=1);side=(a[:,0]-a[:,1])*.2
 return (pan(mid,p)+np.column_stack((side,-side)))*velocity

def drum(kind,volume=.5,variant=0):
 if kind=='snare':a=sample(f'Snare2-HitSN_v3_rr{1+variant%2}_Sum.wav')[:int(.32*SR)].copy();a*=np.exp(-np.arange(len(a))/SR*6)[:,None]
 elif kind=='rim':a=sample('Snare2-taps_v2_rr1_Sum.wav')[:int(.18*SR)].copy();a=signal.sosfilt(signal.butter(2,4000,fs=SR,output='sos'),a,axis=0)
 elif kind=='metal':a=sample('BrakeDrum1_Hammer_v2_Sum.wav')[:int(.4*SR)].copy();a=signal.sosfilt(signal.butter(2,2200,fs=SR,output='sos'),a,axis=0);a*=np.exp(-np.arange(len(a))/SR*7)[:,None]
 else:
  length=.38 if kind=='kick' else .12;t=np.arange(int(length*SR))/SR
  if kind=='kick':
   frequency=48+95*np.exp(-t*38);phase=2*np.pi*np.cumsum(frequency)/SR
   mono=np.sin(phase)*np.exp(-t*13)+.1*RNG.normal(size=len(t))*np.exp(-t*180)
   mono*=np.minimum(1,t/.0025);a=pan(mono,0)
  else:
   mono=RNG.normal(size=len(t));mono=signal.sosfilt(signal.butter(2,[4200,8000],fs=SR,btype='bandpass',output='sos'),mono)
   mono*=np.minimum(1,t/.002)*np.exp(-t*(70 if kind=='hat' else 42));a=pan(mono,-.35 if variant%2 else .35)
 # Every one-shot starts/ends continuously, including trimmed recorded percussion.
 fade=min(int(.008*SR),len(a)//2);a[:min(48,len(a))]*=np.linspace(0,1,min(48,len(a)))[:,None];a[-fade:]*=np.linspace(1,0,fade)[:,None]
 return a*volume

HQ_CHORDS=[[50,57,61,64,66],[47,54,57,61,66],[43,54,57,59,62],[45,55,61,66,71],
 [50,57,61,64,66],[42,52,57,61,64],[40,50,54,55,59],[45,55,61,66,71],
 [43,54,57,59,62],[42,50,57,61,64],[40,50,54,55,59],[45,55,61,66,71],
 [47,54,57,61,66],[43,54,57,59,62],[40,50,54,55,59],[45,55,61,64,66]]
RAID_CHORDS=[[50,57,60,64,65],[50,57,60,64,65],[46,53,57,62,65],[43,55,59,62,64],
 [50,57,60,64,65],[41,53,57,60,64],[43,53,57,58,62],[45,55,61,64,67],
 [50,57,60,64,65],[48,55,60,62,64],[46,53,57,62,65],[45,55,61,64,67],
 [50,57,60,64,65],[43,55,59,62,64],[46,53,57,62,65],[45,55,61,64,67]]
# Each phrase is authored explicitly: onset in beats, MIDI pitch, sounding duration.
HQ_LEAD=[
 [(0,66,.65),(.75,69,.3),(1.25,71,.55),(2,76,.7),(3,74,.4),(3.5,69,.35)],
 [(0,73,.9),(1.25,71,.45),(2,69,.45),(2.75,66,.65),(3.5,64,.35)],
 [(0,67,.65),(.75,69,.3),(1.25,71,.55),(2,74,.7),(3,73,.45)],
 [(0,71,.7),(1,69,.45),(2,64,.65),(3.25,66,.45)],
 [(0,66,.65),(.75,69,.3),(1.25,71,.55),(2,78,.6),(2.75,76,.4),(3.5,74,.35)],
 [(0,73,.65),(.75,71,.35),(1.5,69,.6),(2.5,68,.4),(3.25,66,.5)],
 [(0,67,.65),(.75,71,.3),(1.25,74,.55),(2,78,.7),(3,76,.45)],
 [(0,73,.7),(1,71,.45),(2,69,.65),(3.25,64,.45)],
 [(0,71,.9),(1.25,69,.45),(2,67,.6),(3,66,.65)],
 [(0,66,.65),(1,69,.5),(1.75,74,.65),(2.75,73,.4),(3.5,69,.35)],
 [(0,66,.35),(.5,67,.4),(1.25,71,.55),(2,76,.65),(3,74,.35),(3.5,71,.35)],
 [(0,73,.65),(.75,71,.3),(1.5,69,.6),(2.5,67,.45),(3.25,64,.5)],
 [(0,66,.65),(.75,69,.3),(1.25,71,.55),(2,76,.65),(3,74,.4),(3.5,69,.35)],
 [(0,67,.65),(.75,71,.3),(1.5,74,.6),(2.5,76,.45),(3.25,74,.5)],
 [(0,64,.35),(.5,66,.35),(1,67,.5),(1.75,71,.55),(2.5,74,.4),(3.25,73,.45)],
 [(0,73,.65),(.75,71,.3),(1.5,69,.6),(2.5,67,.45),(3.5,64,.3)]]
RAID_LEAD=[
 [(0,65,.4),(.5,69,.25),(.875,71,.3),(1.5,76,.45),(2.25,74,.35),(2.75,69,.3),(3.5,65,.3)],
 [(0,72,.4),(.75,69,.3),(1.25,67,.3),(2,65,.45),(2.75,64,.3),(3.5,62,.3)],
 [(0,74,.6),(.75,77,.3),(1.5,76,.4),(2.25,74,.35),(3,72,.3),(3.5,69,.3)],
 [(0,71,.45),(.75,74,.3),(1.25,76,.4),(2,74,.35),(2.75,71,.3),(3.5,69,.3)],
 [(0,65,.4),(.5,69,.25),(.875,71,.3),(1.5,76,.45),(2.25,74,.35),(3,72,.3),(3.5,69,.3)],
 [(0,69,.4),(.75,72,.3),(1.25,74,.35),(2,76,.45),(2.75,72,.3),(3.5,69,.3)],
 [(0,70,.4),(.75,69,.3),(1.25,67,.3),(2,74,.45),(2.75,77,.3),(3.5,76,.3)],
 [(0,73,.4),(.75,76,.3),(1.25,79,.35),(2,76,.4),(2.75,73,.3),(3.5,69,.3)],
 [(0,65,.4),(.5,69,.25),(.875,72,.3),(1.5,76,.4),(2.25,74,.3),(2.75,72,.3),(3.5,71,.3)],
 [(0,64,.4),(.75,67,.3),(1.25,69,.3),(2,74,.45),(2.75,72,.3),(3.5,67,.3)],
 [(0,74,.4),(.75,72,.3),(1.25,70,.3),(2,65,.45),(2.75,69,.3),(3.5,70,.3)],
 [(0,67,.4),(.75,69,.3),(1.25,73,.3),(2,76,.45),(2.75,74,.3),(3.5,73,.3)],
 [(0,65,.4),(.5,69,.25),(.875,71,.3),(1.5,76,.45),(2.25,74,.35),(2.75,69,.3),(3.5,65,.3)],
 [(0,71,.4),(.75,74,.3),(1.25,76,.3),(2,79,.45),(2.75,77,.3),(3.5,76,.3)],
 [(0,77,.4),(.75,76,.3),(1.25,74,.3),(2,72,.45),(2.75,70,.3),(3.5,69,.3)],
 [(0,73,.4),(.75,76,.3),(1.25,79,.3),(2,77,.45),(2.75,76,.3),(3.5,73,.3)]]

class Song:
 def __init__(self,mode):
  self.mode=mode;self.bpm=112 if mode=='hq' else 128;self.beat=60/self.bpm;self.n=round(64*self.beat*SR)
  self.stems={name:np.zeros((self.n,2)) for name in ['lead','keys','pad','arp','bass','drums','detail']}
  self.notes=[]
 def add(self,stem,beat,a,level=1):
  a=a*level;start=round(beat*self.beat*SR)%self.n
  for offset in range(0,len(a),self.n):
   chunk=a[offset:offset+self.n];first=min(len(chunk),self.n-start);self.stems[stem][start:start+first]+=chunk[:first]
   if first<len(chunk):self.stems[stem][:len(chunk)-first]+=chunk[first:]
 def note(self,stem,at,n,duration,kind,volume,p=0):
  self.notes.append({'stem':stem,'beat':at,'midi':n,'durationBeats':duration,'instrument':kind,'volume':volume})
  a=piano(n,duration*self.beat,p,.65) if kind=='piano' else synth(n,duration*self.beat,kind,p)
  self.add(stem,at,a,volume)
 def compose(self):
  raid=self.mode=='raid';chords=RAID_CHORDS if raid else HQ_CHORDS;melody=RAID_LEAD if raid else HQ_LEAD
  for bar,chord in enumerate(chords):
   at=bar*4;roots=[n for n in chord[1:]]
   for n in roots:self.note('pad',at,n,3.5,'pad',.038 if raid else .052)
   for offset in ([0,2.5] if not raid else [0,1.5,2.75]):
    for j,n in enumerate(roots[:3]):self.note('keys',at+offset+j*.024,n,.85 if not raid else .35,'keys',.055 if not raid else .038,(j-1)*.22)
   for offset,n,length in melody[bar]:
    self.note('lead',at+offset,n,length,'battle' if raid else 'lead',.17 if raid else .16)
    if not raid:self.note('keys',at+offset+.012,n,length,'piano',.065,-.16)
    elif bar>=8 and offset in [0,2]:self.note('detail',at+offset,n-12,length,'battle',.035,.2)
   bass=chord[0]-12
   for j,offset in enumerate([0,.75,1.5,2,2.75,3.5] if raid else [0,1.75,2.5]):
    pitch=bass+(12 if raid and j==4 else 7 if not raid and j==2 and bar%2 else 0)
    self.note('bass',at+offset,pitch,.3 if raid else .75,'bass',.24 if raid else .16)
   for j,offset in enumerate(np.arange(.25,4,.5) if raid else [.5,1.5,2.5,3.5]):
    n=roots[[0,2,1,3][j%4]]+(12 if raid and bar%4>=2 else 0)
    self.note('arp',at+float(offset),n,.14 if raid else .24,'arp',.035 if raid else .032,(-1 if j%2 else 1)*.55)
   kicks=[0,1.5,2,2.75] if raid else [0,2]
   if bar%4==3:kicks.append(3.5)
   for offset in kicks:self.add('drums',at+offset,drum('kick',.30 if raid else .18))
   for offset in [1,3]:self.add('drums',at+offset+.012,drum('snare' if raid else 'rim',.17 if raid else .10,bar))
   hats=np.arange(0,4,.25 if raid else .5)
   for j,offset in enumerate(hats):self.add('drums',at+float(offset)+(0.018 if j%2 else 0),drum('hat',(.033 if j%2 else .021) if raid else .024,j))
   if raid and bar in [3,7,11,15]:
    for j,offset in enumerate([3.25,3.5,3.75]):self.add('detail',at+offset,drum('rim',.045+j*.015,j))
   if raid and bar%4==0:self.add('detail',at+.5,drum('metal',.045))
  return self
 def finish(self):
  # Periodic processing wraps tails naturally; no fade-to-silence disguise at the seam.
  dry=np.zeros((self.n,2));send=np.zeros_like(dry)
  for name,a in self.stems.items():
   if name in ['pad','keys','arp']:
    a=a+.10*np.roll(a[:,::-1],round(.019*SR),axis=0)
   if name in ['lead','arp']:
    a=a+.14*np.roll(a[:,::-1],round(self.beat*.75*SR),axis=0)+.055*np.roll(a,round(self.beat*1.5*SR),axis=0)
   if name not in ['drums','bass']:
    position=(np.arange(self.n)/SR/self.beat)%1
    pulse=(1-np.cos(2*np.pi*position))*np.exp(-position*9)*8
    duck=1-(.11 if self.mode=='raid' else .035)*pulse
    a=a*duck[:,None]
   dry+=a;send+=a*({'pad':.32,'keys':.15,'lead':.14,'arp':.19,'detail':.12}.get(name,0))
  # Original room response: early reflections plus filtered diffuse stereo decay.
  irn=int(SR*1.25);t=np.arange(irn)/SR;ir=np.zeros((self.n,2))
  for c in [0,1]:
   noise=RNG.normal(size=irn);noise=signal.sosfilt(signal.butter(2,4200,fs=SR,output='sos'),noise)
   noise*=np.exp(-t*6)*np.minimum(1,t/.03);noise[:int(.015*SR)]=0;noise/=max(.001,np.sqrt(np.sum(noise*noise)));ir[:irn,c]=noise*.5
   for delay,level in [(.023,.23),(.041,.17),(.067,.12)]:ir[round((delay+c*.003)*SR),c]+=level
  wet=np.fft.irfft(np.fft.rfft(send,axis=0)*np.fft.rfft(ir,axis=0),n=self.n,axis=0)
  mix=dry+wet*.58
  # Periodic high-pass and smooth top-end; no cold-start filter discontinuity.
  freq=np.fft.rfftfreq(self.n,1/SR);response=(freq**2/(freq**2+30**2)) / np.sqrt(1+(freq/10500)**4)
  mix=np.fft.irfft(np.fft.rfft(mix,axis=0)*response[:,None],n=self.n,axis=0)
  rms=np.sqrt(ndimage.uniform_filter1d(np.mean(mix*mix,axis=1),size=int(.06*SR),mode='wrap')+1e-12)
  gain=np.minimum(1,(.26/np.maximum(rms,.0001))**.3);mix*=gain[:,None]
  mix=np.tanh(mix*.8)/.8
  meter=pyln.Meter(SR);loudness=meter.integrated_loudness(mix);mix*=10**((-18-loudness)/20)
  truepeak=np.max(np.abs(signal.resample_poly(np.vstack((mix[-1000:],mix,mix[:1000])),4,1,axis=0)))
  if truepeak>10**(-1.5/20):mix*=10**(-1.5/20)/truepeak
  result=meter.integrated_loudness(mix)
  delta=np.abs(np.diff(mix,axis=0));seam=np.abs(mix[0]-mix[-1]);reference=np.percentile(delta,99.9,axis=0)
  report={'name':'After Hours, First Ideas' if self.mode=='hq' else 'Race the Network','mode':self.mode,'bpm':self.bpm,'bars':16,'sampleRate':SR,'channels':2,'frames':self.n,'seconds':self.n/SR,'integratedLUFS':float(result),'samplePeakDbFS':float(20*np.log10(np.max(np.abs(mix)))),'truePeakDbTP':float(20*np.log10(np.max(np.abs(signal.resample_poly(mix,4,1,axis=0))))),'dc':mix.mean(axis=0).tolist(),'seamDelta':seam.tolist(),'normalDelta99_9':reference.tolist(),'authoredNotes':len(self.notes)}
  assert 20<=report['seconds']<=40 and abs(result+18)<.5
  assert np.all(seam<np.maximum(.001,reference)),report
  # TPDF dither only at final PCM conversion.
  pcm=np.int16(np.clip(mix+(RNG.random(mix.shape)-RNG.random(mix.shape))/65536,-1,1)*32767)
  file=OUT/(self.mode+'-candidate-v1.wav');wavfile.write(file,SR,pcm)
  subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-v','error','-y','-i',str(file),'-c:a','aac','-b:a','160k',str(OUT/(self.mode+'-candidate-v1.m4a'))],check=True)
  report['wavBytes']=file.stat().st_size;report['aacBytes']=(OUT/(self.mode+'-candidate-v1.m4a')).stat().st_size
  (OUT/(self.mode+'-score.json')).write_text(json.dumps({'chords':HQ_CHORDS if self.mode=='hq' else RAID_CHORDS,'lead':HQ_LEAD if self.mode=='hq' else RAID_LEAD,'events':self.notes},indent=2))
  for ext in ['wav','m4a']:
   source=OUT/(self.mode+'-candidate-v1.'+ext);target=ART/source.name
   if source.resolve()!=target.resolve():shutil.copyfile(source,target)
  return report
if __name__=='__main__':
 manifest=json.loads((Path(__file__).parent/'sources.json').read_text())
 for item in manifest['files']:assert hashlib.sha256((SAMPLES/item['local']).read_bytes()).hexdigest()==item['sha256'],item['local']
 reports=[Song(mode).compose().finish() for mode in ['hq','raid']]
 (OUT/'measurements.json').write_text(json.dumps(reports,indent=2));print(json.dumps(reports,indent=2))
