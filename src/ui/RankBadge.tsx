import {RankMedal} from './RankMedal';
export function RankBadge({rank}:{rank:number}){return <span className={`rank-medal rank-${rank} ${rank>3?'rank-neutral':''} ${rank>=100?'rank-wide':''}`} aria-label={`Rank ${rank}`}>{rank<=3?<RankMedal rank={rank as 1|2|3}/>:<span className="rank-numeral">{rank}</span>}</span>;}
