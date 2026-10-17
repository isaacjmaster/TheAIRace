/** Static optimized art plus lightweight road-light layers; no WebGL or game state. */
export function TitleArtwork(){return <div className="title-artwork" aria-hidden="true">
 <picture><source media="(orientation: landscape)" srcSet="/art/title/ava-city-desktop.webp"/><img src="/art/title/ava-city-portrait.webp" alt="" width="1080" height="1920" fetchPriority="high" draggable={false}/></picture>
 <svg className="title-road-lights title-road-portrait" viewBox="0 0 941 1672" preserveAspectRatio="xMidYMid slice"><path className="road-glow road-cyan" d="M941 1520C720 1240 1020 1040 620 940S260 838 485 810"/><path className="road-glow road-pink" d="M245 1672C650 1410 440 1130 180 1010S50 860 210 790"/></svg>
 <svg className="title-road-lights title-road-desktop" viewBox="0 0 1672 941" preserveAspectRatio="xMidYMid slice"><path className="road-glow road-cyan" d="M0 930C420 840 470 680 880 650S1380 765 1672 920"/><path className="road-glow road-pink" d="M1100 941C850 820 680 740 790 685S1080 650 1180 700"/></svg>
 <div className="title-sun-glow"/>
 </div>;}
