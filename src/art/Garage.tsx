import { useId } from 'react';
import './garage.css';

/** Hardware level is the existing 0/1/2 economy value, not the displayed founder level. */
export function Garage({ level, working, rigLevel = 0, installing = false }: { level: number; working: boolean; rigLevel?: number; installing?: boolean }) {
  const id = useId().replace(/:/g, '');
  const paint = (name: string) => `url(#${id}-${name})`;
  const stage = level >= 2 ? 'company' : level >= 1 ? 'workstation' : 'starter';
  return <svg className={`garage garage-v2 ${working ? 'working' : ''} ${installing ? 'installing' : ''}`} viewBox="0 0 600 650" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby={`${id}-title ${id}-desc`} data-stage={stage}>
    <title id={`${id}-title`}>{stage === 'starter' ? 'Your first garage' : stage === 'workstation' ? 'A growing AI workshop' : 'Your AI company headquarters'}</title>
    <desc id={`${id}-desc`}>{stage === 'starter' ? 'A bare garage, a single laptop on the floor, and Pixel, your mint-colored AI agent.' : stage === 'workstation' ? 'A desk, chair, desktop computer, laptop, warm task lighting, and a small plant transform your garage into a workshop.' : 'A sophisticated garage with a GPU workbench, server rack, lighting, plants, and Pixel.'}{rigLevel > 0 ? ' Your agent training rig stands beside the entrance.' : ''}</desc>
    <defs>
      <linearGradient id={`${id}-left`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff0d2"/><stop offset="1" stopColor="#d9b693"/></linearGradient>
      <linearGradient id={`${id}-right`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d7c6aa"/><stop offset="1" stopColor="#a3897c"/></linearGradient>
      <linearGradient id={`${id}-floor`} x1="0" y1="0" x2="0" y2="1"><stop stopColor={level > 1 ? '#aac6cb' : '#91a9b2'}/><stop offset="1" stopColor={level > 1 ? '#668d9d' : '#627e8f'}/></linearGradient>
      <linearGradient id={`${id}-screen`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#193c54"/><stop offset="1" stopColor="#348e8c"/></linearGradient>
      <radialGradient id={`${id}-light`}><stop stopColor="#ffe9ab" stopOpacity=".7"/><stop offset="1" stopColor="#ffe9ab" stopOpacity="0"/></radialGradient>
      <linearGradient id={`${id}-mint`}><stop stopColor="#c6ffe4"/><stop offset="1" stopColor="#65d3be"/></linearGradient>
      <filter id={`${id}-blur`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>
    </defs>
    <ellipse cx="300" cy="574" rx="252" ry="43" fill="#061728" opacity=".5" filter={paint('blur')}/>
    {/* Thick foundation and two walls keep the world readable at phone scale. */}
    <path d="M34 390 300 238 566 390v31L300 585 34 421Z" fill="#304d64"/>
    <path d="m34 390 266 154 266-154v22L300 566 34 412Z" fill="#496c80"/>
    <path d="M34 390 300 236 566 390 300 544Z" fill={paint('floor')}/>
    <path d="M34 390V163L300 9v227Z" fill={paint('left')}/>
    <path d="M300 9 566 163v227L300 236Z" fill={paint('right')}/>
    <path d="M34 163 300 9 566 163" fill="none" stroke="#f68d72" strokeWidth="15" strokeLinejoin="round"/>
    <path d="M34 168v222m266-367v213m266-68v222" fill="none" stroke="#c09376" strokeWidth="7"/>
    <path d="m39 380 261-151 261 151" fill="none" stroke="#7b6e66" strokeWidth="11"/>
    <path d="m41 381 259-150 259 150" fill="none" stroke="#f8dfb9" strokeWidth="3"/>
    {/* Recessed closed garage door, simple architecture even at level one. */}
    <path d="m338 57 184 107v194L338 251Z" fill="#7b706c"/>
    <path d="m345 69 168 97v177l-168-97Z" fill="#456175"/>
    {[0,1,2,3,4,5].map(i=><path key={i} d={`m346 ${91+i*28} 166 96`} stroke={i % 2 ? '#627c8b' : '#506e80'} strokeWidth="12"/>)}
    <path d="m337 58 186 108v194" fill="none" stroke="#ffe4bc" strokeWidth="9" strokeLinejoin="round"/>
    <path d="m411 268 30 17" stroke="#c7d4ce" strokeWidth="5" strokeLinecap="round"/>
    {/* Floor seams and worn concrete add depth without giving free furniture. */}
    <g stroke="#385c72" strokeWidth="1.5" opacity=".28"><path d="m100 428 266-154M166 467l266-154M233 505l266-154M100 351l266 154M166 313l266 154M233 274l266 154"/></g>
    {level < 1 && <g fill="none" stroke="#afc0c0" opacity=".48" strokeWidth="2"><path d="m134 421 22-4 8 7 18-4M342 456l13-13 10 2 8-9M162 316l12 5"/></g>}
    <path d="m83 156 85-49v91l-85 49Z" fill="#ad8b73"/>
    <path d="m88 161 75-43v75l-75 43Z" fill="#ffcf87"/>
    <path d="m88 161 75-43v75l-75 43Z" fill={paint('light')}/>
    <path d="m126 140v75m-38-17 75-44" fill="none" stroke="#fff0d3" strokeWidth="6"/>
    <path d="m82 244 88-51v9l-88 51Z" fill="#f7dfb4"/>
    <path d="m87 248 78-45 125 160-135 78Z" fill="#ffdc94" opacity=".1"/>
    {level >= 1 && <g data-equipment="workstation">
      <path d="m117 380 145-84 162 93-145 84Z" fill="#24485d" opacity=".3"/>
      {/* Chair behind the desk. */}
      <path d="m217 323 37-21 26 15-37 21Z" fill="#ef957a"/>
      <path d="m217 323-2-46 37-21 2 46Z" fill="#37596e" stroke="#88a0a7" strokeWidth="4" strokeLinejoin="round"/>
      <path d="m243 338v38m-26 13 26-13 22 13m-22-13v27" fill="none" stroke="#344f65" strokeWidth="6" strokeLinecap="round"/>
      {/* Full workstation appears only after the first earned upgrade. */}
      <path d="M137 357v64m142 24v62m111-124v63" stroke="#314d64" strokeWidth="12" strokeLinecap="round"/>
      <path d="m124 342 133-77 151 88-133 77Z" fill="#fff0c9"/>
      <path d="m124 342 151 88v14l-151-88Z" fill="#d19b70"/>
      <path d="m275 430 133-77v14l-133 77Z" fill="#ac745b"/>
      <path d="m188 308 53-31 4 58-53 31Z" fill="#233d55" stroke="#688995" strokeWidth="4" strokeLinejoin="round"/>
      <path d="m194 311 41-24 2 41-41 24Z" fill={paint('screen')}/>
      <path className="garage-screen-trace" d="m200 329 8-5 5-14 7 14 10-6" fill="none" stroke="#91f6d7" strokeWidth="3"/>
      <path d="m218 350 1 17m-15 9 31-18" stroke="#486679" strokeWidth="5" strokeLinecap="round"/>
      <path d="m294 321 31-18 28 16-31 18Z" fill="#7795a3"/>
      <path d="m294 321 28 16v53l-28-16Z" fill="#29475f"/>
      <path d="m322 337 31-18v53l-31 18Z" fill="#3c6479"/>
      <path d="m328 345 18-10m-18 21 18-10" stroke="#82efcd" strokeWidth="4"/>
      <circle className="garage-led" cx="307" cy="354" r="4" fill="#ffd885"/>
      {/* Warm task light and single small plant. */}
      <path d="m157 325 8-5 27 16-8 5Z" fill="#3e5a6a"/>
      <path d="m171 329v-34l14-25" fill="none" stroke="#536d78" strokeWidth="5" strokeLinecap="round"/>
      <path d="m177 268 15-9 14 19-26 15Z" fill="#f6aa6e"/>
      <ellipse cx="194" cy="310" rx="36" ry="27" fill={paint('light')}/>
      <g transform="translate(99 283)"><path d="m0 0 17-10 18 10-18 10Z" fill="#ffd4a3"/><path d="m0 0 17 10 18-10-5 24-13 8-13-8Z" fill="#dd8b6e"/><path d="M17 1C-8-8-8-36 4-29 14-25 12-10 17-4 11-41 29-45 29-28 29-15 20-10 17 1 39-25 46-10 34-4Z" fill="#53b39b"/></g>
    </g>}
    {/* One laptop always belongs to the founder; its position evolves with hardware. */}
    <g data-equipment="laptop" transform={level >= 1 ? 'translate(238 348) scale(.72)' : 'translate(203 384)'}>
      <path d="m-15 31 70-40 77 44-70 41Z" fill="#173e55" opacity=".25"/>
      <path d="m0 13 54-31 62 36-54 31Z" fill="#6e91a0"/>
      <path d="m0 13-5-55 56 32 11 59Z" fill="#27485f" stroke="#8ba5ad" strokeWidth="3" strokeLinejoin="round"/>
      <path d="m5 8-3-39 43 25 7 40Z" fill={paint('screen')}/>
      <path d="m23-8 4 10 10 9-9-1-4 5-3-11-8-8 8 1Z" fill="#97f7d7"/>
      <path d="m63 19 22-13 20 12-22 13Z" fill="#476e82"/>
      <path d="m62 49 54-31v6L62 55 0 19v-6Z" fill="#34566e"/>
    </g>
    {level >= 2 && <g data-equipment="gpu-lab">
      {/* Right-wall server stack, large silhouette and warm indicator lights. */}
      <path d="m406 398 74-43 52 30-74 43Z" fill="#21445a" opacity=".35"/>
      <path d="m433 294 45-26 39 23-45 26Z" fill="#7995a4"/>
      <path d="m433 294 39 23v103l-39-23Z" fill="#253f57"/>
      <path d="m472 317 45-26v103l-45 26Z" fill="#426b80"/>
      {[0,1,2,3].map(i=><g key={i}><path d={`m440 ${311+i*21} 24 14v13l-24-14Z`} fill="#4f7589"/><path d={`m444 ${317+i*21} 13 7`} stroke="#162f46" strokeWidth="3"/><circle className="garage-led" cx="460" cy={326+i*21} r="2.3" fill={i%2 ? '#ffcb80' : '#8ff5cf'}/></g>)}
      <path d="m479 327 31-18m-31 31 31-18m-31 31 31-18m-31 31 31-18" stroke="#638e9b" strokeWidth="3"/>
      {/* Exposed GPU bench makes the final stage recognizably more capable. */}
      <path d="m94 433v55m73-13v54m-3-133v57" stroke="#35586f" strokeWidth="8"/>
      <path d="m79 425 78-45 88 51-78 45Z" fill="#bcd5d3"/><path d="m79 425 88 51v10l-88-51Z" fill="#618b96"/><path d="m167 476 78-45v10l-78 45Z" fill="#426a80"/>
      {[0,1,2].map(i=><g key={i} transform={`translate(${106+i*29} ${416-i*5})`}><path d="m0 0 28-16 23 13-28 16Z" fill="#355a71"/><path d="m0 0 23 13v13L0 13Z" fill="#243f57"/><path d="m23 13 28-16v13L23 26Z" fill="#517f8e"/><ellipse cx="13" cy="9" rx="7" ry="5" transform="rotate(30 13 9)" fill="#89efd1" className="garage-led"/></g>)}
      <path d="m62 185 207-120m69 0 207 120" stroke="#425e6b" strokeWidth="9" strokeLinecap="round"/>
      <path d="m62 183 207-120m69 0 207 120" stroke="#fff2c2" strokeWidth="4" strokeLinecap="round"/>
      <path d="m44 385 256-148 256 148" fill="none" stroke="#a7f8de" strokeWidth="3" opacity=".65"/>
      <g transform="translate(488 458)"><path d="m-19-5 20-12 22 13-20 12Z" fill="#ffe3b5"/><path d="m-19-5 22 13 20-12-6 31-14 9-16-9Z" fill="#e58e73"/><path d="M3-7C-38-20-35-65-17-54 0-43-4-23 3-12-6-67 24-87 24-57 24-33 10-27 3-7 32-52 57-41 42-23 30-9 18-12 3-7" fill="#4ab29c"/><path d="M3-7v-45" stroke="#7cd4b6" strokeWidth="3"/></g>
    </g>}
    {rigLevel > 0 && <g data-equipment="recovery-rig" aria-label="Installed agent training rig" transform="translate(73 340)">
      <path d="m0 7 28-16 39 23-28 16Z" fill="#f6d69a"/><path d="m0 7 39 23v41L0 48Z" fill="#bb805f"/><path d="m39 30 28-16v41L39 71Z" fill="#80635b"/>
      <path d="m8-2 22-12 24 14-22 13Z" fill="#a5f4d7"/><path d="m8-2 24 15v20L8 18Z" fill="#399c94"/><path d="m32 13 22-13v20L32 33Z" fill="#247b7e"/>
      <path d="M30-14v-34l26 15v25" fill="none" stroke="#ffd47e" strokeWidth="8" strokeLinecap="round"/>
      <circle cx="56" cy="-6" r="9" fill="#b7ffe1" className="garage-led"/>
      <path d="m15 41 11 7" stroke="#ffe9b5" strokeWidth="4"/>
    </g>}
    {/* Pixel is an agent at headquarters, not a player avatar. */}
    <ellipse cx="351" cy="492" rx="39" ry="17" fill="#193e54" opacity=".3"/>
    <g className="garage-pixel" data-character="pixel">
      <path d="m319 428 32-19 35 20-33 19Z" fill={paint('mint')}/>
      <path d="m319 428 34 20v43l-34-20Z" fill="#78dfc4"/>
      <path d="m353 448 33-19v43l-33 19Z" fill="#3fb6a5"/>
      <path d="m324 439 23 13v26l-23-13Z" fill="#22475b"/>
      <path d="m329 449v10m11-4v10" stroke="#aaffdf" strokeWidth="4.5" strokeLinecap="round"/>
      <path d="m350 413v-18" stroke="#355b6d" strokeWidth="5" strokeLinecap="round"/>
      <circle cx="350" cy="392" r="7" fill="#b8ffe4" stroke="#6ed8be" strokeWidth="3" className="garage-led"/>
      <path d="m314 450-8 5v13m82-18 9-6v13" fill="none" stroke="#75d7bd" strokeWidth="6" strokeLinecap="round"/>
      {working && <g className="garage-work-spark" fill="#ffdc91"><path d="m397 405 3 9 9 3-9 3-3 9-3-9-9-3 9-3Z"/><path d="m302 421 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z"/></g>}
    </g>
    {installing && <g className="garage-install-fx" pointerEvents="none"><path d="m36 389 264-153 264 153-264 153Z" fill="#aeffdd" fillOpacity=".2" stroke="#bfffe2" strokeWidth="4"/><g fill="#ffdfa0">{[[149,255],[411,264],[254,169],[378,377],[202,454]].map(([x,y],i)=><path key={i} d={`m${x} ${y} 4 12 12 4-12 4-4 12-4-12-12-4 12-4Z`}/>)}</g></g>}
  </svg>;
}

