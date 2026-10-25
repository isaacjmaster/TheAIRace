/** Shot positions belong to the captured attack, while live target IDs may already have changed. */
export function sameShotPosition(shot:readonly number[]|undefined,current:readonly number[]|undefined){return !!shot&&!!current&&shot[0]===current[0]&&shot[1]===current[1];}
export function shotAsset<T extends {position:readonly number[]}>(assets:readonly T[],shot:readonly number[]|undefined){return assets.find(asset=>sameShotPosition(shot,asset.position));}
