"""Package owner-supplied recordings without composing or replacing their music.
Usage: python music/supplied-v1/prepare.py HQ.mp3 INFILTRATION.mp3
Original bytes are retained for rollback/provenance. No network or database access.
"""
from pathlib import Path
import sys,json,hashlib,subprocess,shutil
import numpy as np
from scipy.io import wavfile
from scipy import signal
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'data/music-tools'))
import imageio_ffmpeg,pyloudnorm
FF=imageio_ffmpeg.get_ffmpeg_exe();SR=32000
HERE=Path(__file__).parent;OUT=ROOT/'public/audio/supplied-v1'
OUT.mkdir(parents=True,exist_ok=True);(HERE/'source').mkdir(exist_ok=True)
CACHE=ROOT/'data/supplied-v1';CACHE.mkdir(exist_ok=True)
reports={}
for mode,source in zip(['hq','infiltration'],sys.argv[1:]):
    original=Path(source);saved=HERE/'source'/f'{mode}.mp3';shutil.copyfile(original,saved)
    decoded=CACHE/f'{mode}-decoded.wav'
    subprocess.run([FF,'-v','error','-y','-i',str(saved),'-ar',str(SR),'-ac','2','-c:a','pcm_f32le',str(decoded)],check=True)
    rate,a=wavfile.read(decoded);a=a.astype(np.float64)
    # Remove only digital/near-silent end padding; keep musical introductions/tails.
    energy=np.convolve(np.max(np.abs(a),axis=1),np.ones(320)/320,mode='same')
    active=np.flatnonzero(energy>10**(-65/20))
    end=min(len(a),int(active[-1]) + round(.08*SR)+1) if len(active) else len(a)
    end=round(end/(SR/100))*int(SR/100);a=a[:end]
    # Short endpoint ramps prevent a click; these are full songs with their own
    # musical endings, not a newly composed seamless musical transition.
    fade=round(.06*SR);a[:fade]*=np.linspace(0,1,fade)[:,None];a[-fade:]*=np.linspace(1,0,fade)[:,None]
    target=-22 if mode=='hq' else -26
    meter=pyloudnorm.Meter(SR);a*=10**((target-meter.integrated_loudness(a))/20)
    peak=np.max(np.abs(signal.resample_poly(a,4,1,axis=0)))
    if peak>10**(-2/20):a*=10**(-2/20)/peak
    pcm=np.round(a*32767).astype(np.int16);n=len(pcm)
    guarded=np.concatenate([pcm[-SR:],pcm,pcm[:SR]])
    wav=OUT/f'{mode}.wav';wavfile.write(wav,SR,guarded)
    for ext,args in [('flac',['-c:a','flac']),('m4a',['-c:a','aac','-b:a','160k','-movflags','+faststart'])]:
        subprocess.run([FF,'-v','error','-y','-i',str(wav),*args,str(OUT/f'{mode}.{ext}')],check=True)
    reports[mode]={'seconds':n/SR,'encodedSeconds':len(guarded)/SR,'loopStart':1,'loopEnd':1+n/SR,'sampleRate':SR,'frames':len(guarded),'sha256Wav':hashlib.sha256(wav.read_bytes()).hexdigest(),'flac':f'/audio/supplied-v1/{mode}.flac','wav':f'/audio/supplied-v1/{mode}.wav','aac':f'/audio/supplied-v1/{mode}.m4a','compressedBytes':(OUT/f'{mode}.m4a').stat().st_size}
    stats={'sourceFilename':original.name,'sourceSha256':hashlib.sha256(saved.read_bytes()).hexdigest(),'sourceSeconds':len(wavfile.read(decoded)[1])/SR,'trimmedEndSeconds':(len(wavfile.read(decoded)[1])-n)/SR,'lufs':float(meter.integrated_loudness(a)),'truePeakDbTP':float(20*np.log10(np.max(np.abs(signal.resample_poly(a,4,1,axis=0))))),'exports':{p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in OUT.glob(mode+'.*')}}
    (HERE/f'{mode}-measurements.json').write_text(json.dumps(stats,indent=2)+'\n')
    assert np.isfinite(a).all() and stats['truePeakDbTP']<-1
    print(mode,json.dumps(reports[mode]),flush=True)
assert len(reports)==2
(HERE/'tracks.json').write_text(json.dumps(reports,indent=2)+'\n')
