'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { changeLabel, formatRate, toCSV, type BetaMetrics, type ContentMetrics, type AppActivity } from './metrics'
import './dashboard.css'

const VIEWS = ['Overview', 'Learning', 'Content & quality', 'People', 'App health', 'Measurement'] as const
type View = typeof VIEWS[number]
const number = (n: number) => new Intl.NumberFormat('en-GB').format(n)
const friendly = (s: string) => s.replaceAll('_', ' ')
const date = (s: string) => new Date(s).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' })
const timestamp = (s: string | null) => s ? new Date(s).toLocaleString('en-GB', { timeZone: 'UTC' }) : 'Not recorded'

function Metric({label,value,note,accent=false}:{label:string;value:string|number;note:string;accent?:boolean}) {
 return <article className={'am-metric'+(accent?' am-accent':'')}><p>{label}</p><strong>{typeof value==='number'?number(value):value}</strong><small>{note}</small></article>
}
function Panel({title,sub,children}:{title:string;sub?:string;children:React.ReactNode}) {
 return <section className="am-panel"><header><h2>{title}</h2>{sub&&<p>{sub}</p>}</header>{children}</section>
}
function Empty({children}:{children:React.ReactNode}) {return <p className="am-empty">{children}</p>}
function Trend({data,field,label}:{data:BetaMetrics['daily'];field:'sessions'|'signups';label:string}) {
 const max=Math.max(1,...data.map(d=>d[field]))
 return <><div className="am-trend" role="img" aria-label={label+': '+data.map(d=>date(d.day)+' '+d[field]).join('; ')}>
 {data.map(d=><div key={d.day} className="am-bar-slot" title={date(d.day)+': '+number(d[field])}><span style={{height:(d[field]/max*100)+'%'}}/></div>)}
 </div><div className="am-axis"><span>{date(data[0].day)}</span><span>{date(data[data.length-1].day)}</span></div>
 <details className="am-detail"><summary>View daily values</summary><div className="am-table-wrap" tabIndex={0} role="region" aria-label={label+' daily values'}><table><caption className="am-sr-only">{label}</caption><thead><tr><th>Date (UTC)</th><th>Count</th></tr></thead><tbody>{data.map(d=><tr key={d.day}><td>{date(d.day)}</td><td>{number(d[field])}</td></tr>)}</tbody></table></div></details></>
}
function SearchTable({title,headers,rows}:{title:string;headers:string[];rows:(string|number)[][]}) {
 const [query,setQuery]=useState(''),[page,setPage]=useState(0)
 const filtered=rows.filter(r=>r.some(c=>String(c).toLowerCase().includes(query.toLowerCase())))
 const pages=Math.max(1,Math.ceil(filtered.length/10));const safePage=Math.min(page,pages-1)
 return <div><label className="am-search"><span className="am-sr-only">Search {title}</span><input placeholder={'Search '+title.toLowerCase()} value={query} onChange={e=>{setQuery(e.target.value);setPage(0)}}/></label>
 {filtered.length===0?<Empty>{rows.length?'No matching results. Try another search.':'No records in this scope yet.'}</Empty>:<div className="am-table-wrap" tabIndex={0} role="region" aria-label={title+' table; scroll horizontally if needed'}><table><caption className="am-sr-only">{title}</caption><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{filtered.slice(safePage*10,safePage*10+10).map((row,i)=><tr key={i}>{row.map((c,j)=><td key={j}>{typeof c==='number'?number(c):c}</td>)}</tr>)}</tbody></table></div>}
 <div className="am-pagination"><small>{filtered.length?number(safePage*10+1)+'–'+number(Math.min((safePage+1)*10,filtered.length))+' of ':''}{number(filtered.length)} results</small><div><button disabled={safePage===0} onClick={()=>setPage(safePage-1)} aria-label={'Previous page of '+title}>←</button><button disabled={safePage===pages-1} onClick={()=>setPage(safePage+1)} aria-label={'Next page of '+title}>→</button></div></div></div>
}

