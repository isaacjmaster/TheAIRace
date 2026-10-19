import { useEffect, useRef, useState } from 'react';
import { INFILTRATION_TARGETS, type Operation, type Tool, type InfiltrationCommand } from '../../shared/infiltration';
import { InfiltrationScene } from '../art/InfiltrationScene';
import { ResearchIcon } from './ResearchIcon';
import { sound } from '../audio/sound';
export function InfiltrationView({ operation, serverTime, busy, error, onCommand, onRetry, onReturn }: {
    operation: Operation;
    serverTime: number;
    busy: boolean;
    error: string;
    onCommand: (c: InfiltrationCommand) => Promise<boolean | undefined>;
    onRetry?: () => void;
    onReturn: () => void;
}) {
    const labels = useRef(new Map<string, HTMLSpanElement>());
    const host = useRef<HTMLDivElement>(null), view = useRef<InfiltrationScene | null>(null), pointers = useRef(new Map<number, {
        x: number;
        y: number;
        startX: number;
        startY: number;
        moved: boolean;
    }>()), pinch = useRef(0), lastEvent = useRef(operation.events.length), [failed, setFailed] = useState(false), [quit, setQuit] = useState(false);
    const live = operation.status === 'active', done = !live && operation.status !== 'ready', asset = operation.target.assets.find(a => a.id === operation.agent.target), settlement = operation.settlement;
    useEffect(() => { let scene: InfiltrationScene | undefined, frame = 0, last = performance.now(); try {
        scene = new InfiltrationScene(host.current!, operation);
        view.current = scene;
        const draw = (time: number) => { scene!.update(Math.min(.05, (time - last) / 1000)); for (const [id, node] of labels.current) {
            const p = scene!.labelPoint(id);
            node.style.left = p.x + 'px';
            node.style.top = p.y + 'px';
        } last = time; frame = requestAnimationFrame(draw); };
        frame = requestAnimationFrame(draw);
    }
    catch {
        setFailed(true);
    } return () => { cancelAnimationFrame(frame); scene?.dispose(); view.current = null; }; }, [operation.id]);
    useEffect(() => { view.current?.sync(operation, serverTime); for (const e of operation.events.slice(lastEvent.current)) {
        if (e.type === 'hacked')
            sound.cue('hack');
        if (e.type === 'detected')
            sound.cue('security-alert');
        if (e.type === 'extracted')
            sound.cue('extraction');
    } lastEvent.current = operation.events.length; }, [operation, serverTime]);
    return <section className="infiltration-view" aria-label="Infiltration operation"><header className="operation-header glass"><div><small>OPERATION INFILTRATION</small><h2>{operation.target.name}</h2></div><button aria-label="Leave operation" onClick={() => done ? onReturn() : setQuit(true)}>×</button></header><div className="operation-canvas" ref={host} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, moved: false }); pinch.current = 0; if (pointers.current.size > 1)
        for (const p of pointers.current.values())
            p.moved = true; }} onPointerMove={e => { const p = pointers.current.get(e.pointerId); if (!p)
        return; if (Math.hypot(e.clientX - p.startX, e.clientY - p.startY) > 8)
        p.moved = true; if (pointers.current.size === 1 && p.moved)
        view.current?.pan(e.clientX - p.x, e.clientY - p.y); p.x = e.clientX; p.y = e.clientY; if (pointers.current.size > 1) {
        const [a, b] = [...pointers.current.values()], distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch.current && distance > 0)
            view.current?.zoom(pinch.current / distance);
        pinch.current = distance;
    } }} onPointerUp={e => { const p = pointers.current.get(e.pointerId), single = pointers.current.size === 1; pointers.current.delete(e.pointerId); pinch.current = 0; if (single && p && !p.moved && live && !busy) {
        const pick = view.current?.pick(e.clientX, e.clientY);
        if (pick?.assetId && pick.assetId !== 'hq')
            void onCommand({ action: 'hack', assetId: pick.assetId });
        else if (pick?.position)
            void onCommand({ action: 'move', position: pick.position });
    } }} onPointerCancel={e => { pointers.current.delete(e.pointerId); pinch.current = 0; }} onLostPointerCapture={e => { pointers.current.delete(e.pointerId); pinch.current = 0; }} onWheel={e => view.current?.zoom(e.deltaY > 0 ? 1.06 : .94)}><div className="operation-world-labels" aria-hidden="true">{[...operation.target.assets.filter(a => a.access).map(a => ({ id: a.id, name: a.kind === 'gpu' ? 'Compute' : a.kind === 'lab' ? 'Research' : 'Core' })), { id: 'exit', name: 'Extract' }].map(a => <span key={a.id} className={operation.agent.target === a.id ? 'selected' : ''} ref={node => { if (node)
        labels.current.set(a.id, node);
    else
        labels.current.delete(a.id); }}>{a.name}</span>)}</div>{failed && <p role="alert">Graphics unavailable. Your operation is saved. Return to HQ and retry.</p>}</div>
 <div className="operation-controls glass"><div className="operation-status" role="status"><strong>{operation.status === 'ready' ? 'Ready to deploy' : operation.status === 'caught' ? 'Agent intercepted' : operation.status === 'timeout' ? 'Operation timed out' : operation.status === 'abandoned' ? 'Operation abandoned' : operation.status === 'extracted' ? 'Extraction complete' : operation.agent.mode === 'hacking' ? `Hacking ${asset?.name}` : operation.agent.mode === 'extracting' ? 'Returning to extraction' : operation.agent.mode === 'moving' ? 'Moving to position' : 'Awaiting your order'}</strong>{live && <span>{Math.max(0, 180 - Math.floor((operation.lastTick - operation.startedAt!) / 1000))}s</span>}</div>
 {live && operation.drones.some(d => d.mode === 'warning' || d.mode === 'pursuit') && <div className="security-warning" role="alert">Security alert — move clear or use your tool</div>}
 {live && operation.agent.mode === 'hacking' && <progress aria-label="Hacking progress" max={asset?.hackSeconds ?? 1} value={operation.agent.hack}/>}
 <div className="operation-loot"><span>{done ? 'Banked' : 'Carrying'} <b>{done ? settlement?.compute ?? 0 : operation.carried.compute}</b> Compute</span><span><ResearchIcon /><b>{done ? settlement?.research ?? 0 : operation.carried.research}</b> Research</span>{done && <span><b>+{settlement?.influence ?? 0}</b> Influence</span>}</div>
 {done ? <>{(settlement?.pendingCompute || settlement?.pendingResearch) ? <small className="reserve-note">Storage full: {settlement.pendingCompute} Compute and {settlement.pendingResearch} Research secured in reserve.</small> : null}<button className="primary" onClick={onReturn}>Return to HQ</button></> : operation.status === 'ready' ? <><p className="operation-brief">Tap an asset to hack. Tap open ground to move. Extract to bank loot.</p><button className="primary" disabled={busy} onClick={() => void onCommand({ action: 'deploy' })}>Deploy agent</button></> : <><div className="hack-targets">{operation.target.assets.filter(a => a.access).map(a => <button key={a.id} disabled={busy || operation.hacked.includes(a.id)} aria-pressed={operation.agent.target === a.id} onClick={() => void onCommand({ action: 'hack', assetId: a.id })}>{a.kind === 'gpu' ? 'Compute' : a.kind === 'lab' ? 'Research' : 'Core'}{operation.hacked.includes(a.id) ? ' ✓' : ''}<small aria-hidden="true">{a.kind==='gpu'?`+${a.compute}`:a.kind==='lab'?`+${a.research}`:`+${a.compute} C · ${a.research} R`}</small></button>)}</div><div className="operation-actions"><button disabled={busy || operation.toolUsed} onClick={() => void onCommand({ action: 'tool' })}>{operation.tool === 'probe' ? 'Probe' : 'Jammer'} {operation.toolUsed ? '0/1' : '1/1'}</button><button className="primary" disabled={busy} onClick={() => void onCommand({ action: 'extract' })}>Extract now ↗</button></div><small className="operation-tip">Unextracted loot is lost if intercepted.</small></>}{error && <div className="operation-error" role="alert">{error}{onRetry && <button disabled={busy} onClick={onRetry}>Retry order</button>}</div>}</div>
 {quit && <div className="foundation-backdrop"><section className="foundation-dialog glass" role="alertdialog" aria-label="Abandon operation"><h2>Leave operation?</h2><p>Unextracted loot will be lost.</p><button onClick={() => setQuit(false)}>Continue operation</button><button disabled={busy} onClick={async () => { if (await onCommand({ action: 'abandon' })) {
        setQuit(false);
        onReturn();
    } }}>Abandon</button></section></div>}</section>;
}
