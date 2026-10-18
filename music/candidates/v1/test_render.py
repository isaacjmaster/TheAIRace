import unittest,json,sys
from pathlib import Path
import numpy as np
from scipy.io import wavfile
sys.path.insert(0,str(Path(__file__).parent))
import render
class CandidateTests(unittest.TestCase):
 def test_voice_envelopes_are_continuous(self):
  for kind in ['lead','battle','keys','pad','bass','arp']:
   a=render.synth(69,.4,kind);self.assertLess(np.max(np.abs(a[0])),1e-8,kind);self.assertLess(np.max(np.abs(a[-1])),1e-7,kind)
  for kind in ['kick','hat','rim','snare','metal']:
   a=render.drum(kind);self.assertEqual(float(np.max(np.abs(a[0]))),0,kind);self.assertEqual(float(np.max(np.abs(a[-1]))),0,kind)
 def test_finished_audio_meets_duration_loudness_and_seam_limits(self):
  reports=json.loads((render.OUT/'measurements.json').read_text())
  self.assertLess(abs(reports[0]['integratedLUFS']-reports[1]['integratedLUFS']),.2)
  for r in reports:
   sr,a=wavfile.read(render.OUT/(r['mode']+'-candidate-v1.wav'));self.assertEqual(sr,48000);self.assertEqual(a.shape,(r['frames'],2));self.assertTrue(20<=len(a)/sr<=40);self.assertLess(r['truePeakDbTP'],-1.5);self.assertLess(max(abs(x) for x in r['dc']),.0001)
   self.assertTrue(all(s<n for s,n in zip(r['seamDelta'],r['normalDelta99_9'])));self.assertGreater(np.std(a),100);self.assertLess(np.max(np.abs(a.astype(float))),32767)
 def test_shared_motif_distinct_harmony_and_arrangement(self):
  h=render.HQ_LEAD[0];r=render.RAID_LEAD[0];self.assertEqual([n[1] for n in h][1:],[n[1] for n in r[:6]][1:]);self.assertNotEqual([n[0] for n in h],[n[0] for n in r]);self.assertNotEqual(render.HQ_CHORDS,render.RAID_CHORDS);self.assertEqual(len(render.HQ_LEAD),16);self.assertEqual(len(render.RAID_LEAD),16)
if __name__=='__main__':unittest.main()
