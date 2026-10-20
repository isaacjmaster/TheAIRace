type Rect={left:number;top:number;right:number;bottom:number;width:number;height:number};
/** Hide rather than move a world timer onto unrelated terrain or an interactive HUD. */
export function worldIndicatorVisible(p:{x:number;y:number;z?:number},canvas:Rect,occlusions:Rect[]){
 const x=p.x+canvas.left,y=p.y+canvas.top;
 return (p.z===undefined||p.z>=-1&&p.z<=1)&&p.x>=34&&p.x<=canvas.width-34&&p.y>=48&&p.y<=canvas.height-8&&!occlusions.some(r=>x+34>r.left&&x-34<r.right&&y>r.top&&y-48<r.bottom);
}
