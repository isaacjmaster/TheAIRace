/** Static optimized art plus lightweight road-light layers; no WebGL or game state. */
export function TitleArtwork(){return <div className="title-artwork" aria-hidden="true">
 <picture><source media="(orientation: landscape)" srcSet="/art/title/ava-hq-title-v1-desktop.webp"/><img src="/art/title/ava-hq-title-v1-portrait.webp" alt="" width="941" height="1672" fetchPriority="high" draggable={false}/></picture>
 <svg className="title-road-lights title-road-portrait" viewBox="0 0 941 1672" preserveAspectRatio="xMidYMid slice"><path className="road-glow road-cyan" d="M941 1280C740 1230 470 1200 610 1140S950 1080 690 1070S230 1100 0 1170"/><path className="road-glow road-pink" d="M941 1018C740 962 570 965 450 940S200 908 100 903"/></svg>
 <svg className="title-road-lights title-road-desktop" viewBox="0 0 1672 941" preserveAspectRatio="xMidYMid slice"><path className="road-glow road-cyan" d="M1672 940C1330 800 960 680 610 610S290 540 470 520S730 520 510 505S180 520 0 550"/><path className="road-glow road-pink" d="M290 465C470 432 690 428 585 398S690 354 785 355"/></svg>
 <div className="title-sun-glow"/>
 </div>;}
