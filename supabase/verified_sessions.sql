-- Additive rollout: untimed MCQ/case/flashcard protocol. Existing clients keep
-- their old contracts until the new clients have been tested and distributed.
-- A receipt prevents replay of ONE issued session; it is not proof of human
-- study, and existing content endpoints still expose explanations/answer keys.
set lock_timeout='2s';
set statement_timeout='10s';
create schema app_private;
revoke all on schema app_private from public,anon,authenticated;

create table app_private.verified_sessions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.user_profiles(id) on delete cascade,
 request_id uuid not null,
 mode text not null check(mode in('mcq','case_study','flashcard')),
 item_ids text[] not null check(cardinality(item_ids) between 1 and 60),
 snapshot jsonb not null,
 issued_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null default clock_timestamp()+interval '12 hours',
 answers jsonb,
 completed_at timestamptz,
 unique(user_id,request_id),
 check((answers is null)=(completed_at is null))
);
create index verified_sessions_user_issued on app_private.verified_sessions(user_id,issued_at);
create table app_private.reward_receipts (
 session_id uuid primary key references app_private.verified_sessions(id) on delete cascade,
 user_id uuid not null references public.user_profiles(id) on delete cascade,
 quiz_session_id uuid not null unique references public.quiz_sessions(id),
 receipt jsonb not null,
 created_at timestamptz not null default clock_timestamp()
);
create index reward_receipts_user on app_private.reward_receipts(user_id);
alter table app_private.verified_sessions enable row level security;
alter table app_private.reward_receipts enable row level security;
revoke all on app_private.verified_sessions,app_private.reward_receipts from public,anon,authenticated;

-- Mirrors the supported array/A-F object data shapes without rewriting content.
-- Ambiguous or unresolved keys fail closed: no guessed grade and no reward.
create function app_private.option_contract(p_options jsonb,p_answer text) returns jsonb
language plpgsql immutable security invoker set search_path='' as $fn$
declare opts text[]; ca text:=btrim(coalesce(p_answer,'')); letter text; hits integer; pos integer;
begin
 if jsonb_typeof(p_options)='array' then
   select array_agg(value order by ord) into opts from jsonb_array_elements_text(p_options) with ordinality a(value,ord);
 elsif jsonb_typeof(p_options)='object' then
   select array_agg(p_options->>k order by k) into opts
   from unnest(array['A','B','C','D','E','F']) k where coalesce(p_options->>k,'')<>'';
 end if;
 if coalesce(cardinality(opts),0) not between 2 and 6 or ca='' then
   raise exception 'Unsupported answer contract' using errcode='22023';
 end if;
 if ca ~ '^[A-F]$' then letter:=ca;
 elsif ca ~ '^[A-F][.):]' then letter:=left(ca,1);
 else
   select count(*),min(ord)::int into hits,pos from unnest(opts) with ordinality a(value,ord)
   where lower(btrim(regexp_replace(value,'^\s*[A-F][.):]\s*','')))=lower(btrim(regexp_replace(ca,'^\s*[A-F][.):]\s*','')));
   if hits=1 then letter:=substr('ABCDEF',pos,1); end if;
 end if;
 if letter is null or strpos('ABCDEF',letter)>cardinality(opts) then
   raise exception 'Unresolved answer contract' using errcode='22023';
 end if;
 return jsonb_build_object('key',letter,'options',cardinality(opts));
end $fn$;
revoke all on function app_private.option_contract(jsonb,text) from public,anon,authenticated;

