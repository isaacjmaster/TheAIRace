import { ResearchIcon } from './ResearchIcon';
export function ResearchHud({ value, capacity }: {
    value: number;
    capacity: number;
}) { return <section className="compute-hud research-hud" aria-label={`${value} of ${capacity} Research`}><div className="compute-hud-caption"><span>RESEARCH</span><small>Max: {capacity.toLocaleString()}</small></div><div className="compute-meter" role="progressbar" aria-label="Research storage" aria-valuemin={0} aria-valuemax={capacity} aria-valuenow={value}><div className="compute-energy" style={{ width: `${Math.min(100, Math.max(0, value / capacity * 100))}%` }}/><strong>{value.toLocaleString()}</strong></div><ResearchIcon /></section>; }
