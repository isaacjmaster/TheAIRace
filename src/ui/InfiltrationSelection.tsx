import { useState } from 'react';
import { INFILTRATION_TARGETS, type Tool } from '../../shared/infiltration';
export function InfiltrationSelection({ active, busy, now, cooldowns, onStart, onResume, onClose }: {
    active: boolean;
    busy: boolean;
    now: number;
    cooldowns: {
        targetId: string;
        eligibleAt: number;
    }[];
    onStart: (targetId: string, tool: Tool) => void;
    onResume: () => void;
    onClose: () => void;
}) { const [tool, setTool] = useState<Tool>('jammer'); return <><h2 id="foundation-dialog-title">Infiltration</h2><button className="dialog-close" aria-label="Close infiltration" onClick={onClose}>×</button>{active ? <button className="primary infiltration-resume" onClick={onResume}>Resume operation</button> : <><div className="loadout" role="group" aria-label="Choose one tool"><button aria-pressed={tool === 'probe'} onClick={() => setTool('probe')}>Probe<small>Reveal patrol routes · 12s</small></button><button aria-pressed={tool === 'jammer'} onClick={() => setTool('jammer')}>Jammer<small>Disrupt a nearby drone · 6s</small></button></div><div className="infiltration-targets">{INFILTRATION_TARGETS.map(t => { const remaining = Math.max(0, (cooldowns.find(c => c.targetId === t.id)?.eligibleAt || 0) - now); return <button key={t.id} disabled={busy} onClick={() => onStart(t.id, tool)}><span><strong>{t.name}</strong><small>{t.difficulty} · {t.defenses.length} security drone{t.defenses.length > 1 ? 's' : ''}</small></span><b>{remaining ? `Influence in ${Math.ceil(remaining / 60000)}m` : `+${t.influence} Influence`}</b></button>; })}</div><p className="operation-brief">Hack technology. Escape with the loot.</p></>}</>; }
