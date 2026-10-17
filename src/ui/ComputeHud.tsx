import {useId} from 'react';
/** Original energy-chip emblem and capacity meter; reads the existing resource balance only. */
export function ComputeHud({compute,capacity}:{compute:number;capacity:number}){
 const id=useId(),fill=capacity>0?Math.max(0,Math.min(100,compute/capacity*100)):0;
 return <section className="compute-hud" aria-label={`${compute} of ${capacity} Compute`}>
 <div className="compute-hud-caption"><span>COMPUTE</span><small>Max: {capacity.toLocaleString()}</small></div>
 <div className="compute-meter" role="progressbar" aria-label="Compute storage" aria-valuemin={0} aria-valuemax={capacity} aria-valuenow={compute} aria-valuetext={`${compute.toLocaleString()} / ${capacity.toLocaleString()} Compute`}>
 <div className="compute-energy" style={{width:`${fill}%`}}/><strong>{compute.toLocaleString()}</strong></div>
 <svg className="compute-chip" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id={`${id}-shell`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e8ffff"/><stop offset=".45" stopColor="#78e8ff"/><stop offset="1" stopColor="#1b83d9"/></linearGradient><linearGradient id={`${id}-core`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#1b75c6"/><stop offset="1" stopColor="#143956"/></linearGradient></defs>
 <path d="M18 4v8m10-8v8m10-8v8m10-8v8M18 52v8m10-8v8m10-8v8m10-8v8M4 18h8M4 28h8M4 38h8M4 48h8m40-30h8m-8 10h8m-8 10h8m-8 10h8" stroke="#245575" strokeWidth="5" strokeLinecap="round"/>
 <rect x="10" y="10" width="44" height="44" rx="11" fill={`url(#${id}-shell)`} stroke="#23526d" strokeWidth="2.5"/>
 <rect x="17" y="17" width="30" height="30" rx="7" fill={`url(#${id}-core)`} stroke="#d9ffff" strokeWidth="1.5"/>
 <path className="compute-bolt" d="m35 21-12 15h9l-3 10 13-16h-9Z" fill="#9cffff" stroke="#ebffff" strokeWidth="1" strokeLinejoin="round"/>
 <path d="M17 13h27" stroke="#fff" strokeOpacity=".8" strokeWidth="2" strokeLinecap="round"/>
 </svg></section>;
}
