"""Offline subtractive/FM composition prototypes; no game runtime DSP or reference audio.
Prerequisites: numpy/scipy; data/music-tools/{pyloudnorm,imageio_ffmpeg}.
"""
from pathlib import Path
import sys,json,hashlib,subprocess,struct
import numpy as np
from scipy import signal
from scipy.io import wavfile
from score import BPM,KEY,TITLE,MELODY,CHORDS,FORM
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'data/music-tools'))
import pyloudnorm as pyln
import imageio_ffmpeg
SR=48000;BEAT=60/BPM
OUT=ROOT/'data/hq-identity-v2';OUT.mkdir(parents=True,exist_ok=True)
PUBLIC=ROOT/'public/audio/hq-identity-v2';PUBLIC.mkdir(parents=True,exist_ok=True)
def pitch(n):return {'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}[n[0]]+('#' in n)+(int(n[-1])+1)*12
def pan(a,p=0):return np.column_stack((a*np.cos((p+1)*np.pi/4),a*np.sin((p+1)*np.pi/4)))
def filt(a,f,kind='lowpass',order=2):return signal.sosfilt(signal.butter(order,f,fs=SR,btype=kind,output='sos'),a,axis=0)
def envelope(t,hold,attack=.02,release=.18,decay=.35):
    return np.minimum(1,t/attack)*(.72+.28*np.exp(-t*decay))*np.clip((hold+release-t)/release,0,1)**2

def voice(note,beats,kind,velocity=1,variant=0):
    duration=beats*BEAT;release={'lead':.18,'keys':.32,'bass':.09,'pad':.65}[kind]
    t=np.arange(round((duration+release)*SR))/SR;f=440*2**((note-69)/12)
    if kind=='lead':
        # Rounded dual-oscillator analog voice, soft articulation and a closing filter.
        # Delayed vibrato / slow pitch drift are timbral motion, never generated melody.
        vibrato=np.clip((t-.16)/.2,0,1)*.0009*np.sin(2*np.pi*4.7*t)
        mono=np.zeros(len(t))
        for detune,weight in [(-2.5,.48),(2.5,.36)]:
            phase=2*np.pi*np.cumsum(f*2**(detune/1200)*(1+vibrato+.0005*np.sin(2*np.pi*.8*t)))/SR
            for h in range(1,min(16,int(SR/(2*f)))):
                mono+=weight*np.sin(h*phase)/h**1.7
        mono+=.22*np.sin(2*np.pi*f*t)
        dull=filt(mono,1250);bright=filt(mono,2800)
        openness=.18+.62*np.exp(-t*5)
        mono=dull*(1-openness)+bright*openness
        mono=np.tanh(mono*1.05)*envelope(t,duration,.023,release,.8)
        return pan(mono*velocity,-.04)
    if kind=='keys':
        # Rhodes-inspired soft tine/body model; low modulation avoids a metallic bell lead.
        index=.38*np.exp(-t*4.5)
        mono=np.sin(2*np.pi*f*t+index*np.sin(2*np.pi*f*t))
        mono+=.24*np.sin(2*np.pi*f*2.003*t)*np.exp(-t*2.3)+.055*np.sin(2*np.pi*f*3*t)*np.exp(-t*6)
        mono=filt(mono,2100)*envelope(t,duration,.012,release,1.6)*np.exp(-t*.62)
        a=pan(np.tanh(mono*.9)*velocity,(variant%3-1)*.14)
        a[:,0]*=1+.045*np.sin(2*np.pi*4.2*t);a[:,1]*=1-.045*np.sin(2*np.pi*4.2*t)
        return a
    if kind=='bass':
        mono=.72*np.sin(2*np.pi*f*t)+.22*np.sin(2*np.pi*f*2*t)+.08*np.sin(2*np.pi*f*3*t)
        mono=filt(np.tanh(mono*1.1),600)*envelope(t,duration,.012,release,.55)
        return pan(mono*velocity)
    mono=sum(np.sin(2*np.pi*f*2**(c/1200)*t)*w for c,w in [(-4,.25),(0,.4),(4,.25)])
    mono=filt(mono,1100)*envelope(t,duration,.18,release,.2)
    return pan(mono*velocity,(variant%3-1)*.3)

def drum(kind,index):
    rng=np.random.default_rng(10800+index);length={'kick':.3,'snare':.19,'hat':.07}[kind]
    t=np.arange(round(length*SR))/SR
    if kind=='kick':
        phase=2*np.pi*np.cumsum(53+50*np.exp(-t*42))/SR
        mono=np.sin(phase)*np.exp(-t*17)+.035*rng.normal(size=len(t))*np.exp(-t*180)
    elif kind=='snare':
        mono=filt(rng.normal(size=len(t)),[850,4300],'bandpass')*.38*np.exp(-t*28)
        mono+=.23*np.sin(2*np.pi*185*t)*np.exp(-t*32)
    else:mono=filt(rng.normal(size=len(t)),[3800,6900],'bandpass')*.22*np.exp(-t*70)
    mono*=np.minimum(1,t/.003)*np.minimum(1,(length-t)/.012)
    return pan(mono,0 if kind!='hat' else (.18 if index%2 else -.18))

class Study:
    def __init__(self,name,bars,groove):
        self.name,self.bars,self.groove=name,bars,groove;# Nearest 10 ms gives integer loop frames at 32/44.1/48 kHz, avoiding resampler drift.
        self.frames=round(bars*4*BEAT*100)*(SR//100)
        self.events=[];self.stems={k:np.zeros((self.frames,2),np.float32) for k in ['lead','keys','bass','pad','drums']}
    def add(self,stem,beat,a,gain):
        start=round(beat*BEAT*SR)%self.frames;n=min(len(a),self.frames);head=min(n,self.frames-start)
        self.stems[stem][start:start+head]+=a[:head]*gain
        if head<n:self.stems[stem][:n-head]+=a[head:n]*gain
    def note(self,stem,beat,n,d,gain,variant=0):
        midi=pitch(n);self.events.append({'stem':stem,'beat':beat,'midi':midi,'length':d,'gain':gain})
        self.add(stem,beat,voice(midi,d,stem,variant=variant),gain)
    def hit(self,beat,kind,gain):
        self.events.append({'stem':'drums','beat':beat,'midi':{'kick':36,'snare':38,'hat':42}[kind],'length':.15,'gain':gain})
        self.add('drums',beat,drum(kind,len(self.events)),gain)
    def compose(self):
        for bar in range(self.bars):
            at=bar*4
            for i,(on,n,d) in enumerate(MELODY[bar]):
                # Downbeat accents, softer pickups, and deliberately shortened answers.
                gain=.19*([1.04,.88,.98,.94,.88,.8][i%6])*(.94 if bar in [3,7,15] else 1)
                self.note('lead',at+on,n,d,gain)
            if not self.groove:continue
            chord,root,notes=CHORDS[bar]
            # Compact chord gestures, not a perpetual arpeggio. Leave room at phrase ends.
            for j,n in enumerate(notes):
                self.note('keys',at+.03+j*.012,n,1.25,.025 if bar<2 else .038,j)
                if bar>=2 and bar%4!=3:self.note('keys',at+2.5+j*.009,n,.65,.022,j+1)
            if bar in [2,3,6,8,9,10,12,13,20,21,24,25,26,28]:
                for j,n in enumerate(notes[1:3]):self.note('pad',at+.1,n,3.1,.008,j)
            # Root/fifth movement with a few authored approach tones; comfortably syncopated.
            if bar<2:continue
            self.note('bass',at,root,1.12,.075 if 16<=bar<20 else .105)
            fifth={'D2':'A2','A2':'E3','G2':'D3','F#2':'C#3','E2':'B2'}[root]
            self.note('bass',at+2.25,fifth if bar%2==0 else root,.62,.075)
            if bar in [3,7,11,15,19,23,27,31]:self.note('bass',at+3.5,'C#3' if bar!=15 else 'A2',.28,.055)
            if 16<=bar<18:continue
            self.hit(at,'kick',.10 if bar in [30,31] else .14)
            if bar%2==0 and bar!=30:self.hit(at+2.25,'kick',.07)
            for onset in ([1,3] if bar%4!=3 else [1]):self.hit(at+onset+.015,'snare',.075)
            for onset in ([] if 16<=bar<20 or bar==31 else [.58,2.58,3.58] if bar%2==0 else [1.58,3.08]):self.hit(at+onset,'hat',.035)
        return self
    def render(self):
        mix=sum(self.stems.values()).astype(np.float64)
        # Short circular room/delay tails; no wash or fade masking a weak loop join.
        lead=self.stems['lead'];mix+=np.roll(lead,round(.75*BEAT*SR),axis=0)*.065
        send=lead*.10+self.stems['keys']*.12+self.stems['pad']*.18
        for delay,gain in [(.031,.22),(.053,.16),(.079,.11),(.117,.07),(.171,.035)]:
            reflection=filt(np.roll(send[:,::-1],round(delay*SR),axis=0),2800)
            mix+=reflection*gain
        # Periodic high-pass processing avoids filter-start discontinuities.
        tripled=np.tile(mix,(3,1));tripled=filt(tripled,32,'highpass');mix=tripled[self.frames:2*self.frames]
        meter=pyln.Meter(SR);mix*=10**((-21-meter.integrated_loudness(mix))/20)
        true_peak=np.max(np.abs(signal.resample_poly(mix,4,1,axis=0)))
        if true_peak>.85:mix*=.85/true_peak
        wavfile.write(OUT/(self.name+'-master.wav'),SR,mix.astype(np.float32))
        web=signal.resample_poly(np.tile(mix,(3,1)),2,3,axis=0)
        n=round(self.frames*2/3);web=web[n:2*n]
        pcm=np.clip(np.round(web*32767),-32768,32767).astype(np.int16)
        guarded=np.concatenate([pcm[-32000:],pcm,pcm[:32000]])
        guard_wav=OUT/(self.name+'-guarded.wav');wavfile.write(guard_wav,32000,guarded)
        plain_wav=OUT/(self.name+'.wav');wavfile.write(plain_wav,32000,pcm)
        ff=imageio_ffmpeg.get_ffmpeg_exe()
        subprocess.run([ff,'-v','error','-y','-i',str(guard_wav),'-c:a','flac',str(PUBLIC/(self.name+'.flac'))],check=True)
        subprocess.run([ff,'-v','error','-y','-i',str(plain_wav),'-c:a','aac','-b:a','160k',str(PUBLIC/(self.name+'.m4a'))],check=True)
        seam=np.abs(web[0]-web[-1]);delta=np.quantile(np.abs(np.diff(web,axis=0)),.999,axis=0)
        report={'name':self.name,'status':'full original score; owner requested direct release; musical quality not independently auditioned','bpm':BPM,'key':KEY,'bars':self.bars,'seconds':n/32000,'loopStart':1,'loopEnd':1+n/32000,'encodedSeconds':2+n/32000,'sampleRate':32000,'frames':n,'lufs':float(meter.integrated_loudness(web)),'truePeakDbTP':float(20*np.log10(np.max(np.abs(signal.resample_poly(web,4,1,axis=0))))),'seamDelta':seam.tolist(),'normalDelta99_9':delta.tolist(),'rms':float(np.sqrt(np.mean(web*web))),'sha256Pcm':hashlib.sha256(pcm.tobytes()).hexdigest(),'sha256Wav':hashlib.sha256(guard_wav.read_bytes()).hexdigest(),'flacBytes':(PUBLIC/(self.name+'.flac')).stat().st_size,'aacBytes':(PUBLIC/(self.name+'.m4a')).stat().st_size}
        assert np.isfinite(web).all() and report['truePeakDbTP']<-1
        assert np.all(seam<np.maximum(.001,delta)),report
        if self.name=='hq':
            (PUBLIC/'hq.wav').write_bytes(guard_wav.read_bytes())
        # Exact copied decoder guards and identical repeated PCM periods.
        assert np.array_equal(guarded[32000:32000+n],pcm)
        assert np.array_equal(guarded[:32000],pcm[-32000:])
        assert np.array_equal(guarded[-32000:],pcm[:32000])
        (Path(__file__).parent/(self.name+'-score.json')).write_text(json.dumps({'title':TITLE,'bpm':BPM,'key':KEY,'bars':self.bars,'form':FORM,'events':self.events},indent=2)+'\n')
        midi(self,Path(__file__).parent/(self.name+'.mid'))
        return report

def vlq(n):
    a=[n&127];n>>=7
    while n:a.insert(0,(n&127)|128);n>>=7
    return bytes(a)
def midi(song,path):
    tracks=[];tempo=round(60000000/BPM)
    tempo_data=b'\x00\xff\x51\x03'+tempo.to_bytes(3,'big')+b'\x00\xff\x2f\x00'
    tracks.append(b'MTrk'+len(tempo_data).to_bytes(4,'big')+tempo_data)
    for i,(name,program) in enumerate([('lead',80),('keys',4),('bass',38),('pad',89),('drums',0)]):
        ch=9 if name=='drums' else i
        data=bytearray(b'\x00\xff\x03'+vlq(len(name))+name.encode()+bytes([0,0xc0+ch,program]));events=[]
        for e in song.events:
            if e['stem']==name:
                t=round(e['beat']*480);v=max(30,min(110,round(e['gain']*350)))
                events.extend([(t,1,e['midi'],v),(t+round(e['length']*480),0,e['midi'],0)])
        last=0
        for tick,on,n,v in sorted(events):data+=vlq(tick-last)+bytes([(0x90 if on else 0x80)+ch,n,v]);last=tick
        data+=vlq(max(0,song.bars*4*480-last))+b'\xff\x2f\x00';tracks.append(b'MTrk'+len(data).to_bytes(4,'big')+data)
    path.write_bytes(b'MThd'+struct.pack('>IHHH',6,1,len(tracks),480)+b''.join(tracks))
if __name__=='__main__':
    reports=[Study('hq',32,True).compose().render()]
    (Path(__file__).parent/'measurements.json').write_text(json.dumps(reports,indent=2)+'\n')
    print(json.dumps(reports,indent=2))
