"""Original sample-free 32-second electronic heist loop. No paid API or borrowed recording."""
import math, wave, array
from pathlib import Path
RATE=24000
SECONDS=32
N=RATE*SECONDS
mix=array.array('f',[0])*N
def note(midi,start,duration,level,voice='glass'):
 f=440*2**((midi-69)/12)
 for i in range(int(duration*RATE)):
  t=i/RATE
  attack=min(1,t/.016); release=min(1,(duration-t)/.07)
  env=attack*release*math.exp(-t*(5 if voice=='glass' else 2))
  phase=math.tau*f*t
  if voice=='bass': value=math.sin(phase)+.16*math.sin(phase*2)
  elif voice=='pulse':value=math.sin(phase+.45*math.sin(phase*2))+.12*math.sin(phase*3)
  else:value=math.sin(phase+1.2*math.sin(phase*2)*math.exp(-t*8))
  mix[(int(start*RATE)+i)%N]+=value*env*level
# Half-time minor electronic ostinato: deliberately sparse, exploratory, not a combat march.
roots=[45,45,41,43,45,48,41,40]
motif=[76,None,72,75,None,69,72,None,76,79,None,75,72,None,71,None]
for beat in range(64):
 start=beat*.5;root=roots[beat//8]
 if beat%2==0:note(root,start,.38,.12,'bass')
 if beat%8 in [0,3,6]:note(root+19,start+.25,.22,.045,'pulse')
 m=motif[beat%16]
 if m is not None:note(m+(0 if beat<32 else -12),start+.125,.38,.055,'glass')
 if beat%8==0:
  for pitch in [root+12,root+15,root+19]:note(pitch,start,1.4,.018,'pulse')
 # Rounded low electronic tick; no samples or hard sample boundaries.
 if beat%4 in [0,2]:note(35,start,.1,.065,'bass')
 if beat%2==1:note(94,start+.25,.06,.012,'glass')
peak=max(abs(x) for x in mix)
output=Path('public/audio/infiltration-heist-v1.wav');output.parent.mkdir(parents=True,exist_ok=True)
pcm=array.array('h',(round(max(-1,min(1,x))*26000) for x in mix))
with wave.open(str(output),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(RATE);w.writeframes(pcm.tobytes())
print('Original loop:',SECONDS,'seconds; peak',round(peak,3),'seam delta',abs(pcm[0]-pcm[-1])/32768)
