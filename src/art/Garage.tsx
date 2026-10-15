export function Garage({ level, working }: { level: number; working: boolean }) {
  return <svg className={`garage ${working ? 'working' : ''}`} viewBox="42 0 516 407" role="img" aria-label={`Isometric garage headquarters with ${level === 0 ? 'a starter laptop' : level === 1 ? 'a desktop workstation' : 'a server tower'}`}>
    <defs><linearGradient id="wall" x2="0" y2="1"><stop stopColor="#f9e4bb"/><stop offset="1" stopColor="#efc795"/></linearGradient><linearGradient id="floor" x2="1" y2="1"><stop stopColor="#b9cfd2"/><stop offset="1" stopColor="#849fac"/></linearGradient><filter id="shadow"><feGaussianBlur stdDeviation="10"/></filter></defs>
    <ellipse cx="300" cy="351" rx="234" ry="42" fill="#112d43" opacity=".2" filter="url(#shadow)"/>
    <path d="M58 249 300 111 546 249 303 389Z" fill="#617c8d"/><path d="M58 237 300 99 546 237 303 377Z" fill="url(#floor)"/>
    <path d="M58 237V91L300 12v87Z" fill="#f9e4bb"/><path d="M300 12 546 91v146L300 99Z" fill="url(#wall)"/>
    <path d="M57 91 300 12 547 91" fill="none" stroke="#ff9b77" strokeWidth="12" strokeLinejoin="round"/>
    <path d="m300 99 1-87" stroke="#e6bd8c" strokeWidth="6"/>
    <path d="m331 55 165 52v94l-165-79Z" fill="#6f8d9b" stroke="#f9edda" strokeWidth="7"/>
    {[0,1,2,3].map(i=><path key={i} d={`m337 ${73+i*19} 152 51`} stroke="#a8bec3" strokeWidth="4"/>)}
    <path d="m94 106 83-28v64l-83 39Z" fill="#597486" stroke="#fff0d4" strokeWidth="6"/>
    <path d="m135 92 1 69M97 140l77-30" stroke="#fff0d4" strokeWidth="5"/>
    <path d="m103 111 26-9v21l-26 11Z" fill="#ffcd79"/>
    <path d="m207 80 57-19v45l-57 26Z" fill="#fff8df" transform="rotate(3 235 95)"/>
    <text x="217" y="99" fill="#e67c64" fontSize="13" fontWeight="900" transform="rotate(-20 217 99)">BUILD</text>
    <text x="220" y="113" fill="#526d80" fontSize="10" fontWeight="800" transform="rotate(-20 220 113)">THE FUTURE</text>
    <g stroke="#77949e" opacity=".4"><path d="m117 270 242-139M179 306l242-139M242 342l242-139M118 203l244 139M180 167l245 139M241 133l244 139"/></g>
    <g><path d="m148 203 115-63 121 65-116 67Z" fill="#fff0ca"/><path d="m148 203 120 69v12l-120-69Z" fill="#d69f72"/><path d="m268 272 116-67v12l-116 67Z" fill="#b67c60"/><path d="M160 217v73m109-6v57m103-119v68" stroke="#536d7e" strokeWidth="9"/>
    <path d="m210 183 45-26 42 24-45 27Z" fill="#657f91"/><path d="m210 183-2-35 44 24v36Z" fill="#354d69"/><path d="m215 178-1-23 31 18v23Z" fill="#73ead6"/><path d="m252 208 45-27-1 5-44 27Z" fill="#425971"/>
    <path d="m310 216 17-10 18 10-17 11Z" fill="#f99d82"/><path d="M313 215v-15l15 8v16" fill="#fff3d6"/><path d="m328 209 8-4v10l-8 4" fill="none" stroke="#fff3d6" strokeWidth="3"/>
    </g>
    <g><path d="m100 257 39-23 38 22-40 24Z" fill="#eab985"/><path d="m100 257 37 23v42l-37-23Z" fill="#cf906b"/><path d="m137 280 40-24v43l-40 23Z" fill="#b57559"/><path d="m118 247 39 22v15l-9 5v-15l-39-22Z" fill="#f8d6a0"/></g>
    <g><path d="m442 239 34-19 30 17-34 21Z" fill="#f6bb8f"/><path d="m442 239 30 19v32l-30-17Z" fill="#d68e71"/><path d="m472 258 34-21v32l-34 21Z" fill="#b67763"/><path d="M473 240c-34-8-34-47-17-39 8 3 8 19 17 25-12-38 6-53 14-38 7 14-6 31-7 40 22-27 39-17 29-3-8 11-22 8-36 15" fill="#65b99e"/></g>
    {level >= 1 && <g className="upgrade-art"><path d="m328 171 34-19 23 14-34 20Z" fill="#5a718a"/><path d="m328 171 23 15v52l-23-14Z" fill="#2e4660"/><path d="m351 186 34-20v52l-34 20Z" fill="#415f79"/><path d="m358 190 19-11v4l-19 11m0 7 19-11v4l-19 11" stroke="#7cecd4" strokeWidth="3"/><circle cx="341" cy="208" r="4" fill="#ffd882"/><path d="m283 163-1-40 45 25v40Z" fill="#2d4660"/><path d="m288 158-1-26 34 19v26Z" fill="#7cecd4"/><path d="m304 176 0 13m-10 5 21-12" stroke="#415f79" strokeWidth="5"/></g>}
    {level >= 2 && <g className="upgrade-art"><path d="m394 251 38-22 35 20-38 23Z" fill="#71899c"/><path d="m394 251 35 21v72l-35-21Z" fill="#304962"/><path d="m429 272 38-23v73l-38 22Z" fill="#436580"/>{[0,1,2].map(i=><g key={i}><path d={`m400 ${267+i*18} 23 13v10l-23-13Z`} fill="#5e8297"/><circle cx="409" cy={277+i*18} r="2.5" fill="#7cecd4"/></g>)}</g>}
    <g className="agent-bob"><ellipse cx="327" cy="320" rx="29" ry="12" fill="#446679" opacity=".2"/><path d="m304 285 23-14 25 14v29l-25 15-23-15Z" fill="#73e0c5"/><path d="m304 285 23 14 25-14-25-14Z" fill="#a6f5d7"/><path d="m327 299 25-14v29l-25 15Z" fill="#48bfae"/><path d="m308 292 15 9v12l-15-9Z" fill="#28455d"/><circle cx="312" cy="301" r="2" fill="#fff1c4"/><circle cx="319" cy="305" r="2" fill="#fff1c4"/><path d="M327 274v-10" stroke="#405e70" strokeWidth="3"/><circle cx="327" cy="262" r="4" fill="#ffcb74"/></g>
    <g fill="#fff1c4" className="sparkles"><path d="m400 116 3 9 9 3-9 3-3 9-3-9-9-3 9-3Z"/><path d="m194 232 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z"/></g>
  </svg>;
}

