import React from 'react';
import {createRoot} from 'react-dom/client';
import '../src/ui/player-world.css';
import {InfiltrationScene} from '../src/art/InfiltrationScene';
const mode=new URLSearchParams(location.search).get('mode');
const root=createRoot(document.getElementById('root')!);
if(mode==='normal'){
 const data=await(await fetch('/review-replay')).json();
 root.render(<section className="infiltration-view"><header className="operation-header glass">Normal infiltration · 200 walls</header><div className="operation-world" id="scene"/><footer className="deploy-control glass">Deployment controls</footer></section>);
 while(!document.getElementById('scene'))await new Promise(requestAnimationFrame);const view=new InfiltrationScene(document.getElementById('scene')!,data.initial);let frame=0;const draw=()=>{view.update(0);frame=requestAnimationFrame(draw);};draw();(window as any).cleanup=()=>{cancelAnimationFrame(frame);view.dispose();root.unmount();};
}else{
 const module=mode==='before'?await import('/src/ui/BattleReplay.tsx?priorCamera'):await import('../src/ui/BattleReplay');
 root.render(<module.BattleReplayView id="synthetic-200-walls" onClose={()=>root.render(<p>Replay closed</p>)}/>);(window as any).cleanup=()=>root.unmount();
}
