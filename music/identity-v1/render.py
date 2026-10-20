"""Offline sampled-instrument candidates, editable score/MIDI and periodic stereo mastering.
Local prerequisites: numpy/scipy; pyloudnorm and imageio-ffmpeg in data/music-tools.
No music API, precomposed musical loop, commercial recording or production dependency.
"""
from pathlib import Path
import importlib.util,sys,json,hashlib,subprocess,struct,gc
import numpy as np
from scipy import signal,ndimage
from scipy.io import wavfile
from score import TRACKS,MOTIF
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'data/music-tools'))
import pyloudnorm as pyln
import imageio_ffmpeg
spec=importlib.util.spec_from_file_location('instruments',ROOT/'music/candidates/v1/render.py');b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
SR=48000;OUT=ROOT/'data/music-identity-v1';OUT.mkdir(parents=True,exist_ok=True)
PUBLIC=ROOT/'public/audio/identity-v1';PUBLIC.mkdir(parents=True,exist_ok=True)
RNG=np.random.default_rng(2026102017)
def pitch(name):
 if isinstance(name,int):return name
 return {'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}[name[0]]+(1 if '#' in name else 0)+(int(name[-1])+1)*12
def recorded(name,root,note,seconds,pan=0,release=.55):
 a=b.sample(name);ratio=2**((note-root)/12);n=min(int((seconds+release)*SR),int(len(a)/ratio));t=np.arange(n)*ratio
 mono=np.interp(t,np.arange(len(a)),a.mean(axis=1));mono*=b.env(n,seconds,.004,release,.04)
 return b.pan(mono,pan)
def instrument(kind,note,seconds,pan=0,variant=0):
 if kind=='piano':return b.piano(note,seconds,pan,.64+.04*(variant%3))
 if kind=='harp':
  roots={62:'D4',65:'F4',69:'A4',72:'C5',76:'E5'};root=min(roots,key=lambda r:abs(r-note));return recorded('KSHarp_'+roots[root]+'_mf.wav',root,note,seconds,pan,.9)
 if kind in ['cello','pizz']:
  roots={45:'A2',48:'C3',52:'E3'} if kind=='cello' else {57:'A3',60:'C4',64:'E4'};root=min(roots,key=lambda r:abs(r-note));name=('pizzT_'+roots[root]+'_v1_RR'+str(variant%2+1)+'.wav') if kind=='cello' else ('LLVln_Pizz_'+roots[root]+'_p_RR'+str(variant%2+1)+'.wav');return recorded(name,root,note,seconds,pan,.45)
 if kind=='marimba':return recorded('Marimba_hit_Outrigger_C4_loud_01.wav',60,note,seconds,pan,.5)
 if kind=='bass':return b.synth(note,seconds,'bass',pan)*.75
 if kind=='pad':return b.synth(note,seconds,'pad',pan)
 # Rounded electronic reed: a quiet harmonic partner to the recorded mallets.
 t=np.arange(round((seconds+.22)*SR))/SR;f=440*2**((note-69)/12)
 if kind=='reed':
  mono=.55*b.osc(f,t,'triangle')+.14*b.osc(f,t,'pulse',-3)+.14*b.osc(f,t,'pulse',3)
  mono=signal.sosfilt(signal.butter(2,2100,fs=SR,output='sos'),mono)*b.env(len(t),seconds,.025,.22,.65)
 else:mono=np.sin(2*np.pi*f*t+.55*np.exp(-t*18)*np.sin(2*np.pi*f*2*t))*b.env(len(t),seconds,.007,.22,6)
 return b.pan(mono,pan)
class Composition:
 def __init__(self,mode):
  self.mode=mode;self.info=TRACKS[mode];self.beat=60/self.info['bpm'];self.frames=round(128*self.beat*SR);self.events=[];self.percussionEvents=[]
  self.stems={k:np.zeros((self.frames,2),np.float32) for k in ['theme','piano','strings','bass','pad','percussion','signals']}
 def add(self,stem,at,a,volume):
  a=a*volume;start=round(at*self.beat*SR)%self.frames;length=min(len(a),self.frames);head=min(length,self.frames-start);self.stems[stem][start:start+head]+=a[:head].astype(np.float32)
  if head<length:self.stems[stem][:length-head]+=a[head:length].astype(np.float32)
 def hit(self,at,kind,volume,variant=0):
  self.percussionEvents.append({'stem':'percussion','beat':at,'midi':{'hat':42,'rim':37,'kick':36,'metal':56}[kind],'durationBeats':.15,'instrument':'percussion-'+kind,'gain':volume,'pan':0})
  self.add('percussion',at,b.drum(kind,1,variant),volume)
 def note(self,stem,at,n,d,kind,volume,pan=0):
  n=pitch(n);self.events.append({'stem':stem,'beat':at,'midi':n,'durationBeats':d,'instrument':kind,'gain':volume,'pan':pan});self.add(stem,at,instrument(kind,n,d*self.beat,pan,len(self.events)),volume)
 def compose(self):
  stealth=self.mode=='infiltration'
  for bar,chord in enumerate(self.info['chords']):
   at=bar*4;bridge=16<=bar<24;lift=1 if bar<8 else 1.06 if bar<16 else .86 if bridge else 1.08
   # Hand-rolled voicings breathe and exchange roles between sections.
   offsets=[0,2.5] if stealth else [0]
   for offset in offsets:
    for j,n in enumerate(chord[1:]):self.note('piano',at+offset+j*.032,n,.65 if stealth else 2.5,'piano',(.038 if stealth else .06)*lift,(j-1.5)*.12)
   if not stealth or bar%2==0:
    for j,n in enumerate(chord[1:4]):self.note('pad',at+.1,n,3.5,'pad',.018 if stealth else .021,(j-1)*.38)
   for i,(offset,n,length) in enumerate(self.info['melody'][bar]):
    # A/A'/B/A'' changes the lead instrument instead of looping an identical phrase.
    kind=('reed' if not bridge else 'pizz') if stealth else ('harp' if bridge else 'piano' if 8<=bar<16 else 'marimba')
    velocity=(.19 if stealth else .23)*lift*(1 if i%3 else 1.07)
    self.note('theme',at+offset,n,length,kind,velocity,-.08 if stealth else -.14)
    if stealth and (bar<8 or bar>=24):self.note('strings',at+offset+.018,pitch(n)-12,min(.55,length),'pizz',.10,.25)
    if not stealth and bar>=24:self.note('strings',at+offset+.022,pitch(n)-12,min(.6,length),'harp',.065,.28)
   # Organic bass foundation, with controlled synthesized reinforcement below it.
   bassOffsets=[0,.75,1.75,2.5,3.25] if stealth else [0,2.25]
   for j,offset in enumerate(bassOffsets):
    n=chord[0]+(7 if j==3 and stealth else 0)
    self.note('bass',at+offset,n,.36 if stealth else 1.3,'cello',.12 if stealth else .13)
    if j in [0,2]:self.note('bass',at+offset,n-12,.3 if stealth else 1.0,'bass',.075 if stealth else .045)
   if stealth:
    # Syncopated pizzicato punctuation, not a continuous generic synth arpeggio.
    for j,offset in enumerate([.5,1.5,2.75] if not bridge else [.75,2.75]):self.note('strings',at+offset,chord[1+j%3],.24,'pizz',.10 if not bridge else .075,(-1 if j%2 else 1)*.3)
   else:
    for j,offset in enumerate([.75,2.5] if bar%2 else [1.5,3.25]):self.note('strings',at+offset,chord[1+j],.45,'harp',.075,(-1 if j else 1)*.28)
   # Less percussion in the middle section; phrase-ending fills are small and tactile.
   if not bridge or stealth:
    for j,offset in enumerate([.5,1,1.5,2,2.5,3,3.5] if stealth else [.5,1.5,2.5,3.5]):self.hit(at+offset,'hat',.013 if stealth else .007,j)
    for offset in [1,3]:self.hit(at+offset+.012,'rim',.055 if stealth else .026,bar)
    if stealth:
     for offset in ([0,2.75] if bar%2 else [0,1.75,3.25]):self.hit(at+offset,'kick',.10)
     if bar%8==7:self.hit(at+3.5,'metal',.025)
   # A restrained two-note digital answer ties the organic score to the technology theme.
   if bar%4==3:
    for j,offset in enumerate([2.75,3.5]):self.note('signals',at+offset,chord[2+j]+12,.18,'signal',.035 if stealth else .023,(-1 if j else 1)*.4)
  self.events.extend(self.percussionEvents);return self
 def render(self):
  dry=np.zeros((self.frames,2),np.float64);send=np.zeros_like(dry)
  stemReport={}
  for name,raw in self.stems.items():
   a=raw.astype(np.float64);stemReport[name]={'rms':float(np.sqrt(np.mean(a*a))),'peak':float(np.max(np.abs(a)))}
   if name=='theme':a+=np.roll(a[:,::-1],round(.75*self.beat*SR),axis=0)*(.11 if self.mode=='infiltration' else .085)
   if name=='signals':a+=np.roll(a[:,::-1],round(1.5*self.beat*SR),axis=0)*.15
   dry+=a;send+=a*({'theme':.16,'piano':.13,'strings':.18,'pad':.35,'signals':.16}.get(name,.015))
  # Circular convolution settles room reflections and tails across the exact loop period.
  ir=np.zeros((self.frames,2));n=int(1.15*SR);t=np.arange(n)/SR
  for c in [0,1]:
   noise=signal.sosfilt(signal.butter(2,4300,fs=SR,output='sos'),RNG.normal(size=n));noise*=np.exp(-t*6.8)*np.minimum(1,t/.04);noise[:700]=0;noise/=np.sqrt(np.sum(noise*noise));ir[:n,c]=noise*.35
   for delay,level in [(.021,.24),(.038,.14),(.063,.085)]:ir[round((delay+c*.002)*SR),c]+=level
  wet=np.fft.irfft(np.fft.rfft(send,axis=0)*np.fft.rfft(ir,axis=0),n=self.frames,axis=0);mix=dry+wet*.52
  f=np.fft.rfftfreq(self.frames,1/SR);eq=(f*f/(f*f+35**2))/np.sqrt(1+(f/11000)**6);mix=np.fft.irfft(np.fft.rfft(mix,axis=0)*eq[:,None],n=self.frames,axis=0)
  rms=np.sqrt(ndimage.uniform_filter1d(np.mean(mix*mix,axis=1),size=round(.08*SR),mode='wrap')+1e-12);mix*=np.minimum(1,(.24/np.maximum(rms,.0001))**.22)[:,None]
  mix=np.tanh(mix*.65)/.65;meter=pyln.Meter(SR);mix*=10**((-20-meter.integrated_loudness(mix))/20)
  truepeak=np.max(np.abs(signal.resample_poly(mix,4,1,axis=0)));ceiling=10**(-3/20)
  if truepeak>ceiling:mix*=ceiling/truepeak
  wav=OUT/(self.mode+'-master.wav');wavfile.write(wav,SR,mix.astype(np.float32))
  # Web files are sample-exact lossless stereo; 32 kHz retains a 16 kHz band on mobile.
  web=signal.resample_poly(np.concatenate([mix[-96:],mix,mix[:96]]),2,3,axis=0)[64:-64];pcm=np.int16(np.clip(web+(RNG.random(web.shape)-RNG.random(web.shape))/65536,-1,1)*32767)
  webwav=PUBLIC/(self.mode+'.wav');wavfile.write(webwav,32000,np.concatenate([pcm[-32000:],pcm,pcm[:32000]]));ff=imageio_ffmpeg.get_ffmpeg_exe()
  subprocess.run([ff,'-v','error','-y','-i',str(webwav),'-c:a','flac',str(PUBLIC/(self.mode+'.flac'))],check=True)
  subprocess.run([ff,'-v','error','-y','-i',str(wav),'-c:a','aac','-b:a','160k',str(PUBLIC/(self.mode+'.m4a'))],check=True)
  delta=np.abs(np.diff(web,axis=0));seam=np.abs(web[0]-web[-1]);p999=np.percentile(delta,99.9,axis=0)
  report={'title':self.info['title'],'mode':self.mode,'status':'fully-arranged candidate; not human-listening approved','bpm':self.info['bpm'],'key':self.info['key'],'bars':32,'seconds':len(web)/32000,'frames':len(web)+64000,'loopFrames':len(web),'encodedSeconds':len(web)/32000+2,'loopStart':1,'loopEnd':len(web)/32000+1,'sampleRate':32000,'channels':2,'lufs':float(meter.integrated_loudness(mix)),'truePeakDbTP':float(20*np.log10(np.max(np.abs(signal.resample_poly(web,4,1,axis=0))))),'dc':web.mean(axis=0).tolist(),'seamDelta':seam.tolist(),'normalDelta99_9':p999.tolist(),'rms':float(np.sqrt(np.mean(web*web))),'flacBytes':(PUBLIC/(self.mode+'.flac')).stat().st_size,'sha256Wav':hashlib.sha256(webwav.read_bytes()).hexdigest(),'stems':stemReport}
  assert 60<=report['seconds']<=120 and abs(report['lufs']+20)<1
  assert np.all(seam<np.maximum(.001,p999)),report
  (OUT/(self.mode+'-score.json')).write_text(json.dumps({'motif':MOTIF,'score':self.info,'events':self.events},indent=2));writeMidi(self,OUT/(self.mode+'.mid'))
  return report
def vlq(n):
 a=[n&127];n>>=7
 while n:a.insert(0,(n&127)|128);n>>=7
 return bytes(a)
def writeMidi(song,path):
 tracks=[];tempo=round(60000000/song.info['bpm']);tempoData=b'\x00\xff\x51\x03'+tempo.to_bytes(3,'big')+b'\x00\xff\x2f\x00';tracks.append(b'MTrk'+len(tempoData).to_bytes(4,'big')+tempoData)
 for index,name in enumerate(song.stems):
  channel=9 if name=='percussion' else index
  data=bytearray(b'\x00\xff\x03'+vlq(len(name))+name.encode());data+=bytes([0,0xc0+channel,{'theme':12,'piano':0,'strings':46,'bass':42,'pad':89,'percussion':115,'signals':10}[name]])
  events=[]
  for e in song.events:
   if e['stem']!=name:continue
   tick=round(e['beat']*480);events.extend([(tick,1,e['midi'],max(35,min(110,round(e['gain']*260)))),(tick+round(e['durationBeats']*480),0,e['midi'],0)])
  last=0
  for tick,on,n,v in sorted(events):data+=vlq(tick-last)+bytes([(0x90 if on else 0x80)+channel,n,v]);last=tick
  data+=vlq(max(0,128*480-last))+b'\xff\x2f\x00';tracks.append(b'MTrk'+len(data).to_bytes(4,'big')+data)
 path.write_bytes(b'MThd'+struct.pack('>IHHH',6,1,len(tracks),480)+b''.join(tracks))
if __name__=='__main__':
 for manifest in [ROOT/'music/candidates/v1/sources.json',Path(__file__).parent/'sources.json']:
  for item in json.loads(manifest.read_text())['files']:assert hashlib.sha256((b.SAMPLES/item['local']).read_bytes()).hexdigest()==item['sha256'],item['local']
 reports=[]
 for mode in ['hq','infiltration']:
  song=Composition(mode).compose();report=song.render();reports.append(report);print(json.dumps(report,indent=2),flush=True);del song;gc.collect()
 (OUT/'measurements.json').write_text(json.dumps(reports,indent=2));(Path(__file__).parent/'measurements.json').write_text(json.dumps(reports,indent=2))
