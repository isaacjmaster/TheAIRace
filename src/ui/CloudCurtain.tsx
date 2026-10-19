import type {CSSProperties} from 'react';
export const CLOUD_REVEAL_MS=5600;
const sources=['/textures/intro/cloud-bank-v1.webp','/textures/intro/cloud-mist-v1.webp'];
// Preload during the menu, rather than delaying the first-company scene for art downloads.
const ready=typeof Image==='undefined'?Promise.resolve(false):Promise.all(sources.map(src=>new Promise<boolean>(resolve=>{const image=new Image();image.decoding='async';image.onload=()=>resolve(true);image.onerror=()=>resolve(false);image.src=src;}))).then(results=>results.every(Boolean));
export function cloudsAvailable(){return Promise.race([ready,new Promise<boolean>(resolve=>setTimeout(()=>resolve(false),400))]);}
export function CloudCurtain({animating}:{animating:boolean}){
 return <section className={`company-opening ${animating?'is-revealing':''}`} style={{'--cloud-duration':`${CLOUD_REVEAL_MS}ms`} as CSSProperties} aria-label="Discovering your company" role="status"><div className="cloud-curtain" aria-hidden="true">{['rear','front','wisp'].flatMap((depth,i)=>['left','right'].map((side,j)=><img key={depth+side} className={`intro-cloud cloud-${depth} cloud-${side}`} src={sources[i===2?1:0]} alt="" draggable={false}/>))}</div></section>;
}
