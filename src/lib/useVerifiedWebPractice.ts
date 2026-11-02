'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from './supabase/client'
import { createVerifiedSession, type VerifiedMode } from './verifiedSession'
import { readWithDeadline } from '../../SkoolieApp/lib/readWithDeadline'

/** Never display an unissued payload or pay a client-calculated score. */
export function useVerifiedWebPractice(userId: string, mode: VerifiedMode, ids: string[]) {
  const key = JSON.stringify([userId, mode, ids])
  const [revision, setRevision] = useState(0)
  const [issued, setIssued] = useState<{key:string;items:Record<string,unknown>[]}|null>(null)
  const [error, setError] = useState<string|null>(null)
  const [saving,setSaving] = useState(false)
  const active = useRef<{key:string;client:ReturnType<typeof createVerifiedSession>}|null>(null)
  const busy = useRef(false)
  useEffect(() => {
    let live = true
    setIssued(null); setError(null); busy.current=false; setSaving(false)
    if(!userId){setError('Sign in to start a session.');return}
    if(!ids.length){setError('No available items in this session.');return}
    if(ids.length>60||new Set(ids).size!==ids.length){setError('Please start a session with up to 60 distinct items.');return}
    if(!globalThis.crypto?.randomUUID){setError('Please use an up-to-date browser over HTTPS.');return}
    const db = createClient()
    const client = createVerifiedSession((name,args)=>readWithDeadline(signal=>db.rpc(name,args).abortSignal(signal)),{requestId:crypto.randomUUID(),mode,itemIds:ids})
    active.current={key,client}
    void client.begin().catch(()=>client.begin()).then(result=>{
      if(live)setIssued({key,items:result.items})
    }).catch(()=>{if(live)setError('This session could not start. Check your connection and retry. Only available, cleared content can be used.')})
    return ()=>{live=false;active.current=null}
    // ids and mode are represented by the stable binding key.
  },[key,revision]) // eslint-disable-line react-hooks/exhaustive-deps
  const binding = active.current
  return {items:issued?.key===key?issued.items:null,error,saving,
    restart:()=>{setIssued(null);setRevision(n=>n+1)},
    answer:(id:string,value:string|boolean|null)=>{
      if(!binding||binding.key!==key||issued?.key!==key)throw new Error('Session not ready')
      binding.client.answer(id,value)
    },
    finish:async()=>{
      if(busy.current||!binding||binding.key!==key)return null
      busy.current=true;setSaving(true);setError(null)
      try{
        // A lost response may follow a committed transaction. Same UUID, same answers.
        const receipt=await binding.client.finish().catch(()=>binding.client.finish())
        if(active.current!==binding)return null
        return receipt
      }catch{
        if(active.current===binding)setError('Progress not confirmed. Your answers remain here. Retry saving the same session; rewards cannot be duplicated.')
        return null
      }finally{if(active.current===binding){busy.current=false;setSaving(false)}}
    }}
}
