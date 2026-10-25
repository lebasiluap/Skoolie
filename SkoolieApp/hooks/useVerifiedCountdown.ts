import { useEffect, useRef, useState } from 'react'
import { Alert } from 'react-native'

/** Display follows an issued server deadline, including time spent backgrounded. */
export function useVerifiedCountdown(enabled: boolean, itemId: string | null,
 open: (id: string) => Promise<number | null>, expire: () => void) {
 const [state,setState]=useState<{id:string;remaining:number}|null>(null)
 const callbacks=useRef({open,expire});callbacks.current={open,expire}
 useEffect(()=>{
  if(!enabled||!itemId){setState(null);return}
  let stopped=false,interval:ReturnType<typeof setInterval>|undefined
  setState(null)
  const begin=async()=>{
   try {
    const sent=Date.now()
    const seconds=await callbacks.current.open(itemId)
    if(stopped)return
    if(seconds===null)throw new Error('No deadline')
    // Deduct the entire round trip conservatively; the server grades lateness.
    const deadline=sent+seconds*1000
    let fired=false
    const tick=()=>{
     if(stopped)return
     const value=Math.max(0,Math.ceil((deadline-Date.now())/1000));setState({id:itemId,remaining:value})
     if(value===0&&!fired){fired=true;if(interval)clearInterval(interval);callbacks.current.expire()}
    }
    interval=setInterval(tick,250);tick()
   }catch{
    if(!stopped)Alert.alert('Timer could not start','Check your connection. The server keeps the same deadline on retry.',[{text:'Retry',onPress:()=>void begin()}])
   }
  }
  void begin()
  return()=>{stopped=true;if(interval)clearInterval(interval)}
 },[enabled,itemId])
 return enabled&&state?.id===itemId ? state.remaining : null
}
