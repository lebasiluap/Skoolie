'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toCSV } from './metrics'

interface ActivitySession {
 id: string; email: string; full_name: string | null; platform: string; version: string; build: string
 started_at: string; last_seen_at: string; ended_at: string | null; observed_seconds: number; status: string
}
interface Activity { measured_at: string; sessions: ActivitySession[]; assignments: {email:string;platform:string;session_one:string;session_two:string;registered:boolean;last_sign_in_at:string|null;last_tracked_at:string|null}[] }
const time = (value: string | null) => value ? new Date(value).toLocaleString('en-GB', { timeZone: 'UTC' }) : 'Not recorded'

export default function BetaActivityPanel() {
 const [snapshot,setSnapshot]=useState<Activity|null>(null)
 const [error,setError]=useState(false),[loading,setLoading]=useState(false),[search,setSearch]=useState('')
 const [day,setDay]=useState('')
 const request=useRef<AbortController|null>(null)
 const load=useCallback(async()=>{
  if(request.current)return
  const controller=new AbortController();request.current=controller;setLoading(true)
  const timer=setTimeout(()=>controller.abort(),6000)
  try {
   const {data,error}=await createClient().rpc('admin_beta_activity').abortSignal(controller.signal)
   if(error||!data||!Array.isArray(data.sessions))throw new Error('Unavailable')
   if(request.current===controller){setSnapshot(data as Activity);setError(false)}
  }catch{if(request.current===controller)setError(true)}
  finally{clearTimeout(timer);if(request.current===controller){request.current=null;setLoading(false)}}
 },[])
 useEffect(()=>{
  const refresh=()=>{if(document.visibilityState==='visible')void load()}
  refresh();const timer=setInterval(refresh,30000)
  document.addEventListener('visibilitychange',refresh)
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',refresh);request.current?.abort();request.current=null}
 },[load])
 const rows=snapshot?.sessions.filter(s=>(!day||s.started_at.slice(0,10)===day)&&[s.email,s.full_name,s.platform].some(v=>v?.toLowerCase().includes(search.toLowerCase())))??[]
 const download=()=>{
  const csv=toCSV([['Email','Platform','Build','Start (GMT)','End (GMT)','Last seen (GMT)','Observed foreground seconds','Status'],...rows.map(s=>[s.email,s.platform,s.version+' ('+s.build+')',s.started_at,s.ended_at,s.last_seen_at,s.observed_seconds,s.status])])
  const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'}))
  const a=document.createElement('a');a.href=url;a.download='skoolie-private-beta-activity.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
 }
 return <section className="am-panel"><header><h2>Tester session timing</h2><p>Latest 500 foreground sessions in the last 30 days. Times are GMT; refreshes every 30 seconds while visible.</p></header>
  <p className="am-note">Observed foreground time counts server heartbeat intervals of at most 90 seconds. It is not proof of attention or automatic payment approval. Older app builds have no session history; missing tracking is unverified, not zero testing.</p>
  <div className="am-actions"><button onClick={()=>void load()} disabled={loading}>{loading?'Refreshing…':'Refresh timing'}</button><button onClick={download} disabled={!snapshot}>Export private activity</button></div>
  {snapshot&&<p className="am-note">Measured {time(snapshot.measured_at)}</p>}
  {error&&<p role="alert" className="am-note">Timing could not be refreshed. Any earlier snapshot is retained; retry when connected.</p>}
  <label className="am-search"><span className="am-sr-only">Find tester activity</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find by email, name or platform"/></label>
  <div className="am-actions"><label className="am-range">Testing date (GMT)<input type="date" value={day} onChange={e=>setDay(e.target.value)}/></label><button onClick={()=>setDay(new Date().toISOString().slice(0,10))}>Today</button><button onClick={()=>{setDay('');setSearch('')}}>Show all / reset</button></div>
  {snapshot?.assignments&&<><h3>Assigned testing dates</h3><p className="am-note">One hour on each date. Registration is matched by account email, not store enrollment. Android testers must remain enrolled until Paul confirms completion.</p><div className="am-table-wrap" tabIndex={0} role="region" aria-label="Tester assignments"><table><thead><tr>{['Tester','Platform','Session 1','Session 2','App account','Last tracked (GMT)'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{snapshot.assignments.filter(a=>(!day||a.session_one===day||a.session_two===day)&&[a.email,a.platform].some(v=>v.toLowerCase().includes(search.toLowerCase()))).map(a=><tr key={a.email}><td>{a.email}</td><td>{a.platform}</td><td>{new Date(a.session_one).toLocaleDateString('en-GB',{timeZone:'UTC',day:'numeric',month:'short'})}</td><td>{new Date(a.session_two).toLocaleDateString('en-GB',{timeZone:'UTC',day:'numeric',month:'short'})}</td><td>{a.registered?'Registered':'Not matched'}</td><td>{time(a.last_tracked_at)}</td></tr>)}</tbody></table></div><h3>Observed session history</h3></>}
  {!snapshot?<p className="am-empty">{loading?'Loading session history…':'Session history unavailable.'}</p>:rows.length===0?<p className="am-empty">{search?'No matching sessions.':'No session timing recorded yet. Compatible iOS/Android builds must be installed before tracking appears.'}</p>:<div className="am-table-wrap" tabIndex={0} role="region" aria-label="Tester session timing; scroll horizontally"><table><thead><tr>{['Tester','Platform / build','Start (GMT)','End (GMT)','Last seen (GMT)','Observed foreground','Status'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(s=><tr key={s.id}><td>{s.full_name||s.email}<br/>{s.full_name?s.email:''}</td><td>{s.platform} {s.version} ({s.build})</td><td>{time(s.started_at)}</td><td>{time(s.ended_at)}</td><td>{time(s.last_seen_at)}</td><td>{Math.floor(s.observed_seconds/60)}m {s.observed_seconds%60}s</td><td>{s.status}</td></tr>)}</tbody></table></div>}
 </section>
}
