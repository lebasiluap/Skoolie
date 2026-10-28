import { useEffect, useRef, useState } from 'react'
import { Alert } from 'react-native'

/** Display follows an issued server deadline, including time spent backgrounded. */
export function useVerifiedCountdown(enabled: boolean, itemId: string | null,
 open: (id: string) => Promise<{seconds:number;requestedAt:number} | null>, expire: () => void, leave?: () => void) {
 const [state,setState]=useState<{id:string;remaining:number}|null>(null)
 const callbacks=useRef({open,expire,leave});callbacks.current={open,expire,leave}
 useEffect(()=>{
  if(!enabled||!itemId){setState(null);return}
  let stopped=false,interval:ReturnType<typeof setInterval>|undefined
  setState(null)
  const begin=async()=>{
   if(stopped)return // dismiss stale alerts without reopening an answered item
   try {
    const opening=await callbacks.current.open(itemId)
    if(stopped)return
    if(opening===null)throw new Error('No deadline')
    // Deduct the successful attempt's round trip, not a failed attempt twice.
    // The server still owns the original deadline and grades lateness.
    const deadline=opening.requestedAt+opening.seconds*1000
    let fired=false
    const tick=()=>{
     if(stopped)return
     const value=Math.max(0,Math.ceil((deadline-Date.now())/1000));setState({id:itemId,remaining:value})
     if(value===0&&!fired){fired=true;if(interval)clearInterval(interval);callbacks.current.expire()}
    }
    interval=setInterval(tick,250);tick()
   }catch{
    if(!stopped)Alert.alert('Timer could not start','The timer could not be confirmed. Retry keeps the same server deadline. You can leave and start a fresh run if this one is no longer available.',[
     ...(callbacks.current.leave ? [{text:'Leave run',style:'cancel' as const,onPress:()=>{if(!stopped)callbacks.current.leave?.()}}] : []),
     {text:'Retry',onPress:()=>void begin()},
    ])
   }
  }
  void begin()
  return()=>{stopped=true;if(interval)clearInterval(interval)}
 },[enabled,itemId])
 return enabled&&state?.id===itemId ? state.remaining : null
}
