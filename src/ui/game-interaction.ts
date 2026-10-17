/** Suppress webpage affordances only inside this game's non-editable surface.
 * No touch/pointer/keyboard, clipboard, or scrolling events are intercepted. */
export function installGameInteractionGuard(root:HTMLElement){
 const nativeText='input, textarea, select, [contenteditable]:not([contenteditable="false"]), [data-native-text]';
 const guard=(event:Event)=>{
  const target=event.target instanceof Element?event.target:event.target instanceof Node?event.target.parentElement:null;
  if(!target||target.closest(nativeText))return;
  event.preventDefault();
 };
 const types=['contextmenu','selectstart','dragstart'] as const;
 for(const type of types)root.addEventListener(type,guard);
 return()=>{for(const type of types)root.removeEventListener(type,guard);};
}
