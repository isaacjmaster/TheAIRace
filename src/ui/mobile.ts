/** Rotation changes presentation only: the mounted game and raid clock stay intact. */
export const PORTRAIT_GAME = '(orientation: portrait) and (max-width: 1024px)';
export async function requestLandscape(orientation?: object) {
  try { if(orientation && 'lock' in orientation && typeof orientation.lock==='function') await orientation.lock('landscape'); } catch { /* Safari/permission failures use the rotate screen. */ }
}
