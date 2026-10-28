export function captureCardSwipe(dx:number,dy:number,touches=1) {
  return touches===1 && Number.isFinite(dx) && Number.isFinite(dy)
    && Math.abs(dx)>12 && Math.abs(dx)>Math.abs(dy)*1.5
}

/** Distance wins over an opposite velocity at the end of a deliberate drag. */
export function cardSwipeGrade(dx:number,dy:number,vx:number):boolean|null {
  if(!Number.isFinite(vx)||!captureCardSwipe(dx,dy))return null
  if(Math.abs(dx)>=80)return dx>0
  if(Math.abs(dx)>=24 && Math.abs(vx)>=0.8 && Math.sign(dx)===Math.sign(vx))return dx>0
  return null
}

/** A completion from an old/interrupted swipe must never grade a new card. */
export function createCardSwipeGuard() {
  let generation=0
  let active:{token:number;id:string}|null=null
  return {
    begin(id:string){if(active)return null;active={token:++generation,id};return active.token},
    current(token:number,id:string){return active?.token===token&&active.id===id},
    busy(){return active!==null},
    invalidate(){generation++;active=null},
  }
}
