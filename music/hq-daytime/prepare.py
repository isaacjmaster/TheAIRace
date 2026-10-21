"""Repeat-aligned edit of the current approved HQ recording, preserving its identity.
Source remains byte-identical in music/supplied-v2/source/hq.mp3. No new composition.
"""
from pathlib import Path
import sys,json,hashlib,subprocess
import numpy as np
from scipy.io import wavfile
from scipy import signal
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'data/music-tools'))
import imageio_ffmpeg,pyloudnorm
FF=imageio_ffmpeg.get_ffmpeg_exe();SR=32000
OUT=ROOT/'public/audio/hq-daytime';OUT.mkdir(parents=True,exist_ok=True)
CACHE=ROOT/'data/hq-daytime';CACHE.mkdir(exist_ok=True)
SOURCE=ROOT/'music/supplied-v2/source/hq.mp3'
decoded=CACHE/'source.wav'
subprocess.run([FF,'-v','error','-y','-i',str(SOURCE),'-ar',str(SR),'-ac','2','-c:a','pcm_f32le',str(decoded)],check=True)
_,source=wavfile.read(decoded);source=source.astype(float)
# Repetition search: strongest full-record waveform lag ~57.0175 s. Within that
# period, the 17.9/74.9175 s passages correlate at .875 over a 600ms join window.
start=round(17.9*SR);n=round(57.0175*SR);fade=round(.6*SR)
head=source[start:start+fade];tail=source[start+n:start+n+fade]
corr=float(np.sum(head*tail)/np.sqrt(np.sum(head*head)*np.sum(tail*tail)))
music=source[start:start+n].copy();u=np.linspace(0,1,fade)[:,None]
# Use correlated linear rather than equal-power blending to avoid a +3dB swell.
tail*=np.sqrt(np.mean(head*head)/max(1e-12,np.mean(tail*tail)))
music[:fade]=tail*(1-u)+head*u
meter=pyloudnorm.Meter(SR);music*=10**((-22-meter.integrated_loudness(music))/20)
# Finish a tiny residual waveform edge over 4ms, retaining continuous nonzero audio.
music[-128:]+=np.linspace(0,1,128)[:,None]*(music[0]-music[-1])
peak=np.max(np.abs(signal.resample_poly(music,4,1,axis=0)))
if peak>.8:music*=.8/peak
pcm=np.round(music*32767).astype(np.int16);guard=np.concatenate([pcm[-SR:],pcm,pcm[:SR]])
wav=OUT/'hq.wav';wavfile.write(wav,SR,guard);plain=CACHE/'hq-loop.wav';wavfile.write(plain,SR,pcm)
for ext,args in [('flac',['-c:a','flac']),('m4a',['-c:a','aac','-b:a','160k','-movflags','+faststart'])]:
 subprocess.run([FF,'-v','error','-y','-i',str(wav),*args,str(OUT/f'hq.{ext}')],check=True)
preview=ROOT/'output/HQ_Daytime_Review';preview.mkdir(parents=True,exist_ok=True)
wavfile.write(preview/'HQ_Three_Loops.wav',SR,np.tile(np.round(music*.6*32767).astype(np.int16),(3,1)))
subprocess.run([FF,'-v','error','-y','-i',str(preview/'HQ_Three_Loops.wav'),'-c:a','libmp3lame','-b:a','192k',str(preview/'HQ_Three_Loops.mp3')],check=True)
stats={'sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'startSeconds':17.9,'endSeconds':17.9+n/SR,'seconds':n/SR,'crossfadeSeconds':.6,'joinCorrelation':corr,'lufs':float(meter.integrated_loudness(music)),'mixerScale':.6,'truePeakDbTP':float(20*np.log10(np.max(np.abs(signal.resample_poly(music,4,1,axis=0))))),'seamDelta':np.abs(music[0]-music[-1]).tolist(),'previewTransitionsSeconds':[n/SR,2*n/SR],'exports':{p.name:{'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size} for p in OUT.glob('hq.*')}}
assert stats['truePeakDbTP']<-1 and max(stats['seamDelta'])<1e-7 and corr>.7
# Inspect all repeat joins for short-window energy jumps and zero samples.
looped=np.tile(music,(3,1));joins=[]
for at in [n,2*n]:
 before=looped[at-3200:at];after=looped[at:at+3200]
 db=float(10*np.log10(np.mean(after*after)/np.mean(before*before)))
 assert abs(db)<4 and np.sqrt(np.mean(looped[at-320:at+320]**2))>.0001
 joins.append({'sample':at,'rmsChangeDb':db})
stats['joins']=joins
track={'seconds':n/SR,'encodedSeconds':len(guard)/SR,'loopStart':1,'loopEnd':1+n/SR,'sampleRate':SR,'frames':len(guard),'sha256Wav':hashlib.sha256(wav.read_bytes()).hexdigest(),'flac':'/audio/hq-daytime/hq.flac','wav':'/audio/hq-daytime/hq.wav','aac':'/audio/hq-daytime/hq.m4a','compressedBytes':(OUT/'hq.m4a').stat().st_size}
(Path(__file__).parent/'track.json').write_text(json.dumps(track,indent=2)+'\n')
(Path(__file__).parent/'measurements.json').write_text(json.dumps(stats,indent=2)+'\n');print(json.dumps(stats,indent=2))
