import type { Cue } from '../src/audio/score';
import type { Transcript } from '../shared/raid';
import React, { useEffect, useRef, useState } from 'react';
import { LEVELS } from './level';
import { summarizeRaid, type RaidOutcome } from './outcome';
import { createRaid, deploy, destruction, finish, objectives, rewards, STATS, STEP, tick, KINDS, type Squad, type Kind } from './engine';
import { DeploymentGesture } from './gestures';
import { RaidScene } from './scene';
import './style.css';
import { TroopIcon } from './TroopIcon';

const layouts = LEVELS.map(level => level.name);
const kinds: Kind[] = KINDS;
const startingTroop = (stock: Record<Kind, number>): Kind => stock.tank ? 'tank' : kinds.find(k => stock[k] > 0)!;
export type RaidScreenProps = { initialLayout?: number; squad?: Readonly<Squad>; power?: number; healthPower?:number; rewardMultiplier?: number; integrated?: boolean; onCue?: (cue:Cue)=>void; onComplete?: (outcome: RaidOutcome, log: Transcript) => void; onExit?: () => void };
export function RaidScreen({ initialLayout = 0, squad, power = 1, healthPower = power, rewardMultiplier = 1, integrated = false, onComplete, onExit, onCue }: RaidScreenProps) {
  const audioCue=useRef(onCue);audioCue.current=onCue;
  const heard=useRef(new Set<number>());
  const log = useRef<Transcript>({steps:0,deployments:[],retreat:false});
  const state = useRef<ReturnType<typeof createRaid> | null>(null); if (!state.current) state.current = createRaid(initialLayout, squad, power, healthPower);
  const [layout, setLayout] = useState(initialLayout), [selected, setSelected] = useState<Kind>(() => startingTroop(state.current!.stock)), [started, setStarted] = useState(false), [, refresh] = useState(0);
  const [notice, setNotice] = useState(''), [error, setError] = useState('');
  const mount = useRef<HTMLDivElement>(null), view = useRef<RaidScene | null>(null), running = useRef(false), selection = useRef(selected), noticeUntil = useRef(0);
  const gestures = useRef(new DeploymentGesture()), pinch = useRef(new Map<number, { x: number; y: number }>()), pinchDistance = useRef(0);
  selection.current = selected;
  const toast = (text: string) => { setNotice(text); noticeUntil.current = performance.now() + 2600; };
  useEffect(() => {
    let scene: RaidScene;
    try { scene = new RaidScene(mount.current!, message => { running.current = false; setError(message); }); view.current = scene; }
    catch { setError('3D graphics could not start. Enable WebGL in your browser and reload.'); return; }
    let id = 0, last = performance.now(), accumulator = 0, paint = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, .1); last = now;
      if (!document.hidden) {
        accumulator += dt;
        while (accumulator >= STEP) { if (running.current && !state.current!.ended) { tick(state.current!); log.current.steps++; for(const effect of state.current!.effects){if(heard.current.has(effect.id))continue;heard.current.add(effect.id);if(effect.damage>0)audioCue.current?.(effect.source<100?'laser':'impact');if(effect.destroyed&&effect.target<100)audioCue.current?.('destroy');} } accumulator -= STEP; }
        scene.update(state.current!, selection.current, dt);
        if (noticeUntil.current && now > noticeUntil.current) { setNotice(''); noticeUntil.current = 0; }
        if (now - paint > 100) { refresh(f => f + 1); paint = now; }
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(id); scene.dispose(); view.current = null; };
  }, []);
  const reset = (next = layout) => { heard.current.clear(); state.current = createRaid(next, squad, power, healthPower); log.current = {steps:0,deployments:[],retreat:false}; running.current = false; setStarted(false); setSelected(startingTroop(state.current.stock)); setLayout(next); setNotice(''); gestures.current = new DeploymentGesture(); pinch.current.clear(); refresh(f => f + 1); };
  const s = state.current!, visibleKinds=kinds.filter(k=>(squad?.[k]??(k==='scout'||k==='tank'||k==='breaker'?2:0))>0), rawResult = rewards(s), result={credits:Math.floor(rawResult.credits*rewardMultiplier),compute:Math.floor(rawResult.compute*rewardMultiplier)}, victory = s.reason === 'Network cleared', seconds = Math.ceil(90 - s.time);
  const delivered = useRef<typeof s | null>(null);
  useEffect(() => { if (s.ended && delivered.current !== s) { delivered.current = s; if(s.reason==='Network cleared')audioCue.current?.('win'); onComplete?.(summarizeRaid(s), structuredClone(log.current)); } }, [s, s.ended, onComplete]);
  const pointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || error || s.ended) return;
    e.currentTarget.setPointerCapture(e.pointerId); const p = { x: e.clientX, y: e.clientY };
    gestures.current.begin(e.pointerId, p); pinch.current.set(e.pointerId, p); pinchDistance.current = 0;
  };
  const pointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    view.current?.hover(view.current.pick(e.clientX, e.clientY));
    const delta = gestures.current.move(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current.has(e.pointerId)) pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current.size > 1) {
      const [a, b] = [...pinch.current.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDistance.current > 0) view.current?.zoom(d / pinchDistance.current); pinchDistance.current = d;
    } else if (delta) view.current?.pan(delta.x, delta.y);
  };
  const pointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const tap = gestures.current.release(e.pointerId, { x: e.clientX, y: e.clientY }); pinch.current.delete(e.pointerId); pinchDistance.current = 0;
    if (!tap || error || s.ended) return;
    const p = view.current?.pick(e.clientX, e.clientY);
    if (p && deploy(s, selected, p)) { audioCue.current?.('deploy'); log.current.deployments.push({step:log.current.steps,kind:selected,point:p}); running.current = true; setStarted(true); setNotice(''); refresh(f => f + 1); }
    else toast(!s.stock[selected] ? 'Choose another agent' : 'Tap the cyan edge outside the walls');
  };
  const down = s.buildings.filter(b => b.kind !== 'wall' && b.hp <= 0).length;
  const feedback = victory ? `All network objectives destroyed. ${s.units.filter(u => u.hp > 0).length} agents survived.` : layout>1 ? 'Use Tanks in front, Breakers on defenses, and support agents behind them. Disruptors suppress shields and repair stations.' : s.buildings[2].hp > 0 ? `The Laser took out ${s.lost} agents. Put Tanks closest to it and send Breakers behind them.` : s.buildings[1].hp > 0 ? 'Laser down. Scouts through the open gate could reach the remaining Compute Vault faster.' : 'Vault secured. Keep your armored agents alive long enough to finish the Core.';
  return <main className="raid-game">
    <div className="battlefield" ref={mount} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={e => { gestures.current.cancel(e.pointerId); pinch.current.delete(e.pointerId); }} onPointerLeave={() => view.current?.hover(null)} onWheel={e => view.current?.zoom(e.deltaY > 0 ? .95 : 1.05)} onContextMenu={e => e.preventDefault()}/>
    <div className="orientation-hint">↻ Rotate for a wider battlefield</div><header className="top-hud"><div className="base-title"><span className="base-emblem">◈</span><div><h1>{layouts[layout]}</h1><p>Level {LEVELS[layout].level}</p></div><button className="swap" aria-label={`Switch to ${layouts[(layout+1)%layouts.length]}`} title={`Switch to ${layouts[(layout+1)%layouts.length]}`} disabled={integrated || (started && !s.ended)} onClick={() => reset((layout+1)%layouts.length)}>⇄</button></div>
      <div className={`timer ${seconds <= 20 ? 'urgent' : ''}`} aria-label={`${seconds} seconds remaining`}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M9 2h6M12 5V2M12 9v5l3 2"/></svg><span>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span></div>
    </header>
    <div className="battle-progress" aria-label={`${destruction(s)} percent destruction, ${down} of ${objectives(s).length} objectives destroyed`}><span>✦</span><strong>{destruction(s)}<small>%</small></strong><div className="objective-dots">{objectives(s).map(b => <i key={b.id} className={b.hp <= 0 ? 'done' : ''}/>)}</div></div>
    <div className="camera-controls"><button aria-label="Zoom in" onClick={() => view.current?.zoom(1.12)}>+</button><button aria-label="Zoom out" onClick={() => view.current?.zoom(1 / 1.12)}>−</button></div>
    {(started || integrated) && !s.ended && <button className="retreat" onClick={() => { log.current.retreat = true; finish(s, 'Retreated'); refresh(f => f + 1); }}>Retreat</button>}
    <section className="deployment" aria-label="Deploy troops">
      <div className={`deploy-hint ${notice ? 'notice' : ''}`} role="status">{notice || (!started ? 'Choose an agent · Tap the cyan edge' : s.stock[selected] ? `${STATS[selected].name} ready` : Object.values(s.stock).some(n => n) ? 'Choose another agent' : '')}</div>
      <div className="troop-bar">{visibleKinds.map(kind => <button key={kind} aria-label={`${STATS[kind].name}, ${s.stock[kind]} remaining. ${STATS[kind].role}`} aria-pressed={selected === kind} disabled={!s.stock[kind] || s.ended || !!error} title={STATS[kind].role} onClick={() => { setSelected(kind); toast(STATS[kind].role); }} className={`troop ${selected === kind ? 'selected' : ''} ${s.stock[kind] === 0 ? 'exhausted' : ''}`} style={{ '--unit': STATS[kind].color } as React.CSSProperties}><TroopIcon kind={kind}/><span className="troop-count">{s.stock[kind]}</span><span className="troop-name">{STATS[kind].name}</span><span className="selection-gem"/></button>)}</div>
    </section>
    {error && <div className="graphics-error" role="alert"><h2>Battlefield paused</h2><p>{error}</p><button onClick={() => window.location.reload()}>Reload</button></div>}
    {s.ended && <div className="result-backdrop"><section className={`result-sheet ${victory ? 'victory' : ''}`} role="dialog" aria-modal="true" aria-labelledby="result-title"><div className="result-stars" aria-label={`${down} of ${objectives(s).length} objectives destroyed`}>{[1,2,3].map(n => <span key={n} className={destruction(s)>=n*100/3 ? 'earned' : ''}>✦</span>)}</div><h2 id="result-title">{victory ? 'Victory!' : s.buildings[0].hp <= 0 ? 'Core breached' : 'Raid complete'}</h2><p className="result-subtitle">{layouts[layout]} · {Math.ceil(s.time)}s · {destruction(s)}% destroyed</p><div className="loot"><div><span className="compute-icon">▣</span><div><small>Compute</small><strong>+{result.compute}</strong></div></div><div><span className="credit-icon">⬡</span><div><small>Credits</small><strong>+{result.credits}</strong></div></div></div><p className="debrief">{feedback}</p><div className="contribution">{visibleKinds.map(k => <span key={k}><i style={{ background: STATS[k].color }}/>{STATS[k].name}<b>{Math.round(s.damage[k])}</b></span>)}</div><small className="damage-caption">Damage dealt</small>{!integrated && <><button className="retry" onClick={() => reset()}>Raid again <span>↻</span></button><button className="next-base" onClick={() => reset((layout+1)%layouts.length)}>Try {layouts[(layout+1)%layouts.length]} →</button></>}{onExit && <button className="return-home" onClick={onExit}>Return to base</button>}</section></div>}
  </main>;
}
