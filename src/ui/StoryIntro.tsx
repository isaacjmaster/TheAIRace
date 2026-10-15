import { useEffect, useRef, useState } from 'react';

const moments = [
  { chapter: '2028', title: 'A New Era', text: 'Artificial intelligence is changing everything. A technological revolution has begun.', kind: 'era' },
  { chapter: 'THE WORLD IS MOVING', title: 'The Race Begins', text: 'Companies around the world are racing to develop the most powerful AI ever created.', kind: 'race' },
  { chapter: 'SMALL BEGINNINGS', title: 'Your Story', text: 'One laptop. One AI agent. One garage. Build your company, outpace your rivals, and race toward the singularity.', kind: 'garage' },
  { chapter: 'POWER NEEDS PURPOSE', title: 'The Warning', text: 'As your AI grows more capable, keeping it aligned becomes increasingly important. Progress without control could have consequences.', kind: 'warning' },
];
export function StoryIntro({ replay, busy, error, onFinish }: { replay: boolean; busy: boolean; error: string; onFinish: () => void }) {
  const [index, setIndex] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [index]);
  const moment = moments[index];
  return <main className="game-shell story-shell">
    <header className="story-top"><span>{replay ? 'STORY REPLAY' : 'THE AI RACE'}</span><button disabled={busy} onClick={onFinish}>{replay ? 'Close' : 'Skip story'}</button></header>
    <section className={`story-moment story-${moment.kind}`} key={index} aria-label={`Story moment ${index + 1} of 4`}>
      <div className="story-art" aria-hidden="true">{moment.kind === 'garage' ? <img src="/icons/icon-512.png" alt=""/> : <><div className="story-ring"/><div className="story-core">{moment.kind === 'era' ? '2028' : moment.kind === 'race' ? 'ϟ' : '◇'}</div><div className="story-city">{[0,1,2,3,4].map(i=><i key={i}/>)}</div><span className="story-star">✦</span></>}</div>
      <span className="eyebrow">{moment.chapter}</span><h1 ref={heading} tabIndex={-1}>{moment.title}</h1><p>{moment.text}</p>
    </section>
    <footer className="story-controls">
      {error && <p role="alert" className="story-error">{error}</p>}
      <div className="story-dots" aria-label={`Moment ${index + 1} of 4`}>{moments.map((m,i)=><span key={m.kind} className={i===index?'active':''}/>)}</div>
      <button className="primary" disabled={busy} onClick={()=>index===3?onFinish():setIndex(index+1)}>{busy?'Opening garage…':index===3?(replay?'Return to credits':'Enter your garage →'):'Continue →'}</button>
      {index>0&&<button className="story-back" disabled={busy} onClick={()=>setIndex(index-1)}>Back</button>}
    </footer>
  </main>;
}
