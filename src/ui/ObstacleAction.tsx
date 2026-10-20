import {LANDSCAPE,type LandscapeObstacle} from '../../shared/landscape';
export const obstacleName=(kind:LandscapeObstacle['kind'])=>kind==='tree'?'Tree':kind==='rock'?'Rock':'Scrap Pile';
export function ObstacleAction({kind,busy,unavailable,onClear}:{kind:LandscapeObstacle['kind'];busy:boolean;unavailable:boolean;onClear:()=>void}){
 return <><strong>{obstacleName(kind)}</strong><span className="obstacle-duration">{LANDSCAPE.workByKind[kind]/1000}s</span><button className="primary" disabled={busy||unavailable} onClick={onClear}>{unavailable?'BUILDER BUSY':'CLEAR'}</button></>;
}