create function app_private.session_snapshot(p_mode text,p_ids text[]) returns jsonb
language plpgsql stable security invoker set search_path='' as $fn$
declare uid uuid:=auth.uid(); prof text; access text; item text; q public.questions%rowtype;
 c public.case_studies%rowtype; inner_q jsonb; entry jsonb; result jsonb:='{}'; idx integer;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select profession,access_key into prof,access from public.user_profiles where id=uid;
 if prof is null then raise exception 'Profile required' using errcode='42501'; end if;
 foreach item in array p_ids loop
   if item ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
     select * into q from public.questions where id=item::uuid
       and professions @> array[prof] and public.region_visible(region)
       and (access_key is null or access_key=access)
       and question_type=case when p_mode='flashcard' then 'flashcard' else 'mcq' end;
     if not found then raise exception 'Item not available for this session' using errcode='42501'; end if;
     entry:=case when p_mode='flashcard' then jsonb_build_object('self_graded',true)
       else app_private.option_contract(q.options,q.correct_answer) end;
     entry:=entry||jsonb_build_object('hash',md5(jsonb_build_array(q.question_text,q.options,q.correct_answer,q.explanation,
       q.distractor_explanations,q.image_url,q.topic,q.category,q.subtopic,q.difficulty,q.professions,q.region,q.access_key)::text),
       'type',q.question_type,'topic',q.topic,'category',q.category,'subtopic',q.subtopic,'difficulty',q.difficulty);
   elsif p_mode='case_study' and item ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:(0|[1-9][0-9]{0,2})$' then
     select * into c from public.case_studies where id=split_part(item,':',1)::uuid
       and professions @> array[prof] and public.region_visible(region) and (access_key is null or access_key=access);
     if not found then raise exception 'Case not available for this session' using errcode='42501'; end if;
     idx:=split_part(item,':',2)::int;
     inner_q:=c.questions->idx;
     if inner_q is null then raise exception 'Invalid case item' using errcode='22023'; end if;
     entry:=app_private.option_contract(inner_q->'options',inner_q->>'correct_answer')||
       jsonb_build_object('hash',md5(jsonb_build_array(c.clinical_vignette,c.patient_history,c.examination_findings,
         c.investigations,c.title,c.questions,c.professions,c.region,c.access_key)::text),'type','case_inner','topic',c.topic);
   else raise exception 'Invalid item identifier' using errcode='22023'; end if;
   result:=result||jsonb_build_object(item,entry);
 end loop;
 return result;
end $fn$;
revoke all on function app_private.session_snapshot(text,text[]) from public,anon,authenticated;

-- Return the authoritative render payload at issuance, not an older client
-- prefetch. Answer keys are already present in the app's existing public
-- content payloads; this protocol does not claim open-book cheat prevention.
create function app_private.session_payload(p_mode text,p_ids text[]) returns jsonb
language plpgsql stable security invoker set search_path='' as $fn$
declare item text; payload jsonb; result jsonb:='[]';
begin
 perform app_private.session_snapshot(p_mode,p_ids);
 foreach item in array p_ids loop
   if strpos(item,':')=0 then
     select jsonb_build_object('id',item,'question_text',q.question_text,'options',q.options,
       'correct_answer',q.correct_answer,'explanation',q.explanation,'distractor_explanations',q.distractor_explanations,
       'question_type',q.question_type,'topic',q.topic,'category',q.category,'subtopic',q.subtopic,
       'difficulty',q.difficulty,'image_url',q.image_url) into payload from public.questions q where id=item::uuid;
   else
     select (c.questions->split_part(item,':',2)::int)||jsonb_build_object('id',item,'case_id',c.id,
       'clinical_vignette',c.clinical_vignette,'topic',c.topic,
       'case_context',jsonb_build_object('id',c.id,'title',c.title,'topic',c.topic,'subtopic',c.subtopic,
         'difficulty',c.difficulty,'style',c.style,'high_yield',c.high_yield,
         'clinical_vignette',c.clinical_vignette,'patient_history',c.patient_history,
         'examination_findings',c.examination_findings,'investigations',c.investigations)) into payload
     from public.case_studies c where id=split_part(item,':',1)::uuid;
   end if;
   if payload is null then raise exception 'Item no longer available' using errcode='42501'; end if;
   result:=result||jsonb_build_array(payload);
 end loop;
 return result;
end $fn$;
revoke all on function app_private.session_payload(text,text[]) from public,anon,authenticated;

create function app_private.advance_study_streak(p_user uuid) returns void
language plpgsql security invoker set search_path='' as $fn$
declare p public.user_profiles%rowtype; today date:=(clock_timestamp() at time zone 'UTC')::date;
 missed integer; next_streak integer; frozen date[];
