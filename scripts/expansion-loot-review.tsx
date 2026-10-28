import '../src/ui/foundation.css';import '../src/ui/ui-polish.css';import '../src/ui/infiltration.css';import '../src/styles.css';
import React from 'react';import {createRoot} from 'react-dom/client';import '../src/ui/player-world.css';import {InfiltrationView} from '../src/ui/Infiltration';
const data=await(await fetch('/review-loot')).json(),mode=new URLSearchParams(location.search).get('mode')??'ready',o=data[mode];
createRoot(document.getElementById('root')!).render(<InfiltrationView operation={o} stock={10} serverTime={o.lastTick} busy={false} error="" onCommand={async()=>false} onReturn={()=>{}}/>);