export default function AdminDashboardClient({initialData,initialError,days}:{initialData:BetaMetrics|null;initialError:string|null;days:7|30|90}) {
 const router=useRouter();const [pending,startTransition]=useTransition()
 const [view,setView]=useState<View>('Overview')
 const [content,setContent]=useState<ContentMetrics|null>(null)
 const [contentError,setContentError]=useState<string|null>(null)
 const [contentLoading,setContentLoading]=useState(false)
 const active=useRef<AbortController|null>(null)
 const [activity,setActivity]=useState<AppActivity|null>(null)
 const [activityError,setActivityError]=useState<string|null>(null)
 const [activityLoading,setActivityLoading]=useState(false)
 const activityRequest=useRef<AbortController|null>(null)
 const loadActivity=useCallback(async()=>{
  if(activityRequest.current)return
  const controller=new AbortController();activityRequest.current=controller;setActivityLoading(true)
  const timeout=setTimeout(()=>controller.abort(),7000)
  try{
   const {data,error}=await createClient().rpc('admin_app_activity').abortSignal(controller.signal)
   if(error||!data)throw new Error('unavailable')
   if(activityRequest.current===controller){setActivity(data as AppActivity);setActivityError(null)}
  }catch{if(!controller.signal.aborted||activityRequest.current===controller)setActivityError('App activity could not be refreshed. Any previous snapshot is retained.')}
  finally{clearTimeout(timeout);if(activityRequest.current===controller){activityRequest.current=null;setActivityLoading(false)}}
 },[])
 // Lightweight activity only, visible-tab polling; no content-bank scans.
 useEffect(()=>{
  if(view!=='People'&&view!=='App health')return
  const refreshVisible=()=>{if(document.visibilityState==='visible')void loadActivity()}
  const initial=setTimeout(refreshVisible,0),timer=setInterval(refreshVisible,30000)
  document.addEventListener('visibilitychange',refreshVisible)
  return()=>{clearTimeout(initial);clearInterval(timer);document.removeEventListener('visibilitychange',refreshVisible)}
 },[view,loadActivity])
 const loadContent=useCallback(async()=>{
  if(active.current) return
  const controller=new AbortController();active.current=controller;setContentLoading(true);setContentError(null)
  const timeout=setTimeout(()=>controller.abort(),12000)
  try{
   const {data,error}=await createClient().rpc('admin_content_metrics').abortSignal(controller.signal)
   if(error||!data) throw new Error('unavailable')
   setContent(data as ContentMetrics)
  }catch{if(active.current===controller)setContentError('Content metrics could not be loaded. Your existing snapshot is unchanged; retry when connected.')}
  finally{clearTimeout(timeout);if(active.current===controller){active.current=null;setContentLoading(false)}}
 },[])
 useEffect(()=>()=>{active.current?.abort();active.current=null;activityRequest.current?.abort();activityRequest.current=null},[])
 const changeView=(next:View)=>{setView(next);if(next==='Content & quality'&&!content&&!contentLoading)void loadContent()}
 const refresh=()=>{if(pending)return;startTransition(()=>router.refresh());if(view==='Content & quality')void loadContent();if(view==='People'||view==='App health')void loadActivity()}
 const download=()=>{
  if(!initialData)return
  const s=initialData.summary
  const rows:(string|number|null)[][]=[['Skoolie admin metrics','Value','Scope'],['Measured at',initialData.measured_at,'UTC'],['Window start',initialData.window_start,'UTC'],['Days',days,'Current day is partial'],...Object.entries(s).map(([k,v])=>[k,v,'See measurement definitions'] as (string|number)[]),['Open user reports',initialData.reports.open,'All time; unresolved'],['Web page views',initialData.traffic.views,'Selected window; web only'],[],['Date (UTC)','Saved sessions','New profiles','Active learners','Responses'],...initialData.daily.map(d=>[d.day,d.sessions,d.signups,d.learners,d.responses])]
  if(content)rows.push([],['Content measured at',content.measured_at,'Global current snapshot'],['Released questions',content.released_questions,'Standalone'],['Withheld questions',content.total_questions-content.released_questions,'Standalone'],['Released whole cases',content.released_cases,'Complete families'],['Flagged units',content.flagged_units,'Open current-hash findings; not confirmed errors'])
  const url=URL.createObjectURL(new Blob(['\uFEFF'+toCSV(rows)],{type:'text/csv;charset=utf-8;'}))
  const a=document.createElement('a');a.href=url;a.download='skoolie-metrics-'+initialData.measured_at.slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
 }
 const data=initialData, s=data?.summary
 return <div className="am-dashboard" aria-busy={pending}>
 <header className="am-header"><div><div className="am-eyebrow">SKOOLIE / OPERATIONS</div><h1>Your beta, at a glance.</h1><p>People, practice and content quality. One place to see what needs attention.</p></div><div className="am-actions"><button onClick={()=>{const win=window as Window&{__toggleTheme?:()=>void};win.__toggleTheme?.()}} aria-label="Switch light or dark theme">◐ <span>Theme</span></button><button disabled={!data||pending} onClick={download}>Export CSV</button><button className="am-primary" disabled={pending} onClick={refresh}>{pending?'Refreshing…':'↻ Refresh'}</button></div></header>
 <div className="am-toolbar"><nav aria-label="Dashboard views">{VIEWS.map(v=><button key={v} aria-pressed={view===v} onClick={()=>changeView(v)}>{v}</button>)}</nav><label className="am-range">Period <select aria-label="Analytics period" disabled={pending} value={days} onChange={e=>{startTransition(()=>router.replace('/admin?days='+e.target.value,{scroll:false}))}}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></label></div>
 <div className="am-freshness" role="status">{pending?'Loading a fresh snapshot…':data?'Updated '+new Date(data.measured_at).toLocaleString('en-GB',{timeZone:'UTC'})+' UTC · selected period includes today (partial)':'Snapshot unavailable'}<span>Read-only · People/App health update every 30 s while visible</span></div>
 {!data||!s?<div role="alert" className="am-alert"><h2>We couldn’t load analytics</h2><p>{initialError??'No metrics were returned. No values have been substituted with zeros.'}</p><button onClick={refresh} disabled={pending}>Retry loading metrics</button></div>:<>
 {view==='Overview'&&<>
 <div className="am-hero"><div><span className="am-eyebrow">THE LEARNING PULSE</span><h2>{number(s.learners)} people practiced</h2><p>{number(s.sessions)} saved sessions across {days} days. {changeLabel(s.sessions,s.previous_sessions)}.</p><Link href="/admin/reports">Review tester feedback →</Link></div><div className="am-hero-stat"><strong>{formatRate(s.objective_correct,s.objective_responses)}</strong><span>Scored-response accuracy</span><small>Excludes self-graded flashcards</small></div></div>
 <div className="am-grid am-four"><Metric label="Registered profiles" value={s.users} note="All time; not store installations"/><Metric label="New profiles" value={s.new_users} note={changeLabel(s.new_users,s.previous_new_users)}/><Metric label="New-user activation" value={formatRate(s.activated_new,s.new_users)} note={number(s.activated_new)+' / '+number(s.new_users)+' saved a first session'}/><Metric label="Open user reports" value={data.reports.open} note="Unresolved; separate from audit flags"/></div>
 <div className="am-grid am-two"><Panel title="Daily practice activity" sub="Saved sessions by UTC day. Only successfully recorded result sessions are counted."><Trend data={data.daily} field="sessions" label="Saved practice sessions"/></Panel><Panel title="New profiles by day" sub="New profiles by UTC day; this is not app downloads."><Trend data={data.daily} field="signups" label="New profiles"/></Panel></div>
 <div className="am-grid am-four"><Metric label="Daily active learners" value={s.dau} note="Saved a session today (UTC)"/><Metric label="Weekly active learners" value={s.wau} note="Saved a session in rolling 7 days"/><Metric label="Monthly active learners" value={s.mau} note="Saved a session in rolling 30 days"/><Metric label="D7 return" value={formatRate(s.day7_returned,s.day7_eligible)} note={number(s.day7_returned)+' / '+number(s.day7_eligible)+' mature signup cohort'}/></div>
 <div className="am-grid am-two"><Panel title="Feedback that needs a look" sub="Open reports across all dates."><SearchTable title="Report reasons" headers={['Reason','Reports']} rows={data.reports.reasons.map(r=>[friendly(r.reason),r.reports])}/><Link className="am-link" href="/admin/reports">Open reports inbox →</Link></Panel><Panel title="Beta readiness checklist"><ul className="am-checklist"><li>Check both iOS and Android, cold start and slow networks.</li><li>Keep only dual-cleared content available.</li><li>Resolve safety and sign-in failures before expansion.</li><li>Verify released questions too—not only flagged ones.</li></ul><p className="am-note">App-store invitations and build approvals are not connected to this dashboard. Check TestFlight and Play Console for live distribution status.</p></Panel></div>
 </>}
 {view==='Learning'&&<>
 <div className="am-grid am-four"><Metric label="Saved result sessions" value={s.sessions} note="Selected period; not session starts"/><Metric label="Recorded responses" value={s.responses} note="Sum of saved session question counts"/><Metric label="Scored accuracy" value={formatRate(s.objective_correct,s.objective_responses)} note={number(s.objective_correct)+' / '+number(s.objective_responses)+' valid scored responses'}/><Metric label="Flashcard recall" value={formatRate(s.flashcard_recalled,s.flashcard_responses)} note="Self-reported “Got it”; not objective accuracy"/></div>
 <div className="am-grid am-two"><Panel title="Practice mix" sub="Every recorded mode is shown; flashcards are self-graded."><SearchTable title="Practice modes" headers={['Mode','Sessions','Responses','Score / recall']} rows={data.modes.map(m=>[friendly(m.mode),m.sessions,m.responses,formatRate(m.correct,m.scored_responses)])}/></Panel><Panel title="Topic performance" sub="Top 30 session topics. Mixed sessions stay separate; accuracy excludes flashcards."><SearchTable title="Learning topics" headers={['Topic','Sessions','Responses','Accuracy']} rows={data.topics.map(t=>[t.topic,t.sessions,t.responses,formatRate(t.correct,t.scored_responses)])}/></Panel></div>
 <div className="am-grid am-four"><Metric label="XP in session records" value={s.xp_recorded} note="Recorded awards; not a financial ledger"/><Metric label="Profiles with a streak" value={s.streak_users} note="Stored current_streak > 0; not recomputed"/><Metric label="Longest stored streak" value={s.max_streak+' days'} note="All profiles, all time"/><Metric label="Invalid score records" value={s.invalid_score_sessions} note="Excluded from accuracy, retained in volume"/></div>
 <Panel title="What these numbers mean"><p className="am-note">The app writes quiz sessions on results, not at the start of practice. Session duration, abandonment and completion rate cannot be inferred. Bookmark review and missed-answer drills may deliberately not create sessions. A saved response count is not a distinct-question count.</p></Panel>
 </>}
 {view==='Content & quality'&&<>
 <div className="am-section-heading"><div><h2>Clearance is a gate, not a guess.</h2><p>Global current content snapshot; not filtered by the activity period.</p></div><button disabled={contentLoading} onClick={()=>void loadContent()}>{contentLoading?'Loading…':'Refresh content'}</button></div>
 {contentError&&<div role="alert" className="am-alert"><p>{contentError}</p><button disabled={contentLoading} onClick={()=>void loadContent()}>Retry content metrics</button></div>}
 {!content&&!contentError&&<p role="status">Loading guarded content metrics…</p>}
 {content&&<>
 <p className="am-note">Content measured {new Date(content.measured_at).toLocaleString('en-GB',{timeZone:'UTC'})} UTC</p>
 {content.catalog_questions!==content.released_questions&&<div role="alert" className="am-alert"><p>Catalog coverage differs from the serving count. Type, topic and difficulty breakdowns cover {number(content.catalog_questions)} catalog entries; the released total comes directly from the serving view. Investigate before relying on breakdowns.</p></div>}
 <div className={'am-policy '+(content.serving_mode==='cleared_only'?'':'am-policy-danger')}><strong>{content.serving_mode==='cleared_only'?'Strict cleared-only serving':'Serving policy needs review'}</strong><span>Current mode: {content.serving_mode}. This dashboard cannot clear or release content.</span></div>
 <div className="am-grid am-four"><Metric label="Released questions" value={content.released_questions} note={number(content.total_questions)+' standalone questions total'} accent/><Metric label="Withheld questions" value={content.total_questions-content.released_questions} note="Flagged, pending or otherwise not cleared"/><Metric label="Released whole cases" value={content.released_cases} note={number(content.total_cases-content.released_cases)+' case families withheld'}/><Metric label="Flagged audit units" value={content.flagged_units} note={number(content.issue_tags)+' tags; suspected, not confirmed errors'}/></div>
 <div className="am-grid am-two"><Panel title="Available question mix" sub="Released standalone questions only."><SearchTable title="Question types" headers={['Type','Available']} rows={content.types.map(t=>[friendly(t.question_type),t.available])}/><SearchTable title="Difficulty coverage" headers={['Difficulty','Available']} rows={content.difficulty.map(t=>[friendly(t.difficulty),t.available])}/></Panel><Panel title="Open audit findings" sub="Current-hash open findings. Categories overlap; do not sum as unique questions."><SearchTable title="Audit findings" headers={['Issue','Units','Tags']} rows={content.findings.map(f=>[friendly(f.issue_code),f.units,f.tags])}/></Panel></div>
 <div className="am-grid am-two"><Panel title="Released topics" sub="Top 50 topics by released standalone questions."><SearchTable title="Content topics" headers={['Topic','Available']} rows={content.topics.map(t=>[t.topic,t.available])}/></Panel><Panel title="Workflow status" sub="Shared workflow labels are not provider review coverage. Pending may include state-reconciliation exceptions."><SearchTable title="Workflow statuses" headers={['Unit type','Status','Units']} rows={content.statuses.map(t=>[friendly(t.content_type),friendly(t.phase_a_status),t.units])}/><div className="am-inline-stats"><span>{content.running} running</span><span>{content.unclosed_batches} unclosed batches</span></div></Panel></div>
 </>}
 </>}
 {view==='People'&&<>
 <Panel title="Sign-ins & app activity" sub="Latest server-confirmed sign-in per person, not token refreshes. App activity is a foreground heartbeat, not proof someone is online. Times are UTC; newest 500 profiles by sign-in.">
 {activityLoading&&<p role="status">Refreshing activity…</p>}{activityError&&<p role="alert">{activityError} <button onClick={()=>void loadActivity()}>Retry activity</button></p>}
 {activity?<><p className="am-note">Activity snapshot: {timestamp(activity.measured_at)} UTC</p><SearchTable title="Live app activity" headers={['Name','Last sign-in (UTC)','Last app activity (UTC)','Last web/app activity (UTC)']} rows={activity.people.map(p=>[p.full_name??'Unnamed',timestamp(p.last_sign_in_at),timestamp(p.app_last_seen_at),timestamp(p.last_seen_at)])}/></>:!activityLoading&&<Empty>No activity snapshot loaded.</Empty>}
 </Panel>
 <div className="am-grid am-two"><Panel title="Who you’re reaching" sub="All profiles; active learners are scoped to the selected period."><SearchTable title="Professions" headers={['Profession','Profiles','Ever activated','Active learners']} rows={data.professions.map(p=>[friendly(p.profession),p.users,p.activated,p.learners])}/></Panel><Panel title="Where learners are" sub="Top 15 countries by profiles; self-reported, not geolocation."><SearchTable title="Countries" headers={['Country','Profiles']} rows={data.countries.map(c=>[c.country,c.users])}/></Panel></div>
 <Panel title="Newest profiles" sub="Latest 25 profiles, all time. Names stay inside the authenticated admin area and are not included in the CSV export."><SearchTable title="Recent profiles" headers={['Name','Profession','Country','Joined (UTC)','First saved session']} rows={data.people.map(p=>[p.full_name??'Unnamed',friendly(p.profession??'Not set'),p.country??'Not set',date(p.created_at),p.activated?'Recorded':'Not yet'])}/><Link className="am-link" href="/admin/users">Manage users →</Link></Panel>
 <div className="am-grid am-four"><Metric label="Seen in last 5 minutes" value={s.recently_seen} note="Profile heartbeat; not a reliable live-online count"/><Metric label="Reports received" value={data.reports.new} note="Selected period"/><Metric label="Reports resolved" value={data.reports.resolved} note="Resolution timestamp in selected period"/><Metric label="Mean resolution time" value={data.reports.mean_resolution_hours===null?'—':data.reports.mean_resolution_hours+' h'} note="Resolved reports only; excludes open backlog"/></div>
 </>}
 {view==='App health'&&<>
 <Panel title="Observed app builds" sub="Last build seen per person and platform, within 30 days. Future builds appear automatically when opened. This is not a store installation or approval count.">
 {activityLoading&&<p role="status">Refreshing app health…</p>}{activityError&&<p role="alert">{activityError} <button onClick={()=>void loadActivity()}>Retry app health</button></p>}
 {activity?<><p className="am-note">Updated {timestamp(activity.measured_at)} UTC. Older builds do not report these signals; users must install the instrumented update.</p><SearchTable title="App builds" headers={['Platform','Version','Build','Users seen','Seen within 5 min','Last activity (UTC)']} rows={activity.builds.map(b=>[b.platform,b.version,b.build,b.users,b.recently_active,timestamp(b.last_seen_at)])}/></>:<Empty>No build telemetry loaded yet.</Empty>}
 </Panel>
 <Panel title="Request performance" sub="Last 7 UTC days, client-reported network requests. Mean and maximum include failed requests; these are not p95 or full screen-load timings. No tokens, question content or answers are collected.">
 {activity&&<SearchTable title="Request timings" headers={['Operation','Platform','Version/build','Requests','Failed','Mean ms','Maximum ms']} rows={activity.performance.map(m=>[friendly(m.operation),m.platform,m.version+' / '+m.build,m.calls,m.failures,m.mean_ms,m.max_ms])}/>}<p className="am-note">Offline or interrupted telemetry can be missing. Auth requests include token refreshes and are not a sign-in success-rate metric.</p>
 </Panel>
 {activity&&<Panel title="Synthetic league pacers" sub="Stored separately from real user accounts; excluded from registered-user and learning metrics."><div className="am-grid am-four"><Metric label="Pacer bots" value={activity.bots.total} note="Synthetic accounts"/><Metric label="Active pacers" value={activity.bots.active} note="Display-only league participants"/><Metric label="Punctuated handles" value={activity.bots.usernames} note="Names containing digits, dots or underscores"/><Metric label="Full-name style" value={activity.bots.full_names} note="Fictional display names"/></div></Panel>}
 </>}
 {view==='Measurement'&&<>
 <Panel title="Trust the definitions, not just the numbers"><dl className="am-definitions"><dt>Time window</dt><dd>{date(data.window_start)} through the snapshot time, UTC. Today is incomplete; the previous-period comparison uses the preceding {days} full days.</dd><dt>Active learner</dt><dd>A distinct user with a saved result session. DAU uses today UTC; WAU/MAU are rolling 7/30-day windows.</dd><dt>Activation</dt><dd>A profile created in the selected period with any saved session after profile creation.</dd><dt>D7 return</dt><dd>New profiles in the selected period whose complete seventh calendar day has elapsed; returned means a saved session on exactly that UTC day. No eligible users displays “—”.</dd><dt>Accuracy</dt><dd>Sum of valid scores divided by session question counts, excluding self-graded flashcards. Malformed score records are omitted from the denominator and counted separately.</dd><dt>Traffic</dt><dd>Web page-view records only, including admin and anonymous traffic. Not mobile app sessions, unique visitors or installations.</dd><dt>Quarantine</dt><dd>Current released content is read from the app-facing serving views. Withheld includes more than clinical flags. Audit findings remain a triage queue, not an error-rate estimate.</dd></dl></Panel>
 <div className="am-grid am-two"><Panel title="Recorded web traffic" sub={number(data.traffic.views)+' page views in the selected period; top 10 paths.'}><SearchTable title="Web paths" headers={['Path','Views']} rows={data.traffic.paths.map(p=>[p.path,p.views])}/></Panel><Panel title="Measurement coverage"><ul className="am-checklist"><li>App health: foreground activity, observed builds and mean/maximum network request timings after the instrumented update.</li><li>People: latest real sign-in from the Auth service, separate from foreground heartbeats.</li><li>Still missing: crash-free sessions, screen-ready latency and retry success.</li><li>Still missing: sign-in success rate, onboarding and abandonment funnels.</li><li>Not connected: payment/API spend and store invitation/install counts.</li></ul><p className="am-note">Missing data is not shown as zero. Client telemetry is best-effort diagnostic data, not a security or billing ledger.</p></Panel></div>
 </>}
 </>}
 </div>
}

