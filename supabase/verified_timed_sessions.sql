-- Server-clock timing for the shared iOS/Android MCQ and case clients.
set lock_timeout='2s';
alter table app_private.verified_sessions
 add column if not exists timing_seconds integer check(timing_seconds in (5,10,15,30,45,60)),
 add column if not exists timed_answers jsonb not null default '{}',
 add column if not exists open_item text,
 add column if not exists answer_deadline timestamptz;

create or replace function public.begin_verified_timed_session(p_request_id uuid,p_mode text,p_item_ids text[],p_seconds integer)
returns jsonb language plpgsql security definer set search_path='' set statement_timeout='5s' as $fn$
declare result jsonb; s app_private.verified_sessions%rowtype;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_mode is null or p_mode not in ('mcq','case_study') or p_seconds is null or p_seconds not in(5,10,15,30,45,60) then raise exception 'Invalid timed session' using errcode='22023'; end if;
 result:=public.begin_verified_session(p_request_id,p_mode,p_item_ids);
 select * into s from app_private.verified_sessions where id=(result->>'session_id')::uuid and user_id=auth.uid() for update;
 if s.reward_kind is not null or (s.timing_seconds is not null and s.timing_seconds<>p_seconds) then raise exception 'Session policy mismatch' using errcode='22023'; end if;
 update app_private.verified_sessions set timing_seconds=p_seconds where id=s.id;
 return result;
end $fn$;
revoke all on function public.begin_verified_timed_session(uuid,text,text[],integer) from public,anon,authenticated;
grant execute on function public.begin_verified_timed_session(uuid,text,text[],integer) to authenticated;

create or replace function public.open_verified_timed_item(p_session_id uuid,p_item_id text)
returns jsonb language plpgsql security definer set search_path='' set statement_timeout='3s' as $fn$
declare s app_private.verified_sessions%rowtype; expected text; t timestamptz;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select * into s from app_private.verified_sessions where id=p_session_id and user_id=auth.uid() for update;
 if not found or s.timing_seconds is null or s.completed_at is not null or clock_timestamp()>=s.expires_at then raise exception 'Timed session unavailable' using errcode='42501'; end if;
 select s.item_ids[count(*)::int+1] into expected from jsonb_object_keys(s.timed_answers);
 if p_item_id is distinct from expected then raise exception 'Timed item order mismatch' using errcode='22023'; end if;
 if app_private.session_snapshot(s.mode,s.item_ids) is distinct from s.snapshot then raise exception 'Content unavailable' using errcode='42501'; end if;
 if s.open_item is null then
  t:=clock_timestamp()+make_interval(secs=>s.timing_seconds);
  update app_private.verified_sessions set open_item=p_item_id,answer_deadline=t where id=s.id;
 elsif s.open_item=p_item_id then t:=s.answer_deadline;
 else raise exception 'Another timed item is open' using errcode='22023'; end if;
 return jsonb_build_object('item_id',p_item_id,'remaining_seconds',greatest(0,extract(epoch from t-clock_timestamp())));
end $fn$;
revoke all on function public.open_verified_timed_item(uuid,text) from public,anon,authenticated;
grant execute on function public.open_verified_timed_item(uuid,text) to authenticated;

create or replace function public.answer_verified_timed_item(p_session_id uuid,p_item_id text,p_answer text)
returns jsonb language plpgsql security definer set search_path='' set statement_timeout='3s' as $fn$
declare s app_private.verified_sessions%rowtype; accepted text; streak integer:=0; pos integer; bonus integer:=0;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select * into s from app_private.verified_sessions where id=p_session_id and user_id=auth.uid() for update;
 if not found or s.timing_seconds is null or clock_timestamp()>=s.expires_at then raise exception 'Timed session unavailable' using errcode='42501'; end if;
 if s.timed_answers ? p_item_id then
  -- Idempotent retry returns the original effective answer, never changes it.
  return jsonb_build_object('item_id',p_item_id,'answer',s.timed_answers->p_item_id,'bonus_total',s.rapid_bonus);
 end if;
 if s.completed_at is not null or s.open_item is distinct from p_item_id or s.answer_deadline is null then raise exception 'Timed item not open' using errcode='22023'; end if;
 if p_answer is not null and (p_answer !~ '^[A-F]$' or strpos('ABCDEF',p_answer)>(s.snapshot->p_item_id->>'options')::int) then raise exception 'Invalid canonical option' using errcode='22023'; end if;
 if app_private.session_snapshot(s.mode,s.item_ids) is distinct from s.snapshot then raise exception 'Content unavailable' using errcode='42501'; end if;
 accepted:=case when clock_timestamp()<=s.answer_deadline then p_answer else null end;
 if s.mode='rapid_fire' and accepted is not null and accepted=s.snapshot->p_item_id->>'key' then
  pos:=array_position(s.item_ids,p_item_id)-1;
  while pos>=1 loop
   exit when (s.timed_answers->>s.item_ids[pos]) is distinct from (s.snapshot->s.item_ids[pos]->>'key');
   streak:=streak+1;pos:=pos-1;
  end loop;
  bonus:=round(2*least(streak,5))+round(3*greatest(0,extract(epoch from s.answer_deadline-clock_timestamp()))/12);
 end if;
 update app_private.verified_sessions set timed_answers=timed_answers||jsonb_build_object(p_item_id,accepted),open_item=null,answer_deadline=null,
  rapid_bonus=least(25,rapid_bonus+bonus) where id=s.id;
 return jsonb_build_object('item_id',p_item_id,'answer',accepted,'bonus_total',least(25,s.rapid_bonus+bonus));
end $fn$;
revoke all on function public.answer_verified_timed_item(uuid,text,text) from public,anon,authenticated;
grant execute on function public.answer_verified_timed_item(uuid,text,text) to authenticated;
