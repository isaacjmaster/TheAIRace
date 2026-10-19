import type {CSSProperties} from 'react';
export const CLOUD_REVEAL_MS=6600;
const sources=[1,2,3].map(n=>`/textures/intro/stylized-mist-${n}.svg`);
const ready=typeof Image==='undefined'?Promise.resolve(false):Promise.all(sources.map(src=>new Promise<boolean>(resolve=>{const image=new Image();image.decoding='async';image.onload=()=>resolve(true);image.onerror=()=>resolve(false);image.src=src;}))).then(results=>results.every(Boolean));
export function cloudsAvailable(){return Promise.race([ready,new Promise<boolean>(resolve=>setTimeout(()=>resolve(false),400))]);}
// Independent curved trajectories; no mirrored banks, rectangular masks or moving split seam.
const patches=[
 [8,5,-48,-40,-11,1.1],[40,5,-12,-65,9,.95],[76,8,40,-50,14,1.05],
 [4,43,-70,-12,8,1.2],[42,40,-30,-47,-16,1],[80,43,62,5,13,1.15],
 [5,80,-50,42,-10,1.1],[43,86,7,60,12,1.05],[85,85,50,40,-8,1.2],
 [50,60,34,24,18,.85],
];
export function CloudCurtain({animating}:{animating:boolean}){
 return <section className={`company-opening ${animating?'is-revealing':''}`} style={{'--cloud-duration':`${CLOUD_REVEAL_MS}ms`} as CSSProperties} aria-label="Discovering your company" role="status"><div className="cloud-field" aria-hidden="true">{patches.map(([x,y,dx,dy,turn,scale],i)=><img key={i} className={`intro-cloud mist-depth-${i%3}`} style={{left:`${x}%`,top:`${y}%`,'--dx':`${dx}vw`,'--dy':`${dy}vh`,'--turn':`${turn}deg`,'--size':scale,'--rest':`${(i%3-1)*9}deg`} as CSSProperties} src={sources[i%3]} alt="" draggable={false}/>)}</div></section>;
}
