-- Additive beta-only metadata; never used by Auth, serving, XP or payment gates.
create table app_private.beta_interaction_batches (
 session_id uuid not null references app_private.beta_activity_sessions(id) on delete cascade,
 sequence integer not null check(sequence between 1 and 100000),
 received_at timestamptz not null default clock_timestamp(),
 recent_seconds numeric not null check(recent_seconds>=0),
 quiet_seconds numeric not null check(quiet_seconds>=0),
 idle_seconds numeric not null check(idle_seconds>=0),
 interactions integer not null check(interactions between 0 and 10000),
 events jsonb not null,
 primary key(session_id,sequence)
);
create index beta_interaction_retention on app_private.beta_interaction_batches(received_at);
alter table app_private.beta_interaction_batches enable row level security;
revoke all on app_private.beta_interaction_batches from public,anon,authenticated;

create function public.record_beta_interactions(p_session_id uuid,p_sequence integer,p_data jsonb)
returns void language plpgsql security definer set search_path='' set statement_timeout='2s' as $fn$
declare uid uuid:=auth.uid(); s app_private.beta_activity_sessions; t timestamptz:=clock_timestamp();
 prev timestamptz; gap numeric; total numeric; factor numeric; r numeric; q numeric; i numeric; e jsonb;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if not exists(select 1 from app_private.beta_tester_assignments a join auth.users u on lower(u.email)=a.email where u.id=uid) then return; end if;
 if p_session_id is null or p_sequence is null or p_sequence not between 1 and 100000
 or p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>12000
 or (select count(*) from jsonb_object_keys(p_data))<>5
 or not (p_data ?& array['recent_ms','quiet_ms','idle_ms','interactions','events'])
 or jsonb_typeof(p_data->'events')<>'array' then raise exception 'Invalid metadata' using errcode='22023'; end if;
 if jsonb_array_length(p_data->'events')>60 then raise exception 'Too many events'; end if;
 foreach e in array array[p_data->'recent_ms',p_data->'quiet_ms',p_data->'idle_ms',p_data->'interactions'] loop
  if jsonb_typeof(e)<>'number' or e::text !~ '^[0-9]{1,8}$' then raise exception 'Invalid counters'; end if;
 end loop;
 r:=(p_data->>'recent_ms')::numeric; q:=(p_data->>'quiet_ms')::numeric; i:=(p_data->>'idle_ms')::numeric;
 total:=r+q+i;
 if total>90000 or (p_data->>'interactions')::int>10000 then raise exception 'Counter limit'; end if;
 for e in select value from jsonb_array_elements(p_data->'events') loop
  if jsonb_typeof(e)<>'object' or (select count(*) from jsonb_object_keys(e))<>3
  or not (e ?& array['kind','screen','delay_ms'])
  or e->>'kind' not in ('touch','screen','answer','flip','complete')
  or e->>'screen' not in ('dashboard','practice','mcq','flashcards','rapid-fire','cases','progress','insights','leaderboard','profile','settings','history','bookmarks','other')
  or coalesce(e->>'kind','')='' or coalesce(e->>'screen','')=''
  or jsonb_typeof(e->'delay_ms')<>'number' or (e->>'delay_ms') !~ '^[0-9]{1,7}$'
  or (e->>'delay_ms')::numeric>3600000 then raise exception 'Invalid event'; end if;
 end loop;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||':beta-activity',0));
 select * into s from app_private.beta_activity_sessions where id=p_session_id;
 if not found or s.user_id<>uid then raise exception 'Activity binding mismatch' using errcode='42501'; end if;
 if exists(select 1 from app_private.beta_interaction_batches where session_id=p_session_id and sequence=p_sequence) then return; end if;
 if exists(select 1 from app_private.beta_interaction_batches where session_id=p_session_id and sequence>p_sequence) then return; end if;
 -- Reject stale/cross-device samples, but allow the final background flush.
 if s.last_seen_at<t-interval '90 seconds' or s.end_reason='superseded' then return; end if;
 select max(received_at) into prev from app_private.beta_interaction_batches where session_id=p_session_id;
 gap:=extract(epoch from t-coalesce(prev,s.started_at));
 if prev is not null and gap<1 then return; end if;
 factor:=case when gap between 0 and 90 and total>0 then least(1,gap*1000/total) else 0 end;
 insert into app_private.beta_interaction_batches(session_id,sequence,recent_seconds,quiet_seconds,idle_seconds,interactions,events)
 values(p_session_id,p_sequence,r*factor/1000,q*factor/1000,i*factor/1000,(p_data->>'interactions')::int,p_data->'events');
 -- Bound retention in small indexed chunks; no full-bank refresh or long locks.
 delete from app_private.beta_interaction_batches where (session_id,sequence) in
 (select session_id,sequence from app_private.beta_interaction_batches where received_at<t-interval '30 days' order by received_at limit 100);
end $fn$;
revoke all on function public.record_beta_interactions(uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.record_beta_interactions(uuid,integer,jsonb) to authenticated;

create function public.admin_beta_interactions()
returns jsonb language plpgsql security definer set search_path='' set statement_timeout='3s' as $fn$
begin
 if public.is_admin() is distinct from true then raise exception 'Admin access required' using errcode='42501'; end if;
 return jsonb_build_object('measured_at',clock_timestamp(),'sessions',(
 select coalesce(jsonb_agg(x),'[]'::jsonb) from (
 select b.session_id,sum(b.recent_seconds) as recent_seconds,sum(b.quiet_seconds) as quiet_seconds,
 sum(b.idle_seconds) as idle_seconds,sum(b.interactions) as interactions
 from app_private.beta_interaction_batches b where b.received_at>=clock_timestamp()-interval '30 days' group by b.session_id
 )x),'events',(
 select coalesce(jsonb_agg(x order by received_at desc),'[]'::jsonb) from (
 select b.session_id,b.received_at,e->>'kind' as kind,e->>'screen' as screen,(e->>'delay_ms')::int as delay_ms
 from app_private.beta_interaction_batches b cross join lateral jsonb_array_elements(b.events) e
 where b.received_at>=clock_timestamp()-interval '30 days' order by b.received_at desc limit 1000
 )x));
end $fn$;
revoke all on function public.admin_beta_interactions() from public,anon,authenticated;
grant execute on function public.admin_beta_interactions() to authenticated;
