"""Original deterministic density-field cloud banks. Offline bake: no runtime noise/filter cost."""
from pathlib import Path
import numpy as np
from PIL import Image
OUT=Path(__file__).resolve().parents[1]/'public/textures/intro'
OUT.mkdir(parents=True,exist_ok=True)
W,H=1024,1536
x,y=np.meshgrid(np.linspace(0,1,W,dtype=np.float32),np.linspace(-.15,1.15,H,dtype=np.float32))
def smooth(a):
 a=np.clip(a,0,1);return a*a*(3-2*a)
def noise(x,y,scale,seed):
 rng=np.random.default_rng(seed);grid=rng.random((int(scale*2)+8,int(scale*2)+8),dtype=np.float32)
 xx=x*scale+2;yy=(y+.2)*scale+2;ix=np.floor(xx).astype(int);iy=np.floor(yy).astype(int);fx=smooth(xx-ix);fy=smooth(yy-iy)
 return (grid[iy,ix]*(1-fx)+grid[iy,ix+1]*fx)*(1-fy)+(grid[iy+1,ix]*(1-fx)+grid[iy+1,ix+1]*fx)*fy
for variant,seed in [('mist-v1',9142)]:
 rng=np.random.default_rng(seed);density=np.zeros_like(x)
 # Irregular overlapping banks, not outlined circles. Their gradients provide soft volume lighting.
 for row in np.linspace(-.12,1.15,13):
  for col in [.08,.38,.65]:
   cx=col+rng.uniform(-.09,.09);cy=row+rng.uniform(-.055,.055)
   sx=rng.uniform(.15,.25);sy=rng.uniform(.065,.13)
   density+=rng.uniform(.65,1.25)*np.exp(-2*((x-cx)**2/sx**2+(y-cy)**2/sy**2))
 n=sum(noise(x,y,scale,seed+i)*weight for i,(scale,weight) in enumerate([(3,.5),(7,.25),(15,.14),(31,.07),(61,.04)]))
 density=density*(.78+.6*n)+.24*(n-.42)
 alpha=smooth((density-.025)/.38)
 # A very light wispy fringe and fully covered inner bank create a concealed starting frame.
 alpha=np.maximum(alpha,smooth((.69+.07*np.sin(y*16)+.11*(n-.5)-x)/.22)*.98)
 gy,gx=np.gradient(density,1/H,1/W);normal=np.sqrt(1+(.016*gx)**2+(.016*gy)**2)
 light=np.clip((.68-.014*gx-.02*gy)/normal,.18,.98)
 shade=np.clip(.52*light+.32*n+.16*np.clip(density,0,1),0,1)
 shadow=np.array([141,177,184]);highlight=np.array([250,247,229]);rgb=shadow[None,None,:]+(highlight-shadow)[None,None,:]*shade[:,:,None]
 rgba=np.dstack([rgb,np.clip(alpha,0,1)*255]).astype(np.uint8)
 im=Image.fromarray(rgba);im.save(OUT/f'cloud-{variant}.webp',quality=90,method=6)
 print(OUT/f'cloud-{variant}.webp',(OUT/f'cloud-{variant}.webp').stat().st_size)
