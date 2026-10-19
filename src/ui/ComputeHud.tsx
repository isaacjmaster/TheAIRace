import {ComputeIcon} from './ComputeIcon';
/** Original energy-chip emblem and capacity meter; reads the existing resource balance only. */
export function ComputeHud({compute,capacity}:{compute:number;capacity:number}){
 const fill=capacity>0?Math.max(0,Math.min(100,compute/capacity*100)):0;
 return <section className="compute-hud" aria-label={`${compute} of ${capacity} Compute`}>
 <div className="compute-hud-caption"><span>COMPUTE</span><small>Max: {capacity.toLocaleString()}</small></div>
 <div className="compute-meter" role="progressbar" aria-label="Compute storage" aria-valuemin={0} aria-valuemax={capacity} aria-valuenow={compute} aria-valuetext={`${compute.toLocaleString()} / ${capacity.toLocaleString()} Compute`}>
 <div className="compute-energy" style={{width:`${fill}%`}}/><strong>{compute.toLocaleString()}</strong></div>
 <ComputeIcon/></section>;
}