begin
 if auth.uid() is null or auth.uid()<>p_user then raise exception 'Profile ownership required' using errcode='42501'; end if;
 select * into p from public.user_profiles where id=p_user for update;
 if not found then raise exception 'Profile required' using errcode='42501'; end if;
 if p.last_active_date>=today then return; end if;
 missed:=greatest(0,today-coalesce(p.last_active_date,today)-1);
 frozen:=coalesce(p.frozen_dates,'{}'::date[]);
 if p.last_active_date=today-1 then next_streak:=coalesce(p.current_streak,0)+1;
 elsif missed>0 and coalesce(p.current_streak,0)>0 and coalesce(p.streak_freezes,0)>=missed then
   next_streak:=p.current_streak+missed+1;
   select array_agg(day order by ord) into frozen from (
     select day,ord from unnest(frozen||array(select p.last_active_date+i from generate_series(1,missed) i))
       with ordinality a(day,ord) order by ord desc limit 60) x;
   p.streak_freezes:=p.streak_freezes-missed;
 else next_streak:=1; end if;
 update public.user_profiles set current_streak=next_streak,longest_streak=greatest(coalesce(p.longest_streak,0),next_streak),
   last_active_date=today,streak_freezes=p.streak_freezes,frozen_dates=frozen where id=p_user;
end $fn$;
revoke all on function app_private.advance_study_streak(uuid) from public,anon,authenticated;

create function public.begin_verified_session(p_request_id uuid,p_mode text,p_item_ids text[]) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='5s' as $fn$
declare uid uuid:=auth.uid(); s app_private.verified_sessions%rowtype; snap jsonb;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_request_id is null or p_mode is null or p_mode not in('mcq','case_study','flashcard')
    or p_item_ids is null or cardinality(p_item_ids) not between 1 and 60
    or array_ndims(p_item_ids)<>1 or pg_column_size(p_item_ids)>8192 or array_position(p_item_ids,null) is not null
    or (select count(distinct x) from unnest(p_item_ids) x)<>cardinality(p_item_ids) then
   raise exception 'Invalid session request' using errcode='22023';
 end if;
 -- Serialize only this user's issuance; a retried request returns the same ID.
 perform pg_advisory_xact_lock(hashtextextended(uid::text||':verified-issue',0));
 select * into s from app_private.verified_sessions where user_id=uid and request_id=p_request_id;
 if found then
   if s.mode<>p_mode or s.item_ids<>p_item_ids then raise exception 'Session request conflict' using errcode='22023'; end if;
 else
   if (select count(*) from app_private.verified_sessions where user_id=uid and issued_at>clock_timestamp()-interval '1 hour')>=60 then
     raise exception 'Session issuance limit reached' using errcode='54000';
   end if;
   snap:=app_private.session_snapshot(p_mode,p_item_ids);
   insert into app_private.verified_sessions(user_id,request_id,mode,item_ids,snapshot)
     values(uid,p_request_id,p_mode,p_item_ids,snap) returning * into s;
 end if;
 if clock_timestamp()>=s.expires_at then raise exception 'Session expired' using errcode='22023'; end if;
 if app_private.session_snapshot(s.mode,s.item_ids) is distinct from s.snapshot then
   raise exception 'Session content changed; start a new session' using errcode='22023';
 end if;
 return jsonb_build_object('protocol_version',1,'session_id',s.id,'mode',s.mode,'item_ids',s.item_ids,
   'total',cardinality(s.item_ids),'expires_at',s.expires_at,'items',app_private.session_payload(s.mode,s.item_ids));
end $fn$;
revoke all on function public.begin_verified_session(uuid,text,text[]) from public,anon,authenticated;
grant execute on function public.begin_verified_session(uuid,text,text[]) to authenticated;

