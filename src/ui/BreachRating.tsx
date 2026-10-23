import {breachRating} from '../../shared/breach-rating';
import type {Operation} from '../../shared/infiltration';
export function BreachRating({operation,compact=false}:{operation:Operation;compact?:boolean}){
 const rating=breachRating(operation),labels=['HQ compromised','50% destruction','100% destruction'];
 return <div className={`breach-rating ${compact?'compact':''}`} aria-label={`System Breach Rating: ${rating.count} of 3`}>
 {rating.tokens.map((earned,i)=><div key={`${i}-${earned}`} className={earned?'earned':''} title={labels[i]} aria-label={`${labels[i]}: ${earned?'earned':'not earned'}`}><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 3 43 14v20L24 45 5 34V14Z"/><path className="breach-core" d="m24 11 12 7v12l-12 7-12-7V18Z"/><path className="breach-circuit" d="M24 3v8M5 14l7 4m31-4-7 4M24 37v8M12 30l-7 4m31-4 7 4m-20-8 4 4 8-10"/></svg>{!compact&&<small>{labels[i]}</small>}</div>)}
 </div>;
}
