import unittest,json,hashlib,sys
from pathlib import Path
import numpy as np
from scipy.io import wavfile
sys.path.insert(0,str(Path(__file__).parent))
import raid_render as r
class RaidRevisionTests(unittest.TestCase):
 def test_approved_hq_is_byte_identical(self):
  lock=json.loads((Path(__file__).parent/'approved-hq.json').read_text());folder=r.ROOT/'data/soundtrack-candidates/review'
  for name,digest in lock['files'].items():self.assertEqual(hashlib.sha256((folder/name).read_bytes()).hexdigest(),digest)
 def test_independent_melody_and_palette(self):
  old=[x[1] for x in r.base.HQ_LEAD[0]];new=[x[1] for x in r.LEAD[0]];self.assertNotEqual(np.diff(old).tolist(),np.diff(new).tolist());self.assertNotEqual(r.CHORDS,r.base.HQ_CHORDS)
  song=r.RaidSong().compose();self.assertEqual({x['instrument'] for x in song.notes},{'command','stab','sub','pulse','wire'});self.assertEqual(song.bpm,120);self.assertEqual(song.n/r.SR,32)
 def test_voice_and_drum_endpoints(self):
  for kind in ['command','pulse','sub','stab','wire']:
   a=r.voice(64,.3,kind);self.assertTrue(np.isfinite(a).all());self.assertLess(np.max(np.abs(a[0])),1e-8);self.assertLess(np.max(np.abs(a[-1])),1e-7)
  for kind in ['snare','tom','kick','hat']:
   a=r.percussion(kind);self.assertEqual(np.max(np.abs(a[0])),0);self.assertEqual(np.max(np.abs(a[-1])),0)
 def test_master_duration_loudness_and_boundary(self):
  report=json.loads((r.OUT/'measurements.json').read_text());sr,a=wavfile.read(r.OUT/'raid-candidate-v2.wav');self.assertEqual(sr,48000);self.assertEqual(a.shape,(1536000,2));self.assertAlmostEqual(report['integratedLUFS'],-18,delta=.2);self.assertLess(report['truePeakDbTP'],-1.5);self.assertLess(max(report['seamDelta']),.001);self.assertLess(max(report['dc']),.0001)
if __name__=='__main__':unittest.main()
