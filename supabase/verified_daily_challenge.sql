-- Additive migration on an existing verified-session installation.
-- Daily-set selection, claim, session issuance and reward all remain server-bound.
set lock_timeout='2s';
alter table app_private.verified_sessions
 add column reward_kind text check(reward_kind is null or reward_kind='daily_challenge'),
 add column reward_day date;

create function public.begin_verified_daily_challenge(p_request_id uuid,p_mode text,p_item_ids text[])
returns jsonb language plpgsql security definer set search_path='' set statement_timeout='5s' as $fn$
declare uid uuid:=auth.uid(); challenge jsonb; expected text[]; result jsonb; request uuid;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_request_id is null or p_mode is distinct from 'mcq' then raise exception 'Invalid challenge request' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||':verified-challenge',0));
 challenge:=public.get_daily_challenge();
 if not coalesce((challenge->>'available')::boolean,false) or coalesce((challenge->>'claimed')::boolean,false) then
   raise exception 'Challenge unavailable or completed' using errcode='22023';
 end if;
 select array_agg(x->>'id' order by ord) into expected
 from jsonb_array_elements(challenge->'questions') with ordinality a(x,ord);
 if cardinality(expected) is distinct from (challenge->>'total')::integer or expected is distinct from p_item_ids then
   raise exception 'Challenge set changed; reload' using errcode='22023';
 end if;
 -- Exactly one issuance per user/day across devices and request retries.
 request:=md5(uid::text||':verified-daily-challenge:'||current_date::text)::uuid;
 result:=public.begin_verified_session(request,'mcq',expected);
 if not public.start_daily_challenge() then raise exception 'Challenge already completed' using errcode='22023'; end if;
 update app_private.verified_sessions set reward_kind='daily_challenge',reward_day=current_date,
   expires_at=least(expires_at,(current_date+1)::timestamptz)
 where id=(result->>'session_id')::uuid and user_id=uid and completed_at is null;
 return result||jsonb_build_object('expires_at',
   (select expires_at from app_private.verified_sessions where id=(result->>'session_id')::uuid));
end $fn$;
revoke all on function public.begin_verified_daily_challenge(uuid,text,text[]) from public,anon,authenticated;
grant execute on function public.begin_verified_daily_challenge(uuid,text,text[]) to authenticated;
