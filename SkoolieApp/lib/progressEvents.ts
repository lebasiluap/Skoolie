const listeners=new Set<()=>void>()
export function onProgressSaved(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener)}}
// A background summary failure must never turn a committed reward into an error.
export function notifyProgressSaved(){for(const listener of listeners){try{listener()}catch{/* best effort */}}}
