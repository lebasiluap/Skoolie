-- Additive support; existing app versions retain their legacy contract.
set lock_timeout='2s';
alter table app_private.verified_sessions drop constraint verified_sessions_mode_check;
alter table app_private.verified_sessions add constraint verified_sessions_mode_check check(mode in('mcq','case_study','flashcard','rapid_fire'));
alter table app_private.verified_sessions drop constraint verified_sessions_reward_kind_check;
alter table app_private.verified_sessions add constraint verified_sessions_reward_kind_check check(reward_kind is null or reward_kind in('daily_challenge','barrage'));
alter table app_private.verified_sessions drop constraint verified_sessions_timing_seconds_check;
alter table app_private.verified_sessions add constraint verified_sessions_timing_seconds_check check(timing_seconds in(5,10,12,15,30,45,60));
alter table app_private.verified_sessions
 add column reward_slot integer check(reward_slot in(0,1)),
 add column rapid_bonus integer not null default 0 check(rapid_bonus between 0 and 25);

create function public.begin_verified_rapid_session(p_request_id uuid,p_mode text,p_item_ids text[],p_barrage boolean,p_slot integer)
returns jsonb language plpgsql security definer set search_path='' set statement_timeout='5s' as $fn$
declare result jsonb; request uuid:=p_request_id; s app_private.verified_sessions%rowtype;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_mode is distinct from 'rapid_fire' or p_barrage is null or p_slot is null or p_slot not in(0,1) or cardinality(p_item_ids) not between 1 and 5 then raise exception 'Invalid rapid session' using errcode='22023';end if;
 if p_barrage then
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':verified-barrage',0));
  if exists(select 1 from public.barrage_claims where user_id=auth.uid() and day=current_date and slot=p_slot) then raise exception 'Barrage already completed' using errcode='22023';end if;
  -- A new attempt may restart after abandonment; the payout's unique daily
  -- slot is enforced atomically by credit_xp at completion, not by the client.
 end if;
 result:=public.begin_verified_session(request,'rapid_fire',p_item_ids);
 select * into s from app_private.verified_sessions where id=(result->>'session_id')::uuid and user_id=auth.uid() for update;
 if s.timing_seconds is not null and (s.timing_seconds<>12 or coalesce(s.reward_kind='barrage',false) is distinct from p_barrage) then raise exception 'Rapid policy mismatch' using errcode='22023';end if;
 update app_private.verified_sessions set timing_seconds=12,reward_kind=case when p_barrage then 'barrage' else null end,
  reward_slot=case when p_barrage then p_slot else null end,reward_day=case when p_barrage then current_date else null end,
  expires_at=case when p_barrage then least(expires_at,(current_date+1)::timestamptz) else expires_at end where id=s.id;
 return result;
end $fn$;
revoke all on function public.begin_verified_rapid_session(uuid,text,text[],boolean,integer) from public,anon,authenticated;
grant execute on function public.begin_verified_rapid_session(uuid,text,text[],boolean,integer) to authenticated;
