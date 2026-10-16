import type { Kind } from './engine';

export function TroopIcon({ kind }: { kind: Kind }) {
  return <svg viewBox="0 0 72 68" aria-hidden="true" className={`troop-art ${kind}`}><ellipse cx="37" cy="59" rx="23" ry="5" fill="#122d46" opacity=".22"/>{kind === 'tank' ? <>
    <path d="M11 37 43 26 65 38 65 52 34 64 11 51Z" fill="#263b58"/><path d="M12 38 34 48 34 59 12 49Z" fill="#536f97"/><path d="M35 49 65 39 65 51 35 62Z" fill="#334d70"/>
    <path d="M17 33 42 24 60 34 35 44Z" fill="#b7ceff"/><path d="M17 33 35 44 35 53 17 43Z" fill="#7198d7"/><path d="M35 44 60 34 60 43 35 53Z" fill="#5778b3"/>
    <path d="M27 23 43 17 55 24 39 30Z" fill="#dce8ff"/><path d="M27 23 39 30 39 40 27 33Z" fill="#8eaee8"/><path d="M39 30 55 24 55 33 39 40Z" fill="#6588c7"/>
    <path d="M39 30 48 26 65 32 56 37Z" fill="#edf3f7"/><path d="M56 37 65 32 65 37 56 42Z" fill="#43617c"/><path d="M18 46 29 51M43 52 56 47" stroke="#a6e7ed" strokeWidth="3"/>
  </> : <>
    <path d="M21 45 31 42 35 52 27 58 18 54Z M40 44 50 42 55 54 45 60 36 55Z" fill="#2a465d"/>
    <path d="M17 29 38 20 56 31 35 41Z" fill={kind === 'scout' ? '#9affdf' : '#ffe2a1'}/><path d="M17 29 35 41 35 51 17 41Z" fill={kind === 'scout' ? '#3fb8a5' : '#e9a34f'}/><path d="M35 41 56 31 56 43 35 53Z" fill={kind === 'scout' ? '#249281' : '#bb7334'}/>
    <path d="M23 15 39 9 53 18 37 25Z" fill="#f0f5e5"/><path d="M23 15 37 25 37 35 23 27Z" fill="#b6d4cf"/><path d="M37 25 53 18 53 30 37 37Z" fill="#d9eae4"/><path d="m38 27 13-6v7l-13 6Z" fill={kind === 'scout' ? '#197a80' : '#93552b'}/>
    {kind === 'breaker' ? <><path d="m54 35 9-4 3 13-9 4Z" fill="#3b5264"/><path d="m61 39 10 4-8 7Z" fill="#ffe1a2"/><path d="M12 32 19 29 23 44 15 47Z" fill="#f2b566"/></> : <><path d="M12 31 18 29 21 42 15 45Z" fill="#64e5c4"/><path d="m53 36 7-3 5 10-8 5Z" fill="#2d5364"/><path d="m27 14-4-5 7-3 3 5Z" fill="#6de4d0"/></>}
  </>}</svg>;
}
