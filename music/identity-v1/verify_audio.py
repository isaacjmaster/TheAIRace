"""Check shipped PCM/guard integrity without needing samples or audio hardware."""
from pathlib import Path
import json,hashlib
import numpy as np
from scipy.io import wavfile
ROOT=Path(__file__).resolve().parents[2]
for report in json.loads(Path(__file__).with_name('measurements.json').read_text()):
 name=report['mode'];path=ROOT/'public/audio/identity-v1'/f'{name}.wav'
 sr,pcm=wavfile.read(path);guard=sr;loop=pcm[guard:-guard]
 assert sr==32000 and pcm.shape==(report['frames'],2) and pcm.dtype==np.int16
 assert hashlib.sha256(path.read_bytes()).hexdigest()==report['sha256Wav']
 assert len(loop)==report['loopFrames'] and len(loop)/sr==report['seconds']
 assert np.array_equal(pcm[:guard],loop[-guard:]) and np.array_equal(pcm[-guard:],loop[:guard])
 a=loop.astype(float)/32768
 assert np.max(np.abs(a))<.71 and np.max(np.abs(a.mean(axis=0)))<.0001
 assert np.max(np.abs(a[0]-a[-1]))<.001
 # Mono fold-down retains useful melodic/bass energy rather than cancelling stereo.
 assert np.sqrt(np.mean(a.mean(axis=1)**2))>.7*np.sqrt(np.mean(a*a))
 assert abs(report['lufs']+20)<.1 and report['truePeakDbTP']<=-3
 print(f"{name}: {len(loop)/sr:g}s; exact guards; seamless PCM join; controlled peak/DC; mono compatible")
