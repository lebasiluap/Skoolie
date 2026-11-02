import { BETA_SCREENS, type BetaAction, type BetaScreen } from './betaInteraction'

export type ScreenMetric = {screen: BetaScreen; recent_ms:number; quiet_ms:number; idle_ms:number; views:number; touches:number; answers:number; flips:number; completions:number}
/** In-memory aggregates only: no event trail, content, coordinates or identifiers. */
export function createAppMetrics(initial: BetaScreen, now:()=>number=()=>performance.now()) {
  let screen=(BETA_SCREENS as readonly string[]).includes(initial)?initial:'other' as BetaScreen
  let last=now(), input:number|null=null, entered=last, lastTouch=-Infinity
  const rows=new Map<BetaScreen,ScreenMetric>()
  const row=()=>{
    if(!rows.has(screen)) rows.set(screen,{screen,recent_ms:0,quiet_ms:0,idle_ms:0,views:0,touches:0,answers:0,flips:0,completions:0})
    return rows.get(screen)!
  }
  const account=()=>{
    const t=now(), gap=t-last
    if(gap>=0 && gap<=90000){
      const r=input===null?0:Math.max(0,Math.min(t,input+30000)-last)
      const q=input===null?Math.max(0,Math.min(t,entered+120000)-last):Math.max(0,Math.min(t,input+120000)-Math.max(last,input+30000))
      const x=row();x.recent_ms+=r;x.quiet_ms+=q;x.idle_ms+=Math.max(0,gap-r-q)
    }
    last=t;return t
  }
  row().views++
  return {
    action(kind:BetaAction,next:BetaScreen){
      if(!(BETA_SCREENS as readonly string[]).includes(next))return
      const t=account()
      if(kind==='screen'){if(next!==screen){screen=next;row().views++}return}
      if(kind==='touch' && t-lastTouch<500)return
      if(kind==='touch'){lastTouch=t;row().touches++}
      else if(kind==='answer')row().answers++
      else if(kind==='flip')row().flips++
      else if(kind==='complete')row().completions++
      else return
      input=t
    },
    take(){
      account()
      const data=[...rows.values()].map(x=>({...x,recent_ms:Math.floor(x.recent_ms),quiet_ms:Math.floor(x.quiet_ms),idle_ms:Math.floor(x.idle_ms)}))
      rows.clear();return data
    },
  }
}