create function public.finish_verified_session(p_session_id uuid,p_answers jsonb) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='5s' as $fn$
declare uid uuid:=auth.uid(); s app_private.verified_sessions%rowtype; result jsonb; item text;
 entry jsonb; answer jsonb; score integer:=0; xp integer:=0; quiz_id uuid; completed timestamptz:=clock_timestamp();
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_answers is null or jsonb_typeof(p_answers)<>'object' or pg_column_size(p_answers)>20000 then
   raise exception 'Invalid answer envelope' using errcode='22023';
 end if;
 select * into s from app_private.verified_sessions where id=p_session_id and user_id=uid for update;
 if not found then raise exception 'Session not available' using errcode='42501'; end if;
 if s.completed_at is not null then
   if s.answers is distinct from p_answers then raise exception 'Completed session answer conflict' using errcode='22023'; end if;
   select receipt into result from app_private.reward_receipts where session_id=s.id;
   if result is null then raise exception 'Session receipt invariant failed'; end if;
   return result;
 end if;
 if clock_timestamp()>=s.expires_at then raise exception 'Session expired' using errcode='22023'; end if;
 if (select count(*) from jsonb_object_keys(p_answers))<>cardinality(s.item_ids)
    or not (p_answers ?& s.item_ids) then raise exception 'Incomplete or extra answers' using errcode='22023'; end if;
 if app_private.session_snapshot(s.mode,s.item_ids) is distinct from s.snapshot then
   raise exception 'Session content changed; start a new session' using errcode='22023';
 end if;
 foreach item in array s.item_ids loop
   answer:=p_answers->item; entry:=s.snapshot->item;
   if s.mode='flashcard' then
     if jsonb_typeof(answer)<>'boolean' then raise exception 'Flashcard self-rating must be boolean' using errcode='22023'; end if;
     if answer='true'::jsonb then score:=score+1; end if;
   else
     if answer<>'null'::jsonb and (jsonb_typeof(answer)<>'string' or (answer#>>'{}') !~ '^[A-F]$'
         or strpos('ABCDEF',answer#>>'{}')>(entry->>'options')::int) then
       raise exception 'Invalid canonical option' using errcode='22023';
     end if;
     if (answer#>>'{}')=entry->>'key' then score:=score+1; end if;
   end if;
 end loop;
 -- One transaction: grade, reward, saved result, private receipt and completion.
 -- All per-user rewards serialize here; same-session calls already hold its row.
 perform pg_advisory_xact_lock(hashtextextended(uid::text||':verified-reward',0));
 if s.mode<>'flashcard' then xp:=public.credit_xp(s.mode,score,cardinality(s.item_ids),false,0,0); end if;
 insert into public.quiz_sessions(user_id,question_ids,answers,score,xp_earned,started_at,completed_at,mode,timed)
   values(uid,s.item_ids,p_answers,score,xp,s.issued_at,completed,s.mode,false) returning id into quiz_id;
 -- V1 uses the server UTC day; future timezone policy must be explicit.
 perform app_private.advance_study_streak(uid);
 foreach item in array s.item_ids loop
   entry:=s.snapshot->item;
   if entry->>'type'='mcq' then
     perform public.record_answer(item::uuid,'mcq',entry->>'topic',entry->>'category',entry->>'subtopic',
       entry->>'difficulty',coalesce((p_answers->>item)=entry->>'key',false),p_answers->>item);
   elsif s.mode='flashcard' then
     perform public.record_answer(item::uuid,'flashcard',entry->>'topic',entry->>'category',entry->>'subtopic',
       entry->>'difficulty',(p_answers->>item)::boolean,null);
   end if;
 end loop;
 result:=jsonb_build_object('protocol_version',1,'session_id',s.id,'quiz_session_id',quiz_id,'mode',s.mode,
   'score',score,'total',cardinality(s.item_ids),'xp',xp,'completed_at',completed);
 insert into app_private.reward_receipts(session_id,user_id,quiz_session_id,receipt) values(s.id,uid,quiz_id,result);
 update app_private.verified_sessions set answers=p_answers,completed_at=completed where id=s.id;
 return result;
end $fn$;
revoke all on function public.finish_verified_session(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.finish_verified_session(uuid,jsonb) to authenticated;
