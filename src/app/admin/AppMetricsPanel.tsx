'use client'

import {useCallback,useEffect,useRef,useState} from 'react'
import {createClient} from '@/lib/supabase/client'

type Screen={screen:string;users:number;recent_seconds:number;quiet_seconds:number;idle_seconds:number;views:number;touches:number;answers:number;flips:number;completions:number}
type Metrics={measured_at:string;days:number;collection_enabled:boolean;oldest_summary_date:string|null;summary:{users:number;recent_seconds:number;quiet_seconds:number;idle_seconds:number;views:number;answers:number;flips:number;completions:number};screens:Screen[]}
const minutes=(seconds:number)=>`${(Number(seconds)/60).toFixed(1)}m`
export default function AppMetricsPanel(){
 const [data,setData]=useState<Metrics|null>(null),[error,setError]=useState(false),[loading,setLoading]=useState(false),[days,setDays]=useState(7)
 const active=useRef<AbortController|null>(null)
 const load=useCallback(async()=>{
  active.current?.abort()
  const controller=new AbortController();active.current=controller;setLoading(true)
  const timeout=setTimeout(()=>controller.abort(),5000)
  try{
   const result=await createClient().rpc('admin_app_metrics',{p_days:days}).abortSignal(controller.signal)
   if(result.error||!result.data?.summary||!Array.isArray(result.data.screens))throw new Error('Unavailable')
   if(active.current===controller){setData(result.data);setError(false)}
  }catch{if(active.current===controller)setError(true)}
  finally{clearTimeout(timeout);if(active.current===controller){active.current=null;setLoading(false)}}
 },[days])
 useEffect(()=>{
  setData(null)
  const refresh=()=>{if(document.visibilityState==='visible'&&!active.current)void load()}
  refresh();const timer=setInterval(refresh,60000)
  document.addEventListener('visibilitychange',refresh)
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',refresh);active.current?.abort();active.current=null}
 },[load])
 return <section className="am-panel"><header><h2>App usage metrics</h2><p>Daily account-linked summaries from compatible app builds, across all signed-in users. Not a click-by-click history.</p></header>
  <div className="am-actions"><label>Reporting window <select aria-label="App metrics reporting window" value={days} onChange={e=>setDays(Number(e.target.value))}><option value={1}>Today (UTC)</option><option value={7}>7 days</option><option value={30}>30 days</option></select></label><button disabled={loading} onClick={()=>void load()}>{loading?'Refreshing…':'Refresh metrics'}</button></div>
  <p className="am-note">Recent interaction is time within 30 seconds of input. Quiet/reading is 30–120 seconds; possible idle is longer. These device-reported estimates are capped by server elapsed time, not proof of attention. Session completions below are client-reported events, not verified rewards. Missing/offline samples are not backfilled.</p>
  {error&&<p role="alert">App metrics could not refresh. Any previous snapshot remains visible.</p>}
  {!data?<p className="am-empty">{loading?'Loading app metrics…':'No snapshot available.'}</p>:<>
   {!data.collection_enabled&&<p role="status" className="am-note">New collection is disabled by the server rollout switch. Existing beta timing is unaffected.</p>}
   {data.oldest_summary_date&&Date.parse(data.measured_at)-Date.parse(data.oldest_summary_date)>31*86400000&&<p role="alert">Analytics cleanup is behind: summaries older than 31 days remain. Review retention before continuing rollout.</p>}
   <p className="am-note">{data.days} UTC calendar day(s), including today. Measured {new Date(data.measured_at).toLocaleString('en-GB',{timeZone:'UTC'})}. Users: {data.summary.users}; screen views: {data.summary.views}; answer submissions: {data.summary.answers}; reported completions: {data.summary.completions}.</p>
   {data.screens.length===0?<p className="am-empty">No compatible app metrics received yet. Older beta activity remains separate below.</p>:<div className="am-table-wrap" tabIndex={0} role="region" aria-label="App usage by screen; scroll horizontally"><table><thead><tr>{['Screen','Users','Views','Recent input','Quiet / reading','Possible idle','Touches','Answers','Flips','Reported completions'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{data.screens.map(s=><tr key={s.screen}><td>{s.screen}</td><td>{s.users}</td><td>{s.views}</td><td>{minutes(s.recent_seconds)}</td><td>{minutes(s.quiet_seconds)}</td><td>{minutes(s.idle_seconds)}</td><td>{s.touches}</td><td>{s.answers}</td><td>{s.flips}</td><td>{s.completions}</td></tr>)}</tbody></table></div>}
  </>}
 </section>
}
